import { crc32, deflateRawSync } from 'node:zlib';

/**
 * Builds small synthetic .docx files for tests and for `scripts/make-fixture-sheets.mjs`. They imitate the
 * layouts of real sentence builders (formatting habits, merged cells, floating boxes) with invented
 * content, so the repo never holds a teacher's worksheet.
 */
export interface FxRun { t: string; b?: boolean; i?: boolean }
export type FxPara = FxRun[];
export interface FxCell { paras: FxPara[]; span?: number; vmerge?: 'restart' | 'cont'; fill?: string; box?: FxPara[] }
export type FxBlock = { p: FxPara } | { table: { grid: number[]; rows: FxCell[][] } } | { image: true };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (r: FxRun) => `<w:r><w:rPr>${r.b ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`;
const para = (p: FxPara) => `<w:p>${p.map(run).join('')}</w:p>`;
const box = (paras: FxPara[]) => {
  const inner = `<w:txbxContent>${paras.map(para).join('')}</w:txbxContent>`;
  return `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>${inner}</w:drawing></mc:Choice><mc:Fallback>${inner}</mc:Fallback></mc:AlternateContent></w:r></w:p>`;
};
function cell(c: FxCell) {
  const pr = `<w:tcPr>${c.span && c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : ''}${c.vmerge ? `<w:vMerge${c.vmerge === 'restart' ? ' w:val="restart"' : ''}/>` : ''}${c.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.fill}"/>` : ''}</w:tcPr>`;
  const inner = c.paras.length ? c.paras.map(para).join('') : '<w:p/>';
  return `<w:tc>${pr}${inner}${c.box ? box(c.box) : ''}</w:tc>`;
}
function block(b: FxBlock): string {
  if ('p' in b) return para(b.p);
  if ('image' in b) return '<w:p><w:r><w:drawing><wp:inline/></w:drawing></w:r></w:p>';
  const { grid, rows } = b.table;
  return `<w:tbl><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>${rows.map((r) => `<w:tr>${r.map(cell).join('')}</w:tr>`).join('')}</w:tbl>`;
}

function zip(files: Record<string, { data: Uint8Array; deflate: boolean }>): Uint8Array {
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 255, (n >> 8) & 255], u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [name, { data, deflate }] of Object.entries(files)) {
    const nm = new TextEncoder().encode(name), body = deflate ? deflateRawSync(data) : data, method = deflate ? 8 : 0, crc = crc32(data);
    const local = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(method), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(body.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...nm]);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(method), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(body.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nm]));
    parts.push(local, body);
    offset += local.length + body.length;
  }
  const cd = central.reduce((n, c) => n + c.length, 0);
  const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(cd), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((n, a) => n + a.length, 0));
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

export function buildDocx(blocks: FxBlock[]): Uint8Array {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${blocks.map(block).join('')}</w:body></w:document>`;
  const enc = (s: string) => new TextEncoder().encode(s);
  return zip({
    '[Content_Types].xml': { data: enc('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'), deflate: false },
    'word/document.xml': { data: enc(xml), deflate: true },
  });
}

/** A cell with Spanish in bold followed by its English in brackets on the next line. */
const B = (es: string, en?: string, br: '()' | '[]' = '()'): FxPara[] => [[{ t: es, b: true }], ...(en ? [[{ t: `${br[0]}${en}${br[1]}`, i: br === '[]' }]] : [])];
const items = (...ps: FxPara[][]): FxPara[] => ps.flat();
/** Plain Spanish with italic bracketed English, as on a sheet with no bold at all. */
const PL = (es: string, en: string): FxPara[] => [[{ t: es }], [{ t: `(${en})`, i: true }]];

export const FIXTURES: Record<string, () => Uint8Array> = {
  /** Bold Spanish, plain bracketed English on its own line. */
  boldBrackets: () => buildDocx([{ p: [{ t: '¿Qué haces en tu tiempo libre? ', b: true }, { t: '(What do you do in your free time?)' }] }, { table: { grid: [3000, 3000], rows: [[{ paras: items(B('Me gusta', 'I like to'), B('Odio', 'I hate to')) }, { paras: items(B('bailar', 'to dance'), B('cocinar', 'to cook')) }]] } }]),
  /** No bold anywhere; English is italic in round brackets. */
  italicNoBold: () => buildDocx([{ table: { grid: [3000, 3000], rows: [[{ paras: items(PL('jugué al tenis', 'I played tennis'), PL('nadé en la piscina', 'I swam in the pool')) }, { paras: items(PL('con mis amigos', 'with my friends'), PL('en casa', 'at home')) }]] } }]),
  /** Bold Spanish, italic English in square brackets. */
  squareBrackets: () => buildDocx([{ table: { grid: [3000], rows: [[{ paras: items(B('castaño', 'brown', '[]'), B('rubio', 'blonde', '[]')) }]] } }]),
  /** Two columns, one cell that spans both, and a cell that spans two rows. */
  merged: () => buildDocx([{ table: { grid: [2000, 2000, 2000], rows: [[{ paras: B('uno'), vmerge: 'restart' }, { paras: B('dos'), span: 2 }], [{ paras: [], vmerge: 'cont' }, { paras: B('tres') }, { paras: B('cuatro') }]] } }]),
  /** Garments and colours that sit in the same rows, so a garment's own colours line up with it. */
  alignedLists: () => buildDocx([{ table: { grid: [3000, 3000], rows: [[{ paras: items(B('un jersey', 'a jumper')) }, { paras: items(B('negro', 'black'), B('blanco', 'white')) }], [{ paras: items(B('una falda', 'a skirt')) }, { paras: items(B('negra', 'black'), B('blanca', 'white')) }]] } }]),
  /** A floating text box whose "es = en" pairs are split over two lines. */
  floatBox: () => buildDocx([{ table: { grid: [3000, 3000], rows: [[{ paras: B('Ayer', 'yesterday'), box: [[{ t: 'fuimos =' }], [{ t: 'we went' }], [{ t: 'jugamos =' }], [{ t: 'we played' }]] }, { paras: B('al parque', 'to the park') }]] } }]),
  /** "(no)" optional words and "[no]" in square brackets. */
  optionalNo: () => buildDocx([{ table: { grid: [3000], rows: [[{ paras: items([[{ t: '(no) soy', b: true }, { t: ' (I am)' }]], [[{ t: '[no] llevo', b: true }]]) }]] } }]),
  /** Slash alternatives, with endings shared, and forms that must stay whole. */
  alternatives: () => buildDocx([{ table: { grid: [4000], rows: [[{ paras: items([[{ t: 'dos/ tres / cuatro personas', b: true }]], [[{ t: 'me gustaria ser más/menos', b: true }, { t: ' (I would like to be more/less)' }]], B('alto/a', 'tall'), [[{ t: 'hablo por Skype/Zoom', b: true }, { t: ' (I talk on Skype/Zoom)' }]]) }]] } }]),
  /** A bracket that is never closed, and two chunks in one paragraph. */
  unclosedAndMany: () => buildDocx([{ table: { grid: [4000], rows: [[{ paras: items([[{ t: 'me ayuda a relajarme ', b: true }, { t: '(he/she helps me relax' }]], [[{ t: 'guapo/a ', b: true }, { t: '[good-looking] ' }, { t: 'feo/a ', b: true }, { t: '[ugly]' }]]) }]] } }]),
  /** An image and a shaded cell. */
  imageAndShading: () => buildDocx([{ image: true }, { table: { grid: [3000], rows: [[{ paras: B('y', 'and'), fill: 'FBE4D5' }]] } }]),
};
