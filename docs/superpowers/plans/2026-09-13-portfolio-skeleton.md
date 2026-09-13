# Portfolio "Singularity" Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full skeleton of the portfolio site: static Astro pages with real content slots, a scroll-driven WebGL2 particle object that lives the life of a star (name → star → collapse → shock breakout → ejecta → remnant → fallback disk → lensed black hole), the Madhav-style collapsing top nav, the dithered portrait, the mode toggle and pointer forces, section interactions, the gravity-slingshot toy, and a GitHub Pages deploy with an enforced size budget.

**Architecture:** Astro renders every section as static HTML with zero framework runtime. A single fixed `<canvas>` behind the page is driven by one `progress` number (0..1) that GSAP ScrollTrigger derives from section positions; a vertex shader interpolates keyframed particle states from static attributes (no per-frame CPU work), and a composite fragment shader adds lensing, shadow, photon ring, text-column attenuation and an ordered dither. Small vanilla TS modules (bundled by Astro `<script>` tags) wire the nav, modes, pointer, project hover and the toy to that shared state.

**Tech Stack:** Astro 7.3 (static, Fonts API), TypeScript 5.9, GSAP 3.15 (ScrollTrigger, ScrollToPlugin), raw WebGL2 + GLSL ES 3.00, sharp 0.35 (build-time dither), Vitest 5, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-13-portfolio-skeleton-design.md`

## Global Constraints

- Node ≥ 22.12 (Astro 7 floor). Repo: `D:\portfolio`, remote `origin` = `https://github.com/ad1tya-wq/ad1tya-wq.github.io.git`, branch `main`.
- Commits authored only as `ad1tya-wq <sahu200431@gmail.com>` (already the global identity). **Never add a `Co-Authored-By` trailer.** Push with `git push origin main` after every commit step. Never force-push.
- Palette is exactly: `--graphite #151617`, `--smoke #1F2123`, `--fog #7E8388`, `--silver #CBCED1`, `--core #F3F2ED`. No other color anywhere except the portrait's color layer. No gradients, glow, box-shadow, blur, glass.
- Fonts: Syne (name/headings), IBM Plex Mono (title/labels/dates/nav), IBM Plex Sans (body). Self-hosted via Astro's Fonts API; two preloaded (Syne, Plex Mono).
- Only `transform` and `opacity` are animated in CSS/JS. No `scroll` event listeners; ScrollTrigger is the only scroll observer.
- Copy: sentence case, no em-dashes (`—`) or en-dashes as separators anywhere in visible text, no "scroll" cues, no section numbers, no eyebrows. Contact CTA label is "Contact" (nav only); Contact section actions are "Email me" and "Download resume".
- Budget: total JS ≤ 120 KB gzipped (CI-enforced), fonts ≤ 110 KB, portrait ≤ 150 KB color + ≤ 30 KB dithered. No Three.js, no React on the main page, no Tailwind.
- Every interactive element: hover 150-200 ms, press `scale(0.98)` 90 ms, visible `:focus-visible` ring (2 px `--core`, offset 3 px), ≥ 44 × 44 px target.
- `prefers-reduced-motion: reduce` disables assembly, lerp, pointer forces and idle motion; the page remains fully usable.
- Chapter ids and progress ranges (from spec §2): `top` 0.00-0.10, `about` 0.10-0.28, `projects` 0.28-0.55, `skills` 0.55-0.68, `experience` 0.68-0.82, `horizon` 0.82-0.94, `contact` 0.94-1.00.
- Windows dev machine: shell commands below are Git Bash / POSIX; the same npm scripts run in CI on Ubuntu.

---

## File structure (created across the tasks)

```
D:\portfolio
  package.json  astro.config.mjs  tsconfig.json  vitest.config.ts
  .github/workflows/deploy.yml         build + test + budget + Pages deploy
  scripts/
    budget.mjs                         gzip-size gate over dist/**/*.js
    dither.ts                          portrait → dithered PNG + AVIF/WebP color
    poster.ts                          static fallback poster PNG from the particle generator
  public/                              favicon.svg, resume.pdf (user-provided), poster.png, portrait-* (generated)
  src/
    content.config.ts                  projects + experience collections
    content/site.ts                    name, title, one-liner, links (single source of truth for personal copy)
    content/projects/*.md              7 seeded projects
    content/experience/*.md            placeholder entries (user fills)
    content/skills.json                bands of technical skills + soft-skill sentences
    styles/tokens.css                  palette, type, spacing, motion tokens
    styles/global.css                  reset, base type, focus, layout primitives, reduced motion
    styles/interactions.css            micro-interaction table (buttons, links, rows, reveals)
    layouts/Base.astro                 head, fonts, skip link, canvas, nav, main, mode toggle, boot script
    pages/index.astro                  composes the sections
    components/
      TopNav.astro  Hero.astro  About.astro  Projects.astro  Skills.astro
      Experience.astro  Horizon.astro  Contact.astro  ModeToggle.astro  DitheredImage.astro
    islands/
      boot.ts                          entry: builds state, field, scroll, nav, modes, pointer, hover, toy
      field/state.ts                   shared mutable FieldState
      field/lifecycle.ts               chapters, progress mapping, easing helpers (pure)
      field/particles.ts               seeded PRNG + attribute generation (pure)
      field/layout.ts                  anchor/radius per viewport, text rect (pure + DOM helper)
      field/gl.ts                      program/buffer/FBO helpers
      field/shaders/points.vert.glsl   lifecycle keyframes + forces
      field/shaders/points.frag.glsl   soft round point
      field/shaders/composite.frag.glsl lensing, shadow, photon ring, attenuation, dither
      field/index.ts                   createField(): context, loop, uniforms, DPR, fallback
      field/fallback.ts                poster swap when WebGL2 is unavailable
      field/namePoints.ts              glyph mask sampling (pure pickPoints + DOM sampleName)
      field/scroll.ts                  ScrollTrigger wiring → state.target, chapter events
      nav/topNav.ts                    indicator FLIP, collapse/expand, keyboard, smooth scroll
      modes.ts                         mode toggle → progress tweens, re-attach on scroll
      pointer.ts                       pointer position + force ramps
      projectsHover.ts                 row hover → state.hover / hoverY
      reveals.ts                       once-only section reveals, experience path draw
      toy/slingshot.ts                 Paczyński-Wiita integrator (pure)
      toy/index.ts                     input, probe buffer → field.setProbe
    islands/**/*.test.ts               Vitest for the pure modules
```

---
## Phase 1: Scaffold, tokens, content, deploy

### Task 1: Astro project scaffold that builds

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro`, `src/env.d.ts`, `public/favicon.svg`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `check`, `test`, `dither`, `poster`, `budget` used by every later task; font CSS variables `--font-display`, `--font-mono`, `--font-body` (defined by Astro's Fonts API when `<Font>` is rendered in Task 2).

- [ ] **Step 1: Write package.json**

```json
{
  "name": "ad1tya-wq.github.io",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "dither": "tsx scripts/dither.ts",
    "poster": "tsx scripts/poster.ts",
    "budget": "node scripts/budget.mjs"
  },
  "dependencies": {
    "astro": "^7.3.2",
    "gsap": "^3.15.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "sharp": "^0.35.4",
    "tsx": "^4.23.0",
    "typescript": "^5.9.3",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: Write astro.config.mjs (Fonts API, static, site URL)**

```js
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://ad1tya-wq.github.io',
  output: 'static',
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Syne',
      cssVariable: '--font-display',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Arial Black', 'Impact', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Consolas', 'Menlo', 'monospace'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-body',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Segoe UI', 'Helvetica Neue', 'sans-serif'],
    },
  ],
});
```

- [ ] **Step 3: Write tsconfig.json, vitest.config.ts, src/env.d.ts**

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": {
    "types": ["vite/client"],
    "noUncheckedIndexedAccess": true
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

`src/env.d.ts`:
```ts
/// <reference types="astro/client" />
```
(`?raw` imports are typed by `vite/client` already.)

- [ ] **Step 4: Write a minimal page and favicon**

`src/pages/index.astro`:
```astro
---
const title = 'Portfolio';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <h1>Portfolio scaffold</h1>
  </body>
</html>
```

`public/favicon.svg` (the star at rest: one core disc on graphite):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#151617"/><circle cx="16" cy="16" r="6" fill="#F3F2ED"/></svg>
```

- [ ] **Step 5: Install and build**

Run: `npm install && npm run build`
Expected: `dist/index.html` exists; the build log shows the three fonts being fetched with no errors. If the Fonts API rejects the range string `'400 800'`, replace it with `[700, 800]` and re-run.

- [ ] **Step 6: Commit and push**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts src public
git commit -m "Scaffold Astro project with self-hosted fonts and test runner"
git push origin main
```

---
### Task 2: Design tokens, global styles, base layout, static nav markup

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/TopNav.astro`, `src/content/site.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: the CSS custom properties in tokens.css; layout classes `.section`, `.col`, `.col--center`, `.prose`, `.mono`, `.btn`, `.btn--primary`, `.link`, `.sr-only`; `Base.astro` props `{ title: string; description: string }`; `site` object `{ name, title, line, email, github, linkedin, resume }` and `chapters` array `{ id, label }[]`; nav hooks `.topbar`, `[data-topbar]`, `[data-nav]`, `[data-indicator]`, `[data-chapter-link]`, `[data-nav-toggle]`, `.pill__item`, state classes `.is-active`, `.is-collapsed`, `.is-visible`.

- [ ] **Step 1: Write src/styles/tokens.css**

```css
:root {
  /* palette: the only five colors on the site */
  --graphite: #151617;
  --smoke: #1f2123;
  --fog: #7e8388;
  --silver: #cbced1;
  --core: #f3f2ed;
  --hairline: color-mix(in srgb, var(--fog) 40%, transparent);

  /* type sizes (families come from the Fonts API: --font-display, --font-mono, --font-body) */
  --fs-name: clamp(3.5rem, 11vw, 10.5rem);
  --fs-h2: clamp(2rem, 3.4vw, 2.75rem);
  --fs-h3: 1.75rem;
  --fs-body: 1.0625rem;
  --fs-mono: 0.875rem;
  --fs-mono-sm: 0.8125rem;
  --lh-body: 1.6;
  --measure: 62ch;

  /* spacing scale */
  --s-1: 8px;
  --s-2: 16px;
  --s-3: 24px;
  --s-4: 40px;
  --s-5: 64px;
  --s-6: 96px;
  --s-7: 160px;
  --section-pad: var(--s-7);
  --gutter: clamp(20px, 5vw, 72px);

  /* shape: pills for controls, square for everything else */
  --r-pill: 999px;

  /* motion */
  --ease-out: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --d-hover: 160ms;
  --d-press: 90ms;
  --d-reveal: 350ms;
  --d-nav-open: 320ms;
  --d-nav-close: 200ms;
  --d-image: 220ms;
  --d-mode: 1100ms;
}

@media (max-width: 767px) {
  :root {
    --section-pad: var(--s-6);
  }
}
```

- [ ] **Step 2: Write src/styles/global.css**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: dark;
  background: var(--graphite);
}

body {
  margin: 0;
  min-height: 100dvh;
  background: var(--graphite);
  color: var(--silver);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, p, ul, figure { margin: 0; }
ul { padding: 0; list-style: none; }
a { color: inherit; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
img, picture, svg, canvas { display: block; max-width: 100%; }

:focus-visible {
  outline: 2px solid var(--core);
  outline-offset: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.skip-link {
  position: fixed;
  top: var(--s-2);
  left: var(--s-2);
  z-index: 100;
  padding: var(--s-1) var(--s-2);
  background: var(--core);
  color: var(--graphite);
  font-family: var(--font-mono);
  font-size: var(--fs-mono-sm);
  border-radius: var(--r-pill);
  transform: translateY(-200%);
}
.skip-link:focus-visible { transform: none; }

/* the field canvas sits behind everything and never intercepts input */
#field {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

main { position: relative; z-index: 1; }

.section {
  position: relative;
  padding-block: var(--section-pad);
  padding-inline: var(--gutter);
}

/* the text column: left ~46% on desktop, full width on mobile */
.col { width: min(46%, 600px); }
.col--center { width: min(100%, 600px); margin-inline: auto; text-align: center; }

h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--fs-h2);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--core);
  margin-bottom: var(--s-4);
}

.prose { max-width: var(--measure); }
.prose > * + * { margin-top: var(--s-3); }

.mono {
  font-family: var(--font-mono);
  font-size: var(--fs-mono);
  letter-spacing: 0.06em;
  color: var(--fog);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--s-3);
  border-radius: var(--r-pill);
  font-family: var(--font-mono);
  font-size: var(--fs-mono-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid var(--core);
  color: var(--core);
  transition:
    background-color var(--d-hover) var(--ease-out),
    color var(--d-hover) var(--ease-out),
    transform var(--d-press) var(--ease-out);
}
.btn--primary { background: var(--core); color: var(--graphite); }
.btn:hover { background: var(--core); color: var(--graphite); }
.btn--primary:hover { background: transparent; color: var(--core); }
.btn:active { transform: scale(0.98); }

.link {
  position: relative;
  text-decoration: none;
  color: var(--core);
}
.link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 120ms var(--ease-in);
}
.link:hover::after,
.link:focus-visible::after {
  transform: scaleX(1);
  transition: transform 180ms var(--ease-out);
}

@media (max-width: 767px) {
  .col { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Write src/content/site.ts (the single place for personal copy)**

```ts
export const site = {
  // TODO(user): replace name and title before launch; everything else reads from here
  name: 'Your Name',
  title: 'software engineer',
  line: 'I build systems that decide what to trust: security triage, ML, and the tools around them.',
  email: 'sahu200431@gmail.com',
  github: 'https://github.com/ad1tya-wq',
  linkedin: 'https://www.linkedin.com/in/', // TODO(user): full profile URL
  resume: '/resume.pdf',
} as const;

export const chapters = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'horizon', label: 'Horizon' },
] as const;
```

- [ ] **Step 4: Write src/components/TopNav.astro (markup + CSS; behaviour arrives in Task 12)**

```astro
---
import { site, chapters } from '../content/site';
---
<header class="topbar" data-topbar>
  <a class="wordmark" href="#top">{site.name}</a>

  <nav class="pill" aria-label="Sections" data-nav>
    <button class="pill__toggle" type="button" aria-expanded="false" aria-controls="site-nav-list" data-nav-toggle>
      <span class="sr-only">Open section menu</span>
      <span class="pill__toggle-bar" aria-hidden="true"></span>
      <span class="pill__toggle-bar" aria-hidden="true"></span>
    </button>
    <span class="pill__indicator" aria-hidden="true" data-indicator></span>
    <ul class="pill__list" id="site-nav-list">
      {chapters.map((c) => (
        <li><a class="pill__item" href={`#${c.id}`} data-chapter-link={c.id}>{c.label}</a></li>
      ))}
    </ul>
  </nav>

  <a class="btn btn--primary topbar__contact" href="#contact">Contact</a>
</header>

