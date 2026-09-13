#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;   // css px
uniform float uDpr;
uniform vec2 uHole;         // hole centre, css px
uniform float uRsPx;        // Schwarzschild radius, css px (0 = no hole yet)
uniform vec4 uTextRect;     // x y w h css px
uniform float uExposure;

out vec4 outColor;

float bayer8(ivec2 p) {
  p &= 7;
  int x = p.x ^ p.y;
  int y = p.y;
  int v = ((x & 1) << 5) | ((y & 1) << 4) | ((x & 2) << 2) | ((y & 2) << 1) | ((x & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}

float sceneAt(vec2 pxCss) {
  vec2 uv = vec2(pxCss.x / uResolution.x, 1.0 - pxCss.y / uResolution.y);
  return texture(uScene, uv).r;
}

void main() {
  vec2 pxCss = vec2(gl_FragCoord.x / uDpr, uResolution.y - gl_FragCoord.y / uDpr);
  float lum;

  if (uRsPx > 0.5) {
    vec2 d = pxCss - uHole;
    float b = length(d) / uRsPx;              // impact parameter in r_s

    // screen-space deflection ≈ α = 2 r_s / b: pulls the far side of the disk over and under the shadow
    float k = 1.6;
    vec2 warped = uHole + d * (1.0 - k / max(b * b, 1.0));
    lum = sceneAt(warped);

    // photon ring at b ≈ 2.6, fed by light from the whole disk (sampled on a small ellipse at b = 4)
    float ring = smoothstep(2.55, 2.62, b) * (1.0 - smoothstep(2.72, 2.85, b));
    float feed = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853981634;
      feed += sceneAt(uHole + vec2(cos(a), sin(a) * 0.35) * uRsPx * 4.0);
    }
    lum += ring * (0.5 + 1.5 * feed / 8.0);

    // shadow with a soft edge
    lum *= smoothstep(2.45, 2.6, b);
  } else {
    lum = sceneAt(pxCss);
  }

  // dim the field by half inside the current text column
  vec2 lo = step(uTextRect.xy, pxCss);
  vec2 hi = step(pxCss, uTextRect.xy + uTextRect.zw);
  lum *= 1.0 - 0.5 * lo.x * lo.y * hi.x * hi.y;

  lum = clamp(lum * uExposure, 0.0, 1.0);

  // ordered dither to four gray levels
  float q = floor(lum * 3.0 + bayer8(ivec2(gl_FragCoord.xy))) / 3.0;
  vec3 graphite = vec3(0.082, 0.086, 0.090);
  vec3 fog = vec3(0.494, 0.514, 0.533);
  vec3 silver = vec3(0.796, 0.808, 0.820);
  vec3 core = vec3(0.953, 0.949, 0.929);
  vec3 col = q < 0.17 ? graphite : (q < 0.5 ? fog : (q < 0.84 ? silver : core));
  outColor = vec4(col, 1.0);
}
