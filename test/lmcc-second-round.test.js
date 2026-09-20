const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'source', 'lmcc', 'second-round', 'index.html');

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