<style>
  .topbar {
    position: fixed;
    inset: 20px 20px auto 20px;
    z-index: 50;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--s-2);
    pointer-events: none;
  }
  .topbar > * { pointer-events: auto; }
  .wordmark {
    justify-self: start;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.875rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--core);
    transition: opacity var(--d-hover) var(--ease-out);
  }
  .topbar__contact {
    justify-self: end;
    transition:
      background-color var(--d-hover) var(--ease-out),
      color var(--d-hover) var(--ease-out),
      transform var(--d-press) var(--ease-out),
      opacity var(--d-hover) var(--ease-out);
  }
  .pill {
    position: relative;
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 6px;
    border-radius: var(--r-pill);
    background: var(--smoke);
    border: 1px solid var(--hairline);
    transform-origin: center;
  }
  .pill__list { display: flex; align-items: center; gap: 2px; }
  .pill__item {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    border-radius: var(--r-pill);
    font-family: var(--font-mono);
    font-size: var(--fs-mono-sm);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--fog);
    transition:
      color var(--d-hover) var(--ease-out),
      opacity var(--d-hover) var(--ease-out),
      transform var(--d-press) var(--ease-out);
  }
  .pill__item:hover { color: var(--core); }
  .pill__item:active { transform: scale(0.98); }
  .pill__item.is-active { color: var(--graphite); }
  .pill__indicator {
    position: absolute;
    top: 5px;
    left: 0;
    height: 32px;
    width: 0;
    border-radius: var(--r-pill);
    background: var(--core);
    transform-origin: left center;
    opacity: 0;
  }
  .pill__indicator.is-visible { opacity: 1; }
  .pill__toggle {
    display: none;
    width: 44px;
    height: 44px;
    margin-left: -6px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 5px;
  }
  .pill__toggle-bar {
    width: 16px;
    height: 1.5px;
    background: var(--core);
    transition: transform var(--d-nav-open) var(--ease-out);
  }
  .pill__toggle[aria-expanded='true'] .pill__toggle-bar:first-of-type { transform: translateY(3.25px) rotate(45deg); }
  .pill__toggle[aria-expanded='true'] .pill__toggle-bar:last-of-type { transform: translateY(-3.25px) rotate(-45deg); }

  /* collapsed state: Task 12 toggles these classes */
  .topbar.is-collapsed .wordmark,
  .topbar.is-collapsed .topbar__contact { opacity: 0.6; }
  .pill.is-collapsed .pill__item:not(.is-active) { opacity: 0; }

  @media (max-width: 767px) {
    .topbar { inset: 12px 12px auto 12px; grid-template-columns: auto 1fr auto; }
    .wordmark { font-size: 0.75rem; }
    .pill { justify-self: center; }
    .pill__toggle { display: inline-flex; }
    .topbar__contact { padding-inline: var(--s-2); }
  }
</style>
```

- [ ] **Step 5: Write src/layouts/Base.astro**

```astro
---
import { Font } from 'astro:assets';
import '../styles/tokens.css';
import '../styles/global.css';
import TopNav from '../components/TopNav.astro';

interface Props { title: string; description: string }
const { title, description } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#151617" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <Font cssVariable="--font-display" preload />
    <Font cssVariable="--font-mono" preload />
    <Font cssVariable="--font-body" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <canvas id="field" aria-hidden="true"></canvas>
    <TopNav />
    <main id="main">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 6: Point index.astro at the layout with seven section shells**

```astro
---
import Base from '../layouts/Base.astro';
import { site } from '../content/site';
---
<Base title={`${site.name}, ${site.title}`} description={site.line}>
  <section id="top" class="section" data-chapter="top"><div class="col"><h1>{site.name}</h1></div></section>
  <section id="about" class="section" data-chapter="about"><div class="col"><h2>About</h2></div></section>
  <section id="projects" class="section" data-chapter="projects"><div class="col"><h2>Projects</h2></div></section>
  <section id="skills" class="section" data-chapter="skills"><div class="col"><h2>Skills</h2></div></section>
  <section id="experience" class="section" data-chapter="experience"><div class="col"><h2>Experience</h2></div></section>
  <section id="horizon" class="section" data-chapter="horizon"><div class="col col--center"><h2>Horizon</h2></div></section>
  <section id="contact" class="section" data-chapter="contact"><div class="col col--center"><h2>Contact</h2></div></section>
</Base>
```

- [ ] **Step 7: Build, type-check, and inspect**

Run: `npm run build && npm run check`
Expected: build ok, 0 errors. `npm run dev` → http://localhost:4321 shows a graphite page, Syne headings, Plex Sans body, the top bar (wordmark, pill with 5 items, Contact). Tab order: skip link, wordmark, five items, Contact, each with a visible ring. No horizontal scrollbar at 375 px.

- [ ] **Step 8: Commit and push**

```bash
git add src
git commit -m "Add design tokens, global styles, base layout and static top nav"
git push origin main
```

---
### Task 3: Content collections and the seven sections as static HTML

**Files:**
- Create: `src/content.config.ts`, `src/content/projects/{codegate,corporate-finance-risk,family-tree,vulnerability-scoring,travel-planner,ewsd,stocktracker}.md`, `src/content/experience/{example-1,example-2}.md`, `src/content/skills.json`, `src/components/{Hero,About,Projects,Skills,Experience,Horizon,Contact}.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces DOM hooks used later: `h1[data-name]` (hero name), `.hero__portrait` slot, `li[data-fragment="N"]` on project rows (N = 0-based order), `[data-chapter]` on every section, `.col` as the text column per section, `[data-spectrum]`, `svg[data-spiral] path`, `[data-toy]` with `[data-toy-launch]` and `[data-toy-status]`, `[data-reveal]` on blocks that fade in.
- Collections: `projects` (`title, summary, stack: string[], repo: url, url?: url, order: number`), `experience` (`role, org, start, end?, summary, order`).

- [ ] **Step 1: Write src/content.config.ts**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(140),
    stack: z.array(z.string()).min(1),
    repo: z.string().url(),
    url: z.string().url().optional(),
    order: z.number().int(),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/experience' }),
  schema: z.object({
    role: z.string(),
    org: z.string(),
    start: z.string(),
    end: z.string().optional(),
    summary: z.string().max(200),
    order: z.number().int(),
  }),
});

export const collections = { projects, experience };
```

- [ ] **Step 2: Write the seven project files (summaries ≤ 140 chars, no em-dashes)**

`src/content/projects/codegate.md`:
```md
---
title: Codegate
summary: A certified gate that escalates AI-generated code to an LLM only when it cannot prove the code is safe.
stack: [Python, Conformal risk control, Static analysis]
repo: https://github.com/ad1tya-wq/codegate
url: https://github.com/ad1tya-wq/codegate-scanner
order: 1
---
```

`src/content/projects/corporate-finance-risk.md`:
```md
---
title: Corporate finance risk agent
summary: An autonomous financial controller that forecasts with Prophet and enforces policy through document retrieval.
stack: [Python, LangGraph, Prophet, Docling, Streamlit]
repo: https://github.com/ad1tya-wq/Corporate-Finance-Risk-Analysis
order: 2
---
```

`src/content/projects/family-tree.md`:
```md
---
title: Family tree
summary: An offline-first Android family tree that infers kinship and names relations in English and Hindi.
stack: [Kotlin, Android]
repo: https://github.com/ad1tya-wq/family-tree
order: 3
---
```

`src/content/projects/vulnerability-scoring.md`:
```md
---
title: Context-based vulnerability scoring
summary: Scores vulnerabilities by the context they sit in rather than by generic severity alone.
stack: [Python, Jupyter]
repo: https://github.com/ad1tya-wq/context-based-vulnerability-scoring-engine
order: 4
---
```

`src/content/projects/travel-planner.md`:
```md
---
title: Eco travel planner
summary: A retrieval-augmented planner that builds itineraries around the lowest-impact transport and activities.
stack: [Python, RAG]
repo: https://github.com/ad1tya-wq/travel-planner
order: 5
---
```

`src/content/projects/ewsd.md`:
```md
---
title: Early warning sepsis dashboard
summary: The front end for a sepsis early-warning system, built as a software engineering project.
stack: [JavaScript]
repo: https://github.com/ad1tya-wq/EWSD-frontend
order: 6
---
```

`src/content/projects/stocktracker.md`:
```md
---
title: Stock tracker pipeline
summary: A small Java stock tracker used to build a Jenkins, Maven, Ansible, Docker and Grafana delivery pipeline.
stack: [Java, Jenkins, Docker, Ansible, Grafana]
repo: https://github.com/ad1tya-wq/stocktracker
order: 7
---
```

- [ ] **Step 3: Write two placeholder experience entries and skills.json**

`src/content/experience/example-1.md`:
```md
---
role: Role title
org: Organisation
start: "2025"
end: "present"
summary: One or two lines on what you owned and shipped. Replace me.
order: 1
---
```

`src/content/experience/example-2.md`:
```md
---
role: Earlier role
org: Organisation
start: "2023"
end: "2025"
summary: One or two lines on what you owned and shipped. Replace me.
order: 2
---
```

`src/content/skills.json`:
```json
{
  "bands": [
    { "name": "Languages", "items": ["Python", "TypeScript", "Java", "Kotlin", "SQL"] },
    { "name": "Frameworks", "items": ["LangGraph", "React", "Astro", "Android"] },
    { "name": "Data and ML", "items": ["scikit-learn", "Prophet", "Conformal prediction", "RAG"] },
    { "name": "Tools", "items": ["Docker", "Jenkins", "Ansible", "Git", "Grafana"] }
  ],
  "soft": [
    "I write down the failure modes before I write the code.",
    "I would rather ship a small, proven thing than a large, promised one.",
    "I explain trade-offs in plain language to the people who will live with them."
  ]
}
```

- [ ] **Step 4: Write Hero.astro**

```astro
---
import { site } from '../content/site';
---
<section id="top" class="section hero" data-chapter="top" aria-labelledby="hero-name">
  <div class="col hero__col">
    <h1 id="hero-name" class="hero__name" data-name>{site.name}</h1>
    <p class="hero__title mono">{site.title}</p>
    <p class="hero__line">{site.line}</p>
    <a class="link" href="#projects">Projects</a>
  </div>
  <div class="hero__portrait">
    <slot name="portrait" />
  </div>
</section>

<style>
  .hero {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    padding-top: calc(var(--s-6) + 44px);
  }
  .hero__col { width: min(100%, 720px); }
  .hero__name {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--fs-name);
    line-height: 0.9;
    letter-spacing: -0.02em;
    color: var(--core);
    text-wrap: balance;
    transition: opacity 400ms var(--ease-out);
  }
  .hero__name.is-assembled { opacity: 0; }
  .hero__title { margin-top: var(--s-3); font-size: var(--fs-mono); }
  .hero__line { margin-top: var(--s-2); max-width: 44ch; }
  .hero__col > .link { display: inline-block; margin-top: var(--s-4); }
  .hero__portrait { align-self: start; margin-top: var(--s-3); }
  @media (max-width: 767px) {
    .hero { grid-template-columns: 1fr; align-content: start; row-gap: var(--s-4); }
    .hero__portrait { order: -1; width: 120px; }
  }
</style>
```

- [ ] **Step 5: Write About.astro and Projects.astro**

`src/components/About.astro`:
```astro
<section id="about" class="section" data-chapter="about" aria-labelledby="about-h">
  <div class="col prose" data-reveal>
    <h2 id="about-h">About</h2>
    <p>Replace me: two or three sentences on what you work on and why it matters to you.</p>
    <p>Replace me: one sentence on what you are looking for next.</p>
  </div>
</section>
```

`src/components/Projects.astro`:
```astro
---
import { getCollection } from 'astro:content';
const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
---
<section id="projects" class="section" data-chapter="projects" aria-labelledby="projects-h">
  <div class="col">
    <h2 id="projects-h">Projects</h2>
    <ul class="rows" data-projects>
      {projects.map((p, i) => (
        <li class="row" data-fragment={i} data-reveal>
          <a class="row__link" href={p.data.url ?? p.data.repo} rel="noopener">
            <span class="row__title">{p.data.title}</span>
            <span class="row__arrow" aria-hidden="true">↗</span>
          </a>
          <p class="row__summary">{p.data.summary}</p>
          <p class="row__stack mono">{p.data.stack.join(' / ')}</p>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .rows { border-top: 1px solid var(--hairline); }
  .row { padding: var(--s-3) 0; border-bottom: 1px solid var(--hairline); }
  .row__link {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    text-decoration: none;
    color: var(--core);
  }
  .row__title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-h3);
    line-height: 1.1;
    letter-spacing: -0.01em;
    transition: transform var(--d-hover) var(--ease-out);
  }
  .row__arrow {
    font-size: 1rem;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity var(--d-hover) var(--ease-out), transform var(--d-hover) var(--ease-out);
  }
  .row:hover .row__title, .row:focus-within .row__title { transform: translateX(4px); }
  .row:hover .row__arrow, .row:focus-within .row__arrow { opacity: 1; transform: none; }
  .row__summary { margin-top: var(--s-1); max-width: var(--measure); }
  .row__stack { margin-top: var(--s-1); font-size: var(--fs-mono-sm); }
</style>
```

- [ ] **Step 6: Write Skills.astro and Experience.astro**

`src/components/Skills.astro`:
```astro
---
import skills from '../content/skills.json';
---
<section id="skills" class="section" data-chapter="skills" aria-labelledby="skills-h">
  <div class="col">
    <h2 id="skills-h">Skills</h2>
    <div class="spectrum" data-spectrum data-reveal>
      {skills.bands.map((band) => (
        <div class="band">
          <p class="band__name mono">{band.name}</p>
          <ul class="band__lines">
            {band.items.map((item) => (
              <li class="line">
                <button type="button" class="line__hit">
                  <span class="line__bar" aria-hidden="true"></span>
                  <span class="line__label mono">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <ul class="soft prose" data-reveal>
      {skills.soft.map((s) => <li>{s}</li>)}
    </ul>
  </div>
</section>

<style>
  .spectrum { display: grid; gap: var(--s-3); }
  .band { display: grid; grid-template-columns: 8rem 1fr; align-items: center; gap: var(--s-2); }
  .band__name { font-size: var(--fs-mono-sm); }
  .band__lines {
    position: relative;
    display: flex;
    justify-content: space-evenly;
    height: 64px;
    border-block: 1px solid var(--hairline);
  }
  .line__hit { position: relative; width: 44px; height: 64px; display: grid; place-items: center; }
  .line__bar {
    display: block;
    width: 2px;
    height: 40px;
    background: var(--silver);
    transition: transform var(--d-hover) var(--ease-out), background-color var(--d-hover) var(--ease-out);
  }
  .line__label {
    position: absolute;
    top: -1.5rem;
    left: 50%;
    white-space: nowrap;
    font-size: var(--fs-mono-sm);
    color: var(--core);
    opacity: 0;
    transform: translate(-50%, 4px);
    transition: opacity var(--d-hover) var(--ease-out), transform var(--d-hover) var(--ease-out);
    pointer-events: none;
  }
  .line__hit:hover .line__bar, .line__hit:focus-visible .line__bar { background: var(--core); transform: scaleY(1.2); }
  .line__hit:hover .line__label, .line__hit:focus-visible .line__label { opacity: 1; transform: translate(-50%, 0); }
  .soft { margin-top: var(--s-5); }
  @media (max-width: 767px) {
    .band { grid-template-columns: 1fr; }
  }
</style>
```

`src/components/Experience.astro`:
```astro
---
import { getCollection } from 'astro:content';
const items = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
---
<section id="experience" class="section" data-chapter="experience" aria-labelledby="experience-h">
  <div class="col">
    <h2 id="experience-h">Experience</h2>
    <div class="timeline">
      <svg class="spiral" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true" data-spiral>
        <path d="M 2 0 C 2 140, 2 220, 20 300 S 80 380, 100 400" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>
      <ul class="entries">
        {items.map((e) => (
          <li class="entry" data-reveal>
            <p class="entry__dates mono">{e.data.start} to {e.data.end ?? 'present'}</p>
            <p class="entry__role">{e.data.role}, {e.data.org}</p>
            <p class="entry__summary">{e.data.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  </div>
</section>

<style>
  .timeline { position: relative; padding-left: var(--s-4); }
  .spiral { position: absolute; top: 0; left: 0; width: 100%; height: 100%; color: var(--fog); overflow: visible; }
  .entries { display: grid; gap: var(--s-5); }
  .entry__dates { font-size: var(--fs-mono-sm); }
  .entry__role { margin-top: var(--s-1); font-family: var(--font-display); font-weight: 700; font-size: 1.25rem; color: var(--core); }
  .entry__summary { margin-top: var(--s-1); max-width: var(--measure); }
</style>
```

- [ ] **Step 7: Write Horizon.astro and Contact.astro**

