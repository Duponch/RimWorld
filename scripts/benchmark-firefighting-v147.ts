/** Compare the V147 firefighting proposal with its pre-change implementation.
 * Run from the repository root, without concurrent CPU or browser measurements:
 * node --experimental-strip-types scripts/benchmark-firefighting-v147.ts
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';
import { candidateAccess } from '../src/sim/candidate-access.ts';
import { firefightingProposal, firefightingTargets, fireTouch, type FirefightingProposal } from '../src/sim/firefighting.ts';
import { firePosition } from '../src/sim/fire-rules.ts';
import { blockedCells, canStopAt, routeToCell, workNeighbours } from '../src/sim/pathfinding.ts';
import { deserializeWorld, serializeWorld } from '../src/sim/index.ts';
import { CIVIL_TRANSIT_BLOCKERS } from '../src/sim/travel.ts';
import type { Cell, Pawn, World } from '../src/sim/types.ts';
import type { Reachability } from '../src/sim/pathfinding.ts';

const SAVE_PATH = 'public/test-saves/v98/mixed-100.json';
const SOURCE_PATH = 'src/sim/firefighting.ts';
const OUTPUT_PATH = 'tmp/benchmark-firefighting-v147.json';
const stored = readFileSync(SAVE_PATH, 'utf8');
const sourceHash = createHash('sha256').update(readFileSync(SOURCE_PATH)).digest('hex');
const envelope = JSON.parse(stored);
const raw = envelope?.format === 'lisiere-save' && envelope.codec === 'gzip-base64'
  ? gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8') : stored;
// Migration, strict validation, reachability construction, and serialization are outside timings.
const world = deserializeWorld(raw);
if (world.width !== 250 || world.height !== 250 || world.pawns.length !== 104 || world.fires?.items.length !== 9)
  throw new Error('Expected the mixed 250² fixture with 104 pawns and nine fires.');
const before = serializeWorld(world);
const rng = { world: world.rng, fires: world.fires?.rng, wildlife: world.wildlife?.rng };
const blocked = blockedCells(world);

/** Exact pre-change implementation, including its stable path-length sort. */
function previousProposal(w:World,p:Pawn,reach:Reachability):FirefightingProposal|undefined {
  for(const f of firefightingTargets(w,p)){
    const target=firePosition(w,f)!;
    const paths=[target,...workNeighbours(target,'mine')].filter(c=>inside(w,c)&&fireTouch(w,c,target)&&canStopAt(w,c,reach)).map(c=>routeToCell(w,c,reach)).filter((path):path is Cell[]=>path!==null).sort((a,b)=>a.length-b.length);
    if(paths.length)return {fireId:f.id,target:{x:target.x,z:target.z},path:paths[0]!};
  }
  return undefined;
}
const inside=(w:World,c:Cell)=>c.x>=0&&c.z>=0&&c.x<w.width&&c.z<w.height;
const freshReach = (pawn:Pawn):Reachability => candidateAccess(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS);
const sameProposal = (a:FirefightingProposal|undefined,b:FirefightingProposal|undefined):boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// Compare every colonist, including those with no eligible or reachable fire.
const oracle:Array<{pawnId:number;targets:number;proposal:FirefightingProposal|undefined}> = [];
for (const pawn of world.pawns) {
  const oldResult = previousProposal(world,pawn,freshReach(pawn));
  const newResult = firefightingProposal(world,pawn,freshReach(pawn));
  if (!sameProposal(oldResult,newResult))
    throw new Error(`Firefighting proposal mismatch for pawn ${pawn.id}: ${JSON.stringify({oldResult,newResult})}`);
  oracle.push({ pawnId:pawn.id, targets:firefightingTargets(world,pawn).length, proposal:newResult });
}
const eligible = world.pawns.filter(pawn => oracle.find(row => row.pawnId === pawn.id)!.targets > 0);
if (!eligible.length) throw new Error('The fixture has no firefighters to measure.');

