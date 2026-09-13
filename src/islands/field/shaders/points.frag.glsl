#version 300 es
precision mediump float;
in float vBright;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.15, 0.5, d);
  outColor = vec4(vec3(vBright * a), 1.0);
}
