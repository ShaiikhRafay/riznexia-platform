import { createZip, readZip, ZipError } from './zip.util';
import { validateSite } from './site-validator';

const good = () => [
  {
    path: 'site/package.json',
    data: Buffer.from(
      JSON.stringify({ dependencies: { next: '15' }, scripts: { build: 'next build' } }),
    ),
  },
  {
    path: 'site/app/page.tsx',
    data: Buffer.from('export default () => <p>Demo website prepared by Riznexia</p>'),
  },
  { path: 'site/node_modules/x/index.js', data: Buffer.from('x') },
];

describe('zip', () => {
  it('round-trips', () => {
    const z = createZip([
      { path: 'a/b.txt', data: Buffer.from('hello '.repeat(100)) },
      { path: 'c.bin', data: Buffer.from([1, 2, 3]) },
    ]);
    const r = readZip(z);
    expect(r.map((e) => e.path)).toEqual(['a/b.txt', 'c.bin']);
    expect(r[0]!.data.toString()).toBe('hello '.repeat(100));
  });
  it('rejects garbage and traversal', () => {
    expect(() => readZip(Buffer.from('nope'))).toThrow(ZipError);
    expect(() => readZip(createZip([{ path: '../x', data: Buffer.from('1') }]))).toThrow(/Unsafe/);
  });
  it('rejects oversize entries', () => {
    const z = createZip([{ path: 'big.txt', data: Buffer.alloc(100, 97) }]);
    expect(() => readZip(z, { maxEntries: 5, maxTotalBytes: 1000, maxEntryBytes: 50 })).toThrow(
      /too large/,
    );
  });
});

describe('validateSite', () => {
  it('accepts a good site, strips root and skips node_modules', () => {
    const v = validateSite(readZip(createZip(good())));
    expect(v.ok).toBe(true);
    expect(v.files.map((f) => f.path).sort()).toEqual(['app/page.tsx', 'package.json']);
    expect(v.warnings).toEqual([]);
  });
  it('rejects binary, env, missing package.json, secrets', () => {
    const v = validateSite([
      { path: 'app/page.tsx', data: Buffer.from('const k="sk-abcdefghijklmnopqrstuvwxyz"') },
      { path: 'public/a.png', data: Buffer.from([1]) },
      { path: '.env.local', data: Buffer.from('A=1') },
    ]);
    expect(v.ok).toBe(false);
    expect(v.errors.join('|')).toMatch(/Binary/);
    expect(v.errors.join('|')).toMatch(/Environment/);
    expect(v.errors.join('|')).toMatch(/package.json not found/);
    expect(v.errors.join('|')).toMatch(/secret/);
  });
});
