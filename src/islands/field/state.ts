export interface FieldState {
  /** where scroll (or a mode) wants the lifecycle to be, 0..1 */
  target: number;
  /** smoothed lifecycle progress actually rendered, 0..1 */
  progress: number;
  /** load-time name assembly, 0..1 */
  nameMix: number;
  /** 1 once portrait points are uploaded (they sit exactly under the image) */
  faceMix: number;
  /** face particle brightness, dips while the real photo is shown on hover */
  faceReveal: number;
  pointerX: number;
  pointerY: number;
  /** >0 repel, <0 attract, magnitude <= 1 */
  force: number;
  /** hovered project fragment index or -1 */
  hover: number;
  /** viewport y (css px) of the hovered row */
  hoverY: number;
  /** project whose ejecta cluster currently forms its pictogram, or -1 */
  activeFragment: number;
  /** pictogram assembly 0..1 (tweened when the active project changes) */
  pictoMix: number;
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
    faceMix: 0,
    faceReveal: 1,
    pointerX: -1e4,
    pointerY: -1e4,
    force: 0,
    hover: -1,
    hoverY: 0,
    activeFragment: -1,
    pictoMix: 0,
    detached: false,
    reducedMotion,
    textRect: [0, 0, 0, 0],
  };
}
