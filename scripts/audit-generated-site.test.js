const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { auditSite } = require('./audit-generated-site');

function createSite() {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-site-audit-'));
  fs.mkdirSync(path.join(publicDir, 'img'), { recursive: true });
  fs.mkdirSync(path.join(publicDir, 'posts'), { recursive: true });
  return publicDir;
}

function writePng(file) {
  fs.writeFileSync(
    file,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
}

test('accepts existing image references and ignores onerror fallback code', (t) => {
  const publicDir = createSite();
  t.after(() => fs.rmSync(publicDir, { recursive: true, force: true }));

  writePng(path.join(publicDir, 'img', 'cover.png'));
  fs.writeFileSync(
    path.join(publicDir, 'index.html'),
    `<img src="/img/cover.png" onerror="this.src='/img/404.jpg'">`,
  );

  const result = auditSite(publicDir);

  assert.equal(result.htmlFiles, 1);
  assert.equal(result.uniqueLocalAssetRefs, 1);
  assert.deepEqual(result.missingAssets, []);
  assert.deepEqual(result.extensionMismatches, []);
  assert.deepEqual(result.actualFallbackRefs, []);
});

test('reports a missing image with the page that references it', (t) => {
  const publicDir = createSite();
  t.after(() => fs.rmSync(publicDir, { recursive: true, force: true }));

  fs.writeFileSync(
    path.join(publicDir, 'posts', 'missing.html'),
    `<img src="/img/missing.png">`,
  );

  const result = auditSite(publicDir);

  assert.deepEqual(result.missingAssets, [
    { asset: 'img/missing.png', pages: ['posts/missing.html'] },
  ]);
});

test('reports when an image extension does not match its file signature', (t) => {
  const publicDir = createSite();
  t.after(() => fs.rmSync(publicDir, { recursive: true, force: true }));

  fs.writeFileSync(
    path.join(publicDir, 'img', 'photo.png'),
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  );
  fs.writeFileSync(
    path.join(publicDir, 'index.html'),
    `<img src="/img/photo.png">`,
  );

  const result = auditSite(publicDir);

  assert.deepEqual(result.extensionMismatches, [
    { asset: 'img/photo.png', extension: 'png', actual: 'jpg' },
  ]);
});
