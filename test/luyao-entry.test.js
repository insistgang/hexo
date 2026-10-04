const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parse } = require('hexo-front-matter');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'source', 'luyao', 'index.html');

test('publishes a standalone Luyao entry without changing the browser domain', () => {
  const source = parse(fs.readFileSync(entry, 'utf8'));
  assert.equal(source.layout, false);
  assert.equal(source.sitemap, false);
  assert.match(source._content, /<title>路遥[^<]*<\/title>/);
  assert.match(source._content, /<iframe\b[^>]*src="https:\/\/dmp\.insistgang\.top\/luyao\/"/);
  assert.match(source._content, /allow="autoplay; clipboard-write"/);
  assert.match(source._content, /name="viewport"/);
  assert.doesNotMatch(source._content, /http-equiv="refresh"|window\.location|223\.6\.255\.45/);
});

test('uses the original Luyao PNG as its favicon and restricts the parent page', () => {
  const source = parse(fs.readFileSync(entry, 'utf8'));
  assert.match(source._content, /rel="icon"[^>]*href="\/img\/luyao-ai\/luyao-avatar\.png"/);
  assert.match(source._content, /frame-src https:\/\/dmp\.insistgang\.top/);
  assert.match(source._content, /referrerpolicy="no-referrer"/);
  const data = fs.readFileSync(path.join(root, 'source', 'img', 'luyao-ai', 'luyao-avatar.png'));
  assert.deepEqual(data.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
});