`src/components/Horizon.astro`:
```astro
<section id="horizon" class="section horizon" data-chapter="horizon" aria-labelledby="horizon-h">
  <div class="col col--center" data-toy>
    <h2 id="horizon-h">Horizon</h2>
    <p class="horizon__caption">Launch a probe and let gravity decide: escape, orbit, or capture. Drag anywhere to aim.</p>
    <button type="button" class="btn" data-toy-launch>Launch a probe</button>
    <p class="horizon__status mono" aria-live="polite" data-toy-status></p>
  </div>
</section>

<style>
  .horizon { min-height: 100dvh; display: grid; align-content: end; padding-bottom: var(--s-6); }
  .horizon__caption { max-width: 44ch; margin-inline: auto; }
  .horizon .btn { margin-top: var(--s-4); }
  .horizon__status { min-height: 1.5em; margin-top: var(--s-2); font-size: var(--fs-mono-sm); }
</style>
```

`src/components/Contact.astro`:
```astro
---
import { site } from '../content/site';
const year = new Date().getFullYear();
---
<section id="contact" class="section contact" data-chapter="contact" aria-labelledby="contact-h">
  <div class="col col--center" data-reveal>
    <h2 id="contact-h">Contact</h2>
    <p>If any of this is useful to what you are building, write to me.</p>
    <div class="contact__actions">
      <a class="btn btn--primary" href={`mailto:${site.email}`}>Email me</a>
      <a class="btn" href={site.resume} download>Download resume</a>
    </div>
    <p class="contact__links">
      <a class="link" href={site.github} rel="me noopener">GitHub</a>
      <a class="link" href={site.linkedin} rel="me noopener">LinkedIn</a>
    </p>
  </div>
  <footer class="footer mono">{site.name}, {year}</footer>
</section>

<style>
  .contact { min-height: 100dvh; display: grid; align-content: center; }
  .contact__actions { display: flex; gap: var(--s-2); justify-content: center; margin-top: var(--s-4); flex-wrap: wrap; }
  .contact__links { display: flex; gap: var(--s-3); justify-content: center; margin-top: var(--s-4); }
  .footer { position: absolute; left: var(--gutter); bottom: var(--s-3); font-size: var(--fs-mono-sm); }
</style>
```

- [ ] **Step 8: Compose index.astro from the components**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import About from '../components/About.astro';
import Projects from '../components/Projects.astro';
import Skills from '../components/Skills.astro';
import Experience from '../components/Experience.astro';
import Horizon from '../components/Horizon.astro';
import Contact from '../components/Contact.astro';
import { site } from '../content/site';
---
<Base title={`${site.name}, ${site.title}`} description={site.line}>
  <Hero />
  <About />
  <Projects />
  <Skills />
  <Experience />
  <Horizon />
  <Contact />
</Base>
```

- [ ] **Step 9: Build, check, and read the page**

Run: `npm run build && npm run check`
Expected: 0 errors; `grep -c "data-fragment" dist/index.html` prints 7; `grep -c "<section" dist/index.html` prints 7. In `npm run dev`: every heading is Syne, mono labels are Plex Mono, no horizontal scrollbar at 375 px, and Tab reaches every project link, skill line, the toy button and both contact actions.

- [ ] **Step 10: Commit and push**

```bash
git add src
git commit -m "Add content collections and the seven sections as static HTML"
git push origin main
```

---

### Task 4: GitHub Pages deploy with tests and a JS size budget gate

**Files:**
- Create: `scripts/budget.mjs`, `.github/workflows/deploy.yml`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `npm run budget` exits 1 when gzipped JS under `dist/` exceeds 120 KB; the workflow runs `npm ci && npm test && npm run build && npm run budget` and deploys `dist/`.

- [ ] **Step 1: Write scripts/budget.mjs**

```js
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 120;
const root = 'dist';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.js') out.push(p);
  }
  return out;
}

let total = 0;
const rows = walk(root)
  .map((f) => {
    const gz = gzipSync(readFileSync(f)).length;
    total += gz;
    return [f.replace(/\\/g, '/'), gz];
  })
  .sort((a, b) => b[1] - a[1]);

for (const [f, gz] of rows) console.log(`${(gz / 1024).toFixed(1).padStart(7)} KB  ${f}`);
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total gzipped JS (limit ${LIMIT_KB} KB)`);

if (total > LIMIT_KB * 1024) {
  console.error(`Budget exceeded by ${((total - LIMIT_KB * 1024) / 1024).toFixed(1)} KB`);
  process.exit(1);
}
```

- [ ] **Step 2: Write a smoke test so the test step is green before Task 5**

`src/smoke.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 3: Write .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run budget
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify the budget locally**

Run: `npm run build && npm run budget`
Expected: a table of JS files (little or none yet) and a total far under 120 KB; exit code 0.

- [ ] **Step 5: Enable Pages for Actions, commit, push, watch the run**

```bash
gh api --method POST repos/ad1tya-wq/ad1tya-wq.github.io/pages -f build_type=workflow 2>/dev/null || echo "pages already enabled"
git add scripts/budget.mjs src/smoke.test.ts .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deploy workflow with test and JS budget gates"
git push origin main
gh run watch --exit-status
curl -sI https://ad1tya-wq.github.io/ | head -1
```
Expected: the run succeeds and the curl prints `HTTP/2 200` (allow a minute for propagation).

---
## Phase 2: The field, version 0

### Task 5: Lifecycle mapping (pure, tested)

**Files:**
- Create: `src/islands/field/lifecycle.ts`, `src/islands/field/lifecycle.test.ts`
- Delete: `src/smoke.test.ts`

**Interfaces:**
- Produces:
  - `type ChapterId = 'top' | 'about' | 'projects' | 'skills' | 'experience' | 'horizon' | 'contact'`
  - `CHAPTERS: readonly { id: ChapterId; start: number; end: number; poster: number }[]` (poster = the progress used under reduced motion)
  - `MODE_TARGETS: { star: 0.08; nova: 0.19; remnant: 0.6; horizon: 0.9 }`
  - `chapterProgress(id: ChapterId, local: number): number`
  - `chapterAt(progress: number): ChapterId`
  - `clamp01(x)`, `lerp(a, b, t)`, `smoothstep(e0, e1, x)`, `damp(current, target, lambda, dt)` (frame-rate independent exponential approach)

- [ ] **Step 1: Write the failing tests**

`src/islands/field/lifecycle.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CHAPTERS, MODE_TARGETS, chapterAt, chapterProgress, clamp01, damp, lerp, smoothstep } from './lifecycle';

describe('CHAPTERS', () => {
  it('tile [0, 1] contiguously in spec order', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(['top', 'about', 'projects', 'skills', 'experience', 'horizon', 'contact']);
    expect(CHAPTERS[0]!.start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1]!.end).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) expect(CHAPTERS[i]!.start).toBe(CHAPTERS[i - 1]!.end);
  });
  it('each poster lies inside its chapter', () => {
    for (const c of CHAPTERS) {
      expect(c.poster).toBeGreaterThanOrEqual(c.start);
      expect(c.poster).toBeLessThanOrEqual(c.end);
    }
  });
});

describe('chapterProgress', () => {
  it('maps local 0..1 onto the chapter range and clamps', () => {
    expect(chapterProgress('about', 0)).toBeCloseTo(0.1);
    expect(chapterProgress('about', 1)).toBeCloseTo(0.28);
    expect(chapterProgress('about', 0.5)).toBeCloseTo(0.19);
    expect(chapterProgress('about', -3)).toBeCloseTo(0.1);
    expect(chapterProgress('contact', 9)).toBeCloseTo(1);
  });
});

describe('chapterAt', () => {
  it('returns the chapter containing the progress, last chapter inclusive at 1', () => {
    expect(chapterAt(0)).toBe('top');
    expect(chapterAt(0.1)).toBe('about');
    expect(chapterAt(0.4)).toBe('projects');
    expect(chapterAt(0.999)).toBe('contact');
    expect(chapterAt(1)).toBe('contact');
  });
});

