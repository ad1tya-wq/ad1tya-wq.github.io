export interface FieldState {
  /** where scroll (or a mode) wants the lifecycle to be, 0..1 */
  target: number;
  /** smoothed lifecycle progress actually rendered, 0..1 */
  progress: number;
  /** load-time name assembly, 0..1 */
  nameMix: number;
  pointerX: number;
  pointerY: number;
  /** >0 repel, <0 attract, magnitude <= 1 */
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
