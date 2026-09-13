import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/** Icons available to projects (Phosphor regular, MIT). Content files reference these names. */
export const PICTO_ICONS = ['shield-check', 'chart-line-up', 'crosshair', 'flask', 'tree-structure', 'compass', 'git-branch'] as const;
export type PictoIcon = (typeof PICTO_ICONS)[number];

const require = createRequire(import.meta.url);

/** Path data of a Phosphor regular icon (256 x 256 viewBox), read from node_modules at build time. */
export function iconPath(name: string): string {
  let svg: string;
  try {
    svg = readFileSync(require.resolve(`@phosphor-icons/core/assets/regular/${name}.svg`), 'utf8');
  } catch {
    throw new Error(`Unknown pictogram icon "${name}"`);
  }
  const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]!);
  if (paths.length === 0) throw new Error(`Icon "${name}" has no path data`);
  return paths.join(' ');
}