describe('math helpers', () => {
  it('clamp01, lerp, smoothstep behave', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(lerp(2, 4, 0.5)).toBe(3);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it('damp approaches the target and is frame-rate independent', () => {
    const oneBig = damp(0, 1, 8, 1 / 30);
    const twoSmall = damp(damp(0, 1, 8, 1 / 60), 1, 8, 1 / 60);
    expect(oneBig).toBeCloseTo(twoSmall, 6);
    expect(oneBig).toBeGreaterThan(0);
    expect(oneBig).toBeLessThan(1);
  });
  it('MODE_TARGETS sit in the intended chapters', () => {
    expect(chapterAt(MODE_TARGETS.star)).toBe('top');
    expect(chapterAt(MODE_TARGETS.nova)).toBe('about');
    expect(chapterAt(MODE_TARGETS.remnant)).toBe('skills');
    expect(chapterAt(MODE_TARGETS.horizon)).toBe('horizon');
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/islands/field/lifecycle.test.ts`
Expected: FAIL, "Failed to resolve import './lifecycle'".

- [ ] **Step 3: Write src/islands/field/lifecycle.ts**

```ts
export type ChapterId = 'top' | 'about' | 'projects' | 'skills' | 'experience' | 'horizon' | 'contact';

export interface Chapter {
  id: ChapterId;
  start: number;
  end: number;
  /** progress shown for this chapter when motion is reduced */
  poster: number;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: 'top', start: 0.0, end: 0.1, poster: 0.06 },
  { id: 'about', start: 0.1, end: 0.28, poster: 0.19 },
  { id: 'projects', start: 0.28, end: 0.55, poster: 0.42 },
  { id: 'skills', start: 0.55, end: 0.68, poster: 0.62 },
  { id: 'experience', start: 0.68, end: 0.82, poster: 0.78 },
  { id: 'horizon', start: 0.82, end: 0.94, poster: 0.92 },
  { id: 'contact', start: 0.94, end: 1.0, poster: 1.0 },
];

export const MODE_TARGETS = { star: 0.08, nova: 0.19, remnant: 0.6, horizon: 0.9 } as const;
export type ModeId = keyof typeof MODE_TARGETS | 'scroll';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Exponential approach: the same result for one 1/30 s step as for two 1/60 s steps. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function chapterProgress(id: ChapterId, local: number): number {
  const c = CHAPTERS.find((ch) => ch.id === id)!;
  return c.start + clamp01(local) * (c.end - c.start);
}

export function chapterAt(progress: number): ChapterId {
  const p = clamp01(progress);
  for (const c of CHAPTERS) if (p < c.end) return c.id;
  return 'contact';
}
```

- [ ] **Step 4: Run the tests, remove the smoke test**

Run: `rm src/smoke.test.ts && npm test`
Expected: all lifecycle tests PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/islands/field/lifecycle.ts src/islands/field/lifecycle.test.ts
git rm -q src/smoke.test.ts
git commit -m "Add lifecycle chapter mapping with tests"
git push origin main
```

---

### Task 6: Particle attribute generation (pure, tested)

**Files:**
- Create: `src/islands/field/particles.ts`, `src/islands/field/particles.test.ts`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number` (deterministic PRNG in [0, 1))
  - `valueNoise3(x: number, y: number, z: number): number` in [0, 1]
  - `interface ParticleBuffers { count: number; seed: Float32Array /*4n*/; star: Float32Array /*3n*/; ejecta: Float32Array /*4n*/; disk: Float32Array /*4n*/; fragment: Float32Array /*n*/; nameSlots: number }`
  - `generateParticles(count: number, projectCount: number, seed?: number): ParticleBuffers` where the first `nameSlots = round(0.55 * count)` particles are the ones that may receive name points.
  - Attribute semantics (also used by the shaders): `star` is a point inside the unit sphere weighted to the surface; `ejecta.xyz` a unit direction, `ejecta.w` a speed factor in [0.6, 1.4]; `disk.x` radius in Schwarzschild units [3, 12], `disk.y` phase [0, 2π), `disk.z` vertical jitter ≈ N(0, 0.06), `disk.w` 1 if the particle falls back (≈30 %), else 0; `fragment` = project index in [0, projectCount) by azimuth sector.

- [ ] **Step 1: Write the failing tests**

`src/islands/field/particles.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { generateParticles, mulberry32, valueNoise3 } from './particles';

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('valueNoise3', () => {
  it('stays in [0, 1] and is continuous-ish', () => {
    const v0 = valueNoise3(1.2, 3.4, 5.6);
    const v1 = valueNoise3(1.2001, 3.4, 5.6);
    expect(v0).toBeGreaterThanOrEqual(0);
    expect(v0).toBeLessThanOrEqual(1);
    expect(Math.abs(v0 - v1)).toBeLessThan(0.01);
  });
});

describe('generateParticles', () => {
  const n = 5000;
  const p = generateParticles(n, 7, 42);

  it('sizes the buffers', () => {
    expect(p.count).toBe(n);
    expect(p.seed.length).toBe(4 * n);
    expect(p.star.length).toBe(3 * n);
    expect(p.ejecta.length).toBe(4 * n);
    expect(p.disk.length).toBe(4 * n);
    expect(p.fragment.length).toBe(n);
    expect(p.nameSlots).toBe(Math.round(0.55 * n));
  });

  it('keeps star points inside the unit sphere, weighted to the surface', () => {
    let outer = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(p.star[3 * i]!, p.star[3 * i + 1]!, p.star[3 * i + 2]!);
      expect(r).toBeLessThanOrEqual(1.0001);
      if (r > 0.8) outer++;
    }
    expect(outer / n).toBeGreaterThan(0.6);
  });

  it('gives unit ejecta directions with speed factors in [0.6, 1.4]', () => {
    for (let i = 0; i < n; i++) {
      const len = Math.hypot(p.ejecta[4 * i]!, p.ejecta[4 * i + 1]!, p.ejecta[4 * i + 2]!);
      expect(len).toBeCloseTo(1, 4);
      expect(p.ejecta[4 * i + 3]).toBeGreaterThanOrEqual(0.6);
      expect(p.ejecta[4 * i + 3]).toBeLessThanOrEqual(1.4);
    }
  });

  it('places disk radii in [3, 12] with about 30 % falling back', () => {
    let falls = 0;
    for (let i = 0; i < n; i++) {
      expect(p.disk[4 * i]).toBeGreaterThanOrEqual(3);
      expect(p.disk[4 * i]).toBeLessThanOrEqual(12);
      expect(p.disk[4 * i + 1]).toBeGreaterThanOrEqual(0);
      expect(p.disk[4 * i + 1]).toBeLessThan(Math.PI * 2);
      falls += p.disk[4 * i + 3]!;
    }
    expect(falls / n).toBeGreaterThan(0.25);
    expect(falls / n).toBeLessThan(0.35);
  });

  it('assigns every particle to one of the project fragments', () => {
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      const f = p.fragment[i]!;
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(7);
      seen.add(f);
    }
    expect(seen.size).toBe(7);
  });

  it('is deterministic for a seed', () => {
    const q = generateParticles(200, 3, 9);
    const r = generateParticles(200, 3, 9);
    expect(Array.from(q.star)).toEqual(Array.from(r.star));
  });
});
```

- [ ] **Step 2: Run to see failure**

Run: `npx vitest run src/islands/field/particles.test.ts`
Expected: FAIL, cannot resolve `./particles`.

- [ ] **Step 3: Write src/islands/field/particles.ts**

```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const fade = (t: number) => t * t * (3 - 2 * t);

/** Trilinear value noise in [0, 1]. Nearby inputs give nearby outputs; that continuity is what forms filaments. */
export function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = l(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = l(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = l(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = l(c(0, 1, 1), c(1, 1, 1), xf);
  return l(l(x00, x10, yf), l(x01, x11, yf), zf);
}

export interface ParticleBuffers {
  count: number;
  seed: Float32Array;
  star: Float32Array;
  ejecta: Float32Array;
  disk: Float32Array;
  fragment: Float32Array;
  nameSlots: number;
}

export function generateParticles(count: number, projectCount: number, seed = 1337): ParticleBuffers {
  const rnd = mulberry32(seed);
  const out: ParticleBuffers = {
    count,
    seed: new Float32Array(4 * count),
    star: new Float32Array(3 * count),
    ejecta: new Float32Array(4 * count),
    disk: new Float32Array(4 * count),
    fragment: new Float32Array(count),
    nameSlots: Math.round(0.55 * count),
  };
  const TAU = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) out.seed[4 * i + k] = rnd();

    // star: uniform direction, radius weighted toward the surface (r = u^(1/6))
    const z = 2 * rnd() - 1;
    const phi = TAU * rnd();
    const s = Math.sqrt(1 - z * z);
    const dx = s * Math.cos(phi), dy = s * Math.sin(phi), dz = z;
    const r = Math.pow(rnd(), 1 / 6);
    out.star[3 * i] = dx * r;
    out.star[3 * i + 1] = dy * r;
    out.star[3 * i + 2] = dz * r;

    // ejecta: direction perturbed by noise sampled at the direction (correlated → filaments)
    const nx = valueNoise3(dx * 2.5 + 11, dy * 2.5 + 7, dz * 2.5 + 3) - 0.5;
    const ny = valueNoise3(dx * 2.5 + 29, dy * 2.5 + 17, dz * 2.5 + 5) - 0.5;
    const nz = valueNoise3(dx * 2.5 + 41, dy * 2.5 + 23, dz * 2.5 + 13) - 0.5;
    let ex = dx + 0.7 * nx, ey = dy + 0.7 * ny, ez = dz + 0.7 * nz;
    const el = Math.hypot(ex, ey, ez) || 1;
    ex /= el; ey /= el; ez /= el;
    // speed lanes: noise-correlated so neighbouring directions share speed (Rayleigh-Taylor fingers)
    const lane = valueNoise3(ex * 3.1 + 7.7, ey * 3.1 + 1.3, ez * 3.1 + 9.1);
    const speed = 0.6 + 0.8 * Math.min(1, Math.max(0, lane * 1.2 - 0.1));
    out.ejecta[4 * i] = ex;
    out.ejecta[4 * i + 1] = ey;
    out.ejecta[4 * i + 2] = ez;
    out.ejecta[4 * i + 3] = speed;

    // disk: r = 3 + 9 u² (denser inward), phase, vertical jitter, fallback flag
    const u = rnd();
    out.disk[4 * i] = 3 + 9 * u * u;
    out.disk[4 * i + 1] = TAU * rnd();
    out.disk[4 * i + 2] = (rnd() + rnd() + rnd() - 1.5) * 0.06;
    out.disk[4 * i + 3] = rnd() < 0.3 ? 1 : 0;

    // fragment: azimuth sector of the ejecta direction
    const az = (Math.atan2(ey, ex) + Math.PI) / TAU;
    out.fragment[i] = Math.min(projectCount - 1, Math.floor(az * projectCount));
  }
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all PASS (if the fallback ratio test is flaky for your seed, it is not: the generator is deterministic for seed 42).

- [ ] **Step 5: Commit and push**

```bash
git add src/islands/field/particles.ts src/islands/field/particles.test.ts
git commit -m "Add deterministic particle attribute generation with tests"
git push origin main
```

---
### Task 7: WebGL2 field v0: a static, dithered star with DPR handling and a poster fallback

**Files:**
- Create: `src/islands/field/state.ts`, `src/islands/field/layout.ts`, `src/islands/field/gl.ts`, `src/islands/field/shaders/points.vert.glsl`, `src/islands/field/shaders/points.frag.glsl`, `src/islands/field/shaders/composite.frag.glsl`, `src/islands/field/index.ts`, `src/islands/field/fallback.ts`, `src/islands/boot.ts`, `scripts/poster.ts`, `src/islands/field/layout.test.ts`
- Modify: `src/layouts/Base.astro` (add the boot script)

**Interfaces:**
- Produces:
  - `FieldState` (state.ts): `{ target, progress, nameMix, pointerX, pointerY, force, hover, hoverY, detached, reducedMotion, textRect: [x, y, w, h] }` and `createState(reducedMotion: boolean): FieldState`. Every other module mutates this object; the field reads it once per frame.
  - `computeAnchor(vw, vh): { x, y, r }` and `particleCount(vw, vh, lowEnd): number` (layout.ts), `textRectOf(el: Element | null): [number, number, number, number]`.
  - `createField(canvas, { state, projectCount }): Field | null` where `Field = { setNamePoints(pts: Float32Array): void; setNameBox(x, y, w, h): void; setProbe(pts: Float32Array | null): void; setChapterColumn(el: Element | null): void; destroy(): void }`. Returns `null` (after showing the poster) when WebGL2 is unavailable.
  - Vertex-shader uniform names (kept stable through Tasks 8-9): `uResolution, uDpr, uProgress, uTime, uAnchor, uRadius, uNameBox, uNameMix, uPointer, uPointerForce, uHover, uHoverY, uDiskScale, uGain`. Composite uniforms: `uScene, uResolution, uDpr, uHole, uRsPx, uTextRect, uExposure`.
  - `public/poster.png` generated by `npm run poster`.

- [ ] **Step 1: Write state.ts and layout.ts (with a small test)**

`src/islands/field/state.ts`:
```ts
export interface FieldState {
  /** where scroll (or a mode) wants the lifecycle to be, 0..1 */
  target: number;
  /** smoothed lifecycle progress actually rendered, 0..1 */
  progress: number;
  /** load-time name assembly, 0..1 */
  nameMix: number;
  pointerX: number;
  pointerY: number;
  /** >0 repel, <0 attract, magnitude ≤ 1 */
  force: number;
  /** hovered project fragment index or -1 */
  hover: number;
  /** viewport y (css px) of the hovered row */
  hoverY: number;
  /** true while a mode toggle overrides scroll */
  detached: boolean;
  reducedMotion: boolean;
  /** current text column in css px: x, y, w, h */
  textRect: [number, number, number, number];
}

export function createState(reducedMotion: boolean): FieldState {
  return {
    target: 0,
    progress: 0,
    nameMix: 0,
    pointerX: -1e4,
    pointerY: -1e4,
    force: 0,
    hover: -1,
    hoverY: 0,
    detached: false,
    reducedMotion,
    textRect: [0, 0, 0, 0],
  };
}
```

`src/islands/field/layout.ts`:
```ts
export interface Anchor {
  x: number;
  y: number;
  /** star radius R in css px */
  r: number;
}

/** Object sits right of centre on desktop, behind the content on mobile (spec §2). */
export function computeAnchor(vw: number, vh: number): Anchor {
  const m = Math.min(vw, vh);
  if (vw < 768) return { x: vw * 0.5, y: vh * 0.38, r: m * 0.2 };
  return { x: vw * 0.62, y: vh * 0.5, r: m * 0.16 };
}

/** clamp(area * 0.035, 15k, 60k), ×0.4 on low-end devices (spec §3). */
export function particleCount(vw: number, vh: number, lowEnd: boolean): number {
  const n = Math.min(60000, Math.max(15000, Math.round(vw * vh * 0.035)));
  return lowEnd ? Math.round(n * 0.4) : n;
}

export function textRectOf(el: Element | null): [number, number, number, number] {
  if (!el) return [0, 0, 0, 0];
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height];
}
```

`src/islands/field/layout.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeAnchor, particleCount } from './layout';

describe('computeAnchor', () => {
  it('sits right of centre on desktop and centred high on mobile', () => {
    const d = computeAnchor(1440, 900);
    expect(d.x).toBeCloseTo(892.8);
    expect(d.y).toBe(450);
    expect(d.r).toBeCloseTo(144);
    const m = computeAnchor(390, 844);
    expect(m.x).toBe(195);
    expect(m.y).toBeCloseTo(320.72);
    expect(m.r).toBe(78);
  });
});

describe('particleCount', () => {
  it('clamps to [15k, 60k] and scales down on low-end devices', () => {
    expect(particleCount(1440, 900, false)).toBe(45360);
    expect(particleCount(390, 844, false)).toBe(15000);
    expect(particleCount(3840, 2160, false)).toBe(60000);
    expect(particleCount(1440, 900, true)).toBe(18144);
  });
});
```

Run: `npm test` → PASS.

- [ ] **Step 2: Write gl.ts helpers**

```ts
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
```

- [ ] **Step 3: Write the v0 shaders (star only; Task 8 replaces the vertex shader, Task 9 the composite)**

`src/islands/field/shaders/points.vert.glsl`:
```glsl
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
  px += (d / dist) * 60.0 * smoothstep(140.0, 0.0, dist) * uPointerForce;

  float cosT = clamp(star.z / max(length(star), 1e-3), 0.0, 1.0);
  vBright = (1.0 - 0.6 * (1.0 - cosT)) * uGain;          // limb darkening

  vec2 clip = (px / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 1.5 * uDpr;
}
```

`src/islands/field/shaders/points.frag.glsl`:
```glsl
#version 300 es
precision mediump float;
in float vBright;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d);
  outColor = vec4(vec3(vBright * a), 1.0);
}
```

`src/islands/field/shaders/composite.frag.glsl` (v0: attenuation + ordered dither + tone; lensing arrives in Task 9):
```glsl
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
```

- [ ] **Step 4: Write fallback.ts and the poster generator**

`src/islands/field/fallback.ts`:
```ts
/** No WebGL2 (or a lost context): paint the static poster behind the page instead. */
export function showPoster(canvas: HTMLCanvasElement): void {
  canvas.style.background = 'var(--graphite) url(/poster.png) center / cover no-repeat';
}
```

`scripts/poster.ts` (CPU render of the star state, same generator and dither as the GPU path):
```ts
import sharp from 'sharp';
import { generateParticles } from '../src/islands/field/particles';
import { computeAnchor } from '../src/islands/field/layout';

const W = 1600;
const H = 1000;
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];
const PALETTE = [[0x15, 0x16, 0x17], [0x7e, 0x83, 0x88], [0xcb, 0xce, 0xd1], [0xf3, 0xf2, 0xed]];

const { x: ax, y: ay, r: R } = computeAnchor(W, H);
const p = generateParticles(45000, 7);
const lum = new Float32Array(W * H);
for (let i = 0; i < p.count; i++) {
  const sx = p.star[3 * i]!, sy = p.star[3 * i + 1]!, sz = p.star[3 * i + 2]!;
  const cosT = Math.max(0, sz / (Math.hypot(sx, sy, sz) || 1));
  const b = (1 - 0.6 * (1 - cosT)) * 0.5;
  const px = Math.round(ax + sx * R), py = Math.round(ay + sy * R);
  if (px < 0 || py < 0 || px >= W || py >= H) continue;
  lum[py * W + px] = Math.min(1, lum[py * W + px]! + b);
}
const rgb = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const q = Math.min(3, Math.floor(lum[y * W + x]! * 0.9 * 3 + (BAYER[y & 7]![x & 7]! + 0.5) / 64));
    const c = PALETTE[q]!;
    const o = (y * W + x) * 3;
    rgb[o] = c[0]!; rgb[o + 1] = c[1]!; rgb[o + 2] = c[2]!;
  }
}
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png({ palette: true, colours: 4 }).toFile('public/poster.png');
console.log('wrote public/poster.png');
```

Run: `npm run poster`
Expected: `public/poster.png` exists, under 60 KB, showing a dithered disc right of centre.

- [ ] **Step 5: Write src/islands/field/index.ts**

```ts
import { attribute, createFbo, createProgram, uniforms } from './gl';
import { computeAnchor, particleCount, textRectOf } from './layout';
import { damp } from './lifecycle';
import { generateParticles } from './particles';
import type { FieldState } from './state';
import { showPoster } from './fallback';
import pointsVert from './shaders/points.vert.glsl?raw';
import pointsFrag from './shaders/points.frag.glsl?raw';
import compositeFrag from './shaders/composite.frag.glsl?raw';

const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export interface Field {
  setNamePoints(pts: Float32Array): void;
  setNameBox(x: number, y: number, w: number, h: number): void;
  setProbe(pts: Float32Array | null): void;
  setChapterColumn(el: Element | null): void;
  destroy(): void;
}

export interface FieldOptions {
  state: FieldState;
  projectCount: number;
}

const POINT_UNIFORMS = ['uResolution', 'uDpr', 'uProgress', 'uTime', 'uAnchor', 'uRadius', 'uNameBox', 'uNameMix', 'uPointer', 'uPointerForce', 'uHover', 'uHoverY', 'uDiskScale', 'uGain'] as const;
const COMPOSITE_UNIFORMS = ['uScene', 'uResolution', 'uDpr', 'uHole', 'uRsPx', 'uTextRect', 'uExposure'] as const;

export function createField(canvas: HTMLCanvasElement, { state, projectCount }: FieldOptions): Field | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) {
    showPoster(canvas);
    return null;
  }

  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
  let dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 2);
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  const count = particleCount(vw, vh, lowEnd);
  const particles = generateParticles(count, projectCount);

  // ---- programs ----
  const pointsProg = createProgram(gl, pointsVert, pointsFrag);
  const compProg = createProgram(gl, FULLSCREEN_VERT, compositeFrag);
  const pu = uniforms(gl, pointsProg, POINT_UNIFORMS);
  const cu = uniforms(gl, compProg, COMPOSITE_UNIFORMS);

  // ---- geometry ----
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  attribute(gl, pointsProg, 'aSeed', particles.seed, 4);
  attribute(gl, pointsProg, 'aStar', particles.star, 3);
  attribute(gl, pointsProg, 'aEjecta', particles.ejecta, 4);
  attribute(gl, pointsProg, 'aDisk', particles.disk, 4);
  attribute(gl, pointsProg, 'aFragment', particles.fragment, 1);
  const nameData = new Float32Array(2 * count).fill(-1);
  const nameBuf = attribute(gl, pointsProg, 'aName', nameData, 2, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(null);
  const emptyVao = gl.createVertexArray()!; // for the fullscreen triangle

  // ---- targets ----
  const fbo = createFbo(gl, Math.round(vw * dpr), Math.round(vh * dpr));

  let anchor = computeAnchor(vw, vh);
  let nameBox: [number, number, number, number] = [0, 0, 0, 0];
  let column: Element | null = document.querySelector('#top .col');
  let probe: Float32Array | null = null; // wired in Task 18
  const gain = lowEnd ? 0.8 : 0.5;

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const w = Math.round(vw * dpr);
    const h = Math.round(vh * dpr);
    canvas.width = w;
    canvas.height = h;
    fbo.resize(w, h);
    anchor = computeAnchor(vw, vh);
  }
  resize();

  // ---- loop ----
  let raf = 0;
  let last = performance.now();
  let idleSince = last;
  let slowFrames = 0;
  let frame = 0;
  let lastRenderedProgress = -1;
  const t0 = last;

  function render(now: number) {
    const time = state.reducedMotion ? 0 : (now - t0) / 1000;
    state.textRect = textRectOf(column);

    // pass 1: points → fbo (additive)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb);
    gl.viewport(0, 0, fbo.w, fbo.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(pointsProg);
    gl.bindVertexArray(vao);
    gl.uniform2f(pu.uResolution, vw, vh);
    gl.uniform1f(pu.uDpr, dpr);
    gl.uniform1f(pu.uProgress, state.progress);
    gl.uniform1f(pu.uTime, time);
    gl.uniform2f(pu.uAnchor, anchor.x, anchor.y);
    gl.uniform1f(pu.uRadius, anchor.r);
    gl.uniform4f(pu.uNameBox, nameBox[0], nameBox[1], nameBox[2], nameBox[3]);
    gl.uniform1f(pu.uNameMix, state.nameMix);
    gl.uniform2f(pu.uPointer, state.pointerX, state.pointerY);
    gl.uniform1f(pu.uPointerForce, state.force);
    gl.uniform1f(pu.uHover, state.hover);
    gl.uniform1f(pu.uHoverY, state.hoverY);
    gl.uniform1f(pu.uDiskScale, anchor.r * 0.16);
    gl.uniform1f(pu.uGain, gain);
    gl.drawArrays(gl.POINTS, 0, particles.count);
    gl.disable(gl.BLEND);

    // pass 2: composite → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(compProg);
    gl.bindVertexArray(emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
    gl.uniform1i(cu.uScene, 0);
    gl.uniform2f(cu.uResolution, vw, vh);
    gl.uniform1f(cu.uDpr, dpr);
    gl.uniform2f(cu.uHole, anchor.x, anchor.y);
    gl.uniform1f(cu.uRsPx, 0); // the hole forms in Task 9
    gl.uniform4f(cu.uTextRect, state.textRect[0], state.textRect[1], state.textRect[2], state.textRect[3]);
    gl.uniform1f(cu.uExposure, 0.9);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    lastRenderedProgress = state.progress;
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    if (document.hidden) return;

    state.progress = state.reducedMotion ? state.target : damp(state.progress, state.target, 8, dt);
    const moving = Math.abs(state.target - state.progress) > 1e-4 || state.force !== 0 || state.hover >= 0 || state.nameMix > 0 && state.nameMix < 1;
    if (moving) idleSince = now;

    // adaptive resolution: three slow frames in a row while moving → step the DPR down
    if (moving && dt > 0.02) {
      if (++slowFrames >= 3 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.5);
        resize();
        slowFrames = 0;
      }
    } else slowFrames = 0;

    if (state.reducedMotion && state.progress === lastRenderedProgress) return; // static when motion is reduced
    const idle = now - idleSince > 500;
    if (idle && frame % 2 === 1) return; // 30 fps idle
    render(now);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    showPoster(canvas);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  raf = requestAnimationFrame(tick);

  return {
    setNamePoints(pts) {
      const n = Math.min(pts.length, 2 * particles.nameSlots);
      nameData.fill(-1);
      nameData.set(pts.subarray(0, n));
      gl.bindBuffer(gl.ARRAY_BUFFER, nameBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nameData);
    },
    setNameBox(x, y, w, h) {
      nameBox = [x, y, w, h];
    },
    setProbe(pts) {
      probe = pts;
    },
    setChapterColumn(el) {
      column = el;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
    },
  };
}
```

- [ ] **Step 6: Write boot.ts and mount it from Base.astro**

`src/islands/boot.ts`:
```ts
import { createField } from './field';
import { createState } from './field/state';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('field') as HTMLCanvasElement | null;
const projectCount = Math.max(1, document.querySelectorAll('[data-fragment]').length);

export const state = createState(reducedMotion);
export const field = canvas ? createField(canvas, { state, projectCount }) : null;
```

In `src/layouts/Base.astro`, add before `</body>`:
```astro
    <script>
      import '../islands/boot';
    </script>
```

- [ ] **Step 7: Run it**

Run: `npm run dev`, open http://localhost:4321.
Expected: a stippled, limb-darkened disc right of centre, slowly rotating, with a fine four-level dither; text on the left is fully legible. Move the mouse over the disc: nothing yet (force is 0 until Task 13). Resize the window: the disc re-anchors without stretching. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → reload: the disc is static. DevTools console: no WebGL warnings. Then `npm run build && npm run budget`: total JS well under 120 KB (expect ≈ 6-8 KB).

- [ ] **Step 8: Commit and push**

```bash
git add src scripts/poster.ts public/poster.png
git commit -m "Render the field v0: WebGL2 points, dithered composite, DPR scaling, poster fallback"
git push origin main
```

---
## Phase 3: Lifecycle

### Task 8: Full lifecycle in the vertex shader, driven by scroll

**Files:**
- Modify (replace wholesale): `src/islands/field/shaders/points.vert.glsl`
- Create: `src/islands/field/scroll.ts`, `src/islands/field/scroll.test.ts`
- Modify: `src/islands/boot.ts`

**Interfaces:**
- Consumes: `FieldState`, `CHAPTERS`, `chapterProgress`, `Field.setChapterColumn`.
- Produces: `mountScroll(opts: { state: FieldState; onChapter?: (id: ChapterId, el: HTMLElement) => void; onScroll?: (direction: 1 | -1, y: number) => void }): { refresh(): void; destroy(): void }`. Dispatches nothing else; nav (Task 12) and modes (Task 13) subscribe through these callbacks. Also `sectionProgress(rectTop: number, rectHeight: number, viewportHeight: number): number` (pure: 0 when the section's top is at the viewport centre, 1 when its bottom is).

- [ ] **Step 1: Write the pure helper test**

`src/islands/field/scroll.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { sectionProgress } from './scroll';

describe('sectionProgress', () => {
  it('is 0 when the section top sits at the viewport centre and 1 when its bottom does', () => {
    const vh = 1000;
    expect(sectionProgress(500, 800, vh)).toBeCloseTo(0);
    expect(sectionProgress(-300, 800, vh)).toBeCloseTo(1);
    expect(sectionProgress(100, 800, vh)).toBeCloseTo(0.5);
  });
  it('clamps outside the section', () => {
    expect(sectionProgress(900, 800, 1000)).toBe(0);
    expect(sectionProgress(-2000, 800, 1000)).toBe(1);
  });
});
```

Run: `npx vitest run src/islands/field/scroll.test.ts` → FAIL (module missing).

- [ ] **Step 2: Write src/islands/field/scroll.ts**

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS, chapterProgress, type ChapterId } from './lifecycle';
import type { FieldState } from './state';

gsap.registerPlugin(ScrollTrigger);

/** 0 when the section's top crosses the viewport centre, 1 when its bottom does. */
export function sectionProgress(rectTop: number, rectHeight: number, viewportHeight: number): number {
  const centre = viewportHeight / 2;
  const t = (centre - rectTop) / rectHeight;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export interface ScrollOptions {
  state: FieldState;
  onChapter?: (id: ChapterId, el: HTMLElement) => void;
  onScroll?: (direction: 1 | -1, y: number) => void;
}

export function mountScroll({ state, onChapter, onScroll }: ScrollOptions) {
  const triggers: ScrollTrigger[] = [];

  for (const chapter of CHAPTERS) {
    const el = document.querySelector<HTMLElement>(`[data-chapter="${chapter.id}"]`);
    if (!el) continue;
    triggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top center',
        end: 'bottom center',
        onUpdate(self) {
          if (state.detached) return;
          state.target = state.reducedMotion ? chapter.poster : chapterProgress(chapter.id, self.progress);
        },
        onToggle(self) {
          if (self.isActive) onChapter?.(chapter.id, el);
        },
      }),
    );
  }

  // one document-level trigger for direction (used by the collapsing nav)
  triggers.push(
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        onScroll?.(self.direction === -1 ? -1 : 1, self.scroll());
      },
    }),
  );

  // before the hero centre the star is at rest
  if (!state.detached) state.target = state.reducedMotion ? CHAPTERS[0]!.poster : 0;

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => triggers.forEach((t) => t.kill()),
  };
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Replace points.vert.glsl with the full lifecycle**

