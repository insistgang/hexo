const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parse } = require('hexo-front-matter');

const postsDir = path.join(__dirname, '..', 'source', '_posts');

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) return markdownFiles(filePath);
    return entry.isFile() && filePath.endsWith('.md') ? [filePath] : [];
  });
}

test('every post has a parseable date and a legal published value', () => {
  const issues = [];
  const files = markdownFiles(postsDir);

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);

    if (!match) {
      issues.push(`${path.relative(postsDir, filePath)}: missing front matter`);
      continue;
    }

    try {
      const metadata = parse(source);
      const { date, published } = metadata;
      if (!(date instanceof Date || typeof date === 'string') || !date || Number.isNaN(new Date(date).getTime())) {
        issues.push(`${path.relative(postsDir, filePath)}: date must be present and parseable`);
      }
      if (Object.hasOwn(metadata, 'published') && typeof published !== 'boolean') {
        issues.push(`${path.relative(postsDir, filePath)}: published must be a boolean when present`);
      }
    } catch (error) {
      issues.push(`${path.relative(postsDir, filePath)}: invalid front matter (${error.name})`);
    }
  }

  assert.ok(files.length > 0, 'Expected Markdown posts under source/_posts');
  assert.deepEqual(issues, [], issues.join('\n'));
});
