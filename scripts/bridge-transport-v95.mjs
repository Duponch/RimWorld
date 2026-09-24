import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { SnapshotEncoder as NewEncoder, SnapshotDecoder as NewDecoder } from '../src/bridge/snapshots.ts';
import { SnapshotEncoder as OldEncoder, SnapshotDecoder as OldDecoder } from '../tmp/perf-v94/src/bridge/snapshots.ts';
import { createWorld, deserializeWorld } from '../src/sim/index.ts';

function run(seed, Encoder, Decoder, count = 80) {
  const world = structuredClone(seed), encoder = new Encoder(), decoder = new Decoder();
  decoder.adopt(structuredClone(encoder.encode(world, 0.2, 6)));
  const durations = [];
  let pilesSent = 0;
  const apparel = world.piles.find(p => p.kind === 'apparel' && p.owner.type === 'ground');
  for (let i = 0; i < count + 10; i++) {
    world.tick++;
    if (apparel && i % 20 === 0) apparel.apparel.forbidden = true;
    if (apparel && i % 20 === 10) delete apparel.apparel.forbidden;
    const start = performance.now();
    const message = encoder.encode(world, 0.2, 6);
    const transported = structuredClone(message);
    const adopted = decoder.adopt(transported);
    if (adopted.status !== 'applied') throw new Error(JSON.stringify(adopted));
    const elapsed = performance.now() - start;
    if (i >= 10) {
      durations.push(elapsed);
      pilesSent += message.kind === 'delta' ? 'piles' in message.world ? message.world.piles.length : message.piles?.upserted.length ?? 0 : world.piles.length;
    }
  }
  durations.sort((a, b) => a - b);
  return { meanMs: durations.reduce((a, b) => a + b, 0) / count, p95Ms: durations[Math.floor(count * .95)], pilesSent };
}

const results=[];
const large = deserializeWorld(gunzipSync(readFileSync('tests/fixtures/colony-v90.json.gz')).toString());
for (const [name, world] of [['small', createWorld(42, 32, 32)], ['large', large]]) {
  const old = run(world, OldEncoder, OldDecoder), current = run(world, NewEncoder, NewDecoder);
  results.push({ name, pileCount: world.piles.length, baseline: old, current, ratio: old.meanMs / current.meanMs });
}

const report={protocol:'Archive f993e3a src in tmp/perf-v94. 10 warmups, 80 measured packets per variant, initial checkpoint excluded. In-place apparel flag every 10 packets, otherwise fixed collections. Encode + structuredClone + decode. Synthetic transport only, not colony throughput.',results};
writeFileSync('artifacts/bridge-transport-v95.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