```glsl
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

const float TILT_COS = 0.2588; // cos 75°: the disk is seen nearly edge-on

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

  // ---- ejecta: homologous (v ∝ r keeps the pattern self-similar), then Sedov deceleration ----
  float Rej = 1.25 + 7.0 * pow(tEject, 0.4);
  vec3 pEject = aEjecta.xyz * aEjecta.w * Rej;

  // ---- remnant: nearly stalled, slow turbulence ----
  vec3 turb = 0.08 * vec3(sin(uTime * 0.21 + aSeed.x * 31.0), sin(uTime * 0.17 + aSeed.y * 29.0), 0.0);
  vec3 pRem = aEjecta.xyz * aEjecta.w * (8.25 + 0.5 * tRem) + turb * tRem;

  // ---- Keplerian disk (ω ∝ r^-1.5), tilted toward edge-on ----
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
  px += (d / dist) * 60.0 * ss(140.0, 0.0, dist) * uPointerForce;

  // ---- brightness ----
  float cosT = clamp(aStar.z / max(length(aStar), 1e-3), 0.0, 1.0);
  float bStar = (1.0 - 0.6 * (1.0 - cosT)) * (1.0 - 0.4 * wCollapse);
  float flash = 3.0 * wBreak * (1.0 - ss(0.20, 0.26, p));
  float bEject = 6.0 / (Rej * Rej) + 0.5 * step(1.2, aEjecta.w);   // fades ∝ R^-2, outer shell brighter
  float bRem = 0.22;
  float beta = 0.35 * pow(aDisk.x / 3.0, -0.5);                     // faster inside → stronger beaming
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
```

- [ ] **Step 4: Wire scroll into boot.ts**

Replace `src/islands/boot.ts` with:
```ts
import { createField } from './field';
import { createState } from './field/state';
import { mountScroll } from './field/scroll';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('field') as HTMLCanvasElement | null;
const projectCount = Math.max(1, document.querySelectorAll('[data-fragment]').length);

export const state = createState(reducedMotion);
export const field = canvas ? createField(canvas, { state, projectCount }) : null;

export const scroll = mountScroll({
  state,
  onChapter(_id, el) {
    field?.setChapterColumn(el.querySelector('.col'));
  },
});

// ScrollTrigger measures once fonts and images are in
document.fonts.ready.then(() => scroll.refresh());
```

- [ ] **Step 5: Scrub the whole lifecycle in the browser**

Run: `npm run dev`. Scroll slowly from top to bottom and back. Expected, per section (compare with spec §3 table):
- Hero: calm limb-darkened disc (name particles are invisible until Task 10).
- About: the disc visibly shrinks and dims, then a thin bright shell flashes outward.
- Projects: filamentary ejecta expand fast then slow; the pattern scales, it does not smear; brightness fades.
- Skills: expansion stalls; faint filaments drift.
- Experience: about a third of the particles spiral inward and settle into a thin tilted ring; the rest fade.
- Horizon / Contact: the ring rotates faster inside than outside; one side is visibly brighter (Doppler).
Scroll back up: every state reverses exactly. Then `npm run build && npm run budget`: GSAP + ScrollTrigger add ≈ 30 KB; total still under 120 KB.

- [ ] **Step 6: Commit and push**

```bash
git add src
git commit -m "Drive the star lifecycle from scroll: collapse, breakout, ejecta, remnant, fallback, disk"
git push origin main
```

---

## Phase 4: The black hole

### Task 9: Lensing, shadow, photon ring, and the hole-forming ramp

**Files:**
- Modify (replace wholesale): `src/islands/field/shaders/composite.frag.glsl`
- Modify: `src/islands/field/index.ts` (compute `uRsPx` from progress)

**Interfaces:**
- Consumes: composite uniforms from Task 7.
- Produces: `holeRadiusPx(progress: number, starRadiusPx: number): number` exported from `src/islands/field/lifecycle.ts` (pure: `R * 0.16 * smoothstep(0.82, 0.90, progress)`), plus its test.

- [ ] **Step 1: Add holeRadiusPx with a test**

Append to `src/islands/field/lifecycle.ts`:
```ts
/** Schwarzschild radius on screen: 0 until the hole starts forming at 0.82, full at 0.90. */
export function holeRadiusPx(progress: number, starRadiusPx: number): number {
  return starRadiusPx * 0.16 * smoothstep(0.82, 0.9, progress);
}
```

Append to `src/islands/field/lifecycle.test.ts`:
```ts
import { holeRadiusPx } from './lifecycle';

describe('holeRadiusPx', () => {
  it('is zero before the horizon chapter and R * 0.16 once formed', () => {
    expect(holeRadiusPx(0.5, 150)).toBe(0);
    expect(holeRadiusPx(0.82, 150)).toBe(0);
    expect(holeRadiusPx(0.9, 150)).toBeCloseTo(24);
    expect(holeRadiusPx(1, 150)).toBeCloseTo(24);
    expect(holeRadiusPx(0.86, 150)).toBeGreaterThan(0);
    expect(holeRadiusPx(0.86, 150)).toBeLessThan(24);
  });
});
```
(Merge the import into the existing import line.) Run `npm test` → PASS.

- [ ] **Step 2: Replace composite.frag.glsl**

```glsl
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
```

- [ ] **Step 3: Feed uRsPx from progress in index.ts**

In `src/islands/field/index.ts`, import `holeRadiusPx` alongside `damp`:
```ts
import { damp, holeRadiusPx } from './lifecycle';
```
and replace the line `gl.uniform1f(cu.uRsPx, 0); // the hole forms in Task 9` with:
```ts
    gl.uniform1f(cu.uRsPx, holeRadiusPx(state.progress, anchor.r));
```

- [ ] **Step 4: Verify against the references**

Run: `npm run dev`; scroll into Horizon. Expected: as the section enters, a black disc grows at the anchor (shadow), the tilted ring visibly bends: its far side appears as an arc above and below the shadow (the Interstellar halo), a thin bright circle hugs the shadow's edge (photon ring), and the left/right brightness asymmetry from Task 8 persists. Compare side by side with the EHT M87* image (bright ring, dark centre) and a Gargantua still. Scroll back into Experience: the shadow shrinks away and the ring flattens back. Confirm there is no visible seam at the `b = 1` clamp (if there is, raise `max(b * b, 1.0)` to `max(b * b, 1.5)`).

- [ ] **Step 5: Commit and push**

```bash
git add src
git commit -m "Form the black hole: screen-space lensing, shadow, photon ring, Doppler asymmetry"
git push origin main
```

---
## Phase 5: Hero

### Task 10: Particles assemble the name on load

**Files:**
- Create: `src/islands/field/namePoints.ts`, `src/islands/field/namePoints.test.ts`, `src/islands/hero.ts`
- Modify: `src/islands/field/index.ts` (expose `nameSlots`, document-relative name box), `src/islands/boot.ts`, `src/components/Hero.astro` (remove `text-wrap: balance` so canvas wrapping matches the browser)

**Interfaces:**
- Produces: `pickPoints(mask: Uint8Array, w: number, h: number, count: number, rng: () => number): Float32Array` (pairs of x,y normalised to 0..1; all -1 when the mask is empty); `sampleName(el: HTMLElement, count: number): { points: Float32Array; box: DOMRect } | null`; `mountHero({ state, field }): void`.
- Changes `Field`: adds `readonly nameSlots: number`; `setNameBox(x, yDocument, w, h)` now takes a document-relative y and the renderer subtracts `window.scrollY` each frame so the name box follows the page.

- [ ] **Step 1: Write the failing test for pickPoints**

`src/islands/field/namePoints.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './particles';
import { pickPoints } from './namePoints';

describe('pickPoints', () => {
  it('returns count points that all fall inside filled mask cells', () => {
    const w = 8, h = 4;
    const mask = new Uint8Array(w * h);
    for (let x = 2; x < 6; x++) mask[1 * w + x] = 1; // one filled row segment
    const pts = pickPoints(mask, w, h, 50, mulberry32(1));
    expect(pts.length).toBe(100);
    for (let i = 0; i < 50; i++) {
      const cx = Math.floor(pts[2 * i]! * w);
      const cy = Math.floor(pts[2 * i + 1]! * h);
      expect(mask[cy * w + cx]).toBe(1);
    }
  });
  it('returns -1 sentinels for an empty mask', () => {
    const pts = pickPoints(new Uint8Array(16), 4, 4, 3, mulberry32(1));
    expect(Array.from(pts)).toEqual([-1, -1, -1, -1, -1, -1]);
  });
});
```

Run: `npx vitest run src/islands/field/namePoints.test.ts` → FAIL (module missing).

- [ ] **Step 2: Write src/islands/field/namePoints.ts**

```ts
import { mulberry32 } from './particles';

export function pickPoints(mask: Uint8Array, w: number, h: number, count: number, rng: () => number): Float32Array {
  const filled: number[] = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) filled.push(i);
  const out = new Float32Array(2 * count);
  if (filled.length === 0) return out.fill(-1);
  for (let k = 0; k < count; k++) {
    const idx = filled[Math.floor(rng() * filled.length)]!;
    out[2 * k] = ((idx % w) + rng()) / w;
    out[2 * k + 1] = (Math.floor(idx / w) + rng()) / h;
  }
  return out;
}

/** Rasterises the element's text with its computed font into an offscreen canvas and samples the glyph mask. */
export function sampleName(el: HTMLElement, count: number): { points: Float32Array; box: DOMRect } | null {
  const box = el.getBoundingClientRect();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);
  if (!w || !h) return null;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.1;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing;

  // greedy word wrap at the element width, the same rule the browser applies to plain text
  const words = (el.textContent ?? '').trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(test).width > w) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => ctx.fillText(ln, 0, i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8));

  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = data[4 * i + 3]! > 128 ? 1 : 0;
  return { points: pickPoints(mask, w, h, count, mulberry32(99)), box };
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Expose nameSlots and make the name box follow the page (index.ts)**

In `src/islands/field/index.ts`:
1. Add to the `Field` interface: `readonly nameSlots: number;`
2. Change the `nameBox` handling: keep `let nameBox` as is, and in `render()` replace the `uNameBox` line with
```ts
    gl.uniform4f(pu.uNameBox, nameBox[0], nameBox[1] - window.scrollY, nameBox[2], nameBox[3]);
