const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const diaryDir = path.join(__dirname, '..', 'source', '_posts', '日记');

test('keeps every post in the diary directory unpublished', () => {
  const publicDiaries = fs
    .readdirSync(diaryDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .filter((file) => {
      const source = fs
        .readFileSync(path.join(diaryDir, file), 'utf8')
        .replace(/\r\n/g, '\n');
      const frontMatter = source.match(/^---\n([\s\S]*?)\n---/);

      return !frontMatter || !/^published:\s*false\s*$/m.test(frontMatter[1]);
    });

  assert.deepEqual(
    publicDiaries,
    [],
    `Diary posts must include "published: false": ${publicDiaries.join(', ')}`,
  );
});
