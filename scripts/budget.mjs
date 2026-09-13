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
