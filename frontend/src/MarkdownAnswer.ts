import { createElement, Fragment } from 'react';
import type { ReactNode } from 'react';

type InlinePart = string | { kind: 'strong' | 'em' | 'code' | 'link'; text: string; href?: string };

function inlineParts(source: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(source.slice(last, index));
    if (match[1] || match[2]) parts.push({ kind: 'strong', text: match[1] ?? match[2] });
    else if (match[3] || match[4]) parts.push({ kind: 'em', text: match[3] ?? match[4] });
    else if (match[5]) parts.push({ kind: 'code', text: match[5] });
    else parts.push({ kind: 'link', text: match[6], href: match[7] });
    last = index + match[0].length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts;
}

function renderInline(source: string, keyPrefix: string): ReactNode[] {
  return inlineParts(source).map((part, index) => {
    if (typeof part === 'string') return part;
    const key = `${keyPrefix}-${index}`;
    switch (part.kind) {
      case 'strong': return createElement('strong', { key }, part.text);
      case 'em': return createElement('em', { key }, part.text);
      case 'code': return createElement('code', { key }, part.text);
      case 'link': return createElement('a', { key, href: part.href, target: '_blank', rel: 'noopener noreferrer' }, part.text);
    }
  });
}

const isTableDivider = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());

export function MarkdownAnswer({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;
  let blockKey = 0;
  const key = () => `md-${blockKey++}`;
  while (index < lines.length) {
    if (!lines[index].trim()) { index++; continue; }
    const blockId = key();
    const fence = lines[index].match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push(createElement('pre', { key: blockId }, createElement('code', { className: fence[1] ? `language-${fence[1]}` : undefined }, codeLines.join('\n'))));
      continue;
    }
    const heading = lines[index].match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const tag = `h${heading[1].length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(createElement(tag, { key: blockId }, ...renderInline(heading[2], blockId)));
      index++;
      continue;
    }
    if (index + 1 < lines.length && lines[index].includes('|') && isTableDivider(lines[index + 1])) {
      const header = cells(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(cells(lines[index++]));
      const head = createElement('thead', null, createElement('tr', null, ...header.map((cell, i) => createElement('th', { key: i }, ...renderInline(cell, `${blockId}-h${i}`)))));
      const body = createElement('tbody', null, ...rows.map((row, rowIndex) => createElement('tr', { key: rowIndex }, ...header.map((_, i) => createElement('td', { key: i }, ...renderInline(row[i] ?? '', `${blockId}-${rowIndex}-${i}`))))));
      blocks.push(createElement('div', { key: blockId, className: 'markdown-table-wrap' }, createElement('table', null, head, body)));
      continue;
    }
    const listMatch = lines[index].match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\s*\d/.test(lines[index]);
      const items: ReactNode[] = [];
      const listIndent = lines[index].match(/^\s*/)?.[0].length ?? 0;
      while (index < lines.length) {
        const item = lines[index].match(/^(\s*)(?:([-*+])|\d+[.)])\s+(.+)$/);
        if (!item || item[1].length !== listIndent || /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[index]) !== true) break;
        items.push(createElement('li', { key: items.length }, ...renderInline(item[3], `${blockId}-li${items.length}`)));
        index++;
      }
      blocks.push(createElement(ordered ? 'ol' : 'ul', { key: blockId }, ...items));
      continue;
    }
    const paragraphLines = [lines[index++]];
    while (index < lines.length && lines[index].trim() && !/^\s*(?:#{1,6}\s|```|(?:[-*+] |\d+[.)] )|> )/.test(lines[index]) && !(lines[index].includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1]))) paragraphLines.push(lines[index++]);
    const paragraph: ReactNode[] = [];
    paragraphLines.forEach((line, lineIndex) => {
      if (lineIndex) paragraph.push(createElement('br', { key: `${blockId}-br${lineIndex}` }));
      paragraph.push(...renderInline(line, `${blockId}-p${lineIndex}`));
    });
    blocks.push(createElement('p', { key: blockId }, ...paragraph));
  }
  return createElement(Fragment, null, ...blocks);
}
