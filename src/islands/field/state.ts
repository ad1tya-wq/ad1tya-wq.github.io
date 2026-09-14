export interface FieldState {
  /** where scroll (or a mode) wants the lifecycle to be, 0..1 */
  target: number;
  /** smoothed lifecycle progress actually rendered, 0..1 */
  progress: number;
  /** load-time name assembly, 0..1 */
  nameMix: number;
  /** 1 once portrait points are uploaded (they sit exactly under the image) */
  faceMix: number;
  /** reveal wave for the portrait: origin (viewport css px) and radius; particles inside the circle dim while the photo shows */
  waveX: number;
  waveY: number;
  waveR: number;
  pointerX: number;
  pointerY: number;
  /** >0 repel, <0 attract, magnitude <= 1 */
  force: number;
  /** hovered project fragment index or -1 */
  hover: number;
  /** viewport y (css px) of the hovered row */
  hoverY: number;
  /** Horizon "mass" slider 0..1: scales the hole (shadow, lensing, disk, toy gravity) and decides which text blocks it has eaten */
  mass: number;
  /** 1 while the hole has eaten the hero name / portrait: their resting particles are hidden */
  nameEaten: number;
  faceEaten: number;
  /** timeline entry whose orbit ring is lit in Experience, or -1 */
  orbitActive: number;
  /** short pulse when the lit ring changes, 1 -> 0 */
  orbitGlow: number;
  /** shader-clock birth time per ring (-1 = not formed yet): rings are thrown into orbit the first time their entry is read */
  orbitBorn: Float32Array;
  /** where each ring was thrown from: the entry's date tick, document css px pairs */
  orbitFrom: Float32Array;
  /** project whose ejecta cluster currently forms its pictogram, or -1 */
  activeFragment: number;
  /** pictogram assembly 0..1 (tweened when the active project changes) */
  pictoMix: number;
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
    waveX: 0,
    waveY: 0,
    waveR: 0,
    pointerX: -1e4,
    pointerY: -1e4,
    force: 0,
    hover: -1,
    hoverY: 0,
    mass: 0,
    nameEaten: 0,
    faceEaten: 0,
    orbitActive: -1,
    orbitGlow: 0,
    orbitBorn: new Float32Array(5).fill(-1),
    orbitFrom: new Float32Array(10),
    activeFragment: -1,
    pictoMix: 0,
    reducedMotion,
    textRect: [0, 0, 0, 0],
  };
}
