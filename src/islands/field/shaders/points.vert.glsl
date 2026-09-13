#version 300 es
precision highp float;

in vec4 aSeed;      // random 0..1
in vec2 aName;      // 0..1 inside the name box, or (-1,-1) when unassigned
in vec3 aStar;      // point in the unit sphere, weighted to the surface
in vec4 aEjecta;    // xyz unit direction, w speed factor 0.6..1.4
in vec4 aDisk;      // x radius in r_s (3..12), y phase, z vertical jitter, w 1 = falls back
in float aFragment; // project index

uniform vec2 uResolution;   // css px
uniform float uDpr;
uniform float uProgress;    // lifecycle 0..1
uniform float uTime;        // seconds (0 under reduced motion)
uniform vec2 uAnchor;       // object centre, css px
uniform float uRadius;      // star radius R, css px
uniform vec4 uNameBox;      // x y w h of the h1 glyph box, css px
uniform float uNameMix;     // load-time assembly 0..1
uniform vec2 uPointer;      // css px
uniform float uPointerForce;// >0 repel, <0 attract
uniform float uHover;       // hovered fragment or -1
uniform float uHoverY;      // css px
uniform float uDiskScale;   // r_s in css px for disk geometry (R * 0.16)
uniform float uGain;

out float vBright;

const float TILT_COS = 0.2588; // cos 75 deg: the disk is seen nearly edge-on

