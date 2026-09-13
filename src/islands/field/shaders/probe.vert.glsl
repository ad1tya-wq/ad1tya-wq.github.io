#version 300 es
precision highp float;
in vec2 aPos;          // css px
uniform vec2 uResolution;
uniform float uDpr;
out float vBright;
void main() {
  vec2 clip = (aPos / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 2.6 * uDpr;
  vBright = 1.0;
}
