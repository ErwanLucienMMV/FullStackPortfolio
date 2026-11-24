const assert = require('node:assert/strict');
const { test } = require('node:test');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { GithubModule } = require('../dist/github/github.module');
const { GithubService } = require('../dist/github/github.service');
const { distribution, parseSelection, selectRepositories } = require('../dist/github/github.data');

const owner = 'ErwanLucienMMV';
const selection = (overrides = {}) => ({
  username: owner, include: ['Alpha', 'Beta'], exclude: [owner, 'Deployment'],
  allow_forks: [], allow_archived: [], top_n: 2, show_other: true, ...overrides,
});
const repo = (name, overrides = {}) => ({
  name, private: false, fork: false, archived: false, default_branch: 'main', ...overrides,
});
const json = (data, headers = {}) => new Response(JSON.stringify(data), {
  status: 200, headers: { 'content-type': 'application/json', ...headers },
});

function upstream(t, options = {}) {
  const calls = [];
  const handler = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (options.failure) return options.failure(url, init);
    if (url.pathname.endsWith('/contents/config/languages.json')) return json(options.config ?? selection());
    if (url.pathname === `/users/${owner}/repos`) {
      if (options.pages) {
        const page = Number(url.searchParams.get('page'));
        return json(options.pages[page - 1], page < options.pages.length
          ? { link: `<https://api.github.com/users/${owner}/repos?page=${page + 1}>; rel="next"` } : {});
      }
      return json(options.repos ?? [repo('Alpha'), repo('Beta')]);
    }
    const name = url.pathname.split('/')[3];
    if (url.pathname.endsWith('/languages')) return json(options.languages?.[name] ?? { TypeScript: 40, C: 10 });
    if (url.pathname.endsWith('/commits')) {
      if (options.commitResponse) return options.commitResponse(url);
      const commits = options.commits?.[name] ?? 4;
      return json(commits ? [{ sha: 'abc123' }] : [], commits > 1 ? {
        link: `<https://api.github.com/repos/${owner}/${name}/commits?per_page=1&page=2>; rel="next", ` +
          `<https://api.github.com/repos/${owner}/${name}/commits?per_page=1&page=${commits}>; rel="last"`,
      } : {});
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  t.mock.method(globalThis, 'fetch', handler);
  return calls;
}

test('selection follows README exclusions and fork/archive allowances case-insensitively', () => {
  const config = parseSelection(selection({
    include: [owner, 'deployment', 'Alpha', 'Beta', 'Fork', 'Archive', 'SkippedFork', 'SkippedArchive'],
    allow_forks: ['fOrK'], allow_archived: ['ARCHIVE'],
  }));
  const selected = selectRepositories(config, [repo('Alpha'), repo('Beta'),
    repo('Fork', { fork: true }), repo('Archive', { archived: true }),
    repo('SkippedFork', { fork: true }), repo('SkippedArchive', { archived: true })]);
  assert.deepEqual(selected.map(value => value.name), ['Alpha', 'Archive', 'Beta', 'Fork']);
  assert.throws(() => selectRepositories(config, [repo('Alpha', { private: true })]));
  assert.throws(() => selectRepositories(config, []));
});

test('invalid remote selection cannot change owner, duplicate names, or inject paths', () => {
  for (const override of [
    { username: 'someone-else' }, { include: ['Alpha', 'ALPHA'] }, { include: ['../secret'] },
    { include: 'Alpha' }, { top_n: 0 }, { show_other: 'true' },
  ]) assert.throws(() => parseSelection(selection(override)));
});

test('language percentages use byte weighting, deterministic rounding, Other and empty results', () => {
  const ordered = [['C', 1], ['Java', 1], ['TypeScript', 1]];
  assert.deepEqual(distribution(ordered, 2, true), [
    { name: 'C', bytes: 1, percentage: 33.4 },
    { name: 'Java', bytes: 1, percentage: 33.3 },
    { name: 'Other', bytes: 1, percentage: 33.3 },
  ]);
  assert.deepEqual(distribution(ordered, 2, false).map(row => row.percentage), [50, 50]);
  assert.deepEqual(distribution([], 7, true), []);
});

test('summary and languages share one refresh and count all commit pages across repositories', async t => {
  const calls = upstream(t, {
    pages: [[repo('Alpha')], [repo('Beta'), repo('Ignored')]],
    languages: { Alpha: { C: 80, Rust: 20 }, Beta: { TypeScript: 50, C: 20 } },
    commits: { Alpha: 247, Beta: 3 },
  });
  const service = new GithubService();
  const [stats, languages, repeated] = await Promise.all([service.stats(), service.languages(), service.stats()]);
  assert.deepEqual(stats, { publicRepositories: 2, contributions: 250, mainLanguages: ['C', 'TypeScript'] });
  assert.deepEqual(repeated, stats);
  assert.deepEqual(languages.repositories, ['Alpha', 'Beta']);
  assert.equal(languages.totalBytes, 170);
  assert.deepEqual(languages.languages, [
    { name: 'C', bytes: 100, percentage: 58.8 },
    { name: 'TypeScript', bytes: 50, percentage: 29.4 },
    { name: 'Other', bytes: 20, percentage: 11.8 },
  ]);
  assert.ok(Number.isFinite(Date.parse(languages.updatedAt)));
  assert.equal(calls.length, 7);
  assert.ok(calls.every(call => call.url.origin === 'https://api.github.com'));
  for (const { url, init } of calls.filter(call => call.url.pathname.endsWith('/commits'))) {
    assert.equal(url.searchParams.get('author'), owner);
    assert.equal(url.searchParams.get('sha'), 'main');
    assert.equal(url.searchParams.get('per_page'), '1');
    assert.equal(Date.parse(url.searchParams.get('until')) - Date.parse(url.searchParams.get('since')), 365 * 86400000);
    assert.equal(init.headers['X-GitHub-Api-Version'], '2022-11-28');
    assert.equal(init.redirect, 'error');
  }
  await service.stats();
  assert.equal(calls.length, 7, 'successful results are cached');
});

test('no matching commits and empty language maps are legitimate zero values', async t => {
  upstream(t, { languages: { Alpha: {}, Beta: {} }, commits: { Alpha: 0, Beta: 0 } });
  const service = new GithubService();
  assert.deepEqual(await service.stats(), { publicRepositories: 2, contributions: 0, mainLanguages: [] });
  assert.equal((await service.languages()).totalBytes, 0);
});

test('empty repositories return zero commits; a single commit needs no pagination header', async t => {
  upstream(t, { commitResponse: url => url.pathname.includes('/Alpha/')
    ? new Response(JSON.stringify({ message: 'Git Repository is empty.' }), { status: 409 })
    : json([{ sha: 'one' }]) });
  assert.equal((await new GithubService().stats()).contributions, 1);
});

test('GitHub may return last page 1 with a next-page link for a single matching commit', async t => {
  upstream(t, { commitResponse: () => json([{ sha: 'one' }], {
    link: '<https://api.github.com/repositories/123/commits?per_page=1&page=2>; rel="next", ' +
      '<https://api.github.com/repositories/123/commits?per_page=1&page=1>; rel="last"',
  }) });
  assert.equal((await new GithubService().stats()).contributions, 2);
});

test('a refresh rereads the canonical selection after the six-hour cache expires', async t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const config = selection();
  const calls = upstream(t, { config });
  const service = new GithubService();
  assert.equal((await service.stats()).publicRepositories, 2);
  config.include = ['Alpha'];
  now += 6 * 60 * 60 * 1000 + 1;
  assert.equal((await service.stats()).publicRepositories, 1);
  assert.equal(calls.filter(call => call.url.pathname.endsWith('languages.json')).length, 2);
});

