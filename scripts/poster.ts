import sharp from 'sharp';
import { generateParticles } from '../src/islands/field/particles';
import { computeAnchor } from '../src/islands/field/layout';

const W = 1600;
const H = 1000;
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];
const PALETTE = [[0x15, 0x16, 0x17], [0x85, 0x8a, 0x8f], [0xcb, 0xce, 0xd1], [0xf3, 0xf2, 0xed]];

const { x: ax, y: ay, r: R } = computeAnchor(W, H);
const p = generateParticles(45000, 7);
const lum = new Float32Array(W * H);
for (let i = 0; i < p.count; i++) {
  const sx = p.star[3 * i]!, sy = p.star[3 * i + 1]!, sz = p.star[3 * i + 2]!;
  const cosT = Math.max(0, sz / (Math.hypot(sx, sy, sz) || 1));
  const b = (1 - 0.6 * (1 - cosT)) * 0.5;
  const px = Math.round(ax + sx * R), py = Math.round(ay + sy * R);
  if (px < 0 || py < 0 || px >= W || py >= H) continue;
  lum[py * W + px] = Math.min(1, lum[py * W + px]! + b);
}
const rgb = new Uint8Array(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const q = Math.min(3, Math.floor(lum[y * W + x]! * 0.9 * 3 + (BAYER[y & 7]![x & 7]! + 0.5) / 64));
    const c = PALETTE[q]!;
    const o = (y * W + x) * 3;
    rgb[o] = c[0]!; rgb[o + 1] = c[1]!; rgb[o + 2] = c[2]!;
  }
}
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png({ palette: true, colours: 4 }).toFile('public/poster.png');
console.log('wrote public/poster.png');
