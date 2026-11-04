# indent-style-folding-parser

Parses indentation-structured text into a nested tree of nodes, treating leading whitespace as hierarchy.

```js
import { parseIndentTree, nodesToText, countNodes } from './src/index.js';

const tree = parseIndentTree(`root
  child
    grandchild
  sibling`);

tree[0].text;                       // 'root'
tree[0].children[0].text;           // 'child'
tree[0].children[0].children[0].text; // 'grandchild'
tree[0].children[1].text;           // 'sibling'

countNodes(tree);                   // 4
nodesToText(tree);                  // 'root\n  child\n    grandchild\n  sibling'
```

## Why this exists

Most indentation parsers either assume a fixed indentation unit or build an
intermediate token stream that callers must walk themselves. This library makes
the opposite trade-off: it reads the raw indentation width of each line and
uses that width directly as the node's depth. That means a file indented with
three spaces and a file indented with two spaces both parse correctly, and the
resulting nodes carry the exact column count so callers can reconstruct the
original layout. The cost is that the tree is sensitive to inconsistent
indentation: a line indented by one space under a sibling indented by two is a
child of the previous node, not a sibling, because one space is still greater
than zero.

## The awkward edge

Tabs are expanded to spaces before indentation is measured. The default tab
width is 2 and can be changed with `parseIndentTree(text, { tabWidth })`. This
means a tab character inside a line's text is also expanded; there is no way to
keep a literal tab in the node text. That is deliberate: mixing tab expansion
only for indentation and leaving interior tabs alone would make `nodesToText`
produce output that parses differently from the input, which is worse than the
minor text change.

## API

- `parseIndentTree(text, options?)` — returns an array of root nodes. Each node
  has `text` (string), `depth` (number of leading whitespace characters after
  tab expansion), and `children` (array). Throws `TypeError` for non-string
  input and `RangeError` for an invalid `tabWidth`.
- `nodesToText(nodes, options?)` — serializes a tree back to indented text
  using spaces. `indentWidth` defaults to 2. Throws `TypeError` for malformed
  nodes and `RangeError` for an invalid `indentWidth`.
- `countNodes(nodes)` — returns the total number of nodes, including all
  descendants. Throws `TypeError` for non-array input.
