/** Exact world trace for comparing a candidate change against the same save. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index.ts';

const label = process.argv[2];
if (!label || !/^[a-z0-9-]{1,40}$/.test(label) || process.argv.length !== 3)
  throw new Error('Usage: node --experimental-strip-types scripts/trace-mixed-v147.ts <label>');
const stored = readFileSync('public/test-saves/v98/mixed-100.json', 'utf8');
const envelope = JSON.parse(stored);
const raw = envelope?.format === 'lisiere-save' && envelope.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8') : stored;
const world = deserializeWorld(raw);
const rows = [];
for (let index = 0; index < 80; index++) {
  stepWorld(world);
  const saved = serializeWorld(world);
  rows.push({ tick: world.tick, sha256: createHash('sha256').update(saved).digest('hex'),
    rng: world.rng, wildlifeRng: world.wildlife?.rng });
}
const output = `tmp/trace-mixed-v147-${label}.json`;
mkdirSync('tmp', { recursive: true });
writeFileSync(output, `${JSON.stringify({ fixtureSha256: createHash('sha256').update(stored).digest('hex'), rows }, null, 2)}\n`);
console.log(JSON.stringify({ output, ticks: rows.length, first: rows[0], last: rows.at(-1) }));
