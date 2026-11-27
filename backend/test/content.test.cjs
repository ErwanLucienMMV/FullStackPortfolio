const assert = require('node:assert/strict');
const { test } = require('node:test');
const { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { contentLocale } = require('../dist/content/content.validation');
const proxy = require('../../frontend/proxy.conf.cjs');

test('locale normalization accepts supported regional variants and rejects invalid inputs', () => {
  assert.equal(contentLocale(undefined), 'fr');
  assert.equal(contentLocale('FR-fr'), 'fr');
  assert.equal(contentLocale('en-GB'), 'en');
  for (const value of ['', 'de', ['fr', 'en'], '../fr', null, {}, 'en-']) {
    assert.throws(() => contentLocale(value), error => error.getStatus() === 400);
  }
});

test('portfolio routes serve localized editable content and real document files', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-content-'));
  const content = join(directory, 'content');
  const documents = join(directory, 'documents');
  const previous = { content: process.env.PORTFOLIO_CONTENT_DIR, documents: process.env.PORTFOLIO_DOCUMENTS_DIR };
  await cp(join(__dirname, '../dist/content/data'), content, { recursive: true });
  process.env.PORTFOLIO_CONTENT_DIR = content;
  process.env.PORTFOLIO_DOCUMENTS_DIR = documents;
  const app = await NestFactory.create(AppModule, { logger: false });
  t.after(async () => {
    await app.close();
    for (const [key, value] of [['PORTFOLIO_CONTENT_DIR', previous.content], ['PORTFOLIO_DOCUMENTS_DIR', previous.documents]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const request = path => fetch(`${base}${path}`);
  const rewrites = Object.entries(proxy['/api/**'].pathRewrite);
  const browser = path => request(rewrites.reduce((url, [pattern, value]) => url.replace(new RegExp(pattern), value), path));

  await t.test('health endpoint remains available', async () => {
    assert.deepEqual(await (await request('/')).json(), { status: 'ok' });
  });

  await t.test('the portfolio case study links to the packaged SVG through the API in both locales', async () => {
    const expected = await readFile(join(__dirname, '../../docs/uml/production-deployment-overview.svg'), 'utf8');
    for (const locale of ['fr', 'en']) {
      const projects = await (await browser(`/api/projets?locale=${locale}`)).json();
      const project = projects.find(project => project.id === 'full-stack-portfolio');
      assert.equal(project.caseStudy.diagramUrl, '/api/diagrams/full-stack-portfolio.svg');
      const diagram = await browser(project.caseStudy.diagramUrl);
      assert.equal(diagram.status, 200);
      assert.equal(diagram.headers.get('content-type'), 'image/svg+xml');
      assert.equal(diagram.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(diagram.headers.get('content-disposition'), 'inline; filename="full-stack-portfolio.svg"');
      assert.equal(await diagram.text(), expected);
    }
    assert.equal((await browser('/api/diagrams/unknown.svg')).status, 404);
  });

  for (const locale of ['fr', 'en']) {
    await t.test(`all projects and all seven category endpoints in ${locale}`, async () => {
      const all = await request(`/projets?locale=${locale}`);
      assert.equal(all.status, 200);
      const projects = await all.json();
      const repositories = ['AtlasDominion', 'ft_irc', 'ft_transcendance', 'Inception', 'my_philosopher',
        'mypushswap', 'minirt', 'ft_minishell', 'DrQuinn', 'Piscine-Django-42', 'FullStackPortfolio',
        '42matcha', '42Learn2Slither', '42camagru'];
      assert.equal(projects.length, 14);
      assert.equal(new Set(projects.map(project => project.id)).size, 14);
      assert.deepEqual(projects.map(project => project.repositoryUrl), repositories.map(name => `https://github.com/ErwanLucienMMV/${name}`));
      assert.match(projects.find(project => project.id === 'ft-transcendance').description, locale === 'fr' ? /Plateforme/ : /chess platform/);
      const expected = {
        fullstack: ['ft-transcendance', 'piscine-django-42', 'full-stack-portfolio', '42matcha', '42camagru'],
        'relative-low-level': ['ft-irc', 'my-philosopher', 'mypushswap', 'ft-minishell'],
        'low-level': ['minirt', 'dr-quinn'],
        backend: ['atlas-dominion', 'ft-irc', 'ft-transcendance', 'piscine-django-42', 'full-stack-portfolio', '42matcha', '42camagru'],
        frontend: ['ft-transcendance', 'piscine-django-42', 'full-stack-portfolio', '42matcha', '42camagru'],
        devops: ['atlas-dominion', 'ft-transcendance', 'inception', 'full-stack-portfolio', '42matcha', '42camagru'],
        ai: ['42learn2slither'],
      };
      for (const [category, ids] of Object.entries(expected)) {
        const response = await browser(`/api/projets/${category}?locale=${locale}`);
        assert.equal(response.status, 200);
        assert.deepEqual((await response.json()).map(project => project.id), ids);
      }
      assert.equal((await (await browser(`/api/projets?locale=${locale}`)).json()).length, 14);
      const fallback = JSON.parse(await readFile(join(__dirname, `../../frontend/public/data/projects.${locale}.json`), 'utf8'));
      assert.deepEqual(projects, fallback, 'frontend fallback contains the same catalog as the API');
      assert.ok(projects.find(project => project.id === '42matcha').technologies.includes('Spark Java'));
      assert.match(projects.find(project => project.id === '42learn2slither').description, locale === 'fr' ? /agent reste à implémenter/ : /agent is still to be implemented/);
      assert.match(projects.find(project => project.id === '42camagru').description, locale === 'fr' ? /application à réaliser/ : /application is still to be built/);
    });

    await t.test(`journey and skills expose their full frontend contracts in ${locale}`, async () => {
      const journey = await browser(`/api/parcours?locale=${locale}`);
      assert.equal(journey.status, 200);
      const entries = await journey.json();
      assert.deepEqual(entries.map(row => row.id), ['hn-services', 'school-42', 'ft-transcendance', 'next-step']);
      assert.ok(entries[0].section.highlights[0].technologies.includes('NestJS'));
      assert.match(entries[0].description, locale === 'fr' ? /Ingénieur/ : /Engineer/);
      const skills = await browser(`/api/skills?locale=${locale}`);
      assert.equal(skills.status, 200);
      const values = await skills.json();
      assert.equal(values.length, 7);
      assert.equal(values[0].rating, null);
      assert.deepEqual(values[0].certifications, []);
      assert.deepEqual(values[0].contexts, []);
    });
  }

  await t.test('locale defaults to French, regional English works, unknown routes/locales are explicit', async () => {
    assert.match((await (await request('/projets')).json())[0].description, /Pilotage/);
    assert.match((await (await request('/projets?locale=EN-gb')).json())[0].description, /Manage Docker/);
    assert.equal((await request('/projets/not-a-category')).status, 404);
    for (const endpoint of ['projets', 'parcours', 'skills', 'documents']) {
      for (const query of ['locale=es', 'locale=', 'locale=fr&locale=en', 'locale=..%2Ffr']) {
        assert.equal((await request(`/${endpoint}?${query}`)).status, 400);
      }
    }
  });

  await t.test('all three content lists can intentionally be empty and edits are read on subsequent requests', async () => {
    for (const [resource, endpoint] of [['projects', 'projets'], ['journey', 'parcours'], ['skills', 'skills']]) {
      const filename = join(content, `${resource}.fr.json`);
      const original = await readFile(filename, 'utf8');
      try {
        await writeFile(filename, '[]');
        const response = await request(`/${endpoint}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), []);
      } finally { await writeFile(filename, original); }
    }
  });

  await t.test('invalid JSON, invalid nested fields, missing content, and duplicate IDs return safe 503 errors', async () => {
    const filename = join(content, 'projects.fr.json');
    const original = await readFile(filename, 'utf8');
    const rows = JSON.parse(original);
    const invalidImage = structuredClone(rows);
    invalidImage[0].image = { url: 'javascript:alert(1)', alt: 'test', width: 10, height: 10 };
    const invalidStudy = structuredClone(rows);
    invalidStudy.find(project => project.id === 'ft-transcendance').caseStudy.architecture = 'not an array';
    const invalidType = structuredClone(rows);
    invalidType[0].type = ['school'];
    const invalidRepository = structuredClone(rows);
    invalidRepository[0].repositoryUrl = 'javascript:alert(1)';
    try {
      for (const data of ['invalid JSON', JSON.stringify([rows[0], rows[0]]), JSON.stringify(invalidImage), JSON.stringify(invalidStudy), JSON.stringify(invalidType), JSON.stringify(invalidRepository)]) {
        await writeFile(filename, data);
        const response = await request('/projets');
        assert.equal(response.status, 503);
        assert.equal((await response.json()).message, 'Portfolio content is temporarily unavailable');
      }
      await rm(filename);
      assert.equal((await request('/projets')).status, 503);
    } finally { await writeFile(filename, original); }
  });

  await t.test('skill ratings distinguish zero and null, reject values outside 0–10', async () => {
    const filename = join(content, 'skills.fr.json');
    const original = await readFile(filename, 'utf8');
    try {
      const skills = JSON.parse(original);
      skills[0].rating = 0;
      await writeFile(filename, JSON.stringify(skills));
      assert.equal((await (await request('/skills')).json())[0].rating, 0);
      skills[0].rating = 11;
      await writeFile(filename, JSON.stringify(skills));
      assert.equal((await request('/skills')).status, 503);
    } finally { await writeFile(filename, original); }
  });

  await t.test('absent documents return null; names, locales and extensions are restricted', async () => {
    const response = await browser('/api/documents?locale=en');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { resumePdf: null, resumeDocx: null, portfolioPdf: null });
    assert.equal((await request('/documents/files/fr/resume.pdf')).status, 404);
    assert.equal((await request('/documents/files/fr/secrets.json')).status, 404);
    assert.equal((await request('/documents/files/fr/%2e%2e%2fmain.ts')).status, 404);
    assert.equal((await request('/documents/files/de/resume.pdf')).status, 400);
  });

  await t.test('documents are discovered and streamed through the browser proxy with correct MIME and filenames', async () => {
    await mkdir(join(documents, 'fr'), { recursive: true });
    const files = [
      ['resume.pdf', 'resumePdf', 'application/pdf', 'inline'],
      ['resume.docx', 'resumeDocx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'attachment'],
      ['portfolio.pdf', 'portfolioPdf', 'application/pdf', 'inline'],
    ];
    for (const [name] of files) await writeFile(join(documents, 'fr', name), `test content for ${name}`);
    const metadata = await (await browser('/api/documents?locale=fr')).json();
    for (const [name, key, type, disposition] of files) {
      assert.equal(metadata[key].url, `/api/documents/files/fr/${name}`);
      const download = await browser(metadata[key].url);
      assert.equal(download.status, 200);
      assert.equal(download.headers.get('content-type'), type);
      assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(download.headers.get('content-disposition'), `${disposition}; filename="${metadata[key].filename}"`);
      assert.equal(await download.text(), `test content for ${name}`);
    }
    assert.deepEqual(await (await request('/documents?locale=en')).json(), { resumePdf: null, resumeDocx: null, portfolioPdf: null });
    await rm(join(documents, 'fr/resume.pdf'));
    assert.equal((await request('/documents/files/fr/resume.pdf')).status, 404);
    assert.equal((await (await request('/documents')).json()).resumePdf, null);
  });

  await t.test('empty files and symlinks do not become public document downloads', async () => {
    await writeFile(join(documents, 'fr/resume.pdf'), '');
    assert.equal((await (await request('/documents')).json()).resumePdf, null);
    await rm(join(documents, 'fr/resume.pdf'));
    await writeFile(join(directory, 'private.pdf'), 'not public');
    await symlink(join(directory, 'private.pdf'), join(documents, 'fr/resume.pdf'));
    assert.equal((await (await request('/documents')).json()).resumePdf, null);
    assert.equal((await request('/documents/files/fr/resume.pdf')).status, 404);
  });
});
