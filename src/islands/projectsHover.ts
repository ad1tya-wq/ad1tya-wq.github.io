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