type Version = 'before'|'after';
type Sample = { round:number; slot:number; version:Version; milliseconds:number; calls:number; proposals:number; pathCells:number };
const samples:Sample[] = [];
let checksum = 0;
// Warm both variants on fresh access objects before alternating complete pawn batches.
for (const pawn of eligible) {
  checksum += previousProposal(world,pawn,freshReach(pawn))?.path.length ?? 0;
  checksum += firefightingProposal(world,pawn,freshReach(pawn))?.path.length ?? 0;
}
const rounds = 4;
for (let round = 0; round < rounds; round++) {
  for (const [slot,version] of (['before','after','after','before'] as const).entries()) {
    // CandidateAccess has mutable private search state: every invocation owns a fresh object.
    // Build its navigation snapshot before the timed proposal batch.
    const reaches = eligible.map(freshReach);
    let proposals = 0, pathCells = 0;
    const started = performance.now();
    for (let i = 0; i < eligible.length; i++) {
      const result = version === 'before'
        ? previousProposal(world,eligible[i]!,reaches[i]!)
        : firefightingProposal(world,eligible[i]!,reaches[i]!);
      if (result) { proposals++; pathCells += result.path.length; }
    }
    const milliseconds = performance.now() - started;
    samples.push({ round:round+1, slot:slot+1, version, milliseconds,
      calls:eligible.length, proposals, pathCells });
    checksum += proposals + pathCells;
  }
}
const expected = samples[0]!;
if (samples.some(row => row.proposals !== expected.proposals || row.pathCells !== expected.pathCells))
  throw new Error('A/B proposal totals changed across frozen-world batches.');
if (world.rng !== rng.world || world.fires?.rng !== rng.fires || world.wildlife?.rng !== rng.wildlife || serializeWorld(world) !== before)
  throw new Error('The firefighting proposal benchmark mutated the World or a PRNG.');
if (createHash('sha256').update(readFileSync(SOURCE_PATH)).digest('hex') !== sourceHash)
  throw new Error('The firefighting source changed during the benchmark.');

function summarize(version:Version) {
  const times = samples.filter(row => row.version === version).map(row => row.milliseconds);
  const sorted = [...times].sort((a,b) => a-b);
  const meanMs = times.reduce((sum,value) => sum+value,0)/times.length;
  return { batches:times.length, callsPerBatch:eligible.length, meanMs,
    medianMs:(sorted[3]!+sorted[4]!)/2, p95Ms:sorted[Math.ceil(sorted.length*.95)-1]!,
    meanMsPerProposal:meanMs/eligible.length };
}
let commit:string|null = null;
try { commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); }
catch { /* Fixture and source hashes still identify this local comparison. */ }
const beforeSummary = summarize('before'), afterSummary = summarize('after');
const report = {
  timestamp:new Date().toISOString(), commit, runtime:process.version,
  platform:process.platform, arch:process.arch, cpuModel:cpus()[0]?.model??'unknown',
  source:{path:SOURCE_PATH,sha256:sourceHash},
  fixture:{path:SAVE_PATH,sha256:createHash('sha256').update(stored).digest('hex'),
    originalSchema:JSON.parse(raw).schemaVersion,migratedSchema:world.schemaVersion,
    tick:world.tick,width:world.width,height:world.height,pawns:world.pawns.length,fires:world.fires!.items.length},
  protocol:{oraclePawns:world.pawns.length,measuredPawns:eligible.length,eligiblePawnIds:eligible.map(p=>p.id),
    targetCounts:oracle.filter(row=>row.targets).map(row=>({pawnId:row.pawnId,targets:row.targets})),
    oracle:'Exact fireId, target and ordered path on every pawn, with independent fresh access for each version.',
    reachability:'Fresh CandidateAccess per proposal; its creation and the migrated World are outside timed batches.',
    sequence:'A/B/B/A',rounds,
    limitation:'Frozen mixed world; this measures proposal work after access construction, not whole-tick throughput.'},
  expectedProposals:expected.proposals,expectedPathCells:expected.pathCells,checksum,samples,
  before:beforeSummary,after:afterSummary,ratioBeforeOverAfter:beforeSummary.meanMs/afterSummary.meanMs,
};
mkdirSync('tmp',{recursive:true});
writeFileSync(OUTPUT_PATH,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({output:OUTPUT_PATH,oraclePawns:world.pawns.length,measuredPawns:eligible.length,
  before:beforeSummary,after:afterSummary,ratioBeforeOverAfter:report.ratioBeforeOverAfter},null,2));
