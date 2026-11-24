import type { PublicRepository, RepositorySelection } from './github.types';

export const GITHUB_USERNAME = 'ErwanLucienMMV';
export const SELECTION_PATH = `/repos/${GITHUB_USERNAME}/${GITHUB_USERNAME}/contents/config/languages.json`;

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a GitHub object');
  }
  return value as Record<string, unknown>;
}

export function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid GitHub count');
  }
  return value;
}

export function parseSelection(value: unknown): RepositorySelection {
  const config = object(value);
  if (config.username !== GITHUB_USERNAME) throw new Error('Unexpected GitHub owner');
  const lists: Record<string, string[]> = {};
  for (const key of ['include', 'exclude', 'allow_forks', 'allow_archived']) {
    const names = config[key] ?? [];
    if (!Array.isArray(names) || names.length > 100 || names.some(name =>
      typeof name !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(name) || name === '.' || name === '..',
    ) || new Set(names.map(name => name.toLowerCase())).size !== names.length) {
      throw new Error('Invalid repository selection');
    }
    lists[key] = names;
  }
  const topN = config.top_n ?? 7;
  const showOther = config.show_other ?? true;
  if (typeof topN !== 'number' || !Number.isInteger(topN) || topN < 1 || topN > 12 || typeof showOther !== 'boolean') {
    throw new Error('Invalid language display settings');
  }
  return {
    username: GITHUB_USERNAME, include: lists.include, exclude: lists.exclude,
    allow_forks: lists.allow_forks, allow_archived: lists.allow_archived,
    top_n: topN, show_other: showOther,
  };
}

export function selectRepositories(config: RepositorySelection, values: unknown[]): PublicRepository[] {
  const byName = new Map(values.map(value => {
    const repo = object(value);
    if (typeof repo.name !== 'string') throw new Error('Invalid repository name');
    return [repo.name.toLowerCase(), repo];
  }));
  const excluded = new Set([...config.exclude, config.username].map(name => name.toLowerCase()));
  const allowedForks = new Set(config.allow_forks.map(name => name.toLowerCase()));
  const allowedArchived = new Set(config.allow_archived.map(name => name.toLowerCase()));
  const selected: PublicRepository[] = [];
  for (const name of [...config.include].sort((a, b) => compareNames(a.toLowerCase(), b.toLowerCase()))) {
    const key = name.toLowerCase();
    if (excluded.has(key)) continue;
    const repo = byName.get(key);
    if (!repo || ['private', 'fork', 'archived'].some(field => typeof repo[field] !== 'boolean') ||
      typeof repo.default_branch !== 'string' || !repo.default_branch) {
      throw new Error('Selected repository missing or invalid');
    }
    if (repo.private) throw new Error('Selected repository must be public');
    if (repo.fork && !allowedForks.has(key)) continue;
    if (repo.archived && !allowedArchived.has(key)) continue;
    selected.push(repo as unknown as PublicRepository);
  }
  return selected;
}

export function languageBytes(value: unknown): [string, number][] {
  return Object.entries(object(value)).map(([name, bytes]) => {
    if (!name.trim() || name.length > 128 || /[\u0000-\u001f\u007f]/.test(name)) {
      throw new Error('Invalid language name');
    }
    return [name, count(bytes)];
  });
}

export function compareNames(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function orderedLanguages(totals: Map<string, number>): [string, number][] {
  return [...totals].filter(([, bytes]) => bytes > 0)
    .sort(([a, aBytes], [b, bBytes]) => bBytes - aBytes || compareNames(a, b));
}

// Match the README generator's largest-remainder allocation to tenths of a percent.
export function distribution(ordered: [string, number][], topN: number, showOther: boolean) {
  const visible = ordered.slice(0, topN).map(([name, bytes]) => ({ name, bytes }));
  const remaining = ordered.slice(topN).reduce((sum, [, bytes]) => count(sum + bytes), 0);
  if (showOther && remaining) {
    const other = visible.find(language => language.name === 'Other');
    if (other) other.bytes = count(other.bytes + remaining);
    else visible.push({ name: 'Other', bytes: remaining });
  }
  const total = visible.reduce((sum, language) => count(sum + language.bytes), 0);
  if (!total) return [];
  const denominator = BigInt(total);
  const tenths = visible.map(language => Number(BigInt(language.bytes) * 1000n / denominator));
  const remainder = visible.map(language => BigInt(language.bytes) * 1000n % denominator);
  const priority = visible.map((_, i) => i).sort((a, b) =>
    remainder[a] > remainder[b] ? -1 : remainder[a] < remainder[b] ? 1 : a - b,
  );
  for (const i of priority.slice(0, 1000 - tenths.reduce((sum, value) => sum + value, 0))) tenths[i]++;
  return visible.map((language, i) => ({ ...language, percentage: tenths[i] / 10 }));
}
