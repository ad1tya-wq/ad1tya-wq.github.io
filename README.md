# ad1tya-wq.github.io

Personal portfolio of Aditya Sahu. One monochrome WebGL particle object lives the life of a star as you scroll:
your name and portrait, a star, core collapse, shock breakout, ejecta (project pictograms, a spacecraft flyby),
remnant (orbit rings for the timeline), accretion disk, black hole (a slingshot toy and a mass slider that eats the page).

- Live: https://ad1tya-wq.github.io/
- Design spec: `docs/superpowers/specs/2026-09-13-portfolio-skeleton-design.md` (addenda at the end record every later decision)
- Build log: `docs/AFK-LOG-2026-09-14.md`

## High-level design

```
                 ┌──────────────────────────── build time (Node 22) ────────────────────────────┐
                 │  Markdown / JSON content ─► Astro content collections (zod schemas)          │
                 │  Phosphor SVGs ─► path data     resume.pdf, portrait ─► sharp dither + poster │
                 │  Astro components ─► static HTML + scoped CSS   Fonts API ─► self-hosted woff2│
                 └───────────────────────────────────┬──────────────────────────────────────────┘
                                                     ▼  dist/ (static, ~65 KB gz JS)
 ┌───────────────────────────────────────── browser ─────────────────────────────────────────────┐
 │  boot.ts ── createField() ──► one fixed <canvas>, WebGL2                                       │
 │     │            │  pass 1: 20k–80k GL_POINTS, additive, into an RGBA8 FBO                     │
 │     │            │  pass 2: composite: lensing, shadow, photon ring, text dimming, 8×8 dither  │
 │     │            └─ particles.worker.ts generates all static attributes off the main thread    │
 │     │                                                                                          │
 │     └── (after first frame) behaviours.ts, one chunk                                           │
 │            scroll.ts      ScrollTrigger per [data-chapter] ─► state.target ─► state.progress   │
 │            hero.ts        name + portrait sampled to points; wave hover                        │
 │            projectsActive pictogram per active project row, sticky readout                     │
 │            orbits.ts      one ring per timeline entry: launch, bead, tether                    │
 │            toy/           Paczyński–Wiita slingshot, drag to aim, predicted path               │
 │            devour/        mass slider: DOM blocks fly into the hole, dust, void, reset         │
 │            nav/, reveals, pointer                                                              │
 │                                                                                                │
 │  FieldState (plain object) is the only shared state: islands write it, the renderer reads it   │
 │  each frame and uploads it as uniforms. All motion is keyframed in the vertex shader from      │
 │  static attributes + progress, so it is reversible and costs nothing per frame on the CPU.     │
 └────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     ▲
              GitHub Actions (deploy.yml): test ─► build ─► JS budget ─► GitHub Pages
```

### The lifecycle

`progress` (0..1) is driven by scroll: each section is a chapter with a fixed slice of the range
(`src/islands/field/lifecycle.ts`). The vertex shader turns progress into position and brightness per particle:

| Progress | Chapter | Field |
| --- | --- | --- |
| 0.00–0.10 | Hero | name and portrait particles stream into a star |
| 0.10–0.28 | About | core collapse, shock breakout |
| 0.28–0.55 | Projects | homologous ejecta; the active project's cluster forms a pictogram; spacecraft flyby |
| 0.55–0.68 | Skills, Certificates | remnant |
| 0.68–0.82 | Experience, Education | fallback spiral; orbit rings per timeline entry |
| 0.82–0.94 | Horizon | Keplerian disk, lensed shadow; slingshot toy; mass slider |
| 0.94–1.00 | Contact | hole at rest |

## Tools, frameworks, and languages, and where each is used

