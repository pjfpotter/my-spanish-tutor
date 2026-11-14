/**
 * A small XML reader (no dependency, no DOM). Word documents are well-formed XML, so this is enough
 * to read them in the browser, on the server and in tests alike. Names are kept as local names:
 * `w:tbl` becomes `tbl`, and attribute `w:val` becomes `val`.
 */
export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Text of a `#text` node; empty for elements. */
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
const local = (n: string) => n.slice(n.indexOf(':') + 1);

const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseXml(src: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  for (const m of src.matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.children.push({ name: '#text', attrs: {}, children: [], text: m[1] });
    else if (m[2] !== undefined) { if (stack.length > 1) stack.pop(); }
    else if (m[3] !== undefined) {
      const el: XmlNode = { name: local(m[3]), attrs: {}, children: [], text: '' };
      for (const a of (m[4] ?? '').matchAll(ATTR)) el.attrs[local(a[1])] = decode(a[2] ?? a[3] ?? '');
      top.children.push(el);
      if (m[5] !== '/') stack.push(el);
    } else if (m[6] !== undefined) {
      // Whitespace between elements is layout; inside <t> it is content.
      if (m[6].trim() === '' && top.name !== 't') continue;
      top.children.push({ name: '#text', attrs: {}, children: [], text: decode(m[6]) });
    }
  }
  return root;
}

/** Direct child elements with this local name. */
export const kids = (n: XmlNode | undefined, name: string): XmlNode[] => (n ? n.children.filter((c) => c.name === name) : []);
export const first = (n: XmlNode | undefined, name: string): XmlNode | undefined => kids(n, name)[0];
export const attr = (n: XmlNode | undefined, name: string): string | undefined => n?.attrs[name];
/** All text beneath a node. */
export function textOf(n: XmlNode): string {
  return n.name === '#text' ? n.text : n.children.map(textOf).join('');
}
