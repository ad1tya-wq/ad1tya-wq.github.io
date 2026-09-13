#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform vec2 uHole;
uniform float uRsPx;
uniform vec4 uTextRect;
uniform float uExposure;

out vec4 outColor;

float bayer8(ivec2 p) {
  p &= 7;
  int x = p.x ^ p.y;
  int y = p.y;
  int v = ((x & 1) << 5) | ((y & 1) << 4) | ((x & 2) << 2) | ((y & 2) << 1) | ((x & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / (uResolution * uDpr);
  vec2 pxCss = vec2(gl_FragCoord.x / uDpr, uResolution.y - gl_FragCoord.y / uDpr);

  float lum = texture(uScene, uv).r;

  // dim the field by half inside the current text column so copy stays legible
  vec2 lo = step(uTextRect.xy, pxCss);
  vec2 hi = step(pxCss, uTextRect.xy + uTextRect.zw);
  lum *= 1.0 - 0.5 * lo.x * lo.y * hi.x * hi.y;

  lum = clamp(lum * uExposure, 0.0, 1.0);

  // ordered dither to four gray levels: graphite, fog, silver, core
  float q = floor(lum * 3.0 + bayer8(ivec2(gl_FragCoord.xy))) / 3.0;
  vec3 graphite = vec3(0.082, 0.086, 0.090);
  vec3 fog = vec3(0.494, 0.514, 0.533);
  vec3 silver = vec3(0.796, 0.808, 0.820);
  vec3 core = vec3(0.953, 0.949, 0.929);
  vec3 col = q < 0.17 ? graphite : (q < 0.5 ? fog : (q < 0.84 ? silver : core));
  outColor = vec4(col, 1.0);
}