test('upstream failures return safe 503s, cool down retries, and never cache partial success', async t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const options = { failure: () => new Response('secret upstream body', { status: 429 }) };
  const calls = upstream(t, options);
  const service = new GithubService();
  for (let i = 0; i < 2; i++) {
    await assert.rejects(service.stats(), error => {
      assert.equal(error.getStatus(), 503);
      assert.equal(error.message, 'GitHub statistics are temporarily unavailable');
      return true;
    });
  }
  assert.equal(calls.length, 1, 'cooldown prevents repeated upstream calls');
  options.failure = undefined;
  now += 60_001;
  assert.equal((await service.stats()).publicRepositories, 2);
});

test('expired results are not returned as LIVE when GitHub fails', async t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const options = {};
  upstream(t, options);
  const service = new GithubService();
  await service.stats();
  now += 6 * 60 * 60 * 1000 + 1;
  options.failure = () => new Response('', { status: 403 });
  await assert.rejects(service.stats(), error => error.getStatus() === 503);
});

test('malformed data, missing selections, invalid pagination and timeouts fail the whole result', async t => {
  for (const options of [
    { repos: [repo('Alpha')] },
    { repos: [repo('Alpha', { private: true }), repo('Beta')] },
    { languages: { Alpha: { C: -1 } } },
    { languages: { Alpha: { C: 1.5 } } },
    { languages: { Alpha: [] } },
    { commitResponse: () => json({ message: 'not commits' }) },
    { commitResponse: () => json([{ sha: 'one' }], { link: '<https://api.github.com/commits?page=NaN>; rel="last"' }) },
    { commitResponse: () => json([{ sha: 'one' }], { link: '<https://api.github.com/commits?page=2>; rel="next"' }) },
    { failure: () => { throw new DOMException('Timeout', 'TimeoutError'); } },
    { failure: () => new Response('invalid JSON') },
  ]) {
    await t.test(JSON.stringify(options), async subtest => {
      upstream(subtest, options);
      await assert.rejects(new GithubService().stats(), error => error.getStatus() === 503);
    });
  }
});

test('the refresh deadline aborts upstream requests', async t => {
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')));
  const calls = upstream(t);
  await assert.rejects(new GithubService().stats(), error => error.getStatus() === 503);
  assert.equal(calls.length, 0);
});

test('token is passed only in the upstream Authorization header', async t => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token';
  t.after(() => {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  });
  const calls = upstream(t);
  const result = await new GithubService().stats();
  assert.ok(calls.every(call => call.init.headers.Authorization === 'Bearer test-token'));
  assert.ok(calls.every(call => !call.url.href.includes('test-token')));
  assert.ok(!JSON.stringify(result).includes('test-token'));
});

test('NestJS exposes both HTTP contracts and returns 503 on upstream failure', async t => {
  const request = globalThis.fetch;
  const options = {};
  upstream(t, options);
  const app = await NestFactory.create(GithubModule, { logger: false });
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const response = await request(`${base}/stats/github`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { publicRepositories: 2, contributions: 8, mainLanguages: ['TypeScript', 'C'] });
  const languages = await request(`${base}/stats/github/languages`);
  assert.equal(languages.status, 200);
  assert.equal((await languages.json()).totalBytes, 100);
  let now = Date.now() + 6 * 60 * 60 * 1000 + 1;
  t.mock.method(Date, 'now', () => now);
  options.failure = () => new Response('', { status: 401 });
  const unavailable = await request(`${base}/stats/github`);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).message, 'GitHub statistics are temporarily unavailable');
});