```
3. In the returned object add `nameSlots: particles.nameSlots,` and change the `setNameBox` doc comment: `y` is document-relative.

- [ ] **Step 4: Write src/islands/hero.ts**

```ts
import gsap from 'gsap';
import type { Field } from './field';
import { sampleName } from './field/namePoints';
import type { FieldState } from './field/state';

export function mountHero({ state, field }: { state: FieldState; field: Field | null }): void {
  const h1 = document.querySelector<HTMLElement>('[data-name]');
  if (!h1 || !field || state.reducedMotion) return; // reduced motion: the real h1 stays, no particles for the name

  let resizeTimer = 0;

  const upload = () => {
    const sampled = sampleName(h1, field.nameSlots);
    if (!sampled) return false;
    field.setNamePoints(sampled.points);
    field.setNameBox(sampled.box.left, sampled.box.top + window.scrollY, sampled.box.width, sampled.box.height);
    return true;
  };

  document.fonts.ready.then(() => {
    if (!upload()) return;
    gsap.to(state, {
      nameMix: 1,
      duration: 0.9,
      ease: 'power2.out',
      onComplete: () => h1.classList.add('is-assembled'),
    });
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(upload, 200);
  });
}
```

- [ ] **Step 5: Mount it and drop balance wrapping**

In `src/islands/boot.ts` add:
```ts
import { mountHero } from './hero';
// ...after scroll is created:
mountHero({ state, field });
```
In `src/components/Hero.astro` delete the line `text-wrap: balance;`.

- [ ] **Step 6: Verify**

Run: `npm run dev`, hard-reload. Expected: the name renders instantly as real text; within ~1 s a loose cloud of particles converges onto the letterforms and the text fades out, leaving a stippled name that matches the glyphs (compare by toggling `.is-assembled` off in DevTools: the outlines coincide). Scroll: the particle name streams into the star over the first tenth of the page and reforms on the way back. Resize the window: the name re-samples at the new size. Reduced motion emulation: the text stays, no particles form the name, the star is smaller (it holds only 45 % of the particles). Lighthouse: LCP element is still the `<h1>`.

- [ ] **Step 7: Commit and push**

```bash
git add src
git commit -m "Assemble the hero name from particles and release it into the star on scroll"
git push origin main
```

---

### Task 11: Dithered portrait pipeline and component

**Files:**
- Create: `scripts/dither.ts`, `src/components/DitheredImage.astro`, `src/assets/.gitkeep`
- Modify: `src/pages/index.astro` (portrait slot), `.gitignore` (ignore `src/assets/portrait.*` originals? No: commit the original so CI can build; keep it under 2 MB)
- Generated: `public/portrait-dither.png`, `public/portrait.avif`, `public/portrait.webp`

**Interfaces:**
- Produces: `npm run dither [input] [outBase]` (defaults `src/assets/portrait.jpg` → `public/portrait`), `DitheredImage` props `{ base: string; alt: string; size?: number }` rendering a `<button class="dimg" aria-pressed>` that reveals color on hover/focus, toggles it on click, and auto-reveals while centred on touch devices.

- [ ] **Step 1: Write scripts/dither.ts**

```ts
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const [, , input = 'src/assets/portrait.jpg', outBase = 'public/portrait'] = process.argv;
const SIZE = 560; // 2× of the 280 px desktop slot
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

// no portrait yet: a neutral placeholder so the build and layout work; replace the file and re-run
const source = existsSync(input)
  ? sharp(input)
  : sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="#5a5f64"/><circle cx="50%" cy="42%" r="22%" fill="#9aa0a5"/><rect x="20%" y="68%" width="60%" height="40%" rx="30%" fill="#9aa0a5"/></svg>`));

const square = source.clone().resize(SIZE, SIZE, { fit: 'cover', position: 'attention' });
const gray = await square.clone().grayscale().normalise().raw().toBuffer();

const out = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    const threshold = ((BAYER[y & 7]![x & 7]! + 0.5) / 64) * 255;
    const on = gray[i]! > threshold;
    out[3 * i] = on ? 0xf3 : 0x15;
    out[3 * i + 1] = on ? 0xf2 : 0x16;
    out[3 * i + 2] = on ? 0xed : 0x17;
  }
}
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ palette: true, colours: 2 }).toFile(`${outBase}-dither.png`);
await square.clone().avif({ quality: 50 }).toFile(`${outBase}.avif`);
await square.clone().webp({ quality: 78 }).toFile(`${outBase}.webp`);
console.log(`wrote ${outBase}-dither.png, ${outBase}.avif, ${outBase}.webp`);
```

Run: `mkdir -p src/assets && npm run dither`
Expected: three files in `public/`; `portrait-dither.png` ≤ 30 KB, `portrait.avif` ≤ 150 KB. (Once the real photo is at `src/assets/portrait.jpg`, re-run; also copy the resume to `public/resume.pdf`.)

- [ ] **Step 2: Write src/components/DitheredImage.astro**

```astro
---
interface Props { base: string; alt: string; size?: number }
const { base, alt, size = 280 } = Astro.props;
---
<button type="button" class="dimg" style={`--size:${size}px`} aria-pressed="false" data-dimg>
  <span class="sr-only">Show the portrait in color</span>
  <img class="dimg__dither" src={`${base}-dither.png`} alt={alt} width={size} height={size} decoding="async" fetchpriority="high" />
  <picture class="dimg__color" aria-hidden="true">
    <source srcset={`${base}.avif`} type="image/avif" />
    <img src={`${base}.webp`} alt="" width={size} height={size} loading="lazy" decoding="async" />
  </picture>
</button>

<style>
  .dimg {
    position: relative;
    display: block;
    width: var(--size);
    height: var(--size);
    max-width: 100%;
    aspect-ratio: 1;
    cursor: pointer;
    transition: transform var(--d-press) var(--ease-out);
  }
  .dimg:active { transform: scale(0.98); }
  .dimg img { width: 100%; height: 100%; object-fit: cover; }
  .dimg__color {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity var(--d-image) var(--ease-out);
  }
  .dimg:hover .dimg__color,
  .dimg:focus-visible .dimg__color,
  .dimg.is-centered .dimg__color,
  .dimg[aria-pressed='true'] .dimg__color { opacity: 1; }
  @media (max-width: 767px) {
    .dimg { width: 120px; height: 120px; }
  }
</style>

<script>
  const els = document.querySelectorAll<HTMLButtonElement>('[data-dimg]');
  els.forEach((el) => {
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-pressed') === 'true';
      el.setAttribute('aria-pressed', String(!on));
    });
  });
  // touch devices have no hover: color in while the portrait is near the viewport centre
  if (window.matchMedia('(hover: none)').matches) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('is-centered', e.isIntersecting)),
      { rootMargin: '-40% 0px -40% 0px' },
    );
    els.forEach((el) => io.observe(el));
  }
</script>
```

- [ ] **Step 3: Place the portrait in the hero**

In `src/pages/index.astro`:
```astro
import DitheredImage from '../components/DitheredImage.astro';
// ...
  <Hero>
    <DitheredImage slot="portrait" base="/portrait" alt={`Portrait of ${site.name}`} size={260} />
  </Hero>
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Expected: a 2-color stippled portrait top-right that becomes the color photo on hover, on keyboard focus, and stays after a click (button state). In device emulation (touch), it colors in when scrolled to the middle of the screen. `npm run build && npm run budget` still passes. Check `dist/index.html` has `fetchpriority="high"` on the dithered image.

- [ ] **Step 5: Commit and push**

```bash
git add scripts/dither.ts src public/portrait-dither.png public/portrait.avif public/portrait.webp
git commit -m "Add the dithered portrait pipeline and color-on-hover image component"
git push origin main
```

---
## Phase 6: Nav, modes, pointer

### Task 12: Top pill nav behaviour: sliding indicator, collapse on scroll, keyboard, smooth scroll

**Files:**
- Create: `src/islands/nav/topNav.ts`
- Modify: `src/components/TopNav.astro` (mobile-open styles), `src/islands/boot.ts`

**Interfaces:**
- Consumes: hooks from Task 2, `mountScroll` callbacks from Task 8.
- Produces: `mountTopNav({ reducedMotion }): TopNav | null` with `TopNav = { setChapter(id: string): void; setScroll(direction: 1 | -1, y: number): void }`. Dispatches `window` event `chapter:navigate` (CustomEvent, no detail) whenever a header link is used, so Task 13 can re-attach scroll.

- [ ] **Step 1: Add mobile-open styles to TopNav.astro**

Append inside the `<style>` block of `src/components/TopNav.astro`:
```css
  @media (max-width: 767px) {
    .pill__item:not(.is-active) { display: none; }
    .pill.is-open {
      position: fixed;
      left: 12px;
      right: 12px;
      top: 12px;
      justify-content: flex-start;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    .pill.is-open .pill__item { display: inline-flex; scroll-snap-align: start; }
    .topbar.is-open .wordmark,
    .topbar.is-open .topbar__contact { opacity: 0; pointer-events: none; }
  }
```

- [ ] **Step 2: Write src/islands/nav/topNav.ts**

```ts
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export interface TopNav {
  setChapter(id: string): void;
  setScroll(direction: 1 | -1, y: number): void;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function mountTopNav({ reducedMotion }: { reducedMotion: boolean }): TopNav | null {
  const topbar = document.querySelector<HTMLElement>('[data-topbar]');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const indicator = nav?.querySelector<HTMLElement>('[data-indicator]');
  const toggle = nav?.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const links = Array.from(nav?.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]') ?? []);
  if (!topbar || !nav || !indicator || !toggle || links.length === 0) return null;

  let active: HTMLAnchorElement | null = null;
  let collapsed = false;
  let pinned = false; // hover or focus keeps the pill open
  let mobileOpen = false;
  let lastDirection: 1 | -1 = 1;
  let pastHero = false;
  let collapseTimer = 0;

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const originX = () => nav!.getBoundingClientRect().left + nav!.clientLeft;

  // ---- indicator: FLIP with a slight stretch at mid-slide ----
  function moveIndicator(to: HTMLAnchorElement, animate: boolean) {
    const from = indicator!.getBoundingClientRect();
    const rect = to.getBoundingClientRect();
    const hadWidth = from.width > 0;
    const finalX = rect.left - originX();
    indicator!.style.width = `${rect.width}px`;
    indicator!.style.transform = `translateX(${finalX}px)`;
    indicator!.classList.add('is-visible');
    if (!animate || !hadWidth || reducedMotion) return;
    const fromX = from.left - originX();
    const sx = from.width / rect.width;
    indicator!.animate(
      [
        { transform: `translateX(${fromX}px) scaleX(${sx})` },
        { transform: `translateX(${(fromX + finalX) / 2}px) scaleX(${Math.max(sx, 1) * 1.08})`, offset: 0.5 },
        { transform: `translateX(${finalX}px) scaleX(1)` },
      ],
      { duration: 250, easing: EASE },
    );
  }

  function setChapter(id: string) {
    const link = links.find((l) => l.dataset.chapterLink === id);
    if (!link) {
      if (id === 'top') {
        active?.classList.remove('is-active');
        active = null;
        indicator!.classList.remove('is-visible');
        indicator!.style.width = '0px';
      }
      return; // 'contact' keeps the last highlighted section
    }
    if (link === active) return;
    active?.classList.remove('is-active');
    link.classList.add('is-active');
    active = link;
    moveIndicator(link, true);
  }

  // ---- collapse / expand (desktop): fade labels, then FLIP the pill width with a counter-scaled active label ----
  function applyCollapsed(next: boolean) {
    if (collapsed === next || isMobile()) return;
    collapsed = next;
    topbar!.classList.toggle('is-collapsed', next);
    nav!.classList.toggle('is-collapsed', next);
    const others = links.filter((l) => l !== active);
    const before = nav!.getBoundingClientRect();

    const relayout = () => {
      others.forEach((l) => (l.parentElement!.hidden = next));
      const after = nav!.getBoundingClientRect();
      if (active) moveIndicator(active, false);
      if (reducedMotion || after.width === 0) return;
      const s = before.width / after.width;
      const opts: KeyframeAnimationOptions = { duration: 300, easing: EASE };
      nav!.animate([{ transform: `scaleX(${s})` }, { transform: 'scaleX(1)' }], opts);
      active?.animate([{ transform: `scaleX(${1 / s})` }, { transform: 'scaleX(1)' }], opts);
    };
    if (next) window.setTimeout(relayout, reducedMotion ? 0 : 150); // let the labels fade first
    else relayout();
  }

  function scheduleCollapse(delay: number) {
    window.clearTimeout(collapseTimer);
    collapseTimer = window.setTimeout(() => {
      if (!pinned && pastHero && lastDirection === 1) applyCollapsed(true);
    }, delay);
  }

  function setScroll(direction: 1 | -1, y: number) {
    lastDirection = direction;
    const hero = document.querySelector<HTMLElement>('[data-chapter="top"]');
    pastHero = y > (hero?.offsetHeight ?? window.innerHeight) * 0.6;
    if (!pastHero || direction === -1) {
      window.clearTimeout(collapseTimer);
      applyCollapsed(false);
      return;
    }
    if (!pinned) scheduleCollapse(250);
  }

  // hover and focus keep it open; leaving schedules a collapse 1.2 s later
  nav.addEventListener('pointerenter', () => {
    pinned = true;
    window.clearTimeout(collapseTimer);
    applyCollapsed(false);
  });
  nav.addEventListener('pointerleave', () => {
    pinned = false;
    scheduleCollapse(1200);
  });
  nav.addEventListener('focusin', () => {
    pinned = true;
    applyCollapsed(false);
  });
  nav.addEventListener('focusout', (e) => {
    if (nav!.contains(e.relatedTarget as Node | null)) return;
    pinned = false;
    scheduleCollapse(1200);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    active?.focus();
    pinned = false;
    if (isMobile()) setMobileOpen(false);
    else applyCollapsed(true);
  });

  // ---- mobile toggle ----
  function setMobileOpen(open: boolean) {
    mobileOpen = open;
    toggle!.setAttribute('aria-expanded', String(open));
    nav!.classList.toggle('is-open', open);
    topbar!.classList.toggle('is-open', open);
    if (active) moveIndicator(active, false);
  }
  toggle.addEventListener('click', () => setMobileOpen(!mobileOpen));

  // ---- smooth scroll for every header hash link ----
  topbar.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('chapter:navigate'));
      if (isMobile()) setMobileOpen(false);
      gsap.to(window, { scrollTo: { y: target, autoKill: true }, duration: reducedMotion ? 0 : 0.8, ease: 'power2.inOut' });
      history.pushState(null, '', a.getAttribute('href'));
    });
  });

  window.addEventListener('resize', () => {
    if (active) moveIndicator(active, false);
  });

  return { setChapter, setScroll };
}
```

- [ ] **Step 3: Wire it in boot.ts**

```ts
import { mountTopNav } from './nav/topNav';
// before mountScroll:
const nav = mountTopNav({ reducedMotion });
// in mountScroll options:
  onChapter(id, el) {
    field?.setChapterColumn(el.querySelector('.col'));
    nav?.setChapter(id);
  },
  onScroll(direction, y) {
    nav?.setScroll(direction, y);
  },
