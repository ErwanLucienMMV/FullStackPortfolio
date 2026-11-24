import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  count, distribution, GITHUB_USERNAME, languageBytes, orderedLanguages,
  parseSelection, SELECTION_PATH, selectRepositories,
} from './github.data';
import type { GithubLanguageDistribution, GithubStats, PublicRepository } from './github.types';

interface Snapshot {
  stats: GithubStats;
  languages: GithubLanguageDistribution;
  expiresAt: number;
}

const CACHE_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const REFRESH_TIMEOUT_MS = 12_000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GithubService {
  private cached?: Snapshot;
  private pending?: Promise<Snapshot>;
  private retryAt = 0;

  async stats(): Promise<GithubStats> {
    return (await this.snapshot()).stats;
  }

  async languages(): Promise<GithubLanguageDistribution> {
    return (await this.snapshot()).languages;
  }

  private snapshot(): Promise<Snapshot> {
    if (this.cached && this.cached.expiresAt > Date.now()) return Promise.resolve(this.cached);
    if (this.pending) return this.pending;
    if (this.retryAt > Date.now()) return Promise.reject(this.unavailable());
    this.pending = this.refresh().then(snapshot => {
      this.cached = snapshot;
      return snapshot;
    }).catch(() => {
      this.retryAt = Date.now() + RETRY_MS;
      // Never expose credentials, upstream bodies, or incomplete statistics.
      throw this.unavailable();
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private unavailable() {
    return new ServiceUnavailableException('GitHub statistics are temporarily unavailable');
  }

  private async refresh(): Promise<Snapshot> {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REFRESH_TIMEOUT_MS)]);
    try {
      const selectionResponse = await this.get(SELECTION_PATH, signal, 'application/vnd.github.raw+json');
      const selection = parseSelection(await selectionResponse.json());
      // The public user listing batches metadata; only selected repositories have
      // their languages and commits queried. Missing selections fail the refresh.
      const metadata: unknown[] = [];
      for (let page = 1; ; page++) {
        if (page > 100) throw new Error('Repository pagination limit exceeded');
        const response = await this.get(`/users/${GITHUB_USERNAME}/repos?type=owner&per_page=100&page=${page}`, signal);
        const repos: unknown = await response.json();
        if (!Array.isArray(repos) || repos.length > 100) throw new Error('Invalid repository list');
        metadata.push(...repos);
        if (!this.linkPage(response, 'next')) break;
      }
      const repositories = selectRepositories(selection, metadata);
      const until = new Date();
      const since = new Date(until.getTime() - 365 * DAY_MS);
      const totals = new Map<string, number>();
      let contributions = 0;
      let index = 0;
      // Six bounded workers keep the cold request within the frontend timeout
      // without sending all upstream requests at once.
      await Promise.all(Array.from({ length: Math.min(6, repositories.length) }, async () => {
        while (index < repositories.length) {
          signal.throwIfAborted();
          const repo = repositories[index++];
          const path = `/repos/${GITHUB_USERNAME}/${encodeURIComponent(repo.name)}`;
          const response = await this.get(`${path}/languages`, signal);
          for (const [name, bytes] of languageBytes(await response.json())) {
            totals.set(name, count((totals.get(name) ?? 0) + bytes));
          }
          const commits = await this.commitCount(repo, since, until, signal);
          contributions = count(contributions + commits);
        }
      }));
      const ordered = orderedLanguages(totals);
      const updatedAt = new Date().toISOString();
      return {
        stats: {
          publicRepositories: repositories.length,
          contributions,
          mainLanguages: ordered.slice(0, selection.top_n).map(([name]) => name),
        },
        languages: {
          username: GITHUB_USERNAME,
          repositories: repositories.map(repo => repo.name),
          totalBytes: ordered.reduce((sum, [, bytes]) => count(sum + bytes), 0),
          languages: distribution(ordered, selection.top_n, selection.show_other),
          updatedAt,
        },
        expiresAt: Date.now() + CACHE_MS,
      };
    } finally {
      controller.abort();
    }
  }

  private async commitCount(repo: PublicRepository, since: Date, until: Date, signal: AbortSignal): Promise<number> {
    const query = new URLSearchParams({
      author: GITHUB_USERNAME, sha: repo.default_branch,
      since: since.toISOString(), until: until.toISOString(), per_page: '1', page: '1',
    });
    const response = await this.get(`/repos/${GITHUB_USERNAME}/${encodeURIComponent(repo.name)}/commits?${query}`, signal, undefined, true);
    // GitHub uses 409 for an empty Git repository.
    if (response.status === 409) return 0;
    const commits: unknown = await response.json();
    if (!Array.isArray(commits) || commits.length > 1 || commits.some(commit =>
      !commit || typeof commit !== 'object' || typeof commit.sha !== 'string',
    )) throw new Error('Invalid commit list');
    const last = this.linkPage(response, 'last');
    if (last !== undefined) {
      if (!commits.length) throw new Error('Invalid commit pagination');
      return last;
    }
    if (this.linkPage(response, 'next')) throw new Error('Missing final commit page');
    return commits.length;
  }

  private linkPage(response: Response, relation: 'next' | 'last'): number | undefined {
    const link = (response.headers.get('link') ?? '').split(',')
      .find(part => part.includes(`rel="${relation}"`));
    if (!link) return undefined;
    const target = link.match(/<([^>]+)>/);
    if (!target) throw new Error('Invalid GitHub pagination');
    const url = new URL(target[1]);
    const page = Number(url.searchParams.get('page'));
    if (url.origin !== 'https://api.github.com' || !Number.isSafeInteger(page) || page < (relation === 'next' ? 2 : 1)) {
      throw new Error('Invalid GitHub pagination');
    }
    return page;
  }

  private async get(path: string, signal: AbortSignal, accept = 'application/vnd.github+json', allowEmpty = false): Promise<Response> {
    signal.throwIfAborted();
    const headers: Record<string, string> = {
      Accept: accept,
      'User-Agent': 'FullStackPortfolio',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com${path}`, {
      headers, signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]), redirect: 'error',
    });
    if (!response.ok && !(allowEmpty && response.status === 409)) {
      await response.body?.cancel();
      throw new Error('GitHub request failed');
    }
    return response;
  }
}
