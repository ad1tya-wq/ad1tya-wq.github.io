import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Field } from './field';
import { samplePath } from './field/namePoints';
import type { FieldState } from './field/state';

gsap.registerPlugin(ScrollTrigger);

/**
 * Projects: the row nearest the viewport centre is "active". Its ejecta cluster brightens and, on desktop,
 * gathers into the project's pictogram inside the sticky readout slot; hover or focus forces a row.
 */
export function mountProjectsActive({ state, field }: { state: FieldState; field: Field | null }): void {
  if (state.reducedMotion) return; // the gather is motion; brightness alone is not worth a special path
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-fragment]'));
  if (rows.length === 0) return;
  const readout = document.querySelector<HTMLElement>('[data-readout]');
  const slot = readout?.querySelector<HTMLElement>('[data-picto-slot]');
  const wide = window.matchMedia('(min-width: 1024px)');

  // ---- pictograms: sampled once per project from the icon path, uploaded into that project's cluster ----
  let uploaded = false;
  const uploadPictos = () => {
    if (uploaded || !field || !wide.matches) return;
    uploaded = true;
    rows.forEach((row) => {
      const d = row.dataset.picto;
      if (!d) return;
      const pts = samplePath(d, field.pictoSlots);
      if (pts) field.setPictoPoints(Number(row.dataset.fragment), pts);
    });
  };
  const placeSlot = () => {
    if (!field || !slot) return;
    const r = slot.getBoundingClientRect();
    field.setPictoBox(r.left, r.top, r.width, r.height);
  };

  // ---- active row: brightness (hover uniform), pictogram (activeFragment + pictoMix), readout text ----
  let scrolled = -1; // row nearest the centre by scroll
  const inBand: number[] = []; // rows currently crossing the centre band, most recent last
  let forced = -1; // row under the pointer or focus
  let shown = -1;
  let switching: gsap.core.Tween | null = null;

  const fill = (row: HTMLElement) => {
    if (!readout) return;
    const set = (sel: string, v: string) => {
      const el = readout.querySelector<HTMLElement>(sel);
      if (el) el.textContent = v;
    };
    const i = Number(row.dataset.fragment) + 1;
    set('[data-readout-index]', `${String(i).padStart(2, '0')} / ${String(rows.length).padStart(2, '0')}`);
    const [owner = '', name = ''] = (row.dataset.repo ?? '').split('/');
    set('[data-readout-owner]', `${owner}/`);
    set('[data-readout-name]', name);
    set('[data-readout-stack]', row.dataset.stack ?? '');
    set('[data-readout-year]', row.dataset.year ?? '');
    set('[data-readout-detail]', row.querySelector('[data-detail]')?.textContent ?? '');
    const yearRow = readout.querySelector<HTMLElement>('[data-readout-year-row]');
    if (yearRow) yearRow.hidden = !row.dataset.year;
  };

  const apply = () => {
    const next = forced >= 0 ? forced : scrolled;
    if (next === shown) return;
    shown = next;
    const row = rows[next];
    state.hover = next;
    if (row) {
      const r = row.getBoundingClientRect();
      state.hoverY = r.top + r.height / 2;
    }
    if (!wide.matches) return;
    uploadPictos();
    placeSlot();
    // dissolve the old pictogram, swap the cluster, assemble the new one
    switching?.kill();
    readout?.classList.add('is-switching');
    switching = gsap.to(state, {
      pictoMix: 0,
      duration: state.pictoMix > 0 ? 0.18 : 0,
      ease: 'power2.in',
      onComplete: () => {
        state.activeFragment = next;
        if (row) fill(row);
        readout?.classList.remove('is-switching');
        if (next >= 0) switching = gsap.to(state, { pictoMix: 1, duration: 0.55, ease: 'power2.out' });
      },
    });
  };

  rows.forEach((row, index) => {
    ScrollTrigger.create({
      trigger: row,
      start: 'top 58%',
      end: 'bottom 42%',
      onToggle: (self) => {
        const at = inBand.indexOf(index);
        if (self.isActive && at < 0) inBand.push(index);
        if (!self.isActive && at >= 0) inBand.splice(at, 1);
        scrolled = inBand.length ? inBand[inBand.length - 1]! : -1; // no flash to -1 while two rows overlap the band
        apply();
      },
    });
    const on = () => {
      forced = index;
      apply();
    };
    const off = () => {
      if (forced === index) forced = -1;
      apply();
    };
    row.addEventListener('pointerenter', on);
    row.addEventListener('pointerleave', off);
    row.addEventListener('focusin', on);
    row.addEventListener('focusout', (e) => {
      if (!row.contains(e.relatedTarget as Node | null)) off();
    });
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    placeSlot();
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(uploadPictos, 200); // a viewport that grows past 1024 px needs the points for the first time
  });
  window.addEventListener('scroll', placeSlot, { passive: true }); // the sticky slot moves while entering and leaving the section
}