| Layer | Tool | Where |
| --- | --- | --- |
| Framework | [Astro](https://astro.build) 7 (static output) | `src/pages/index.astro`, `src/layouts/Base.astro`, `src/components/*.astro` |
| Content | Astro content collections + `astro/zod` | `src/content.config.ts`; `src/content/{projects,experience,education}/*.md`, `skills.json`, `certificates.json`, `site.ts` |
| Fonts | Astro Fonts API (Google provider, self-hosted, subset) | `astro.config.mjs`; Syne (display), IBM Plex Mono (labels), IBM Plex Sans (body) |
| Language | TypeScript 5.9 (strict, `noUncheckedIndexedAccess`) | everything under `src/` and `scripts/`; `tsconfig.json` |
| Rendering | Raw WebGL2 (no library) | `src/islands/field/index.ts` (renderer, buffers, uniforms), `gl.ts` (programs, VAOs, FBO) |
| Shaders | GLSL ES 3.00 | `src/islands/field/shaders/points.vert.glsl` (all particle motion), `points.frag.glsl`, `composite.frag.glsl` (lensing, dither), `probe.vert.glsl` (toy and tether dots) |
| Concurrency | Web Worker (transferable buffers) | `src/islands/field/particles.worker.ts` ← `particles.ts` |
| Animation | [GSAP](https://gsap.com) 3 + ScrollTrigger + ScrollToPlugin | `scroll.ts` (chapter mapping), `reveals.ts`, `nav/topNav.ts`, `hero.ts`, `projectsActive.ts`, `orbits.ts`, `devour/index.ts`, `toy/index.ts` |
| Text → particles | Canvas 2D sampling | `src/islands/field/namePoints.ts` (`sampleName`, `sampleImage`, `samplePath`) |
| Icons | [Phosphor Icons](https://phosphoricons.com) (`@phosphor-icons/core`, MIT) read at build time | `src/lib/picto.ts` → `Projects.astro` (`data-picto`) → `projectsActive.ts` |
| Generative art | Seeded ring seals (FNV-1a hash) | `src/lib/seal.ts` → `Certificates.astro` |
| Physics | Paczyński–Wiita pseudo-Newtonian potential, semi-implicit Euler | `src/islands/toy/slingshot.ts` (`accel`, `stepProbe`, `predict`, `escapeSpeed`) |
| Images | [sharp](https://sharp.pixelplumbing.com) 0.35 | `scripts/dither.ts` (transparent 1-bit dither, half-size variant, AVIF/WebP), `scripts/poster.ts` (no-WebGL fallback) |
| Portrait cut-out | rembg (`isnet-general-use`), run once offline | produces `src/assets/portrait.png` |
| Styling | Plain CSS with design tokens, scoped component styles | `src/styles/tokens.css` (five grays, spacing, motion), `src/styles/global.css`, `<style>` blocks per component |
| Testing | [Vitest](https://vitest.dev) 5 | `*.test.ts` next to every pure module (lifecycle, particles, layout, name sampling, slingshot, devour rules, ring pool, seals, chronology, picto) |
| Type checking | `@astrojs/check` | `npm run check` |
| Scripts | `tsx` (TypeScript runner) | `scripts/*.ts` |
| Budget gate | Node script | `scripts/budget.mjs` fails the build above 120 KB gzipped JS |
| CI / hosting | GitHub Actions → GitHub Pages | `.github/workflows/deploy.yml`: test → build → budget → deploy on every push to `main` |
| Runtime | Node 22 (build), evergreen browsers with WebGL2 (site) | `package.json` `engines`; no-WebGL visitors get the dithered poster |

No UI framework, no Tailwind, no Three.js, no analytics, no third-party requests at runtime.

## Repository layout

```
src/
  pages/index.astro          the single page: sections in order
  layouts/Base.astro         head, fonts, canvas, top nav, boot script
  components/                one .astro per section (+ Timeline, DitheredImage, TopNav)
  content/                   all copy and data; content.config.ts holds the schemas
  islands/
    boot.ts                  creates state + field immediately
    behaviours.ts            everything GSAP-based, loaded after the first frame
    field/                   renderer, shaders, particle generation, lifecycle math, scroll mapping
    devour/                  mass slider: block ordering, ring pool, flights
    toy/                     slingshot physics and controls
    nav/                     top pill: collapse, indicator, mobile disc
    hero.ts orbits.ts projectsActive.ts reveals.ts pointer.ts
  lib/                       build-time helpers (icons, seals, chronology)
  styles/                    tokens and global CSS
scripts/                     dither, poster, budget
public/                      resume.pdf, portrait-dither*, poster.png, favicon
docs/                        design spec, implementation plan, build log
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:4321 (adds `window.__portfolio = { state, field }` for poking the lifecycle from the console) |
| `npm run build` | Static build to `dist/` (downloads and subsets the fonts) |
| `npm test` | Vitest for the pure modules |
| `npm run check` | Astro + TypeScript type check |
| `npm run budget` | Fails if gzipped JS in `dist/` exceeds 120 KB (currently about 65 KB) |
| `npm run dither` | Regenerates `public/portrait-*` from `src/assets/portrait.png` |
| `npm run poster` | Regenerates the no-WebGL fallback `public/poster.png` |

## Editing content

1. `src/content/site.ts`: name, title, one-line bio, links, resume path.
2. `src/components/About.astro`: the About paragraphs.
3. `src/content/projects/*.md`: `title`, `summary` (≤140 chars), `detail` (≤420 chars), `stack`, `repo`, `url`, `icon` (a Phosphor regular icon name listed in `src/lib/picto.ts`), optional `year`, `order`.
4. `src/content/experience/*.md`: one file per role, optional `certificate` link. `src/content/education/*.md`: one file per degree, `score` as label + value. Rings in the field are assigned by start year automatically.
5. `src/content/skills.json`: bands (technical bands plus Soft skills). `src/content/certificates.json`: title, issuer, id, verify URL (seal art derives from the id).
6. `src/assets/portrait.png` (transparent cut-out), then `npm run dither`.
7. `public/resume.pdf`.

## Interactions worth knowing

- **Portrait**: desktop shows particles; hovering reveals the photo as a circle growing from the pointer (640 px/s); a click pins it. Touch shows the image and dissolves it on the first scroll.
- **Projects** (desktop ≥ 1024 px): the row nearest the centre forms its pictogram on the right; hover or focus forces a row.
- **Experience / Education**: each entry launches a ring into orbit the first time it is read; the active entry is tethered to its bead.
- **Horizon**: press anywhere and drag to aim the probe (predicted path shown), release to launch; arrow keys retune the default shot. The mass slider scales the hole and its gravity and eats the page nearest-first; lowering it brings everything back; at full mass the screen goes black and only "Reset the universe?" remains.
- **Reduced motion**: static field per chapter, real text everywhere, fades instead of flights.

## Quality bar (production build)

Lighthouse with a GPU-enabled Chrome: desktop 100 / 100 / 100 / 100; mobile 77 / 100 / 100 / 100 under the simulated slow-phone profile
(the remaining cost is the cold first layout of the page's text, not script). Text stays at or above 4.5:1 against its surface;
every control has a visible focus ring and a 44 px hit area; no WebGL2 gets a dithered poster; WebGL context loss rebuilds the renderer.

## Reserved for later

- Custom domain (`CNAME` in `public/`, `site` in `astro.config.mjs`, DNS at the registrar).
- `#play`: a Spaceship Battleship section with an in-browser ML opponent (ONNX Runtime Web), as a lazy-loaded island.
