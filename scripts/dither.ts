import { existsSync } from 'node:fs';
import sharp from 'sharp';

// Source: a cutout PNG with transparency (src/assets/portrait.png). Output: a 2-colour dithered PNG that keeps the
// transparency, plus AVIF/WebP colour versions with alpha, all at the same size so they can be stacked.
const [, , input = 'src/assets/portrait.png', outBase = 'public/portrait'] = process.argv;
const TARGET_H = 720; // 2x of a ~360 px tall slot; the cover layout upscales further via CSS
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

const source = existsSync(input)
  ? sharp(input)
  : sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${TARGET_H}"><circle cx="50%" cy="34%" r="20%" fill="#9aa0a5"/><rect x="18%" y="58%" width="64%" height="50%" rx="30%" fill="#9aa0a5"/></svg>`));

const scaled = source.clone().ensureAlpha().resize({ height: TARGET_H, fit: 'inside', kernel: 'lanczos3' });
const { data, info } = await scaled.clone().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// contrast-stretch luminance over the opaque pixels only, then ordered-dither to graphite/core, keeping alpha
const lum = new Float32Array(W * H);
let lo = 255, hi = 0;
for (let i = 0; i < W * H; i++) {
  const r = data[4 * i]!, g = data[4 * i + 1]!, b = data[4 * i + 2]!, a = data[4 * i + 3]!;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  lum[i] = l;
  if (a > 128) { lo = Math.min(lo, l); hi = Math.max(hi, l); }
}
const out = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const a = data[4 * i + 3]!;
    const v = ((lum[i]! - lo) / Math.max(1, hi - lo)) * 255;
    const threshold = ((BAYER[y & 7]![x & 7]! + 0.5) / 64) * 255;
    const on = v > threshold;
    out[4 * i] = on ? 0xf3 : 0x15;
    out[4 * i + 1] = on ? 0xf2 : 0x16;
    out[4 * i + 2] = on ? 0xed : 0x17;
    out[4 * i + 3] = a > 128 ? 255 : 0;
  }
}
const dithered = sharp(out, { raw: { width: W, height: H, channels: 4 } });
await dithered.clone().png({ palette: true, colours: 4 }).toFile(`${outBase}-dither.png`);
// a half-size dither for small or low-DPR screens: a 1-bit pattern must never be downscaled (moire), only upscaled
await dithered.clone().resize({ height: Math.round(H / 2), kernel: 'nearest' }).png({ palette: true, colours: 4 }).toFile(`${outBase}-dither-sm.png`);
await scaled.clone().avif({ quality: 55 }).toFile(`${outBase}.avif`);
await scaled.clone().webp({ quality: 80 }).toFile(`${outBase}.webp`);
console.log(`wrote ${outBase}-dither.png, ${outBase}-dither-sm.png, ${outBase}.avif, ${outBase}.webp (${W}x${H})`);
