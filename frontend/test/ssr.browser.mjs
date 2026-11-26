import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.BASE_URL || 'https://localhost:9042').replace(/\/$/, '');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] } : {}),
});
try {
  // deploy/smoke.py independently verifies the self-signed TLS certificate.
  const noScript = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  for (const [path, expected] of [['/fr/parcours', 'Ingénieur d’études et développement'], ['/en/journey', 'Software Development Engineer']]) {
    const page = await noScript.newPage();
    assert.equal((await page.goto(base + path)).status(), 200);
    assert.ok((await page.locator('main').innerText()).includes(expected));
    await page.close();
  }
  const home = await noScript.newPage();
  await home.goto(base + '/en');
  assert.ok(await home.locator('app-project-collection .project-card').count() > 0, 'Deferred projects must render without JavaScript');
  await noScript.close();
  for (const locale of ['fr', 'en']) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const errors = [], apiRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /NG0\d+|hydration/i.test(message.text())) errors.push(message.text());
    });
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });
    await page.route('**/api/stats/github', route => route.fulfill({
      json: { publicRepositories: 14, contributions: 42, mainLanguages: ['TypeScript'] },
    }));
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const heading = document.querySelector('main h1');
        if (heading) { window.__ssrHeading = heading; observer.disconnect(); }
      });
      observer.observe(document, { subtree: true, childList: true });
    });
    await page.goto(base + (locale === 'en' ? '/en/journey' : '/fr/parcours'));
    await page.waitForFunction(() => {
      const root = document.querySelector('app-root');
      return root && !root.hasAttribute('ngh') && window.__ssrHeading;
    });
    assert.equal(await page.evaluate(() => document.documentElement.lang), locale);
    assert.equal(await page.evaluate(() => window.__ssrHeading === document.querySelector('main h1')), true, 'Hydration must reuse the DOM');
    assert.deepEqual(apiRequests, [], 'Hydration must reuse transferred journey data');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true');
    await page.setViewportSize({ width: 1280, height: 900 });
    const projectsPath = locale === 'en' ? '/en/projects' : '/fr/projets';
    await page.locator(`.main-navigation a[href="${projectsPath}"]`).click();
    await page.waitForURL(base + projectsPath);
    await page.locator('app-project-collection .project-card').first().waitFor();
    await page.getByRole('button', { name: /^Dev ?Ops$/ }).click();
    await page.waitForFunction(() =>
      document.querySelector('.filter-button.selected')?.textContent?.replace(/\s/g, '') === 'DevOps' &&
      document.querySelector('app-project-collection .collection-content')?.getAttribute('aria-busy') === 'false');
    assert.ok(await page.locator('.project-card').count() > 0);
    assert.deepEqual(errors, [], `${locale}: hydration/navigation errors`);
    await context.close();
  }
  console.log('SSR browser checks passed: no-JS content, DOM reuse, transfer cache, both locales, navigation, menus, filters.');
} finally { await browser.close(); }
