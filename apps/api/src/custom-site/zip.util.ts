import { deflateRawSync, inflateRawSync } from 'node:zlib';

// Dependency-free ZIP read/write (Build Pack download, site.zip upload).
// Supports STORE + DEFLATE, no encryption, no zip64 — enough for source
// bundles. Reading enforces hard safety limits (zip-bomb / path traversal).

export interface ZipEntry {
  path: string;
  data: Buffer;
}

export interface ReadZipLimits {
  maxEntries: number;
  maxTotalBytes: number; // uncompressed
  maxEntryBytes: number; // uncompressed
}

export const DEFAULT_READ_LIMITS: ReadZipLimits = {
  maxEntries: 600,
  maxTotalBytes: 12 * 1024 * 1024,
  maxEntryBytes: 2 * 1024 * 1024,
};

export class ZipError extends Error {}

let CRC_TABLE: Uint32Array | null = null;
export function crc32(buf: Buffer): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.path, 'utf8');
    const crc = crc32(e.data);
    const deflated = deflateRawSync(e.data);
    const useDeflate = deflated.length < e.data.length;
    const body = useDeflate ? deflated : e.data;
    const method = useDeflate ? 8 : 0;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8 names
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0x21, 12); // 1980-01-01
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);

    offset += 30 + name.length + body.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, end]);
}

export function isSafeZipPath(p: string): boolean {
  if (!p || p.length > 240) return false;
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0') || /^[a-zA-Z]:/.test(p)) {
    return false;
  }
  return !p.split('/').some((seg) => seg === '..' || seg === '');
}

export function readZip(buf: Buffer, limits: ReadZipLimits = DEFAULT_READ_LIMITS): ZipEntry[] {
  // Locate End Of Central Directory (scan back over a possible comment).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('Not a valid zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count > limits.maxEntries) throw new ZipError(`Too many files (max ${limits.maxEntries})`);

  const out: ZipEntry[] = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) {
      throw new ZipError('Corrupt zip directory');
    }
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    p += 46 + nlen + elen + clen;

    if (name.endsWith('/')) continue; // directory entry
    if (flags & 1) throw new ZipError('Encrypted zips are not supported');
    if (!isSafeZipPath(name)) throw new ZipError(`Unsafe path in zip: ${name}`);
    if (usize > limits.maxEntryBytes) throw new ZipError(`File too large: ${name}`);
    total += usize;
    if (total > limits.maxTotalBytes) throw new ZipError('Zip expands to too much data');

    if (lho + 30 > buf.length || buf.readUInt32LE(lho) !== 0x04034b50) {
      throw new ZipError('Corrupt zip entry');
    }
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(start, start + csize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) {
      try {
        data = inflateRawSync(raw, { maxOutputLength: limits.maxEntryBytes });
      } catch {
        throw new ZipError(`Cannot decompress ${name}`);
      }
    } else throw new ZipError(`Unsupported compression in ${name}`);
    if (data.length !== usize || crc32(data) !== crc)
      throw new ZipError(`Checksum mismatch: ${name}`);
    out.push({ path: name, data });
  }
  return out;
}