```

- [ ] **Step 4: Verify**

Run: `npm run dev`.
- Scroll slowly: the filled pill glides from About → Projects → Skills → Experience → Horizon with a small stretch mid-slide; in Contact it stays on Horizon; back at the very top it disappears.
- Scroll down past the hero and stop: within ~0.25 s the other labels fade, then the pill shrinks around the active label (the label itself does not distort). Scroll up one notch: it re-expands. Hover it: it expands and stays; move away: collapses after ~1.2 s.
- Keyboard: Tab into the pill (it expands), arrow/Tab across items, Escape collapses and focus lands on the active item. Every item has the ring.
- Click "Skills": smooth 0.8 s scroll, URL hash updates, indicator lands on Skills.
- 375 px device emulation: the pill shows only the active label and a two-bar toggle; tap opens a full-width row, tap a label closes it and scrolls.
- Reduced motion: no slide, no FLIP; states switch instantly.

- [ ] **Step 5: Commit and push**

```bash
git add src
git commit -m "Animate the top pill nav: sliding indicator, collapse on scroll, keyboard and smooth scroll"
git push origin main
```

---

### Task 13: Mode toggle and pointer forces

**Files:**
- Create: `src/components/ModeToggle.astro`, `src/islands/modes.ts`, `src/islands/pointer.ts`
- Modify: `src/layouts/Base.astro` (render `<ModeToggle />` after `<main>`), `src/islands/boot.ts`

**Interfaces:**
- Consumes: `MODE_TARGETS`, `ModeId` from lifecycle.ts, `FieldState`, `chapter:navigate` event from Task 12.
- Produces: `mountModes({ state, reducedMotion }): { select(id: ModeId): void } | null`; `mountPointer({ state }): { setEnabled(on: boolean): void }` (Task 18 disables it while a probe flies).

- [ ] **Step 1: Write src/components/ModeToggle.astro**

```astro
---
const modes = [
  { id: 'scroll', label: 'follow scroll' },
  { id: 'star', label: 'star' },
  { id: 'nova', label: 'nova' },
  { id: 'remnant', label: 'remnant' },
  { id: 'horizon', label: 'horizon' },
] as const;
---
<div class="modes" role="group" aria-label="Star lifecycle" data-modes>
  {modes.map((m) => (
    <button type="button" class="modes__btn" data-mode={m.id} aria-pressed={m.id === 'scroll' ? 'true' : 'false'}>{m.label}</button>
  ))}
</div>

<style>
  .modes {
    position: fixed;
    left: 20px;
    bottom: max(20px, env(safe-area-inset-bottom));
    z-index: 40;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: calc(100vw - 40px);
  }
  .modes__btn {
    min-height: 44px;
    padding: 0 14px;
    border-radius: var(--r-pill);
    border: 1px solid var(--hairline);
    background: var(--smoke);
    font-family: var(--font-mono);
    font-size: var(--fs-mono-sm);
    letter-spacing: 0.06em;
    color: var(--fog);
    transition:
      color var(--d-hover) var(--ease-out),
      background-color var(--d-hover) var(--ease-out),
      transform var(--d-press) var(--ease-out);
  }
  .modes__btn:hover { color: var(--core); }
  .modes__btn:active { transform: scale(0.98); }
  .modes__btn[aria-pressed='true'] { background: var(--core); color: var(--graphite); border-color: var(--core); }
  @media (max-width: 767px) {
    .modes { left: 12px; bottom: max(12px, env(safe-area-inset-bottom)); }
    .modes__btn { padding: 0 10px; font-size: 0.75rem; }
  }
</style>
```

In `src/layouts/Base.astro`: `import ModeToggle from '../components/ModeToggle.astro';` and render `<ModeToggle />` right after `</main>`.

- [ ] **Step 2: Write src/islands/modes.ts**

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MODE_TARGETS, type ModeId } from './field/lifecycle';
import type { FieldState } from './field/state';

export function mountModes({ state, reducedMotion }: { state: FieldState; reducedMotion: boolean }) {
  const root = document.querySelector<HTMLElement>('[data-modes]');
  if (!root) return null;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  let tween: gsap.core.Tween | null = null;

  function select(id: ModeId) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === id)));
    tween?.kill();
    if (id === 'scroll') {
      state.detached = false;
      ScrollTrigger.update(); // re-derive the target from the current scroll position
      return;
    }
    state.detached = true;
    tween = gsap.to(state, { target: MODE_TARGETS[id], duration: reducedMotion ? 0 : 1.1, ease: 'power2.inOut' });
  }

  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.mode as ModeId)));

  // any real scrolling intent hands control back to the page
  const reattach = () => {
    if (state.detached) select('scroll');
  };
  window.addEventListener('wheel', reattach, { passive: true });
  window.addEventListener('touchmove', reattach, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) reattach();
  });
  window.addEventListener('chapter:navigate', reattach);

  return { select };
}
```

- [ ] **Step 3: Write src/islands/pointer.ts**

```ts
import gsap from 'gsap';
import type { FieldState } from './field/state';

export function mountPointer({ state }: { state: FieldState }) {
  let enabled = !state.reducedMotion && !window.matchMedia('(hover: none)').matches;
  let down = false;
  let idleTimer = 0;
  let tween: gsap.core.Tween | null = null;

  const to = (force: number, duration: number) => {
    tween?.kill();
    tween = gsap.to(state, { force, duration, ease: 'power2.out' });
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!enabled) return;
      state.pointerX = e.clientX;
      state.pointerY = e.clientY;
      if (!down && state.force <= 0) to(1, 0.2); // repel while the pointer moves
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => !down && to(0, 0.6), 1500); // let the frame loop idle when still
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', (e) => {
    if (!enabled || (e.target as Element).closest('a, button, input, textarea, select')) return;
    down = true;
    to(-1, 0.4); // press and hold attracts
  });
  const release = () => {
    if (!down) return;
    down = false;
    to(1, 0.3);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('pointerleave', () => to(0, 0.3));
  window.addEventListener('blur', () => to(0, 0.2));

  return {
    setEnabled(on: boolean) {
      enabled = on && !state.reducedMotion;
      if (!enabled) {
        down = false;
        to(0, 0.2);
      }
    },
  };
}
```

- [ ] **Step 4: Wire both in boot.ts**

```ts
import { mountModes } from './modes';
import { mountPointer } from './pointer';
// after mountHero:
export const modes = mountModes({ state, reducedMotion });
export const pointer = mountPointer({ state });
```

- [ ] **Step 5: Verify**

Run: `npm run dev`.
- Move the mouse through the star: particles part around the cursor within ~140 px and close back behind it. Hold the button on empty space: they gather toward the cursor over ~0.4 s; release: they spring back.
- Stop moving for 1.5 s: DevTools Performance shows the frame loop dropping to ~30 fps; move again: 60 fps.
- Click "nova" in the bottom-left: the object tweens to the breakout state in ~1.1 s without the page moving; the button inverts. Scroll a notch: "follow scroll" re-selects and the object snaps back under scroll control.
- Click a nav link while a mode is active: control returns to scroll.
- Touch emulation: no pointer forces (hover: none); mode buttons still work. Reduced motion: no forces, mode changes are instant.

- [ ] **Step 6: Commit and push**

```bash
git add src
git commit -m "Add lifecycle mode toggle and stateless pointer forces"
git push origin main
```

---
## Phase 7: Section interactions

### Task 14: Project rows light up their fragment in the field

**Files:**
- Create: `src/islands/projectsHover.ts`
- Modify: `src/islands/boot.ts`

**Interfaces:**
- Consumes: `li[data-fragment]` rows (Task 3), `FieldState.hover / hoverY` read by the vertex shader (Task 8).
- Produces: `mountProjectsHover({ state }): void`.

- [ ] **Step 1: Write src/islands/projectsHover.ts**

```ts
import type { FieldState } from './field/state';

export function mountProjectsHover({ state }: { state: FieldState }): void {
  if (state.reducedMotion) return; // the gather is motion; brightness alone is not worth a special path
  const rows = document.querySelectorAll<HTMLElement>('[data-fragment]');
  rows.forEach((row) => {
    const index = Number(row.dataset.fragment);
    const on = () => {
      const r = row.getBoundingClientRect();
      state.hover = index;
      state.hoverY = r.top + r.height / 2;
    };
    const off = () => {
      if (state.hover === index) state.hover = -1;
    };
    row.addEventListener('pointerenter', on);
    row.addEventListener('pointerleave', off);
    row.addEventListener('focusin', on);
    row.addEventListener('focusout', (e) => {
      if (!row.contains(e.relatedTarget as Node | null)) off();
    });
  });
}
```

- [ ] **Step 2: Wire in boot.ts**

```ts
import { mountProjectsHover } from './projectsHover';
mountProjectsHover({ state });
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, scroll to Projects. Hover the first row: one azimuthal wedge of the ejecta brightens (×2) and leans toward the row's height; the title nudges 4 px right and the arrow fades in. Move down the list: a different wedge each time. Tab through the rows: the same happens on focus. Leave: everything releases.

- [ ] **Step 4: Commit and push**

```bash
git add src
git commit -m "Light up a project's ejecta fragment on row hover and focus"
git push origin main
```

---

### Task 15: Section reveals and the experience spiral drawn on scroll

**Files:**
- Create: `src/islands/reveals.ts`
- Modify: `src/islands/boot.ts`

**Interfaces:**
- Consumes: `[data-reveal]` blocks and `svg[data-spiral] path` (Task 3).
- Produces: `mountReveals({ reducedMotion }): void`. Content is visible without JavaScript (the from-tween hides nothing until it runs).

- [ ] **Step 1: Write src/islands/reveals.ts**

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function mountReveals({ reducedMotion }: { reducedMotion: boolean }): void {
  const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (!reducedMotion) {
    blocks.forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        ease: 'power1.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
  }

  // the experience hairline draws itself as the section scrolls by (accretion spiral)
  const path = document.querySelector<SVGPathElement>('[data-spiral] path');
  if (!path) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  if (reducedMotion) {
    path.style.strokeDashoffset = '0';
    return;
  }
  gsap.fromTo(
    path,
    { strokeDashoffset: length },
    {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: '#experience', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
    },
  );
}
```

- [ ] **Step 2: Wire in boot.ts**

```ts
import { mountReveals } from './reveals';
mountReveals({ reducedMotion });
```

- [ ] **Step 3: Verify**

Run: `npm run dev`. About, each project row, the spectrum, each experience entry and the contact block fade up 12 px as they enter (once; scrolling back does not replay). In Experience the hairline draws from the top and bends toward the object as you scroll. Disable JavaScript in DevTools and reload: all content is visible. Reduced motion: no fades, the path is fully drawn.

- [ ] **Step 4: Commit and push**

```bash
git add src
git commit -m "Reveal sections once on entry and draw the experience spiral on scroll"
git push origin main
```

---

## Phase 8: The slingshot toy

### Task 16: Gravity slingshot in the Horizon section

**Files:**
- Create: `src/islands/toy/slingshot.ts`, `src/islands/toy/slingshot.test.ts`, `src/islands/toy/index.ts`, `src/islands/field/shaders/probe.vert.glsl`
- Modify: `src/islands/field/index.ts` (draw the probe buffer), `src/islands/boot.ts`

**Interfaces:**
- Produces (pure): `interface Probe { x, y, vx, vy, t, outcome: 'flying' | 'captured' | 'escaped' | 'orbiting', trail: Float32Array, trailCount }`, `createProbe(x, y, vx, vy, capacity = 600): Probe`, `accel(x, y, gm, rs): [number, number]` (Paczyński-Wiita `Φ = -GM/(r - r_s)`), `stepProbe(p, cfg: { gm, rs, captureRadius, escapeRadius, orbitAfter }, dt, substeps = 8): Probe`. Units are Schwarzschild radii, origin at the hole.
- Produces (DOM): `mountToy({ state, field, pointer, reducedMotion }): void`.
- Changes `Field.setProbe(pts)`: `pts` are css-px pairs drawn as 2 px points each frame.

- [ ] **Step 1: Write the failing integrator tests**

`src/islands/toy/slingshot.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { accel, createProbe, stepProbe } from './slingshot';

const cfg = { gm: 1, rs: 1, captureRadius: 1.5, escapeRadius: 60, orbitAfter: 40 };

describe('accel', () => {
  it('points toward the hole and grows faster than Newtonian near r_s', () => {
    const [ax, ay] = accel(10, 0, 1, 1);
    expect(ax).toBeLessThan(0);
    expect(ay).toBeCloseTo(0);
    const far = Math.hypot(...accel(10, 0, 1, 1));
    const near = Math.hypot(...accel(2, 0, 1, 1));
    expect(near / far).toBeGreaterThan(25); // Newtonian ratio would be 25
  });
});

describe('stepProbe', () => {
  it('keeps a circular orbit at r = 6 bounded', () => {
    const r = 6;
    const v = Math.sqrt(cfg.gm * r) / (r - cfg.rs); // circular speed in the Paczyński-Wiita potential
    const p = createProbe(r, 0, 0, v);
    for (let i = 0; i < 3000; i++) stepProbe(p, cfg, 1 / 120);
    const rr = Math.hypot(p.x, p.y);
    expect(rr).toBeGreaterThan(5);
    expect(rr).toBeLessThan(7);
    expect(p.outcome === 'flying' || p.outcome === 'orbiting').toBe(true);
  });
  it('captures a probe dropped from rest', () => {
    const p = createProbe(8, 0, 0, 0);
    for (let i = 0; i < 5000 && p.outcome === 'flying'; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.outcome).toBe('captured');
  });
  it('lets a fast probe escape', () => {
    const p = createProbe(10, 0, 0, 3);
    for (let i = 0; i < 5000 && p.outcome === 'flying'; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.outcome).toBe('escaped');
  });
  it('records a trail of at most capacity points', () => {
    const p = createProbe(10, 0, 0, 0.6, 50);
    for (let i = 0; i < 200; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.trailCount).toBe(50);
  });
});
```

Run: `npx vitest run src/islands/toy/slingshot.test.ts` → FAIL (module missing).

- [ ] **Step 2: Write src/islands/toy/slingshot.ts**

