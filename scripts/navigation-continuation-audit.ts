import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { cookingFixture } from './fixtures/cooking.ts';
import { stepWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { isPerishable, ROT_DAYS } from '../src/sim/food-preservation.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';

// Capture before an internal optimization, then compare after it. Full serialized
// checkpoints are compared byte for byte; the compact report stores SHA-256 only.
const [mode, directory, output, expiryArgument] = process.argv.slice(2);
if (!['capture', 'compare'].includes(mode ?? '') || !directory || !output) throw new Error('capture|compare <checkpoint-directory> <report.json>');
const folder = resolve(directory), deadline = performance.now() + 90000;
const expireAt=expiryArgument===undefined?0:Number(expiryArgument);
if(!Number.isInteger(expireAt)||expireAt!==0&&expireAt<3||expireAt>298)throw new Error('Optional expiry tick must be 0 (off) or 3..298');
mkdirSync(folder, { recursive: true });
const checkpoints = expireAt?[1,expireAt-1,expireAt,expireAt+1,300]:[1, 100, 300, 600, 1000], results = [],lastTick=checkpoints.at(-1)!;
for (const count of [3, 30, 100]) {
  const world = cookingFixture(count);
  if(expireAt)for(const p of world.piles)if(isPerishable(p.item))p.rot={progress:ROT_DAYS[p.item]*TICKS_PER_DAY-expireAt,atTick:world.tick};
  for (let tick = 1; tick <= lastTick; tick++) {
    stepWorld(world);
    if (performance.now() > deadline) throw new Error(`90 s watchdog: ${count} pawns tick ${tick}`);
    if (!checkpoints.includes(tick)) continue;
    assert.deepEqual(validateWorld(world), [], `${count} pawns tick ${tick}`);
    const saved = serializeWorld(world), path = resolve(folder, `${count}-${tick}.json`);
    if (mode === 'capture') writeFileSync(path, saved);
    else if(saved!==readFileSync(path,'utf8')) {
      writeFileSync(resolve(folder,`${count}-${tick}-actual.json`),saved);
      throw new Error(`Continuation differs: ${count} pawns tick ${tick}; actual checkpoint retained.`);
    }
    results.push({ pawns: count, tick, bytes: Buffer.byteLength(saved), sha256: createHash('sha256').update(saved).digest('hex') });
  }
  console.log(`${mode}: ${count} pawns, valid checkpoints through tick ${lastTick}`);
}
writeFileSync(output, JSON.stringify({ date: new Date().toISOString(), mode, expireAt,protocol: 'Complete serialized checkpoints on each of three synthetic cooking camps; compare checks byte equality against pre-change capture. No timing claim.', results }, null, 2));
