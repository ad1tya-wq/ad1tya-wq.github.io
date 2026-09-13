/** No WebGL2, or a lost context: hide the canvas (a dead opaque canvas composites white) and paint the poster behind the page. */
export function showPoster(canvas: HTMLCanvasElement): void {
  canvas.style.opacity = '0';
  document.body.classList.add('is-poster');
}

export function hidePoster(canvas: HTMLCanvasElement): void {
  canvas.style.opacity = '';
  document.body.classList.remove('is-poster');
}
