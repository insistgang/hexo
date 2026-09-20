const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'source', 'lmcc', 'second-round', 'index.html');
const readerPath = path.join(root, 'source', 'lmcc', 'second-round', 'read', 'index.html');

test('LMCC 第二轮入口提供训练、模拟与速查，并默认折叠答案', () => {
  const page = fs.readFileSync(pagePath, 'utf8');

  for (const expected of [
    'LMCC-A 第二轮实战冲刺',
    'T1 · 严格 JSON',
    'T2 · 最小 RAG',
    '10 道真题强化训练',
    '3 套完整模拟卷',
    '考前终极速查',
    'data-answer-panel',
    'hidden',
    'materials/',
    'localStorage',
  ]) {
    assert.match(page, new RegExp(expected.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
});

test('LMCC 第二轮页面可回到首轮练习页', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /href="\.\.\/"/);
});

test('LMCC 第二轮 Markdown 链接会进入受限的阅读器，且不暴露原文件入口', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const reader = fs.readFileSync(readerPath, 'utf8');

  assert.match(page, /data-markdown-reader/);
  assert.match(page, /read\/\?file=/);
  assert.match(reader, /new URLSearchParams/);
  assert.match(reader, /\.\.\/materials\//);
  assert.match(reader, /includes\('\.\.'\)/);
  assert.doesNotMatch(reader, /查看原始 Markdown/);
  assert.doesNotMatch(reader, /original-file/);
});
