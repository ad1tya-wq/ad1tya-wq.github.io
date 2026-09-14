import { attribute, createFbo, createProgramDeferred, uniforms } from './gl';
import { computeAnchor, particleCount, SLOTS, textRectOf } from './layout';
import { damp, holeRadiusPx, lerp, massScale, smoothstep } from './lifecycle';
import { generateParticles, SHIP_COUNT, type ParticleBuffers } from './particles';
import type { FieldState } from './state';
import { hidePoster, showPoster } from './fallback';
import pointsVert from './shaders/points.vert.glsl?raw';
import pointsFrag from './shaders/points.frag.glsl?raw';
import compositeFrag from './shaders/composite.frag.glsl?raw';
import probeVert from './shaders/probe.vert.glsl?raw';

const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** particles per project that can form its pictogram */
export const PICTO_SLOTS = 2400;

export interface Field {
  readonly nameSlots: number;
  readonly faceSlots: number;
  readonly pictoSlots: number;
  /** particles at the end of the buffer reserved for text the hole eats */
  readonly eatSlots: number;
  /** seconds on the shader clock (uTime), for timing eaten-text flights */
  now(): number;
  /**
   * Assigns pool slots [from, from + pts.length / 2) to text points (document css px pairs) that start flying
   * at `start` (shader seconds); dir 1 = into the hole, -1 = back out to the text.
   */
  setEat(from: number, pts: Float32Array, start: number, dir: 1 | -1): void;
  /** Releases pool slots [from, to). */
  clearEat(from: number, to: number): void;
  /** points (0..1 in the pictogram box) for one project's cluster */
  setPictoPoints(fragment: number, pts: Float32Array): void;
  setPictoBox(x: number, y: number, w: number, h: number): void;
  setFacePoints(pts: Float32Array): void;
  setFaceBox(x: number, y: number, w: number, h: number): void;
  setNamePoints(pts: Float32Array): void;
  setNameBox(x: number, y: number, w: number, h: number): void;
  setProbe(pts: Float32Array | null): void;
  setChapterColumn(el: Element | null): void;
  destroy(): void;
}

export interface FieldOptions {
  state: FieldState;
  projectCount: number;
}

const POINT_UNIFORMS = ['uResolution', 'uDpr', 'uProgress', 'uTime', 'uAnchor', 'uRadius', 'uNameBox', 'uNameMix', 'uFaceBox', 'uFaceMix', 'uWave', 'uActiveFragment', 'uPictoBox', 'uPictoMix', 'uPointer', 'uPointerForce', 'uHover', 'uHoverY', 'uDiskScale', 'uGain', 'uMass', 'uScroll', 'uEatenNameFace'] as const;
const COMPOSITE_UNIFORMS = ['uScene', 'uResolution', 'uDpr', 'uHole', 'uRsPx', 'uTextRect', 'uExposure'] as const;

