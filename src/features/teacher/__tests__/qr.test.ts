import { encodeQr } from '../qr';

/** Reads the 15 format bits next to the top-left finder (ISO/IEC 18004 7.9), unmasked with 0x5412. */
function formatInfo(modules: boolean[][]) {
  let bits = 0;
  const read = (x: number, y: number) => {
    bits = (bits << 1) | (modules[y][x] ? 1 : 0);
  };
  // Bits 14..9 are at (14-i, 8) for i = 14..9 -> x = 0..5, then (7,8), (8,8), (8,7), then (8, 5..0).
  for (let x = 0; x <= 5; x += 1) read(x, 8);
  read(7, 8);
  read(8, 8);
  read(8, 7);
  for (let y = 5; y >= 0; y -= 1) read(8, y);
  // Order above is bit 14 down to bit 0.
  return bits ^ 0x5412;
}

describe('encodeQr', () => {
  it('encodes an invitation link in version 3 (29 x 29) with finders, timing and the dark module', () => {
    const qr = encodeQr('https://memora.app/u/SK3A26');
    expect(qr.version).toBe(3);
    expect(qr.size).toBe(29);
    expect(qr.modules).toHaveLength(29);
    const m = qr.modules;
    // Finder pattern of the top-left corner: dark ring, light ring, dark 3x3 centre.
    const finderRow0 = m[0].slice(0, 7);
    expect(finderRow0).toEqual([true, true, true, true, true, true, true]);
    expect(m[1].slice(0, 7)).toEqual([true, false, false, false, false, false, true]);
    expect(m[3].slice(0, 7)).toEqual([true, false, true, true, true, false, true]);
    expect(m[7][7]).toBe(false); // separator
    // Top-right and bottom-left finders.
    expect(m[0].slice(22, 29).every(Boolean)).toBe(true);
    expect(m[28].slice(0, 7).every(Boolean)).toBe(true);
    // Timing patterns alternate between the finders.
    for (let i = 8; i < 21; i += 1) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
    // Dark module.
    expect(m[qr.size - 8][8]).toBe(true);
  });

  it('writes valid format information: level M and the chosen mask, with its BCH code', () => {
    const qr = encodeQr('https://memora.app/u/SK3A26');
    const info = formatInfo(qr.modules);
    const data = info >>> 10;
    expect(data >>> 3).toBe(0); // level M
    expect(data & 7).toBe(qr.mask);
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    expect(info & 0x3ff).toBe(rem & 0x3ff);
  });

  it('grows the version with the text and rejects text that does not fit in version 10', () => {
    expect(encodeQr('SK3A26').version).toBe(1);
    expect(encodeQr('x'.repeat(100)).version).toBe(6);
    expect(encodeQr('x'.repeat(200)).size).toBe(57);
    expect(() => encodeQr('x'.repeat(300))).toThrow('El texto es demasiado largo para el código QR.');
  });

  it('matches an independent encoder byte for byte (reference check while one is installed)', () => {
    let toQR: ((text: string, ec?: number) => Uint8Array) | null = null;
    try {
      // Transitive package of the Expo tooling, used only as an oracle here; not an app dependency.
      ({ toQR } = jest.requireActual('toqr'));
    } catch {
      toQR = null;
    }
    if (!toQR) return;
    for (const text of ['https://memora.app/u/SK3A26', 'https://memora.app/u/TQ7W9M', 'Memora', 'x'.repeat(150)]) {
      const theirs = toQR(text, 0); // 0 = level M in that encoder
      const size = Math.sqrt(theirs.length);
      const grid = Array.from({ length: size }, (_, y) => Array.from(theirs.slice(y * size, (y + 1) * size), Boolean));
      // Both encoders may pick different (equally valid) masks: use theirs, then compare every module.
      const theirMask = (formatInfo(grid) >>> 10) & 7;
      const ours = encodeQr(text, theirMask);
      expect(ours.size).toBe(size);
      const flat = ours.modules.flat().map((dark) => (dark ? 1 : 0));
      expect(flat.join('')).toBe(Array.from(theirs).join(''));
    }
  });
});
