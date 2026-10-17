import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownAnswer } from './MarkdownAnswer.ts';

test('advisor markdown renders emphasis, headings, paragraphs, line breaks, lists and tables', () => {
  const html = renderToStaticMarkup(createElement(MarkdownAnswer, { content: '**\u20B94,200** spent\nContinued line\n\n### Summary\n\n1. First action\n2. Second action\n\n- Recorded fact\n- Estimate\n\n| Category | Amount |\n| --- | ---: |\n| Groceries | \u20B94,200 |' }));
  assert.match(html, /<strong>\u20B94,200<\/strong>/);
  assert.match(html, /<h3>Summary<\/h3>/);
  assert.match(html, /<ol><li>First action<\/li><li>Second action<\/li><\/ol>/);
  assert.match(html, /<ul><li>Recorded fact<\/li><li>Estimate<\/li><\/ul>/);
  assert.match(html, /<br\/>/);
  assert.match(html, /<table>/);
  assert.match(html, /<td>Groceries<\/td>/);
});

test('advisor markdown escapes raw HTML and permits only safe markdown links', () => {
  const html = renderToStaticMarkup(createElement(MarkdownAnswer, { content: '<script>alert(1)</script> [safe](https://example.com) [unsafe](javascript:alert(1))' }));
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.equal(html.includes('href="javascript:'), false);
});
