const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const diaryDir = path.join(__dirname, '..', 'source', '_posts', '日记');
const dailyDiaryPattern = /^\d{4}-\d{2}-\d{2}\.md$/;

test('keeps every dated diary unpublished', () => {
  const publicDiaries = fs
    .readdirSync(diaryDir)
    .filter((file) => dailyDiaryPattern.test(file))
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
    `Dated diaries must include "published: false": ${publicDiaries.join(', ')}`,
  );
});
