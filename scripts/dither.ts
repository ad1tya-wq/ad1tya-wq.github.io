import { existsSync } from 'node:fs';
import sharp from 'sharp';

const [, , input = 'src/assets/portrait.jpg', outBase = 'public/portrait'] = process.argv;
const SIZE = 560; // 2x of the 280 px desktop slot
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

// no portrait yet: a neutral placeholder so the build and layout work; replace the file and re-run
const source = existsSync(input)
  ? sharp(input)
  : sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="#5a5f64"/><circle cx="50%" cy="42%" r="22%" fill="#9aa0a5"/><rect x="20%" y="68%" width="60%" height="40%" rx="30%" fill="#9aa0a5"/></svg>`));

const square = source.clone().resize(SIZE, SIZE, { fit: 'cover', position: 'attention' });
const gray = await square.clone().grayscale().normalise().raw().toBuffer();

const out = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const threshold = ((BAYER[y & 7]![x & 7]! + 0.5) / 64) * 255;
    const on = gray[i]! > threshold;
    out[3 * i] = on ? 0xf3 : 0x15;
    out[3 * i + 1] = on ? 0xf2 : 0x16;
    out[3 * i + 2] = on ? 0xed : 0x17;
  }
}
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ palette: true, colours: 2 }).toFile(`${outBase}-dither.png`);
await square.clone().avif({ quality: 50 }).toFile(`${outBase}.avif`);
await square.clone().webp({ quality: 78 }).toFile(`${outBase}.webp`);
console.log(`wrote ${outBase}-dither.png, ${outBase}.avif, ${outBase}.webp`);
