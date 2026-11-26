import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
for (const locale of ['fr', 'en']) {
  for (const resource of ['projects', 'journey', 'skills']) {
    const filename = `${resource}.${locale}.json`;
    const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
    const api = await read(`backend/src/content/data/${filename}`);
    assert.ok(Array.isArray(api), `${filename} must be a list`);
    assert.deepEqual(await read(`frontend/public/data/${filename}`), api, `Frontend/API mismatch: ${filename}`);
    assert.equal(new Set(api.map(row => row.id)).size, api.length, `Duplicate IDs in ${filename}`);
    console.log(`Content and fallback match: ${filename}`);
  }
}
