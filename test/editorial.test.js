const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parse } = require('hexo-front-matter');
const { topics } = require('../source/_data/editorial.json');
const pug = require('pug');

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

test('every public article has a useful description and an existing reading topic', () => {
  const problems = [];
  for (const file of files(path.join(__dirname, '../source/_posts'))) {
    if (!file.endsWith('.md')) continue;
    const post = parse(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    if (post.published === false) continue;
    if (typeof post.description !== 'string' || post.description.trim().length < 25 || post.description.length > 180) {
      problems.push(`${path.basename(file)}: description must be 25–180 characters`);
    }
    if (!topics.some(topic => topic.key === post.topic)) {
      problems.push(`${path.basename(file)}: missing or unknown reading topic`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the reading page lists public articles and excludes unpublished records', () => {
  const posts = [
    { title: '公开笔记', description: '公开摘要', topic: topics[0].key, path: 'posts/public-note.html', date: new Date('2026-01-01'), published: true },
    { title: '不公开的日记', topic: topics[0].key, path: 'posts/private-note.html', date: new Date('2026-01-02'), published: false },
    { title: '数据库中的不公开记录', topic: topics[0].key, path: 'posts/private-numeric.html', date: new Date('2026-01-03'), published: 0 },
  ];
  const html = pug.renderFile(path.join(__dirname, '../themes/butterfly/layout/includes/page/reading.pug'), {
    page: { content: '' },
    site: { data: { editorial: { topics } }, posts: { toArray: () => posts } },
    url_for: value => `/${value}`,
  });
  assert.match(html, /posts\/public-note\.html/);
  assert.doesNotMatch(html, /private-note|private-numeric/);
});
