#version 300 es
precision highp float;

in vec4 aSeed;
in vec2 aName;
in vec3 aStar;
in vec4 aEjecta;
in vec4 aDisk;
in float aFragment;

uniform vec2 uResolution;
uniform float uDpr;
uniform float uProgress;
uniform float uTime;
uniform vec2 uAnchor;
uniform float uRadius;
uniform vec4 uNameBox;
uniform float uNameMix;
uniform vec2 uPointer;
uniform float uPointerForce;
uniform float uHover;
uniform float uHoverY;
uniform float uDiskScale;
uniform float uGain;

out float vBright;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  vec3 star = aStar;
  star.xz = rot(uTime * 0.05) * star.xz;                 // slow rotation
  star += 0.015 * sin(uTime * 0.6 + aSeed.xyz * 60.0);   // granulation
  vec2 px = uAnchor + star.xy * uRadius;

  // stateless pointer spring: pushed while the pointer is near, returns when it leaves
  vec2 d = px - uPointer;
  float dist = length(d) + 1e-3;
  px += (d / dist) * 60.0 * (1.0 - smoothstep(0.0, 140.0, dist)) * uPointerForce;

  float cosT = clamp(star.z / max(length(star), 1e-3), 0.0, 1.0);
  vBright = (1.0 - 0.6 * (1.0 - cosT)) * uGain;          // limb darkening

  vec2 clip = (px / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 1.5 * uDpr;
}