/** Creates the field and rebuilds it transparently if the WebGL context is lost and later restored. */
export function createField(canvas: HTMLCanvasElement, opts: FieldOptions): Field | null {
  let inner = createRenderer(canvas, opts);
  if (!inner) return null;
  // remembered so a rebuilt renderer can pick up where the old one left off
  let lastName: Float32Array | null = null;
  let lastFace: Float32Array | null = null;
  let lastFaceBox: [number, number, number, number] | null = null;
  let lastBox: [number, number, number, number] | null = null;
  let lastColumn: Element | null = null;
  let lastProbe: Float32Array | null = null;
  const lastPicto = new Map<number, Float32Array>();
  const lastEat = new Map<number, { pts: Float32Array; start: number; dir: 1 | -1 }>();
  let lastPictoBox: [number, number, number, number] | null = null;
  const onRestored = () => {
    inner?.destroy();
    inner = createRenderer(canvas, opts);
    if (!inner) return;
    hidePoster(canvas);
    if (lastName) inner.setNamePoints(lastName);
    if (lastFace) inner.setFacePoints(lastFace);
    if (lastFaceBox) inner.setFaceBox(...lastFaceBox);
    if (lastBox) inner.setNameBox(...lastBox);
    inner.setChapterColumn(lastColumn);
    inner.setProbe(lastProbe);
    const restored = inner;
    lastPicto.forEach((pts, f) => restored.setPictoPoints(f, pts));
    lastEat.forEach((e, from) => restored.setEat(from, e.pts, e.start, e.dir));
    if (lastPictoBox) inner.setPictoBox(...lastPictoBox);
  };
  canvas.addEventListener('webglcontextrestored', onRestored);
  return {
    nameSlots: inner.nameSlots,
    faceSlots: inner.faceSlots,
    pictoSlots: inner.pictoSlots,
    eatSlots: inner.eatSlots,
    now: () => inner?.now() ?? 0,
    setEat(from, pts, start, dir) {
      lastEat.set(from, { pts, start, dir });
      inner?.setEat(from, pts, start, dir);
    },
    clearEat(from, to) {
      lastEat.forEach((_, k) => k >= from && k < to && lastEat.delete(k));
      inner?.clearEat(from, to);
    },
    setPictoPoints(f, pts) {
      lastPicto.set(f, pts);
      inner?.setPictoPoints(f, pts);
    },
    setPictoBox(x, y, w, h) {
      lastPictoBox = [x, y, w, h];
      inner?.setPictoBox(x, y, w, h);
    },
    setFacePoints(pts) {
      lastFace = pts;
      inner?.setFacePoints(pts);
    },
    setFaceBox(x, y, w, h) {
      lastFaceBox = [x, y, w, h];
      inner?.setFaceBox(x, y, w, h);
    },
    setNamePoints(pts) {
      lastName = pts;
      inner?.setNamePoints(pts);
    },
    setNameBox(x, y, w, h) {
      lastBox = [x, y, w, h];
      inner?.setNameBox(x, y, w, h);
    },
    setProbe(pts) {
      lastProbe = pts;
      inner?.setProbe(pts);
    },
    setChapterColumn(el) {
      lastColumn = el;
      inner?.setChapterColumn(el);
    },
    destroy() {
      canvas.removeEventListener('webglcontextrestored', onRestored);
      inner?.destroy();
      inner = null;
    },
  };
}