```ts
export type Outcome = 'flying' | 'captured' | 'escaped' | 'orbiting';

export interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  outcome: Outcome;
  /** ring buffer of past positions (x, y pairs) */
  trail: Float32Array;
  trailCount: number;
  trailHead: number;
}

export interface ProbeConfig {
  gm: number;
  rs: number;
  captureRadius: number;
  escapeRadius: number;
  /** seconds of flight after which a still-bound probe counts as orbiting */
  orbitAfter: number;
}

export function createProbe(x: number, y: number, vx: number, vy: number, capacity = 600): Probe {
  return { x, y, vx, vy, t: 0, outcome: 'flying', trail: new Float32Array(2 * capacity), trailCount: 0, trailHead: 0 };
}

/** Paczyński-Wiita pseudo-Newtonian gravity: Φ = -GM / (r - r_s), so a = -GM / (r - r_s)² r̂. Reproduces an ISCO and capture. */
export function accel(x: number, y: number, gm: number, rs: number): [number, number] {
  const r = Math.hypot(x, y);
  const d = Math.max(r - rs, 0.05);
  const a = -gm / (d * d);
  return [(a * x) / r, (a * y) / r];
}

export function stepProbe(p: Probe, cfg: ProbeConfig, dt: number, substeps = 8): Probe {
  if (p.outcome !== 'flying') return p;
  const h = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    const [ax, ay] = accel(p.x, p.y, cfg.gm, cfg.rs);
    p.vx += ax * h; // semi-implicit Euler: velocity first, then position
    p.vy += ay * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
  }
  p.t += dt;
  const capacity = p.trail.length / 2;
  p.trail[2 * p.trailHead] = p.x;
  p.trail[2 * p.trailHead + 1] = p.y;
  p.trailHead = (p.trailHead + 1) % capacity;
  p.trailCount = Math.min(capacity, p.trailCount + 1);

  const r = Math.hypot(p.x, p.y);
  if (r < cfg.captureRadius) p.outcome = 'captured';
  else if (r > cfg.escapeRadius) p.outcome = 'escaped';
  else if (p.t > cfg.orbitAfter) p.outcome = 'orbiting';
  return p;
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Draw a probe buffer in the field**

`src/islands/field/shaders/probe.vert.glsl`:
```glsl
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
  gl_PointSize = 2.0 * uDpr;
  vBright = 1.0;
}
```

In `src/islands/field/index.ts`:
1. Import: `import probeVert from './shaders/probe.vert.glsl?raw';`
2. After the composite program is created:
```ts
  const probeProg = createProgram(gl, probeVert, pointsFrag);
  const qu = uniforms(gl, probeProg, ['uResolution', 'uDpr'] as const);
  const probeVao = gl.createVertexArray()!;
  gl.bindVertexArray(probeVao);
  const probeBuf = attribute(gl, probeProg, 'aPos', new Float32Array(2 * 1200), 2, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(null);
```
3. In `render()`, after `gl.drawArrays(gl.POINTS, 0, particles.count);` and before `gl.disable(gl.BLEND);`:
```ts
    if (probe && probe.length >= 2) {
      gl.useProgram(probeProg);
      gl.bindVertexArray(probeVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, probeBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, probe.subarray(0, Math.min(probe.length, 2400)));
      gl.uniform2f(qu.uResolution, vw, vh);
      gl.uniform1f(qu.uDpr, dpr);
      gl.drawArrays(gl.POINTS, 0, Math.min(probe.length, 2400) / 2);
    }
```
4. In `tick()`, extend `moving` with `|| probe !== null`.

- [ ] **Step 4: Write src/islands/toy/index.ts**

```ts
import gsap from 'gsap';
import type { Field } from '../field';
import { computeAnchor } from '../field/layout';
import type { FieldState } from '../field/state';
import { createProbe, stepProbe, type Probe } from './slingshot';

interface ToyDeps {
  state: FieldState;
  field: Field | null;
  pointer: { setEnabled(on: boolean): void } | null;
  reducedMotion: boolean;
}

const CFG = { gm: 1, rs: 1, captureRadius: 1.5, escapeRadius: 60, orbitAfter: 12 };

export function mountToy({ state, field, pointer, reducedMotion }: ToyDeps): void {
  const root = document.querySelector<HTMLElement>('[data-toy]');
  const button = root?.querySelector<HTMLButtonElement>('[data-toy-launch]');
  const status = root?.querySelector<HTMLElement>('[data-toy-status]');
  const section = document.getElementById('horizon');
  if (!root || !button || !status || !section || !field) return;

  let probe: Probe | null = null;
  let angle = -0.2; // radians, keyboard-adjustable aim
  let speed = 0.55; // r_s per second, keyboard-adjustable
  const px = new Float32Array(2 * 601);

  const rsPx = () => computeAnchor(window.innerWidth, window.innerHeight).r * 0.16;
  const anchor = () => computeAnchor(window.innerWidth, window.innerHeight);

  function toPx(x: number, y: number, out: Float32Array, i: number) {
    const a = anchor();
    const s = rsPx();
    out[2 * i] = a.x + x * s;
    out[2 * i + 1] = a.y + y * s;
  }

  function finish(text: string) {
    status.textContent = text;
    pointer?.setEnabled(true);
    gsap.ticker.remove(frame);
    window.setTimeout(() => {
      probe = null;
      field!.setProbe(null);
    }, 1200);
  }

  function frame(_time: number, deltaMs: number) {
    if (!probe) return;
    stepProbe(probe, CFG, Math.min(deltaMs, 50) / 1000);
    // trail then head, in css px
    const cap = probe.trail.length / 2;
    let n = 0;
    for (let k = 0; k < probe.trailCount; k++) {
      const idx = (probe.trailHead - 1 - k + cap * 2) % cap;
      toPx(probe.trail[2 * idx]!, probe.trail[2 * idx + 1]!, px, n++);
    }
    toPx(probe.x, probe.y, px, n++);
    field!.setProbe(px.subarray(0, 2 * n));
    if (probe.outcome === 'captured') finish('Captured. Nothing gets out past 1.5 r_s.');
    else if (probe.outcome === 'escaped') finish('Escaped. Too fast for the well.');
    else if (probe.outcome === 'orbiting') finish('In orbit. A rare balance.');
  }

  function launch(x: number, y: number, vx: number, vy: number) {
    if (probe && probe.outcome === 'flying') return;
    probe = createProbe(x, y, vx, vy);
    status.textContent = 'Probe away.';
    pointer?.setEnabled(false);
    gsap.ticker.add(frame);
  }

  function launchDefault() {
    // from 14 r_s left of the hole, slightly above its plane, aimed by the keyboard-adjustable angle/speed
    launch(-14, 3, Math.cos(angle) * speed * 1.6, Math.sin(angle) * speed * 1.6);
  }

  button.addEventListener('click', launchDefault);
  button.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: () => (angle -= 0.087), ArrowRight: () => (angle += 0.087), ArrowUp: () => (speed *= 1.1), ArrowDown: () => (speed /= 1.1) }[e.key];
    if (!step) return;
    e.preventDefault();
    step();
    status.textContent = `Aim ${Math.round((angle * 180) / Math.PI)}°, speed ${speed.toFixed(2)}`;
  });

  // drag anywhere in the section (not on controls) to aim: start point → launch point, drag vector → velocity
  let dragStart: { x: number; y: number } | null = null;
  section.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button')) return;
    dragStart = { x: e.clientX, y: e.clientY };
  });
  section.addEventListener('pointerup', (e) => {
    if (!dragStart) return;
    const a = anchor();
    const s = rsPx();
    const x = (dragStart.x - a.x) / s;
    const y = (dragStart.y - a.y) / s;
    const vx = ((e.clientX - dragStart.x) / s) * 0.35;
    const vy = ((e.clientY - dragStart.y) / s) * 0.35;
    dragStart = null;
    if (Math.hypot(vx, vy) < 0.05) return; // a tap, not a throw
    launch(x, y, vx, vy);
  });

  if (reducedMotion) status.textContent = 'Motion is reduced: the probe still flies, the field stays still.';
}
```

- [ ] **Step 5: Wire in boot.ts**

```ts
import { mountToy } from './toy';
mountToy({ state, field, pointer, reducedMotion });
```

- [ ] **Step 6: Verify**

Run: `npm run dev`, scroll to Horizon. Click "Launch a probe": a bright 2 px point enters from the left with a trail, bends around the shadow and either whips off-screen ("Escaped"), loops a few times ("In orbit"), or falls in and the trail fades ("Captured"). The status text updates (screen reader announces via `aria-live`). While it flies, moving the mouse no longer disturbs the field; afterwards it does again. Drag from left to right across the section and release: the probe launches from where you pressed with your drag as its velocity. Focus the button and press ArrowLeft twice, then Enter: the aim text updates and the launch curves differently. `npm test` passes; `npm run build && npm run budget` stays under budget.

- [ ] **Step 7: Commit and push**

```bash
git add src
git commit -m "Add the gravity slingshot toy with a Paczynski-Wiita integrator"
git push origin main
```

---
## Phase 9: Polish and audits

### Task 17: Interaction audit, copy audit, accessibility and performance verification

**Files:**
- Modify: `README.md`, any file the audits flag (list each fix in the commit message)

**Interfaces:**
- Consumes: everything above. Produces: a site that passes the spec's §10, §11 and §14 checks, and a README that tells the user exactly what content to drop in.

- [ ] **Step 1: Copy audit (mechanical)**

Run:
```bash
grep -rnP "[\x{2014}\x{2013}]" src README.md || echo "no em/en dashes"
grep -rniE "scroll (down|to explore)|↓" src/components || echo "no scroll cues"
grep -rnE "\b0[0-9] ?/|No\. ?0" src/components || echo "no section numbering"
```
Expected: the three "no ..." lines. Fix any hit before continuing. Re-read every visible string in `src/components/*.astro` and `src/content/**`: sentence case, plain verbs, ≤ 20-word one-liners.

- [ ] **Step 2: Interaction table audit (spec §9)**

For each row of the spec's table, hover, press and Tab to the element and tick it off:
- `.btn` / `.btn--primary` (nav Contact, Launch a probe, Email me, Download resume): inversion 160 ms, press scale 0.98, ring.
- `.link` (Projects, GitHub, LinkedIn): underline draws in 180 ms, out in 120 ms.
- Project row: title +4 px, arrow in, fragment brightens; focus does the same.
- Skill line: bar brightens and stretches, label appears; focus does the same.
- Nav item: fog → core, active pill slides; focus expands the pill.
- Portrait: color in 220 ms on hover/focus, sticky on click.
- Mode pill: inversion when pressed.
Anything animating a property other than `transform`/`opacity`/`color`/`background-color` is a defect: search `grep -rnE "transition:.*(width|height|top|left|margin|padding)" src` → expect no hits.

- [ ] **Step 3: Contrast at the six checkpoints (spec §11)**

With `npm run dev` and the mode toggle: `star` (p≈0.08), `nova` (0.19), then scroll to Projects (≈0.4), `remnant` (0.6), `horizon` (0.9) and Contact (1.0). At each, use DevTools → element picker on body text, mono labels, and a `.btn` label: contrast ≥ 4.5:1 (silver on graphite is 11.7:1; fog on graphite 4.9:1). Confirm particles behind the text column are dimmed (the attenuation rect follows the active `.col`). If the nova flash pushes particles behind text above fog brightness, lower `uExposure` from 0.9 to 0.8 in `src/islands/field/index.ts`.

- [ ] **Step 4: Keyboard and screen-reader walkthrough**

Tab from the address bar through the entire page: skip link → wordmark → 5 nav items → Contact → Projects link → portrait button → 7 project links → skill lines → Launch a probe → Email me → Download resume → GitHub → LinkedIn → 5 mode buttons. Every stop shows the ring; Enter/Space activates; Escape collapses the nav. With NVDA (or Windows Narrator): headings list shows h1 + 6 h2; the canvas is silent; the toy status is announced after a launch.

- [ ] **Step 5: Reduced-motion walkthrough**

DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload: the h1 stays as text, the star is static, each section shows its poster state when it reaches the viewport centre, the nav switches states instantly, no reveals, no pointer forces, the probe still flies. Then disable WebGL (`chrome://flags/#disable-webgl` or DevTools → Rendering → "Emulate a focused page" is unrelated; use `--disable-webgl` launch flag) and reload: the poster PNG shows behind the page and everything else works.

- [ ] **Step 6: Performance**

```bash
npm run build && npm run budget
npm run preview &
npx lighthouse http://localhost:4321 --preset=desktop --only-categories=performance,accessibility --quiet --chrome-flags="--headless=new" --output=json --output-path=./.lighthouse-desktop.json
npx lighthouse http://localhost:4321 --only-categories=performance,accessibility --quiet --chrome-flags="--headless=new" --output=json --output-path=./.lighthouse-mobile.json
node -e "for (const f of ['.lighthouse-desktop.json','.lighthouse-mobile.json']) { const r = require('./'+f); console.log(f, Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k, Math.round(v.score*100)])), 'LCP', r.audits['largest-contentful-paint'].displayValue, 'CLS', r.audits['cumulative-layout-shift'].displayValue) }"
```
Expected: Performance ≥ 95 and Accessibility 100 on both; LCP < 1.5 s desktop; CLS < 0.05; budget total ≤ 120 KB (expect ≈ 45-55 KB). Then in DevTools Performance, record a full-page scroll with CPU 4× throttling: no long tasks over 50 ms, frame rate ≥ 30 fps; without throttling ≥ 60 fps. Check the font requests in the Network panel total ≤ 110 KB. Add `.lighthouse-*.json` to `.gitignore`.

- [ ] **Step 7: Cross-browser and viewports**

Chrome, Firefox and Safari (iOS Safari on a real phone if available; else the WebKit build via Playwright: `npx playwright install webkit && npx playwright open -b webkit http://localhost:4321`): canvas is crisp at DPR 2, `100dvh` sections do not jump on iOS scroll, `color-mix` hairlines render, the pill toggle works on touch. Viewports 375 / 768 / 1024 / 1440 / 1920: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth` in the console), portrait 120 px on mobile, object centred behind content on mobile.

- [ ] **Step 8: README with the content handoff**

Replace `README.md` with:
```md
# ad1tya-wq.github.io

Personal portfolio. One monochrome WebGL particle object lives the life of a star as you scroll:
name, star, collapse, shock breakout, ejecta, remnant, accretion disk, black hole.

- Design spec: `docs/superpowers/specs/2026-09-13-portfolio-skeleton-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-13-portfolio-skeleton.md`

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Static build to `dist/` (downloads and subsets fonts) |
| `npm test` | Vitest for the pure modules (lifecycle, particles, layout, scroll, name sampling, slingshot) |
| `npm run budget` | Fails if gzipped JS in `dist/` exceeds 120 KB |
| `npm run dither` | Regenerates `public/portrait-*` from `src/assets/portrait.jpg` |
| `npm run poster` | Regenerates the no-WebGL fallback `public/poster.png` |

## Content to fill in

1. `src/content/site.ts`: name, title, one-line bio, LinkedIn URL.
2. `src/components/About.astro`: two or three short paragraphs.
3. `src/content/projects/*.md`: reorder, drop, or tighten summaries (≤ 140 characters).
4. `src/content/experience/*.md`: one file per role.
5. `src/content/skills.json`: bands of technical skills and three or four plain sentences.
6. `src/assets/portrait.jpg` (square-ish, good contrast) then `npm run dither`.
7. `public/resume.pdf`.

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
A custom domain later: add a `CNAME` file to `public/` and point DNS at GitHub Pages.

## Reserved for later

`#play`: a Spaceship Battleship section with an in-browser ML opponent (ONNX Runtime Web), to be built as a lazy-loaded island with its own canvas that reuses the tokens and dither.
```

- [ ] **Step 9: Final commit, push, and confirm the live site**

```bash
git add -A
git commit -m "Polish: copy and interaction audits, accessibility fixes, README content handoff"
git push origin main
gh run watch --exit-status
curl -sI https://ad1tya-wq.github.io/ | head -1
```
Expected: green run; the live site shows the full skeleton.

---

## Self-review notes (already applied)

- **Spec coverage:** §1 tokens/type/copy → Tasks 2, 17. §2 page map → Tasks 5, 8. §3 renderer, fallbacks → Tasks 6, 7, 8, 9. §4 nav → Tasks 2, 12. §5 hero → Tasks 3, 10, 11. §6 imagery → Task 11. §7 sections → Tasks 3, 14, 15, 16 (Play is reserved, nothing rendered, documented in README). §8 fidget/modes → Task 13. §9 interactions → Tasks 2, 3, 12, 13, audited in 17. §10 budget/perf → Tasks 4, 17. §11 a11y → Tasks 2, 3, 17. §12 layout/tests → all. §14 verification → Task 17. Repository workflow (identity, no trailer, push per task) → every task's commit step.
- **Type consistency:** `FieldState` fields (`target, progress, nameMix, pointerX, pointerY, force, hover, hoverY, detached, reducedMotion, textRect`) are used identically in Tasks 7, 8, 10, 13, 14, 16. `Field` methods: `setNamePoints, setNameBox, setProbe, setChapterColumn, destroy` (Task 7) plus `nameSlots` (Task 10). Uniform names are fixed in Task 7 and reused verbatim in Tasks 8, 9, 16. `mountScroll` callbacks `onChapter(id, el)` / `onScroll(direction, y)` match `TopNav.setChapter(id)` / `setScroll(direction, y)`. `ModeId` and `MODE_TARGETS` come from lifecycle.ts. The `chapter:navigate` event name is identical in Tasks 12 and 13.
- **Known tuning knobs** (adjust by eye on real hardware, not defects): `uGain` (0.5 / 0.8 low-end), `uExposure` (0.9), point sizes in the vertex shader, lensing strength `k` (1.6), disk `omega` multiplier (6.0), pointer radius (140 px) and push (60 px).

## Addendum: Task 8b (done inline): spacecraft flyby

Implemented after the user's review of the first lifecycle build. Files: `src/islands/field/particles.ts` (`SHIP_HULL`, `SHIP_EXHAUST`, `SHIP_COUNT`, `inShip()`, `ship` buffer), `src/islands/field/index.ts` (`aShip` attribute), `src/islands/field/shaders/points.vert.glsl` (flyby path, brightness, size), `src/islands/field/particles.test.ts` (two tests). Also a dev-only `window.__portfolio = { state, field }` handle in `boot.ts` for inspecting lifecycle states from the console. See the spec addendum for the design.
