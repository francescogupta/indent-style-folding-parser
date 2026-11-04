const DEFAULT_INDENT_WIDTH = 2;

/**
 * Parse indentation-structured text into a nested tree of nodes.
 *
 * The parser treats each non-empty line as a node. The number of leading
 * whitespace characters determines the node's depth relative to the previous
 * node. A line whose indentation is greater than the previous node's becomes
 * a child of that node. A line with equal indentation becomes a sibling. A
 * line with lesser indentation closes one or more ancestors and becomes a
 * sibling of the nearest ancestor with matching indentation.
 *
 * Blank lines are ignored, except that a completely blank input yields an
 * empty array.
 *
 * Tabs are expanded to spaces using the provided `tabWidth` so that mixed
 * indentation does not silently produce wrong nesting. The trade-off is that
 * tab characters inside a line's text are also expanded; this keeps the
 * indentation arithmetic simple and predictable.
 *
 * @param {string} text - The input text.
 * @param {{ tabWidth?: number }} [options] - Options.
 * @returns {Array<{ text: string, depth: number, children: Array }>} The root-level nodes.
 */
export function parseIndentTree(text, options = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  const tabWidth = options.tabWidth === undefined ? DEFAULT_INDENT_WIDTH : options.tabWidth;
  if (!Number.isInteger(tabWidth) || tabWidth < 1) {
    throw new RangeError('tabWidth must be a positive integer');
  }

  const lines = text.split(/\r\n|\r|\n/);
  const roots = [];
  // Stack of nodes along the current path; stack[stack.length - 1] is the
  // most recently created node that can still accept children.
  const stack = [];
  let prevIndent = 0;

  for (const rawLine of lines) {
    const expanded = rawLine.replace(/\t/g, ' '.repeat(tabWidth));
    const match = expanded.match(/^[ \t]*/);
    const indent = match[0].length;
    const content = expanded.slice(indent);

    if (content.length === 0) {
      // Blank lines do not change the current indentation context.
      continue;
    }

    // Pop ancestors that are deeper than the current line.
    while (stack.length > 0 && stack[stack.length - 1].depth >= indent) {
      stack.pop();
    }

    const node = { text: content, depth: indent, children: [] };

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
    prevIndent = indent;
  }

  // `prevIndent` is retained for clarity of intent even though the stack
  // already encodes the current path; it documents the invariant that the
  // stack top always has depth equal to the last non-blank line's indentation.
  void prevIndent;

  return roots;
}

/**
 * Serialize a tree produced by `parseIndentTree` back into indented text.
 *
 * The output uses spaces only, with `indentWidth` spaces per depth level.
 * This is intentionally not a perfect round-trip for inputs that used tabs;
 * the parser normalizes tabs to spaces, so the serializer writes spaces.
 *
 * @param {Array<{ text: string, children: Array }>} nodes - Tree nodes.
 * @param {{ indentWidth?: number }} [options] - Options.
 * @returns {string} The serialized text.
 */
export function nodesToText(nodes, options = {}) {
  const indentWidth = options.indentWidth === undefined ? DEFAULT_INDENT_WIDTH : options.indentWidth;
  if (!Number.isInteger(indentWidth) || indentWidth < 1) {
    throw new RangeError('indentWidth must be a positive integer');
  }
  if (!Array.isArray(nodes)) {
    throw new TypeError('nodes must be an array');
  }

  const out = [];
  function walk(list, level) {
    for (const node of list) {
      if (node === null || typeof node !== 'object' || typeof node.text !== 'string') {
        throw new TypeError('each node must have a string text property');
      }
      out.push(' '.repeat(level * indentWidth) + node.text);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, level + 1);
      }
    }
  }
  walk(nodes, 0);
  return out.join('\n');
}

/**
 * Count the total number of nodes in a tree, including all descendants.
 *
 * @param {Array<{ children?: Array }>} nodes - Tree nodes.
 * @returns {number} Total node count.
 */
export function countNodes(nodes) {
  if (!Array.isArray(nodes)) {
    throw new TypeError('nodes must be an array');
  }
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node && Array.isArray(node.children) && node.children.length > 0) {
      total += countNodes(node.children);
    }
  }
  return total;
}
