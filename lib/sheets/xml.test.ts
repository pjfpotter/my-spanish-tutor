import { describe, expect, it } from 'vitest';
import { attr, first, kids, parseXml, textOf } from './xml';

describe('xml reader', () => {
  it('reads elements, local names, attributes and entities', () => {
    const r = parseXml('<?xml version="1.0"?><w:a xmlns:w="x" w:val="1 &amp; 2"><w:b/><w:c>Caf&#233; &lt;ok&gt;</w:c><!-- c --></w:a>');
    const a = first(r, 'a')!;
    expect(attr(a, 'val')).toBe('1 & 2');
    expect(kids(a, 'b')).toHaveLength(1);
    expect(textOf(first(a, 'c')!)).toBe('Café <ok>');
  });

  it('keeps spaces inside <t> but drops layout whitespace between elements', () => {
    const r = parseXml('<p>\n  <t xml:space="preserve"> a </t>\n</p>');
    const p = first(r, 'p')!;
    expect(p.children).toHaveLength(1);
    expect(textOf(p)).toBe(' a ');
  });

  it('reads CDATA', () => {
    expect(textOf(parseXml('<t><![CDATA[a < b]]></t>'))).toBe('a < b');
  });
});