// every call keeps a < b; reversed edges are undefined in GLSL ES
float ss(float a, float b, float x) { return smoothstep(a, b, x); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  float p = uProgress;

  // ---- phase weights ----
  float wStar     = ss(0.00, 0.10, p);                  // name streams into the star
  float wCollapse = ss(0.10, 0.15, p);                  // core collapse: shrink and dim
  float wBreak    = ss(0.15, 0.20, p);                  // shock breakout: thin bright shell
  float wEject    = ss(0.20, 0.24, p);                  // hand-off to free expansion
  float tEject    = clamp((p - 0.20) / 0.35, 0.0, 1.0); // 0.20..0.55
  float wRem      = ss(0.55, 0.60, p);                  // remnant
  float tRem      = clamp((p - 0.55) / 0.13, 0.0, 1.0);
  float wFall     = ss(0.68, 0.70, p);                  // fallback begins
  float tFall     = clamp((p - 0.68) / 0.14, 0.0, 1.0); // 0.68..0.82
  float wHole     = ss(0.80, 0.84, p);                  // disk fully Keplerian

  // ---- star (units of R) ----
  vec3 star = aStar;
  star.xz = rot(uTime * 0.05) * star.xz;
  star += 0.015 * sin(uTime * 0.6 + aSeed.xyz * 60.0);
  float rScale = mix(1.0 + 0.15 * wStar, 0.35, wCollapse);
  vec3 pStar = star * rScale;

  // ---- breakout shell ----
  vec3 nrm = normalize(aStar + vec3(1e-4));
  vec3 pShell = nrm * mix(0.35, 1.25, wBreak);

  // ---- ejecta: homologous (v proportional to r keeps the pattern self-similar), then Sedov deceleration ----
  float Rej = 1.25 + 7.0 * pow(tEject, 0.4);
  vec3 pEject = aEjecta.xyz * aEjecta.w * Rej;

  // ---- remnant: nearly stalled, slow turbulence ----
  vec3 turb = 0.08 * vec3(sin(uTime * 0.21 + aSeed.x * 31.0), sin(uTime * 0.17 + aSeed.y * 29.0), 0.0);
  vec3 pRem = aEjecta.xyz * aEjecta.w * (8.25 + 0.5 * tRem) + turb * tRem;

  // ---- Keplerian disk (omega proportional to r^-1.5), tilted toward edge-on ----
  float rsR = uDiskScale / uRadius;                 // r_s in units of R
  float rDisk = aDisk.x * rsR;
  float omega = 0.9 * pow(aDisk.x, -1.5);
  float ang = aDisk.y + uTime * omega * 6.0;
  vec3 pDisk = vec3(cos(ang) * rDisk, sin(ang) * rDisk * TILT_COS + aDisk.z * 0.1, 0.0);

  // ---- fallback: 30 % spiral in from the remnant onto the disk ----
  float falls = step(0.5, aDisk.w);
  float rFrom = length(pRem.xy) + 1e-3;
  float angFrom = atan(pRem.y, pRem.x);
  float tf = tFall * tFall * (3.0 - 2.0 * tFall);
  float rSp = mix(rFrom, rDisk, tf * tf);
  float turns = 6.0 * (1.0 - rSp / rFrom);          // tighter as it gets closer (angular momentum look)
  float angSp = mix(angFrom, ang, tf) + tf * turns;
  vec3 pSpiral = vec3(cos(angSp) * rSp, sin(angSp) * rSp * mix(1.0, TILT_COS, tf), 0.0);

  // ---- choose position by phase ----
  vec3 pos = pStar;
  pos = mix(pos, pShell, wBreak);
  pos = mix(pos, pEject, wEject);
  pos = mix(pos, pRem, wRem);
  pos = mix(pos, mix(pRem, pSpiral, falls), wFall);
  pos = mix(pos, mix(pRem, pDisk, falls), wHole);

  vec2 px = uAnchor + pos.xy * uRadius;

  // ---- name state (assigned particles only) ----
  float hasName = step(0.0, aName.x);
  vec2 namePx = uNameBox.xy + aName * uNameBox.zw;
  vec2 cloud = namePx + (aSeed.xy - 0.5) * vec2(uResolution.x * 0.5, uResolution.y * 0.6);
  vec2 nameNow = mix(cloud, namePx, uNameMix);
  float nameW = hasName * (1.0 - wStar);
  px = mix(px, nameNow, nameW);

  // ---- hovered project cluster gathers toward its row ----
  float isHover = step(0.5, 1.0 - abs(aFragment - uHover)) * step(0.0, uHover) * wEject * (1.0 - wRem);
  px = mix(px, vec2(uAnchor.x, uHoverY), 0.15 * isHover);

  // ---- pointer force (stateless spring) ----
  vec2 d = px - uPointer;
  float dist = length(d) + 1e-3;
  px += (d / dist) * 60.0 * (1.0 - ss(0.0, 140.0, dist)) * uPointerForce;

  // ---- brightness ----
  float cosT = clamp(aStar.z / max(length(aStar), 1e-3), 0.0, 1.0);
  float bStar = (1.0 - 0.6 * (1.0 - cosT)) * (1.0 - 0.4 * wCollapse);
  float flash = 3.0 * wBreak * (1.0 - ss(0.20, 0.26, p));
  float bEject = 6.0 / (Rej * Rej) + 0.5 * step(1.2, aEjecta.w);   // fades as R^-2, outer shell brighter
  float bRem = 0.22;
  float beta = 0.35 * pow(aDisk.x / 3.0, -0.5);                     // faster inside means stronger beaming
  float bDisk = (0.9 * (3.0 / aDisk.x) + 0.15) * pow(1.0 + beta * cos(ang), 3.0);

  float b = bStar + flash;
  b = mix(b, bEject, wEject);
  b = mix(b, bRem, wRem);
  b = mix(b, mix(bRem * (1.0 - 0.7 * tFall), mix(bRem, bDisk, tFall), falls), wFall);
  b = mix(b, mix(bRem * 0.3, bDisk, falls), wHole);
  b = mix(b, 0.9, nameW);
  b *= mix(1.0, 2.0, isHover);

  // name particles stay invisible until assembly starts (the real h1 carries the name until then)
  float invisibleName = hasName * (1.0 - wStar) * (1.0 - step(0.001, uNameMix));
  vBright = b * (1.0 - invisibleName) * uGain;

  float size = 1.4 + 1.2 * wBreak * (1.0 - ss(0.20, 0.26, p)) + 0.6 * falls * wHole;

  vec2 clip = (px / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = size * uDpr;
}
