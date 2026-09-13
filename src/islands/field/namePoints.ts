import { mulberry32 } from './particles';

export function pickPoints(mask: Uint8Array, w: number, h: number, count: number, rng: () => number): Float32Array {
  const filled: number[] = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) filled.push(i);
  const out = new Float32Array(2 * count);
  if (filled.length === 0) return out.fill(-1);
  for (let k = 0; k < count; k++) {
    const idx = filled[Math.floor(rng() * filled.length)]!;
    out[2 * k] = ((idx % w) + rng()) / w;
    out[2 * k + 1] = (Math.floor(idx / w) + rng()) / h;
  }
  return out;
}

/** Opaque and bright pixels only: on a 1-bit dither that is exactly the lit half. */
export function maskFromRGBA(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[4 * i + 3]!;
    const l = 0.2126 * data[4 * i]! + 0.7152 * data[4 * i + 1]! + 0.0722 * data[4 * i + 2]!;
    mask[i] = a > 128 && l > 160 ? 1 : 0;
  }
  return mask;
}

/** Samples the lit pixels of a rendered image (the dithered portrait) at its on-screen size. */
export function sampleImage(img: HTMLImageElement, count: number): { points: Float32Array; box: DOMRect } | null {
  const box = img.getBoundingClientRect();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);
  if (!w || !h || !img.complete || !img.naturalWidth) return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const mask = maskFromRGBA(ctx.getImageData(0, 0, w, h).data, w, h);
  return { points: pickPoints(mask, w, h, count, mulberry32(7)), box };
}

/** Rasterises the element's text with its computed font into an offscreen canvas and samples the glyph mask. */
export function sampleName(el: HTMLElement, count: number): { points: Float32Array; box: DOMRect } | null {
  const box = el.getBoundingClientRect();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);
  if (!w || !h) return null;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.1;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing;

  // greedy word wrap at the element width, the same rule the browser applies to plain text
  let text = (el.textContent ?? '').trim();
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
  const centred = cs.textAlign === 'center';
  const words = text.split(/\s+/);
  const lines: string[] = [];
  if (cs.whiteSpace === 'nowrap') {
    lines.push(text); // the DOM does not wrap either; a slightly wide line is clipped, not broken
  } else {
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(test).width > w) {
        lines.push(cur);
        cur = word;
      } else cur = test;
    }
    if (cur) lines.push(cur);
  }
  lines.forEach((ln, i) => {
    const x = centred ? Math.max(0, (w - ctx.measureText(ln).width) / 2) : 0;
    ctx.fillText(ln, x, i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8);
  });

  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = data[4 * i + 3]! > 128 ? 1 : 0;
  return { points: pickPoints(mask, w, h, count, mulberry32(99)), box };
}
