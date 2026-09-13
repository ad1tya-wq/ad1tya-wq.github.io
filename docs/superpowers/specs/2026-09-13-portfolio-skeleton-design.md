# Portfolio Website: "Singularity" Design Spec (2026-09-13)

## Context

A new personal portfolio site, built from scratch (no repo yet; D:\ has no project files). The brief asked for a space theme (a star exploding and a black hole forming, driven by scroll), small animations on every interaction, a floating semi-hidden nav, a simple catchy hero (name + title in a different font + picture), no bloat, and none of the "vibe-coded" tells (violet gradients, glow, glass, default dark mesh). References: landonorris.com, apple.com/iphone, madhavdogra.com.

Three directions were proposed; the user chose **Direction 3, "Singularity"**: dark but restrained, strictly monochrome, one persistent GPU particle object that assembles the user's name on load and then lives the full life of a star as you scroll. The user asked for the animation to be **physically realistic** (researched below), a **treated (dithered) portrait**, sections **About, Projects, Skills (technical + soft), Experience, Contact + resume**, plus a **small physics toy now** and a reserved slot for a future **Spaceship Battleship** game with an ML opponent.

Decisions locked: Stack = Astro + TypeScript (confirmed), hosting = GitHub Pages now, custom domain later. Projects have no good images, so Projects are visualised by the star field itself (see below).

Design read: personal portfolio for recruiters and peers; Madhav-lineage single-object hero; Apple-tier scroll scrub; Lando-tier polish. Dials: variance 7 / motion 7 / density 3.

---

## 1. Design system

### Palette (zero-color system; no accent hue anywhere)
| Token | Hex | Use |
|---|---|---|
| `--graphite` | `#151617` | page surface (warm off-black; never `#000`) |
| `--smoke` | `#1F2123` | rare raised surface (toggle track, code) |
| `--fog` | `#7E8388` | secondary text, hairlines at 40% (4.9:1 on graphite) |
| `--silver` | `#CBCED1` | body text (11.7:1 on graphite) |
| `--core` | `#F3F2ED` | star core, primary button fill, hover inversions |

The only color on the site is the user's portrait and nothing else, and only on hover/focus (see §6). No gradients, no glow, no box-shadow, no blur, no glass.

### Type
| Role | Face | Setting |
|---|---|---|
| Name (h1, particle source) | Syne 800 | `clamp(56px, 11vw, 168px)`, leading 0.9, tracking -0.02em |
| Section headings | Syne 700 | 32-44px, tracking -0.01em |
| Title under name, labels, dates, mode toggle | IBM Plex Mono 400 | 13-15px, tracking 0.06em, lowercase |
| Body | IBM Plex Sans 400/500 | 17px / 1.6, max 62ch |

Self-hosted variable/woff2 subsets, `font-display: swap`, metric-matched fallbacks (`size-adjust`) so nothing shifts. Two font files above the fold (Syne, Plex Mono); Plex Sans loads after.

### Space, shape, motion tokens
- Spacing scale: 8 / 16 / 24 / 40 / 64 / 96 / 160 px. Section padding 160px desktop, 96px mobile.
- Radius: one system: pills (999px) for buttons/toggles, 0 for everything else. No cards anywhere; grouping by whitespace and single hairlines.
- Easing: `--ease-out: cubic-bezier(0.32, 0.72, 0, 1)`; `--ease-in: cubic-bezier(0.4, 0, 1, 1)` for exits.
- Durations: hover 150-200ms, press 90ms, reveal 350ms, nav open 320ms / close 200ms, image color-in 220ms, mode tween 1100ms.

