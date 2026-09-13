/** No WebGL2 (or a lost context): paint the static poster behind the page instead. */
export function showPoster(canvas: HTMLCanvasElement): void {
  canvas.style.background = 'var(--graphite) url(/poster.png) center / cover no-repeat';
}