function createRenderer(canvas: HTMLCanvasElement, { state, projectCount }: FieldOptions): Field | null {
  const ctx = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!ctx) {
    showPoster(canvas);
    return null;
  }
  // explicit non-null binding so the hoisted render() below sees a WebGL2RenderingContext
  const gl: WebGL2RenderingContext = ctx;

  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
  let dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 2);
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  const count = particleCount(vw, vh, lowEnd);
  const nameSlots = Math.round(SLOTS.name * count); // same rules as generateParticles, known before the buffers arrive
  const faceSlots = Math.round(SLOTS.face * count);
  const eatSlots = Math.round(SLOTS.eat * count); // the last 15 %: ordinary particles until the hole eats text; the star keeps its own
  const eatOffset = count - eatSlots;
  let particles: ParticleBuffers | null = null;
  let pendingName: Float32Array | null = null;
  let pendingFace: Float32Array | null = null;

  // ---- programs ----
  const pointsLink = createProgramDeferred(gl, pointsVert, pointsFrag);
  const compLink = createProgramDeferred(gl, FULLSCREEN_VERT, compositeFrag);
  const probeLink = createProgramDeferred(gl, probeVert, pointsFrag);
  const pointsProg = pointsLink.program;
  const compProg = compLink.program;
  const probeProg = probeLink.program;
  let programsReady = false;
  // uniform locations are resolved once the links complete (see tick)
  let pu = {} as ReturnType<typeof uniforms<(typeof POINT_UNIFORMS)[number]>>;
  let cu = {} as ReturnType<typeof uniforms<(typeof COMPOSITE_UNIFORMS)[number]>>;
  let qu = {} as ReturnType<typeof uniforms<'uResolution' | 'uDpr'>>;
  const probeVao = gl.createVertexArray()!;
  let probeBuf: WebGLBuffer | null = null; // bound once the probe program has linked

  // ---- geometry ----
  const vao = gl.createVertexArray()!;
  const nameData = new Float32Array(2 * count).fill(-1);
  let nameBuf: WebGLBuffer | null = null;
  const faceData = new Float32Array(2 * count).fill(-1);
  let faceBuf: WebGLBuffer | null = null;
  let faceBox: [number, number, number, number] = [0, 0, 0, 0];
  const eatData = new Float32Array(4 * count).fill(-1); // docX, docY, start (-1 = free), lag (+2 when flying back out)
  let eatBuf: WebGLBuffer | null = null;
  const pendingEat: Array<[number, Float32Array, number, 1 | -1]> = [];

  function uploadEat(from: number, pts: Float32Array, start: number, dir: 1 | -1) {
    const n = Math.min(pts.length / 2, eatSlots - from);
    for (let k = 0; k < n; k++) {
      const i = eatOffset + from + k;
      eatData[4 * i] = pts[2 * k]!;
      eatData[4 * i + 1] = pts[2 * k + 1]!;
      eatData[4 * i + 2] = start;
      eatData[4 * i + 3] = ((k * 0.618034) % 1) + (dir < 0 ? 2 : 0); // golden-ratio lag spreads a word into a streak
    }
    flushEat(from, from + n);
  }
  function releaseEat(from: number, to: number) {
    for (let i = eatOffset + from; i < eatOffset + to; i++) eatData[4 * i + 2] = -1;
    flushEat(from, to);
  }
  function flushEat(from: number, to: number) {
    if (!eatBuf || to <= from) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, eatBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (eatOffset + from), eatData.subarray(4 * (eatOffset + from), 4 * (eatOffset + to)));
  }
  const pictoData = new Float32Array(2 * count).fill(-1);
  let pictoBuf: WebGLBuffer | null = null;
  let pictoBox: [number, number, number, number] = [0, 0, 0, 0];
  /** particle indices per project that may form its pictogram (built once the buffers arrive) */
  const pictoIndex = new Map<number, Uint32Array>();
  const pendingPicto = new Map<number, Float32Array>();

  function uploadPicto(fragment: number, pts: Float32Array) {
    const idx = pictoIndex.get(fragment);
    if (!idx) return;
    const n = Math.min(idx.length, pts.length / 2);
    for (let k = 0; k < n; k++) {
      pictoData[2 * idx[k]!] = pts[2 * k]!;
      pictoData[2 * idx[k]! + 1] = pts[2 * k + 1]!;
    }
    if (!pictoBuf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, pictoBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pictoData);
  }

  function uploadName(pts: Float32Array) {
    const n = Math.min(pts.length, 2 * nameSlots);
    nameData.fill(-1);
    nameData.set(pts.subarray(0, n));
    if (!nameBuf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, nameBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, nameData);
  }

  let stagedParticles: ParticleBuffers | null = null;
  function uploadFace(pts: Float32Array) {
    const n = Math.min(pts.length, 2 * faceSlots);
    faceData.fill(-1);
    faceData.set(pts.subarray(0, n), 2 * nameSlots); // face particles follow the name particles
    if (!faceBuf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, faceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, faceData);
  }

  function adoptParticles(p: ParticleBuffers) {
    if (!programsReady) {
      stagedParticles = p; // attribute locations exist only after the link completes
      return;
    }
    particles = p;
    gl.bindVertexArray(vao);
    attribute(gl, pointsProg, 'aSeed', p.seed, 4);
    attribute(gl, pointsProg, 'aStar', p.star, 3);
    attribute(gl, pointsProg, 'aEjecta', p.ejecta, 4);
    attribute(gl, pointsProg, 'aDisk', p.disk, 4);
    attribute(gl, pointsProg, 'aFragment', p.fragment, 1);
    attribute(gl, pointsProg, 'aShip', p.ship, 3);
    nameBuf = attribute(gl, pointsProg, 'aName', nameData, 2, gl.DYNAMIC_DRAW);
    faceBuf = attribute(gl, pointsProg, 'aFace', faceData, 2, gl.DYNAMIC_DRAW);
    pictoBuf = attribute(gl, pointsProg, 'aPicto', pictoData, 2, gl.DYNAMIC_DRAW);
    eatBuf = attribute(gl, pointsProg, 'aEat', eatData, 4, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    // the first PICTO_SLOTS non-ship particles of each project's ejecta sector can form its pictogram
    const perFragment = new Map<number, number[]>();
    for (let i = SHIP_COUNT; i < p.count; i++) {
      const f = p.fragment[i]!;
      let list = perFragment.get(f);
      if (!list) perFragment.set(f, (list = []));
      if (list.length < PICTO_SLOTS) list.push(i);
    }
    perFragment.forEach((list, f) => pictoIndex.set(f, Uint32Array.from(list)));
    if (pendingName) uploadName(pendingName);
    pendingName = null;
    if (pendingFace) uploadFace(pendingFace);
    pendingFace = null;
    pendingPicto.forEach((pts, f) => uploadPicto(f, pts));
    pendingPicto.clear();
    pendingEat.forEach(([from, pts, start, dir]) => uploadEat(from, pts, start, dir));
    pendingEat.length = 0;
  }

  // generate off the main thread; fall back to inline generation if workers are unavailable
  try {
    const worker = new Worker(new URL('./particles.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ParticleBuffers>) => {
      adoptParticles(e.data);
      worker.terminate();
    };
    worker.onerror = () => {
      worker.terminate();
      adoptParticles(generateParticles(count, projectCount));
    };
    worker.postMessage({ count, projectCount });
  } catch {
    adoptParticles(generateParticles(count, projectCount));
  }
  const emptyVao = gl.createVertexArray()!; // for the fullscreen triangle

  // ---- targets ----
  const fbo = createFbo(gl, Math.round(vw * dpr), Math.round(vh * dpr));

  let anchor = computeAnchor(vw, vh);
  let nameBox: [number, number, number, number] = [0, 0, 0, 0];
  let column: Element | null = document.querySelector('#top .col');
  let probe: Float32Array | null = null; // wired in Task 18
  const gain = lowEnd ? 0.8 : 0.5;

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const w = Math.round(vw * dpr);
    const h = Math.round(vh * dpr);
    canvas.width = w;
    canvas.height = h;
    fbo.resize(w, h);
    anchor = computeAnchor(vw, vh);
  }
  resize();

  // ---- loop ----
  let raf = 0;
  let last = performance.now();
  let idleSince = last;
  let slowFrames = 0;
  let frame = 0;
  let lastRenderedProgress = -1;
  const t0 = last;

  const clock = (now: number) => (state.reducedMotion ? 0 : (now - t0) / 1000);
  function render(now: number) {
    const time = clock(now);
    const scale = massScale(state.mass);
    state.textRect = textRectOf(column);
    // on desktop the object drifts from 62vw to the centre as the hole forms, so Horizon and Contact sit on it
    const centred = vw >= 768 ? lerp(anchor.x, vw * 0.5, smoothstep(0.8, 0.86, state.progress)) : anchor.x;

    // pass 1: points -> fbo (additive)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb);
    gl.viewport(0, 0, fbo.w, fbo.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(pointsProg);
    gl.bindVertexArray(vao);
    gl.uniform2f(pu.uResolution, vw, vh);
    gl.uniform1f(pu.uDpr, dpr);
    gl.uniform1f(pu.uProgress, state.progress);
    gl.uniform1f(pu.uTime, time);
    gl.uniform2f(pu.uAnchor, centred, anchor.y);
    gl.uniform1f(pu.uRadius, anchor.r);
    gl.uniform4f(pu.uNameBox, nameBox[0], nameBox[1] - window.scrollY, nameBox[2], nameBox[3]);
    gl.uniform1f(pu.uNameMix, state.nameMix);
    gl.uniform4f(pu.uFaceBox, faceBox[0], faceBox[1] - window.scrollY, faceBox[2], faceBox[3]);
    gl.uniform1f(pu.uFaceMix, state.faceMix);
    gl.uniform3f(pu.uWave, state.waveX, state.waveY - window.scrollY, state.waveR);
    gl.uniform1f(pu.uActiveFragment, state.activeFragment);
    gl.uniform4f(pu.uPictoBox, pictoBox[0], pictoBox[1], pictoBox[2], pictoBox[3]);
    gl.uniform1f(pu.uPictoMix, state.pictoMix);
    gl.uniform2f(pu.uPointer, state.pointerX, state.pointerY);
    gl.uniform1f(pu.uPointerForce, state.force);
    gl.uniform1f(pu.uHover, state.hover);
    gl.uniform1f(pu.uHoverY, state.hoverY);
    gl.uniform1f(pu.uDiskScale, anchor.r * 0.16 * scale);
    gl.uniform1f(pu.uGain, gain);
    gl.uniform1f(pu.uMass, state.mass);
    gl.uniform1f(pu.uScroll, window.scrollY);
    gl.uniform2f(pu.uEatenNameFace, state.nameEaten, state.faceEaten);
    if (particles) gl.drawArrays(gl.POINTS, 0, particles.count);
    if (probe && probe.length >= 2 && probeBuf) {
      gl.useProgram(probeProg);
      gl.bindVertexArray(probeVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, probeBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, probe.subarray(0, Math.min(probe.length, 2400)));
      gl.uniform2f(qu.uResolution, vw, vh);
      gl.uniform1f(qu.uDpr, dpr);
      gl.drawArrays(gl.POINTS, 0, Math.min(probe.length, 2400) / 2);
    }
    gl.disable(gl.BLEND);

    // pass 2: composite -> screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(compProg);
    gl.bindVertexArray(emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
    gl.uniform1i(cu.uScene, 0);
    gl.uniform2f(cu.uResolution, vw, vh);
    gl.uniform1f(cu.uDpr, dpr);
    gl.uniform2f(cu.uHole, centred, anchor.y);
    gl.uniform1f(cu.uRsPx, holeRadiusPx(state.progress, anchor.r) * scale);
    gl.uniform4f(cu.uTextRect, state.textRect[0], state.textRect[1], state.textRect[2], state.textRect[3]);
    gl.uniform1f(cu.uExposure, 0.9);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    lastRenderedProgress = state.progress;
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    if (document.hidden) return;
    if (!programsReady) {
      if (!(pointsLink.ready() && compLink.ready() && probeLink.ready())) return;
      programsReady = true;
      pu = uniforms(gl, pointsProg, POINT_UNIFORMS);
      cu = uniforms(gl, compProg, COMPOSITE_UNIFORMS);
      qu = uniforms(gl, probeProg, ['uResolution', 'uDpr'] as const);
      gl.bindVertexArray(probeVao);
      probeBuf = attribute(gl, probeProg, 'aPos', new Float32Array(2 * 1200), 2, gl.DYNAMIC_DRAW);
      gl.bindVertexArray(null);
      if (stagedParticles) adoptParticles(stagedParticles);
      stagedParticles = null;
    }

    state.progress = state.reducedMotion ? state.target : damp(state.progress, state.target, 8, dt);
    const moving = Math.abs(state.target - state.progress) > 1e-4 || state.force !== 0 || state.hover >= 0 || (state.pictoMix > 0 && state.pictoMix < 1) || (state.nameMix > 0 && state.nameMix < 1) || probe !== null;
    if (moving) idleSince = now;

    // adaptive resolution: three slow frames in a row while moving -> step the DPR down
    if (moving && dt > 0.02) {
      if (++slowFrames >= 3 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.5);
        resize();
        slowFrames = 0;
      }
    } else slowFrames = 0;

    if (state.reducedMotion && state.progress === lastRenderedProgress) return; // static when motion is reduced
    const idle = now - idleSince > 500;
    if (idle && frame % 2 === 1) return; // 30 fps idle
    render(now);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    showPoster(canvas);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  raf = requestAnimationFrame(tick);

  return {
    nameSlots,
    faceSlots,
    pictoSlots: PICTO_SLOTS,
    eatSlots,
    now: () => clock(performance.now()),
    setEat(from, pts, start, dir) {
      if (!particles) {
        pendingEat.push([from, pts, start, dir]);
        return;
      }
      uploadEat(from, pts, start, dir);
    },
    clearEat(from, to) {
      if (particles) releaseEat(from, to);
    },
    setPictoPoints(fragment, pts) {
      if (!particles) {
        pendingPicto.set(fragment, pts);
        return;
      }
      uploadPicto(fragment, pts);
    },
    setPictoBox(x, y, w, h) {
      pictoBox = [x, y, w, h]; // viewport css px: the slot is sticky, so no scroll offset
    },
    setFacePoints(pts) {
      if (!particles) {
        pendingFace = pts;
        return;
      }
      uploadFace(pts);
    },
    setFaceBox(x, y, w, h) {
      faceBox = [x, y, w, h];
    },
    setNamePoints(pts) {
      if (!particles) {
        pendingName = pts;
        return;
      }
      uploadName(pts);
    },
    setNameBox(x, y, w, h) {
      nameBox = [x, y, w, h];
    },
    setProbe(pts) {
      probe = pts;
    },
    setChapterColumn(el) {
      column = el;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
    },
  };
}
