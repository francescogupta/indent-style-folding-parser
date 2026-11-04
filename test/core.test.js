import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIndentTree, nodesToText, countNodes } from '../src/index.js';

test('parses a simple two-level tree', () => {
  const text = ['root', '  child', '  child2', '    grandchild'].join('\n');
  const tree = parseIndentTree(text);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].text, 'root');
  assert.equal(tree[0].depth, 0);
  assert.equal(tree[0].children.length, 2);
  assert.equal(tree[0].children[0].text, 'child');
  assert.equal(tree[0].children[0].depth, 2);
  assert.equal(tree[0].children[1].text, 'child2');
  assert.equal(tree[0].children[1].children.length, 1);
  assert.equal(tree[0].children[1].children[0].text, 'grandchild');
  assert.equal(tree[0].children[1].children[0].depth, 4);
});

test('treats equal indentation as siblings at the root', () => {
  const text = ['a', 'b', 'c'].join('\n');
  const tree = parseIndentTree(text);
  assert.deepEqual(
    tree.map((n) => n.text),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    tree.map((n) => n.depth),
    [0, 0, 0],
  );
});

test('reduces indentation back to an existing ancestor level', () => {
  const text = ['a', '  b', '    c', '  d', 'e'].join('\n');
  const tree = parseIndentTree(text);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].text, 'a');
  assert.equal(tree[0].children.length, 2);
  assert.equal(tree[0].children[0].text, 'b');
  assert.equal(tree[0].children[0].children[0].text, 'c');
  assert.equal(tree[0].children[1].text, 'd');
  assert.equal(tree[1].text, 'e');
});

test('ignores blank lines but preserves surrounding structure', () => {
  const text = ['a', '', '  b', '   ', '  c'].join('\n');
  const tree = parseIndentTree(text);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children.length, 2);
  assert.equal(tree[0].children[0].text, 'b');
  assert.equal(tree[0].children[1].text, 'c');
});

test('expands tabs according to tabWidth', () => {
  const text = ['root', '\tchild', '\t\tgrandchild'].join('\n');
  const tree = parseIndentTree(text, { tabWidth: 4 });
  assert.equal(tree[0].children[0].depth, 4);
  assert.equal(tree[0].children[0].children[0].depth, 8);
});

test('handles CRLF line endings', () => {
  const text = 'a\r\n  b\r\nc';
  const tree = parseIndentTree(text);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].text, 'a');
  assert.equal(tree[0].children[0].text, 'b');
  assert.equal(tree[1].text, 'c');
});

test('returns empty array for empty input', () => {
  assert.deepEqual(parseIndentTree(''), []);
  assert.deepEqual(parseIndentTree('   \n  \n'), []);
});

test('serializes back to indented text with spaces', () => {
  const text = ['root', '  child', '    grandchild', '  sibling'].join('\n');
  const tree = parseIndentTree(text);
  const out = nodesToText(tree);
  assert.equal(out, text);
});

test('nodesToText supports a custom indent width', () => {
  const tree = parseIndentTree(['a', '  b'].join('\n'));
  assert.equal(nodesToText(tree, { indentWidth: 4 }), 'a\n    b');
});

test('countNodes counts all descendants', () => {
  const tree = parseIndentTree(['a', '  b', '    c', '  d', 'e'].join('\n'));
  assert.equal(countNodes(tree), 5);
  assert.equal(countNodes([]), 0);
});

test('rejects invalid arguments', () => {
  assert.throws(() => parseIndentTree(42), TypeError);
  assert.throws(() => parseIndentTree('a', { tabWidth: 0 }), RangeError);
  assert.throws(() => parseIndentTree('a', { tabWidth: 1.5 }), RangeError);
  assert.throws(() => nodesToText('nope'), TypeError);
  assert.throws(() => nodesToText([], { indentWidth: -1 }), RangeError);
  assert.throws(() => nodesToText([{ text: 123 }]), TypeError);
  assert.throws(() => countNodes('nope'), TypeError);
});

test('preserves text that contains internal tabs', () => {
  const text = ['a', '  b\tc'].join('\n');
  const tree = parseIndentTree(text, { tabWidth: 2 });
  assert.equal(tree[0].children[0].text, 'b  c');
});
