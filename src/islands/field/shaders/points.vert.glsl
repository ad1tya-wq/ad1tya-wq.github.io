#version 300 es
precision highp float;

in vec4 aSeed;      // random 0..1
in vec2 aName;      // 0..1 inside the name box, or (-1,-1) when unassigned
in vec3 aStar;      // point in the unit sphere, weighted to the surface
in vec4 aEjecta;    // xyz unit direction, w speed factor 0.6..1.4
in vec4 aDisk;      // x radius in r_s (3..12), y phase, z vertical jitter, w 1 = falls back
in float aFragment; // project index
in vec2 aFace;      // 0..1 inside the portrait box, or (-1,-1) when unassigned
in vec3 aShip;      // ship-local x, y; z = 0 hull, (0,1] exhaust age, -1 not on the ship
in vec2 aPicto;     // 0..1 inside the pictogram box for the particle's project, or (-1,-1)
in vec4 aEat;       // eaten text: document css px, start time (-1 = free), lag 0..1 (+2 when flying back out)

uniform vec2 uResolution;   // css px
uniform float uDpr;
uniform float uProgress;    // lifecycle 0..1
uniform float uTime;        // seconds (0 under reduced motion)
uniform vec2 uAnchor;       // object centre, css px
uniform float uRadius;      // star radius R, css px
uniform vec4 uNameBox;      // x y w h of the h1 glyph box, css px
uniform float uNameMix;     // load-time assembly 0..1
uniform vec4 uFaceBox;      // x y w h of the portrait, css px
uniform float uFaceMix;     // 1 once portrait points exist
uniform vec3 uWave;         // reveal wave: origin xy (viewport css px), radius z; the photo shows inside
uniform float uActiveFragment; // project whose cluster forms its pictogram, or -1
uniform vec4 uPictoBox;     // x y w h of the pictogram slot, css px (viewport)
uniform float uPictoMix;    // pictogram assembly 0..1
uniform vec2 uPointer;      // css px
uniform float uPointerForce;// >0 repel, <0 attract
uniform float uHover;       // hovered fragment or -1
uniform float uHoverY;      // css px
uniform float uDiskScale;   // r_s in css px for disk geometry (R * 0.16)
uniform float uGain;
uniform float uMass;        // Horizon mass slider 0..1
uniform float uScroll;      // window.scrollY, css px (document -> viewport for eaten text)
uniform vec2 uEatenNameFace;// 1 when the hole has eaten the hero name / the portrait

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

  // ---- portrait state: particles sit exactly on the lit pixels of the dithered photo ----
  float hasFace = step(0.0, aFace.x);
  vec2 facePx = uFaceBox.xy + aFace * uFaceBox.zw;
  float faceW = hasFace * (1.0 - wStar);
  // the wavefront passing through the portrait nudges particles outward, then leaves the photo behind it
  vec2 wd = facePx - uWave.xy;
  float wDist = length(wd) + 1e-3;
  float front = exp(-pow((wDist - uWave.z) / 28.0, 2.0)) * step(0.5, uWave.z);
  float inside = 1.0 - ss(uWave.z - 24.0, uWave.z + 24.0, wDist);
  facePx += (wd / wDist) * 7.0 * front;
  px = mix(px, facePx, faceW);

  // ---- hovered project cluster gathers toward its row ----
  float isHover = step(0.5, 1.0 - abs(aFragment - uHover)) * step(0.0, uHover) * wEject * (1.0 - wRem);
  px = mix(px, vec2(uAnchor.x, uHoverY), 0.15 * isHover);

  // ---- the active project's ejecta cluster gathers into its pictogram beside the rows ----
  float hasPicto = step(0.0, aPicto.x);
  float isActive = step(0.5, 1.0 - abs(aFragment - uActiveFragment)) * step(0.0, uActiveFragment);
  float pictoW = hasPicto * isActive * uPictoMix * wEject * (1.0 - wRem);
  vec2 pictoPx = uPictoBox.xy + aPicto * uPictoBox.zw;
  px = mix(px, pictoPx, pictoW);

  // ---- spacecraft flyby during Projects and Skills: a gravity assist under the remnant ----
  float isShip = step(-0.5, aShip.z);
  float wShip = ss(0.28, 0.31, p) * (1.0 - ss(0.65, 0.68, p));
  float su = clamp((p - 0.29) / 0.38, 0.0, 1.0);
  float st = pow(su, 1.8);                                     // slow approach across Projects, periapsis at p = 0.55, fast exit in Skills
  vec2 P0 = vec2(0.04 * uResolution.x, uAnchor.y + 0.42 * uResolution.y);
  vec2 P1 = uAnchor + vec2(-0.35 * uRadius, 1.9 * uRadius);
  vec2 P2 = vec2(1.12 * uResolution.x, uAnchor.y - 0.48 * uResolution.y);
  vec2 shipPos = mix(mix(P0, P1, st), mix(P1, P2, st), st);
  vec2 heading = normalize(mix(P1 - P0, P2 - P1, st));
  vec2 across = vec2(-heading.y, heading.x);
  float shipLen = clamp(0.5 * uRadius, 40.0, 90.0);
  float flicker = 1.0 + 0.15 * sin(uTime * 23.0 + aSeed.x * 40.0) * step(0.001, aShip.z);
  vec2 shipPx = shipPos + heading * (aShip.x * shipLen) + across * (aShip.y * shipLen * flicker);
  float shipW = isShip * wShip;
  px = mix(px, shipPx, shipW);

  // ---- dust of eaten text: from where the (shrunken) block ended, a decaying orbit into the disk; reversed when the mass drops ----
  float hasEat = step(0.0, aEat.z);
  float eatLag = fract(aEat.w);
  float eatOut = step(1.5, aEat.w);
  float te = clamp((uTime - aEat.z - eatLag * 0.3) / 1.2, 0.0, 1.0);
  te = mix(te, 1.0 - te, eatOut);
  vec2 glyph = vec2(aEat.x, aEat.y - uScroll);
  vec2 rel = glyph - uAnchor;
  float r0 = length(rel) + 1e-3;
  float a0 = atan(rel.y, rel.x);
  float rEnd = aDisk.x * uDiskScale;                          // this particle's own place in the disk
  float ts = te * te * (3.0 - 2.0 * te);
  float rE = mix(r0, rEnd, pow(ts, 0.85));
  float turnsE = 2.0 + 3.0 * (1.0 - rE / r0);                 // faster spin as it gets in (angular momentum)
  float aE = a0 + ts * turnsE + eatLag * 0.25 * ts;           // lag smears a word along its streamline
  float squeeze = mix(1.0, TILT_COS, ts);
  vec2 eatPx = uAnchor + vec2(cos(aE) * rE, sin(aE) * rE * squeeze);
  vec2 diskPx = uAnchor + pDisk.xy * uRadius;
  eatPx = mix(eatPx, diskPx, ss(0.75, 1.0, te));              // hand over to the Keplerian disk
  px = mix(px, eatPx, hasEat);

  // ---- pointer force (stateless spring) ----
  vec2 d = px - uPointer;
  float dist = length(d) + 1e-3;
  px += (d / dist) * 60.0 * (1.0 - ss(0.0, 140.0, dist)) * uPointerForce;

  // ---- brightness ----
  float cosT = clamp(aStar.z / max(length(aStar), 1e-3), 0.0, 1.0);
  float bStar = (1.0 - 0.6 * (1.0 - cosT)) * (1.0 - 0.4 * wCollapse);
  float flash = 3.0 * wBreak * (1.0 - ss(0.20, 0.26, p));
  float bEject = 3.6 / Rej + 0.5 * step(1.2, aEjecta.w);           // fades with distance, outer shell brighter
  float bRem = 0.4;
  float beta = 0.35 * pow(aDisk.x / 3.0, -0.5);                     // faster inside means stronger beaming
  float bDisk = (0.9 * (3.0 / aDisk.x) + 0.15) * pow(1.0 + beta * cos(ang), 3.0);

  float b = bStar + flash;
  b = mix(b, bEject, wEject);
  b = mix(b, bRem, wRem);
  b = mix(b, mix(bRem * (1.0 - 0.7 * tFall), mix(bRem, bDisk, tFall), falls), wFall);
  b = mix(b, mix(bRem * 0.3, bDisk, falls), wHole);
  b = mix(b, 0.9, nameW);
  b = mix(b, mix(1.0, 0.12, inside) + 0.8 * front, faceW);
  b *= mix(1.0, 2.0, isHover);
  b = mix(b, 1.5, pictoW);
  float bShip = mix(1.1, 0.9 * (1.0 - aShip.z) * flicker, step(0.001, aShip.z));
  b = mix(b, bShip, shipW);
  // dust burns brighter and larger than the disk it falls through, then settles to disk brightness
  b = mix(b, (2.6 - 1.2 * te) * (1.0 - ss(0.75, 1.0, te)) + (0.9 * (3.0 / aDisk.x) + 0.15) * ss(0.75, 1.0, te), hasEat);

  // name particles stay invisible until assembly starts (the real h1 carries the name until then)
  float invisibleName = hasName * (1.0 - wStar) * (1.0 - step(0.001, uNameMix));
  float invisibleFace = hasFace * (1.0 - wStar) * (1.0 - step(0.001, uFaceMix));
  float eatenName = uEatenNameFace.x * hasName * (1.0 - wStar);
  float eatenFace = uEatenNameFace.y * hasFace * (1.0 - wStar);
  vBright = b * (1.0 - invisibleName) * (1.0 - invisibleFace) * (1.0 - eatenName) * (1.0 - eatenFace) * uGain;

  float size = 1.4 + 1.2 * wBreak * (1.0 - ss(0.20, 0.26, p)) + 0.5 * wEject * (1.0 - wFall) + 0.6 * falls * wHole;
  size = mix(size, 1.6, faceW);
  size = mix(size, 1.7, pictoW);
  size = mix(size, 1.7 - 0.5 * aShip.z, shipW);
  size = mix(size, mix(2.6, 1.6, ss(0.5, 1.0, te)), hasEat);

  vec2 clip = (px / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = size * uDpr;
}
