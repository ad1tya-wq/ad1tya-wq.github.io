import { attribute, createFbo, createProgram, uniforms } from './gl';
import { computeAnchor, particleCount, textRectOf } from './layout';
import { damp, holeRadiusPx } from './lifecycle';
import { generateParticles } from './particles';
import type { FieldState } from './state';
import { showPoster } from './fallback';
import pointsVert from './shaders/points.vert.glsl?raw';
import pointsFrag from './shaders/points.frag.glsl?raw';
import compositeFrag from './shaders/composite.frag.glsl?raw';

const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export interface Field {
  readonly nameSlots: number;
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

const POINT_UNIFORMS = ['uResolution', 'uDpr', 'uProgress', 'uTime', 'uAnchor', 'uRadius', 'uNameBox', 'uNameMix', 'uPointer', 'uPointerForce', 'uHover', 'uHoverY', 'uDiskScale', 'uGain'] as const;
const COMPOSITE_UNIFORMS = ['uScene', 'uResolution', 'uDpr', 'uHole', 'uRsPx', 'uTextRect', 'uExposure'] as const;

export function createField(canvas: HTMLCanvasElement, { state, projectCount }: FieldOptions): Field | null {
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
  const particles = generateParticles(count, projectCount);

  // ---- programs ----
  const pointsProg = createProgram(gl, pointsVert, pointsFrag);
  const compProg = createProgram(gl, FULLSCREEN_VERT, compositeFrag);
  const pu = uniforms(gl, pointsProg, POINT_UNIFORMS);
  const cu = uniforms(gl, compProg, COMPOSITE_UNIFORMS);

  // ---- geometry ----
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  attribute(gl, pointsProg, 'aSeed', particles.seed, 4);
  attribute(gl, pointsProg, 'aStar', particles.star, 3);
  attribute(gl, pointsProg, 'aEjecta', particles.ejecta, 4);
  attribute(gl, pointsProg, 'aDisk', particles.disk, 4);
  attribute(gl, pointsProg, 'aFragment', particles.fragment, 1);
  attribute(gl, pointsProg, 'aShip', particles.ship, 3);
  const nameData = new Float32Array(2 * count).fill(-1);
  const nameBuf = attribute(gl, pointsProg, 'aName', nameData, 2, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(null);
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

  function render(now: number) {
    const time = state.reducedMotion ? 0 : (now - t0) / 1000;
    state.textRect = textRectOf(column);

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
    gl.uniform2f(pu.uAnchor, anchor.x, anchor.y);
    gl.uniform1f(pu.uRadius, anchor.r);
    gl.uniform4f(pu.uNameBox, nameBox[0], nameBox[1] - window.scrollY, nameBox[2], nameBox[3]);
    gl.uniform1f(pu.uNameMix, state.nameMix);
    gl.uniform2f(pu.uPointer, state.pointerX, state.pointerY);
    gl.uniform1f(pu.uPointerForce, state.force);
    gl.uniform1f(pu.uHover, state.hover);
    gl.uniform1f(pu.uHoverY, state.hoverY);
    gl.uniform1f(pu.uDiskScale, anchor.r * 0.16);
    gl.uniform1f(pu.uGain, gain);
    gl.drawArrays(gl.POINTS, 0, particles.count);
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
    gl.uniform2f(cu.uHole, anchor.x, anchor.y);
    gl.uniform1f(cu.uRsPx, holeRadiusPx(state.progress, anchor.r));
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

    state.progress = state.reducedMotion ? state.target : damp(state.progress, state.target, 8, dt);
    const moving = Math.abs(state.target - state.progress) > 1e-4 || state.force !== 0 || state.hover >= 0 || state.nameMix > 0 && state.nameMix < 1;
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
    nameSlots: particles.nameSlots,
    setNamePoints(pts) {
      const n = Math.min(pts.length, 2 * particles.nameSlots);
      nameData.fill(-1);
      nameData.set(pts.subarray(0, n));
      gl.bindBuffer(gl.ARRAY_BUFFER, nameBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nameData);
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