### Copy rules
Sentence case, plain verbs, no em-dashes, no eyebrows except at most one, no "scroll" cues, no section numbers, no filler adjectives. One label per intent: "Contact" (the nav's right pill) scrolls to the Contact section; there, "Email me" and "Download resume" are the only two actions.

---

## 2. Page map and the star's lifecycle

The fixed canvas renders one object. Scroll position maps to a lifecycle `progress` in [0,1]. Each section owns a progress range; ScrollTrigger per section sets a target, and a per-frame lerp (0.12) smooths it so scrubbing never jumps and is fully reversible.

| Section (`id`) | progress | Object state | Why this pairing |
|---|---|---|---|
| Hero (`#top`) | 0.00-0.10 | Particles hold the **name**; a small calm star sits right-center. On scroll the name streams into the star, which grows. | You become the star. |
| About (`#about`) | 0.10-0.28 | **Collapse** (star shrinks and dims for a beat) then **shock breakout** (flash, thin bright shell). | The turning point sits beside "who I am". |
| Projects (`#projects`) | 0.28-0.55 | **Ejecta**: homologous expansion with Rayleigh-Taylor fingers, decelerating. Each project is a fragment cluster. | Projects are what flew out. |
| Skills (`#skills`) | 0.55-0.68 | **Remnant**: expansion nearly stalled, fine filament structure. Skills shown as a spectrum. | Astronomers read a remnant's composition from its spectrum. |
| Experience (`#experience`) | 0.68-0.82 | **Fallback**: a fraction of material spirals back and settles into a Keplerian disk. | Time spiraling inward. |
| Horizon (`#horizon`) | 0.82-0.94 | **Black hole**: shadow, photon ring, lensed disk, Doppler asymmetry. Slingshot toy lives here. | The climax, and the toy's physics. |
| Contact (`#contact`) | 0.94-1.00 | Disk quiets; the hole sits centered behind a short line and two actions. | Get pulled in. |
| Play (`#play`, future) | between Horizon and Contact | Battleship island; the field dims to a grid. | Reserved; not rendered until it exists. |

Layout: the object is anchored right-of-center on desktop (`~62vw, 50vh`) and content flows in the left ~46% column, except Horizon and Contact where content centers on the hole. On mobile the object sits behind content at `50vw, 38vh` at reduced density. The composite pass attenuates particle brightness by 50% inside the current text column so copy stays legible during the nova.

---

## 3. Renderer spec (the core of the site)

### Architecture
- One `<canvas>` (`position: fixed; inset: 0; pointer-events: none`), WebGL2, DPR capped at 1.5 (2 on desktop if frame time allows; auto-steps down if a frame exceeds 20 ms three times).
- **Two draw calls per frame:** (1) points pass into an offscreen float/half-float texture; (2) full-screen composite pass.
- **All motion is computed in the vertex shader** from static per-particle attributes plus uniforms `uProgress`, `uTime`, `uPointer`, `uPointerDown`, `uHover`, `uTextRect`. The CPU uploads nothing per frame. This is what makes it HD and smooth at 60 fps on a laptop and 30+ on a phone.
- Particle count: `clamp(viewportArea * 0.035, 15k, 60k)`; background dust 1.5k extra points.
- rAF runs at full rate while scrolling or pointer-moving, drops to 30 fps when idle, pauses when the tab is hidden.
- Deterministic seeded PRNG for attributes so the object is identical on every visit.

### Per-particle static attributes (generated once)
- `aSeed` vec4 random.
- `aName` vec2: a point sampled from the rendered `<h1>` glyphs (offscreen 2D canvas, Syne loaded via `document.fonts.load`, then rejection-sampled from filled pixels). ~55% of particles get a name point; the rest start in the small star.
- `aStar` vec3: point in a sphere, weighted toward the surface, radius R.
- `aEjecta` vec4: outward direction = normalized(aStar) perturbed by 3D value noise sampled at the direction (neighbouring directions share the perturbation, which is what produces filaments), plus a speed factor 0.6-1.4 also noise-correlated (this makes Rayleigh-Taylor fingers: fast lanes and slow lanes).
- `aDisk` vec4: orbital radius r in [3, 12] r_s with density ∝ r^-1.5, phase, vertical jitter, and a flag for "falls back" (30% of particles) vs "escapes as remnant" (70%).
- `aFragment` float: project index 0..N for cluster membership (ejecta grouped by direction cones), -1 otherwise.

### Lifecycle keyframes (vertex shader, blended with smoothstep between neighbours)
| progress | State | Position | Brightness / size | Realism note |
|---|---|---|---|---|
| 0.00 | Name | `aName` (assembled on load, see §5) | uniform, 1 px | |
| 0.00-0.10 | Name → star | lerp to `aStar` along a slight arc; star radius grows R→1.15R | limb-darkened `I = 1 - 0.6(1 - cosθ)`; granulation drift from `uTime` | Real stars are limb-darkened and convective. |
| 0.10-0.15 | Collapse | radius → 0.35R, ease-in | dims 40% | Core collapse takes < 1 s in reality: a short scroll span so it reads as a blink. |
| 0.15-0.20 | Shock breakout | thin shell at R expands fast | flash ×3, size ×2 for the shell | The first light of any supernova is the breakout flash. |
| 0.20-0.55 | Ejecta | `dir * speed * R(t)`, `R(t)` fast then `∝ t^0.4` | fades `∝ R^-2`; thin outer shell brighter | Homologous expansion (v ∝ r) keeps the filament pattern self-similar; Sedov deceleration as it sweeps up gas. |
| 0.55-0.68 | Remnant | expansion nearly stalled; slow turbulence | fine filaments, dim | Cas A / Crab morphology. |
| 0.68-0.82 | Fallback | 30% spiral inward (angular momentum conserved: tighter spirals as r shrinks) and settle on `aDisk`; 70% linger as faint remnant | inner particles brighten | Fallback accretion onto the compact remnant. |
| 0.82-1.00 | Black hole | disk orbits with `ω ∝ r^-1.5`, tilted ~75° to camera; slow inspiral drift via `uTime` | Doppler: `I *= (1 + β cosφ)^3`, inner edge brightest | Keplerian shear, beaming asymmetry (visible in the EHT image). |

### Composite pass (fragment shader over the full screen)
- Input: points texture. Output: final frame.
- Hole center `c` in screen space, Schwarzschild radius `r_s` in pixels (grows with progress 0.82→0.90 so the hole visibly "forms").
- For pixel offset `d = p - c`, `b = |d| / r_s`:
  - `b < 2.6`: shadow (black, 1.5 px soft edge).
  - else sample source at `p' = c + d * (1 - k / b²)` with `k` ramping 0→~1.6 as the hole forms (screen-space deflection approximation of `α = 2 r_s / b`; produces the Einstein-ring smear and lifts the far side of the disk above and below the shadow, the Interstellar halo).
  - photon ring: thin bright band at `2.6 < b < 2.75` fed by the disk's average intensity.
- Text-column attenuation: multiply by 0.5 inside `uTextRect`.
- **Ordered dither**: quantise to 4 gray levels with an 8×8 Bayer threshold at device pixels. This gives the stipple texture (Madhav's ASCII feel without ASCII) and makes the field and the dithered portrait one material.
- Tone: intensity mapped to `graphite → silver → core`; no color channel is ever non-gray.

### Fallbacks
- No WebGL2 or context lost: swap in a static dithered PNG poster of the star state; page fully usable.
- `prefers-reduced-motion`: `uTime` frozen, no assembly animation, `uProgress` snaps per section (no lerp), pointer forces off. Real `<h1>` stays visible.
- Low-end heuristic (`hardwareConcurrency ≤ 4` or first frames > 33 ms): particle count ×0.4, DPR 1, dither on.

### Reference material used for realism
- Precomputed-geodesic real-time shader: https://ebruneton.github.io/black_hole_shader/ (too heavy; informs disk shading, beaming, photon ring)
- Ray-traced WebGL2 black hole: https://github.com/bzk9x/blackhole (too heavy for a background)
- Screen-space lensing over particles: https://github.com/Scenes3D/black-hole (the approach adopted)
- Keplerian particle disks: https://github.com/Niiflheim01/singularity, https://particles.alexandrudan.com/
- Core-collapse shock breakout and ejecta morphology: https://arxiv.org/pdf/1409.5431, https://iopscience.iop.org/article/10.1086/375701

---

## 4. Navigation (madhavdogra.com pattern, made semi-hidden)

Three fixed elements along the top, 20 px from the edge, like Madhav's header:

```
 NAME                 ( ABOUT  PROJECTS  SKILLS  EXPERIENCE  HORIZON )            ( CONTACT )
 wordmark, left        floating pill, centered                                    filled pill, right
```

- **Wordmark (left)**: the user's name in Syne 700, 14 px, uppercase; links to `#top`.
- **Center pill**: `<nav>` with a `<ul>` of section links (About, Projects, Skills, Experience, Horizon; Play added later). Solid `--smoke` background (no blur, no glass), 1 px hairline `--fog` at 30%, 44 px tall, fully rounded. Labels in Plex Mono 13 px, uppercase, tracking 0.08em (chrome labels are uppercase; content labels stay lowercase). Padding gives every item a ≥ 44 × 44 px target.
- **Active indicator**: a `--core` filled pill behind the current item (text turns `--graphite`), driven by ScrollTrigger section enter/leave. It *slides* between items with `transform` only, 250 ms `--ease-out`, and stretches slightly mid-slide (scaleX 1.08 at 50%) for the Madhav feel.
- **Contact pill (right)**: the page's single primary CTA, `--core` fill, `--graphite` text, hover inverts (outline), press `scale(0.98)`. Because it lives here, the hero does not repeat it.
- **Semi-hidden behaviour** (the brief's requirement layered on Madhav's always-visible pill): on the hero the pill is fully expanded. Once the user scrolls down past the hero, the pill collapses around the active item only (width animates via `transform: scaleX` on a measured wrapper plus opacity fade of the other labels, 300 ms); the wordmark and Contact pill fade to 60 %. Scroll-up, hover, `:focus-within`, or a tap re-expands it (250 ms); it collapses again 1.2 s after the pointer leaves while scrolling down. Reduced motion: no collapse animation, instant states.
- **Keyboard**: normal Tab order (wordmark → nav items → Contact). Focus expands the pill; Escape collapses it and keeps focus. Links smooth-scroll via ScrollTrigger-aware `scrollTo` and update the URL hash.
- **Mobile (< 768 px)**: the center pill starts collapsed (active label + a menu icon from Phosphor Light); tap expands it to a full-width row of labels (horizontal scroll-snap if they overflow); wordmark shrinks to initials; Contact stays as an icon-only pill with `aria-label`.
- Theme toggle (Madhav has one) is intentionally omitted: the site is one material. A light "ink on paper" theme is possible later by inverting the composite pass tone map.

---

## 5. Hero

```
┌──────────────────────────────────────────────────────────────┐
│ NAME        ( ABOUT PROJECTS SKILLS EXPERIENCE HORIZON )  (CONTACT) │
│                                               ┌─────────┐    │
│                                               │ dithered│    │
│   ▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒▒           ○ small star    │ portrait│    │
│   ▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒▒                            │ 1:1     │    │
│   (name in particles)                          └─────────┘    │
│                                                              │
│   title in plex mono                                          │
│   one line, ≤ 20 words, plex sans                             │
│   Projects →                                                  │
└──────────────────────────────────────────────────────────────┘
```
- Load sequence: real `<h1>` renders immediately in Syne (readable at 0 ms, no CLS). Once fonts are ready, particles assemble onto the glyphs over 900 ms from a loose cloud while the `<h1>` fades to `opacity: 0` (stays in the DOM for a11y and SEO). Under reduced motion the `<h1>` simply stays.
- Text elements: name, title (Plex Mono), one-line bio (Plex Sans, ≤ 20 words), one text link "Projects". The Contact CTA lives in the nav (§4), so the hero does not repeat it.
- Portrait: 1:1, 220-280 px on desktop, top-right; dithered by default, color on hover/focus (§6). On touch it colors while centered in the viewport.
- Mobile: name particles top, portrait 120 px, star behind, buttons full width.

---

## 6. Treated imagery pipeline (portrait; project images if ever added)
- Build-time script (`scripts/dither.ts`, uses `sharp`): grayscale → contrast stretch → 8×8 Bayer ordered dither to 1-bit at 2× → PNG (tiny). Also emit the color original as AVIF/WebP ≤ 150 KB.
- Markup: color image stacked over the dithered one; color layer `opacity: 0 → 1` in 220 ms on `:hover` / `:focus-visible` / `.is-centered` (IntersectionObserver, touch only). `prefers-reduced-motion`: instant swap.
- This is the site's single bold move: everything is stippled monochrome; the only color is you, and only when someone reaches for it.

---

## 7. Sections

**About.** Left column, 3-5 short paragraphs max, one heading. No photo (the hero has it). Reveal: opacity + 12 px rise, once.

**Projects (no images).** Wide rows: name (Syne 700, 28 px), one-line description, stack in Plex Mono, external link. Hovering/focusing a row sets `uHover = index`; that project's fragment cluster in the field brightens ×2 and gathers slightly toward the row's vertical position (spring, stateless in shader). Leaving releases it. Rows separated by a single hairline; no cards, no thumbnails. Source: `src/content/projects/*.md` (title, summary, stack, repo, url, order).

Seed list from github.com/ad1tya-wq (public, non-fork; descriptions to be tightened to ≤ 20 words each; user may reorder or drop):
1. `codegate` + `codegate-scanner`: certified LLM-escalation gate for AI-generated code security triage (Learn-Then-Test conformal risk control). Python. Present as one project with two repos.
2. `Corporate-Finance-Risk-Analysis`: autonomous financial-controller agent, Prophet forecasting + Docling RAG, LangGraph, Streamlit. Python.
3. `family-tree`: offline-first Android family tree with kinship inference, English/Hindi term packs. Kotlin.
4. `context-based-vulnerability-scoring-engine`: context-aware vulnerability scoring. Jupyter/Python.
5. `travel-planner`: RAG-powered eco-friendly itinerary planner. Python.
6. `EWSD-frontend`: Early Warning Sepsis Detector dashboard. JavaScript.
7. `stocktracker`: Java stock tracker built to exercise a Jenkins/Maven/Ansible/Docker/Grafana CI/CD pipeline.
Excluded: `Java-Codes-for-ACC` (coursework). Fragment clusters in the field: one per listed project (7).

**Skills (spectrum).** A horizontal band (like a stellar spectrum): each technical skill is a thin vertical emission line; lines are grouped into labelled wavelength bands by category (Languages, Frameworks, Data/ML, Tools). Line height encodes nothing (no fake proficiency); hover/focus shows the label in Plex Mono. It is a real `<ul>` per band styled as lines, so it reads fine to screen readers. Soft skills: three or four plain sentences beneath, not badges. If this proves gimmicky in the browser, fallback is a two-column grouped list.

**Experience.** Vertical entries (role, org, dates in Plex Mono, 1-2 lines). The connecting hairline is an SVG path that curves inward toward the object (the accretion spiral), drawn on scroll (`stroke-dashoffset`). Dates carry order; no numbering.

**Horizon (toy).** The black hole is fully formed. A small caption "Launch a probe" with a `<button>`; clicking (or dragging on the field) launches a probe from the left edge with the drag vector as velocity. Probe integration: 2D Newtonian gravity with a Paczyński-Wiita pseudo-potential `Φ = -GM / (r - r_s)` (cheap, reproduces an innermost stable orbit and capture), semi-implicit Euler at 240 Hz substeps in a ~2 KB TS island; the probe and its trail are drawn as extra points in the same particle pass (a small dynamic buffer, ≤ 2k points). Outcomes: escapes, orbits (stable for a few loops), or is captured (fades at the horizon). Pointer forces on the field are disabled while a probe is live so the two systems never fight. Keyboard: Space launches with a default vector; arrows adjust it.

**Contact.** Centered inside the horizon: one sentence, "Email me" (mailto), "Download resume" (PDF), GitHub and LinkedIn as text links. Footer line: name, year. No version strings, no locale strips.

**Play (future).** Reserved `#play` section, not rendered until the game exists. Contract: a lazy-loaded island (`client:visible`), owns its own `<canvas>`, uses the same tokens and dither pass, receives `{ tokens, reducedMotion }`. Board = sector grid over a dimmed field; hits = local breakout flashes; opponent = ONNX Runtime Web model loaded on demand (< 2 MB target). React island permitted for this section only if convenient.

---

## 8. Fidget: pointer forces and lifecycle modes
- Pointer move: particles within 140 px are pushed away (`offset = dir * 60px * smoothstep(140, 0, d)`), springing back because the effect is a stateless function of the current pointer (no drift, no simulation).
- Press and hold: force flips to attraction and grows over 400 ms; release snaps back with a 300 ms ease.
- Mode toggle (bottom-left, Plex Mono pills): `follow scroll` (default) · `star` · `nova` · `remnant` · `horizon`. Choosing a mode tweens `uProgress` to that state in 1100 ms and detaches from scroll; any scroll re-attaches and the toggle returns to `follow scroll`. All buttons ≥44 px, `aria-pressed`.

---

## 9. Micro-interaction table (every interactive element)
| Element | Hover | Press | Focus |
|---|---|---|---|
| Pill button | fill `--core` → text `--graphite` inverts in 150 ms | `scale(0.98)` 90 ms | 2 px `--core` ring, offset 3 px |
| Text link | underline draws left→right (`scaleX`) 180 ms; exit 120 ms | | same ring |
| Project row | title shifts 4 px right, arrow fades in; field cluster brightens | | ring on the row |
| Skill line | line brightens, label fades in 150 ms | | ring + label |
| Nav item | text `--fog` → `--core` 150 ms; pill expands if collapsed | `scale(0.98)` | expands pill, ring |
| Nav active indicator | | | slides to the new section 250 ms with a slight stretch |
| Portrait | color in 220 ms | | color in |
| Mode pill | text brightens; active pill inverted | `scale(0.98)` | ring |
Exits always faster than entries. Only `transform` and `opacity` animate.

---

## 10. Performance budget and verification targets
- JS ≤ 110 KB gz total: GSAP core + ScrollTrigger ≈ 30 KB, renderer ≤ 15 KB, toy ≤ 3 KB, nav/misc ≤ 5 KB, Astro islands runtime ≈ 2 KB. No Three.js, no React on the main page.
- Fonts ≤ 110 KB (3 subsets). Portrait ≤ 150 KB color + ≤ 30 KB dithered.
- LCP < 1.5 s (the `<h1>` text is the LCP element), CLS < 0.05, INP < 200 ms.
- 60 fps scrolling on a mid-range laptop; ≥ 30 fps on a mid-range Android; canvas frame ≤ 8 ms desktop.
- Lighthouse Performance ≥ 95, Accessibility 100.

---

## 11. Accessibility floor
- Skip link, landmark regions, real headings, `<h1>` name always in DOM.
- All text ≥ 4.5:1 at every scroll position (particles never exceed `--silver` behind text columns because of the attenuation rect; verify at progress 0, 0.18, 0.4, 0.6, 0.85, 1).
- Full keyboard path: nav pill, mode pills, project rows, skill lines, toy, contact links. Visible focus everywhere.
- Reduced motion path tested end to end; toy still usable (probe moves, no field motion).
- Canvas `aria-hidden="true"`; the story is told in text, the canvas illustrates it.

---

## 12. Stack and repository layout (Astro + TypeScript, static)
```
portfolio/
  astro.config.mjs            site URL, static output, base for GitHub Pages
  package.json                astro, typescript, gsap, sharp (dev), vitest (dev)
  public/                     favicon, resume.pdf, poster fallback PNGs
  scripts/dither.ts           build-time portrait/dither pipeline
  src/
    styles/tokens.css         palette, type, spacing, motion tokens
    styles/global.css         reset, base type, focus styles, reduced-motion
    layouts/Base.astro        head, fonts, skip link, canvas mount, nav, mode toggle
    components/
      Hero.astro  About.astro  Projects.astro  Skills.astro
      Experience.astro  Horizon.astro  Contact.astro
      TopNav.astro  ModeToggle.astro  DitheredImage.astro
    islands/
      field/  index.ts (context, loop, uniforms)  particles.ts (attribute generation)
              shaders/points.vert.glsl  points.frag.glsl  composite.frag.glsl
              lifecycle.ts (progress mapping, ScrollTrigger wiring, mode tweens)
              pointer.ts   nameSampler.ts   fallback.ts
      toy/    slingshot.ts (integrator + input; feeds a dynamic point buffer)
      nav/    topNav.ts (active indicator slide, collapse/expand state, scroll-direction tracking via ScrollTrigger)
    content/config.ts  projects/*.md  experience/*.md  skills.json
  .github/workflows/deploy.yml   withastro/action → GitHub Pages
```
- No Tailwind (custom design; tokens in CSS variables keep the CSS ≤ 15 KB).
- GSAP ScrollTrigger is the only scroll observer; no `scroll` event listeners anywhere.

### Repository and commit workflow (user's explicit instructions)
- Create the repo as **`ad1tya-wq/ad1tya-wq.github.io`** (public) so GitHub Pages serves at the root URL with no base path; a custom domain later is a `CNAME` file plus DNS. Local path: `D:\portfolio\`.
- Commits are authored solely as `ad1tya-wq <sahu200431@gmail.com>` (already the global git identity). **No `Co-Authored-By` trailer, no collaborator additions.** This is the user's stated preference for their own repo and overrides the default trailer.
- Commit at the end of every phase step that leaves the site working (roughly every 30-60 minutes of work), with imperative, specific messages; push to `origin main` after each commit. The Pages workflow deploys on every push to `main`.
- Never force-push; never rewrite history on `main`.
- Unit tests (Vitest): lifecycle mapping (section → progress), keyframe blend functions (pure TS mirrors of the GLSL easing used to author posters), slingshot integrator (energy bounded, capture radius), name sampler (returns N points inside glyph mask).

---

## 13. Implementation phases (each ends with a visible, testable result)
1. **Scaffold + tokens + type**: Astro project, fonts self-hosted, tokens, base layout, all sections as static content with real copy placeholders. Deploy workflow to GitHub Pages. (Verifies: Lighthouse ≥ 95 on a text-only page.)
2. **Field v0**: WebGL2 points + composite pass, static star state, dither, DPR handling, fallback poster. (Verifies: 60 fps idle, correct on mobile.)
3. **Lifecycle**: attribute generation, all keyframes, ScrollTrigger progress mapping, reduced-motion snapping. (Verifies: scrub forward/back at every section, contrast checks.)
4. **Black hole composite**: shadow, lensing warp, photon ring, Doppler, hole-forming ramp. (Verifies: side-by-side with EHT/Interstellar references.)
5. **Hero name assembly + dithered portrait pipeline.**
6. **Top pill nav (Madhav pattern, collapsing) + mode toggle + pointer forces.**
7. **Sections' interactions**: project-fragment hover, skills spectrum, experience spiral path.
8. **Slingshot toy.**
9. **Polish pass**: micro-interaction table audit, copy audit, keyboard walkthrough, perf budget audit, cross-browser (Chrome, Safari incl. iOS, Firefox).

After plan approval the spec is copied into the repo at `docs/superpowers/specs/2026-09-13-portfolio-skeleton-design.md` and a detailed task plan is written with the writing-plans skill before code.

---

## 14. Verification (end-to-end)
- `npm run build && npm run preview`; Lighthouse (mobile + desktop) against the targets in §10.
- Chrome DevTools Performance: record a full scroll; no long tasks > 50 ms; frame time budget met; CPU 4× throttle ≥ 30 fps.
- WebGL: test with `webgl2` disabled (fallback poster appears), and with `about:config` reduced motion.
- Contrast sampling at the six progress checkpoints in §11 with the browser's contrast tool.
- Keyboard-only and screen-reader (NVDA) walkthrough of the whole page including the toy.
- Viewports 375 / 768 / 1024 / 1440 / 1920, plus one real Android and one iPhone (Safari canvas DPR and `100dvh`).
- Budget check: `npx astro build` output sizes recorded in the README; fail the deploy workflow if JS > 120 KB gz.

## 15. Open items
- **Display name and title** for the hero (GitHub profile has no name set). Scaffold uses a placeholder until provided; the name sampler and type scale adapt automatically to length.
- Portrait file, resume PDF, and experience/skills text to be dropped into `src/content` when scaffolding starts (user has all three ready).
- After approval: write the standing preference (commit identity, no co-author trailer, frequent pushes) to memory, copy this spec into the repo, then write the task-level implementation plan.

Decisions confirmed by the user: Direction 3 "Singularity"; full dark acceptable if restrained; treated (dithered) portrait; sections About / Projects / Skills / Experience / Contact + resume; physics toy now, Battleship later; Astro + TypeScript; GitHub Pages now, custom domain later.
