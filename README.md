# ad1tya-wq.github.io

Personal portfolio. One monochrome WebGL particle object lives the life of a star as you scroll:
your name, a star, core collapse, shock breakout, ejecta, remnant (with a spacecraft flyby), accretion disk, black hole.

- Live: https://ad1tya-wq.github.io/
- Design spec: `docs/superpowers/specs/2026-09-13-portfolio-skeleton-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-13-portfolio-skeleton.md`

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:4321 (adds `window.__portfolio = { state, field }` for poking the lifecycle from the console) |
| `npm run build` | Static build to `dist/` (downloads and subsets the fonts) |
| `npm test` | Vitest for the pure modules (lifecycle, particles, layout, scroll, name sampling, slingshot) |
| `npm run check` | Astro + TypeScript type check |
| `npm run budget` | Fails if gzipped JS in `dist/` exceeds 120 KB (currently about 57 KB) |
| `npm run dither` | Regenerates `public/portrait-*` from `src/assets/portrait.jpg` |
| `npm run poster` | Regenerates the no-WebGL fallback `public/poster.png` |

## Content to fill in

1. `src/content/site.ts`: name, title, one-line bio, LinkedIn URL.
2. `src/components/About.astro`: two or three short paragraphs.
3. `src/content/projects/*.md`: reorder, drop, or tighten summaries (140 characters max).
4. `src/content/experience/*.md`: one file per role; `src/content/education/*.md`: one file per degree (score = label + value).
5. `src/content/skills.json`: bands of technical skills (soft skills deferred; to be revisited at the very end).
5b. `src/content/certificates.json`: title, issuer, id and verify URL (the seal art is generated from the id).
5c. Each project carries `icon` (a Phosphor regular icon name from `src/lib/picto.ts`) and an optional `year`; the icon becomes the particle pictogram beside the row on desktop.
6. `src/assets/portrait.jpg` (square-ish, good contrast), then `npm run dither`.
7. `public/resume.pdf`.

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml` (tests, build and the JS budget gate run first).
For a custom domain later: add a `CNAME` file to `public/` and point DNS at GitHub Pages.

## Quality bar (measured on the production build)

Lighthouse with a GPU-enabled Chrome: desktop 100 / 100 / 100, mobile 98 / 100 / 100 (LCP 1.9 s, CLS 0).
All text stays at or above 4.5:1 against its surface at every scroll position; every control has a visible focus ring
and a 42 px or taller hit area; `prefers-reduced-motion` gets a static field, the real text name, and instant state changes;
no WebGL2 gets a dithered poster.

## Horizon controls

Launch: press anywhere in the section and drag; the predicted path is drawn while you aim, release to launch (arrow keys retune the default shot from the button). Mass: the slider scales the hole and its gravity and eats the page's text, nearest first; lowering it restores the text; at full mass "Reset the universe?" reloads the page.

## Reserved for later

`#play`: a Spaceship Battleship section with an in-browser ML opponent (ONNX Runtime Web), to be built as a lazy-loaded
island with its own canvas that reuses the tokens and dither.
