export function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

export function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`program link failed: ${gl.getProgramInfoLog(p)}`);
  return p;
}

export type Uniforms<K extends string> = Record<K, WebGLUniformLocation | null>;

export function uniforms<K extends string>(gl: WebGL2RenderingContext, p: WebGLProgram, names: readonly K[]): Uniforms<K> {
  const out = {} as Uniforms<K>;
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

/** Uploads a Float32Array as a static attribute; silently skips attributes the shader optimised away. */
export function attribute(
  gl: WebGL2RenderingContext,
  p: WebGLProgram,
  name: string,
  data: Float32Array,
  size: number,
  usage: number = gl.STATIC_DRAW,
): WebGLBuffer | null {
  const loc = gl.getAttribLocation(p, name);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  if (loc >= 0) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  return buf;
}

export interface Fbo {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
  resize(w: number, h: number): void;
}

export function createFbo(gl: WebGL2RenderingContext, w: number, h: number): Fbo {
  const tex = gl.createTexture()!;
  const fb = gl.createFramebuffer()!;
  const fbo: Fbo = {
    fb,
    tex,
    w,
    h,
    resize(nw, nh) {
      fbo.w = nw;
      fbo.h = nh;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, nw, nh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
  };
  fbo.resize(w, h);
  return fbo;
}
