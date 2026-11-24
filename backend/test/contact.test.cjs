const assert = require('node:assert/strict');
const { test } = require('node:test');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ContactModule } = require('../dist/contact/contact.module');
const { contactMessage } = require('../dist/contact/contact.service');

const message = { name: 'Camille Dupont', email: 'camille+work@example.com', subject: 'Un projet', message: 'Bonjour !' };

test('contact validation trims fields and rejects invalid types, blanks, emails, extra fields and excessive lengths', () => {
  assert.deepEqual(contactMessage({ ...message, name: ' Camille Dupont ', message: ' Bonjour !\n ' }), message);
  assert.equal(contactMessage({ ...message, message: 'Line 1\nLine 2' }).message, 'Line 1\nLine 2');
  for (const value of [
    null, [], 'message', {}, { ...message, name: 123 }, { ...message, subject: '   ' },
    { ...message, email: 'camille@example' }, { ...message, email: 'one@@example.com' },
    { ...message, to: 'another@example.com' }, { ...message, name: 'one\nTwo' },
    { ...message, message: 'text\u0000' }, { ...message, name: 'x'.repeat(121) },
    { ...message, email: 'x'.repeat(250) + '@example.com' },
    { ...message, subject: 'x'.repeat(201) }, { ...message, message: 'x'.repeat(10_001) },
  ]) assert.throws(() => contactMessage(value), error => error.getStatus() === 400);
});

test('contact HTTP delivery acknowledges only accepted messages', async t => {
  const request = globalThis.fetch;
  const previous = { url: process.env.CONTACT_WEBHOOK_URL, token: process.env.CONTACT_WEBHOOK_TOKEN };
  delete process.env.CONTACT_WEBHOOK_URL;
  delete process.env.CONTACT_WEBHOOK_TOKEN;
  const app = await NestFactory.create(ContactModule, { logger: false });
  t.after(async () => {
    await app.close();
    for (const [key, value] of [['CONTACT_WEBHOOK_URL', previous.url], ['CONTACT_WEBHOOK_TOKEN', previous.token]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const submit = (body = message, type = 'application/json') => request(`${base}/contact-form`, {
    method: 'POST', headers: { 'Content-Type': type }, body: JSON.stringify(body),
  });

  await t.test('missing configuration returns 503, invalid data returns 400, unsupported media returns 415', async () => {
    const unconfigured = await submit();
    assert.equal(unconfigured.status, 503);
    assert.equal((await unconfigured.json()).message, 'Contact delivery is not configured');
    assert.equal((await submit({ ...message, email: 'wrong' })).status, 400);
    assert.equal((await submit(message, 'text/plain')).status, 415);
    const malformed = await request(`${base}/contact-form`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid json',
    });
    assert.equal(malformed.status, 400);
  });

  await t.test('a successful webhook receives trimmed JSON and server-only credentials, then the client gets 204', async subtest => {
    process.env.CONTACT_WEBHOOK_URL = 'https://contact.example.test/inbox';
    process.env.CONTACT_WEBHOOK_TOKEN = 'private-test-token';
    const calls = [];
    subtest.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    });
    const response = await submit({ ...message, name: ' Camille Dupont ', message: ' Bonjour ! ' });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), '');
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].url), 'https://contact.example.test/inbox');
    assert.deepEqual(JSON.parse(calls[0].init.body), message);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer private-test-token');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.redirect, 'error');
    assert.ok(calls[0].init.signal instanceof AbortSignal);
    assert.ok(!calls[0].init.body.includes('private-test-token'));
  });

  for (const status of [401, 429, 500]) {
    await t.test(`webhook HTTP ${status} returns a safe 503 and is not automatically retried`, async subtest => {
      let calls = 0;
      subtest.mock.method(globalThis, 'fetch', async () => {
        calls++;
        return new Response('secret destination response', { status });
      });
      const response = await submit();
      assert.equal(response.status, 503);
      assert.equal((await response.json()).message, 'Contact delivery is temporarily unavailable');
      assert.equal(calls, 1);
    });
  }

  await t.test('transport errors and deadlines return 503', async subtest => {
    subtest.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timeout', 'TimeoutError'); });
    assert.equal((await submit()).status, 503);
  });

  await t.test('invalid destination configuration is rejected before sending', async subtest => {
    let calls = 0;
    subtest.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 204 }); });
    for (const destination of ['invalid URL', 'http://remote.example.test/inbox', 'https://user:password@example.test/inbox', 'ftp://example.test/file']) {
      process.env.CONTACT_WEBHOOK_URL = destination;
      assert.equal((await submit()).status, 503);
    }
    assert.equal(calls, 0);
  });

  await t.test('HTTP is allowed for a local development receiver and authentication is optional', async subtest => {
    process.env.CONTACT_WEBHOOK_URL = 'http://127.0.0.1:9999/inbox';
    delete process.env.CONTACT_WEBHOOK_TOKEN;
    subtest.mock.method(globalThis, 'fetch', async (_, init) => {
      assert.equal(init.headers.Authorization, undefined);
      return new Response('{}', { status: 200 });
    });
    assert.equal((await submit()).status, 204);
  });
});
