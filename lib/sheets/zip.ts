/**
 * Unzips a .docx (a zip file) with no library: the stored and deflate methods are all Word uses.
 * The inflate routine follows the structure of zlib's reference decoder.
 */
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface Huffman { count: Uint16Array; symbol: Uint16Array }
function build(lengths: ArrayLike<number>): Huffman {
  const count = new Uint16Array(16), symbol = new Uint16Array(lengths.length), offs = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) count[lengths[i]]++;
  count[0] = 0;
  for (let i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) symbol[offs[lengths[s]]++] = s;
  return { count, symbol };
}

export function inflateRaw(src: Uint8Array): Uint8Array {
  let pos = 0, bitBuf = 0, bitCnt = 0, o = 0;
  let out = new Uint8Array(src.length * 4 + 1024);
  const bits = (n: number) => {
    while (bitCnt < n) { bitBuf |= src[pos++] << bitCnt; bitCnt += 8; }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n; bitCnt -= n;
    return v;
  };
  const grow = (n: number) => { if (o + n > out.length) { const b = new Uint8Array(Math.max(out.length * 2, o + n)); b.set(out); out = b; } };
  const decode = (h: Huffman) => {
    let code = 0, firstCode = 0, index = 0;
    for (let len = 1; len <= 15; len++) {
      code |= bits(1);
      const c = h.count[len];
      if (code - c < firstCode) return h.symbol[index + (code - firstCode)];
      index += c; firstCode += c; firstCode <<= 1; code <<= 1;
    }
    throw new Error('Damaged compressed data');
  };
  let fixedL: Huffman | null = null, fixedD: Huffman | null = null;
  for (let last = 0; !last;) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitBuf = 0; bitCnt = 0;
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4; grow(len); out.set(src.subarray(pos, pos + len), o); o += len; pos += len;
      continue;
    }
    let lit: Huffman, dist: Huffman;
    if (type === 1) {
      if (!fixedL || !fixedD) {
        const l = new Uint8Array(288);
        l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288);
        fixedL = build(l); fixedD = build(new Uint8Array(30).fill(5));
      }
      lit = fixedL; dist = fixedD;
    } else if (type === 2) {
      const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4, cl = new Uint8Array(19);
      for (let i = 0; i < nc; i++) cl[CL_ORDER[i]] = bits(3);
      const ch = build(cl), lens = new Uint8Array(nl + nd);
      for (let i = 0; i < nl + nd;) {
        const s = decode(ch);
        if (s < 16) lens[i++] = s;
        else {
          let prev = 0, rep: number;
          if (s === 16) { prev = lens[i - 1]; rep = 3 + bits(2); } else if (s === 17) rep = 3 + bits(3); else rep = 11 + bits(7);
          while (rep--) lens[i++] = prev;
        }
      }
      lit = build(lens.subarray(0, nl)); dist = build(lens.subarray(nl));
    } else throw new Error('Damaged compressed data');
    for (;;) {
      const s = decode(lit);
      if (s < 256) { grow(1); out[o++] = s; }
      else if (s === 256) break;
      else {
        const k = s - 257, len = LEN_BASE[k] + bits(LEN_EXTRA[k]), d = decode(dist), dd = DIST_BASE[d] + bits(DIST_EXTRA[d]);
        grow(len);
        for (let i = 0; i < len; i++, o++) out[o] = out[o - dd];
      }
    }
  }
  return out.subarray(0, o);
}

/** The files in a zip, by name. */
export function unzip(input: ArrayBuffer | Uint8Array): Record<string, Uint8Array> {
  const u = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = u.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('This is not a Word file.');
  const n = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    const ln = dv.getUint16(lo + 26, true), lx = dv.getUint16(lo + 28, true), start = lo + 30 + ln + lx;
    const data = u.subarray(start, start + csize);
    files[name] = method === 0 ? data : inflateRaw(data);
    p += 46 + nl + xl + cl;
  }
  return files;
}
