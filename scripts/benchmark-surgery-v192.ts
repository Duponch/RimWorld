/** Absolute isolated CPU observations only. Coordinator must approve frozen
 * sources and successive execution before running this script.
 * node --experimental-strip-types scripts/benchmark-surgery-v192.ts
 * No full-tick, A/B gain, navigation, renderer or outcome-distribution claim. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname,isAbsolute,join,relative,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { medicalCamp } from '../tests/scenarios/health.ts';
import { fixtureBuilding } from '../tests/scenarios/deconstruction.ts';
import { surgeryCamp } from '../tests/helpers/surgery-v192.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { reconcileSurgery } from '../src/sim/surgery.ts';
import { surgeryOutdoors } from '../src/sim/surgery-room.ts';
import { captureCleanliness } from '../src/sim/filth-room.ts';
import { assessMedical,createMedicalRecord } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,process.argv[2]??'tmp/surgery-benchmark-v192.json');
const outputRelative=relative(join(root,'tmp'),output);
assert(outputRelative!==''&&outputRelative!=='..'&&!isAbsolute(outputRelative)&&!outputRelative.startsWith('../')&&!outputRelative.startsWith('..\\'),'Output must stay inside tmp.');
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
function hashes(){const result:Record<string,string>={};const walk=(dir:string)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(entry.name.endsWith('.ts'))result[relative(root,path).replaceAll('\\','/')]=sha(readFileSync(path));}};walk(join(root,'src'));walk(join(root,'tests'));result['scripts/benchmark-surgery-v192.ts']=sha(readFileSync(join(root,'scripts/benchmark-surgery-v192.ts')));return result;}
const sourceBefore=hashes(),samples=20,slots=4,calls=50,warmups=5;
const randomForbidden=()=>{throw new Error('This isolated anesthetic condition must not draw PRNG.');};
const worldHashes=(w:World)=>({world:sha(serializeWorld(w)),rng:sha(JSON.stringify([w.rng,w.wildlife?.rng,w.weather?.rng]))});
function healthyIdle(count:number){
  const w=medicalCamp(count,250);
  for(const pawn of w.pawns)pawn.health=createMedicalRecord(w.tick);
  assert.deepEqual(validateWorld(w),[]);return w;
}
function clinical(){
  const w=medicalCamp(200,250),c=surgeryCamp('medicine',250);
  // These builders begin with the same three pawn IDs; remap only new physical
  // objects beyond the crowd's IDs before any actual clinical transition.
  assert.deepEqual(w.pawns.slice(0,3).map(p=>p.id),c.world.pawns.map(p=>p.id));w.pawns.splice(0,3,...c.world.pawns);
  w.structures=c.world.structures.map(s=>({...s,id:w.nextId++}));w.piles=c.world.piles.map(p=>({...p,id:w.nextId++}));w.rng=c.world.rng;refreshStock(w);
  assert.deepEqual(validateWorld(w),[]);assert(applyCommand(w,{type:'surgery-request',pawnId:c.patientId,part:'left-arm'}).ok);
  const patient=w.pawns.find(p=>p.id===c.patientId)!,doctor=w.pawns.find(p=>p.id===c.doctorId)!;
  const until=(predicate:()=>boolean)=>{let steps=0;while(!predicate()&&steps++<1200)stepWorld(w);assert(predicate(),'Real clinical checkpoint did not arrive');assert.deepEqual(validateWorld(w),[]);};
  until(()=>patient.need?.kind==='sleep'&&patient.need.phase==='sleep');assert(applyCommand(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1}).ok);
  until(()=>doctor.surgery?.phase==='pickup');const pickup=structuredClone(w);
  until(()=>doctor.surgery?.phase==='work'&&doctor.surgery.workCore>0);return {pickup,work:structuredClone(w)};
}
const healthy32=healthyIdle(32),healthy200=healthyIdle(200),active=clinical();
function anestheticRecords(){return Array.from({length:200},()=>{const record=createMedicalRecord(3000);record.anesthetic={bornAt:3000,expiresAtCore:150000,severity:1_000_000_000,remainder:0};return record;});}
const records=anestheticRecords(),recordBefore=sha(JSON.stringify(records));
const context={phase:0,posture:'bed' as const,starving:false};
const whole=structuredClone(records),partition=structuredClone(records);
for(let i=0;i<200;i++){advanceMedical(whole[i]!,60,{...context,phase:i%60},randomForbidden);for(let part=0;part<3;part++)advanceMedical(partition[i]!,20,{...context,phase:i%60},randomForbidden);}
assert.deepEqual(whole,partition);assert(whole.every(r=>r.tick===3060&&r.anesthetic!.severity<1_000_000_000));
const exterior=medicalCamp(1,250),interior=medicalCamp(1,250),anchor={x:123,z:123};
for(let z=110;z<=136;z++)for(let x=110;x<=136;x++)if(x===110||x===136||z===110||z===136)fixtureBuilding(interior,'wall',x,z);
interior.roofing={constructed:[],build:[],remove:[],cursor:0};
for(let z=111;z<136;z++)for(let x=111;x<136;x++)interior.roofing.constructed.push(z*250+x);
assert.deepEqual(validateWorld(interior),[]);assert.deepEqual(validateWorld(exterior),[]);
// Topology is primed once outside timing; each result still creates its own
// short-lived cleanliness capture, matching the surgical result path.
assert.equal(captureCleanliness(interior).room(anchor)!.cells.size,625);
assert.equal(surgeryOutdoors(interior,anchor,captureCleanliness(interior)),false);
assert.equal(captureCleanliness(exterior).room(anchor),null);assert.equal(surgeryOutdoors(exterior,anchor,captureCleanliness(exterior)),true);
let sink=0;
type Case={name:string;unit:string;world?:World;prepare:()=>()=>void};
const cases:Case[]=[
  ...[['reconcile-healthy-idle32',healthy32],['reconcile-healthy-idle200',healthy200],['reconcile-pickup200',active.pickup],['reconcile-work200',active.work]].map(([name,w])=>({name:name as string,unit:'ms per whole-world reconcileSurgery',world:w as World,prepare:()=>()=>{reconcileSurgery(w as World);}})),
  {name:'read-anesthetic-capacities200',unit:'ms per 200 assessMedical reads',prepare:()=>()=>{for(const record of records)sink+=assessMedical(record).capacities.consciousness;}},
  {name:'advance-anesthetic200-by20ticks',unit:'ms per 200 private records advanced 20 local ticks',prepare:()=>{const copy=structuredClone(records);return ()=>{copy.forEach((record,i)=>advanceMedical(record,20,{...context,phase:i%60},randomForbidden));};}},
  ...[['surgical-result-exterior',exterior],['surgical-result-room25x25',interior]].map(([name,w])=>({name:name as string,unit:'ms per fresh cleanliness/outdoors capture, cached topology',world:w as World,prepare:()=>()=>{const capture=captureCleanliness(w as World);sink+=capture.room(anchor)?.cleanliness??0;sink+=Number(surgeryOutdoors(w as World,anchor,capture));}})),
];
const witnesses=cases.map(c=>{const before=c.world?worldHashes(c.world):undefined;c.prepare()();if(c.world)assert.deepEqual(worldHashes(c.world),before);return {name:c.name,worldHashes:before,phase:c.world?.pawns.find(p=>p.surgery)?.surgery?.phase,pawns:c.world?.pawns.length};});
assert.equal(sha(JSON.stringify(records)),recordBefore);
for(const c of cases)for(let i=0;i<warmups;i++)c.prepare()();
const values=new Map(cases.map(c=>[c.name,Array.from({length:slots},()=>[] as number[])]));
for(let sample=0;sample<samples;sample++)for(let slot=0;slot<slots;slot++){
  // Four rotated slots, absolute measurements of identical frozen cases;
  // there is no A/B variant or unprovided historical baseline.
  for(let offset=0;offset<cases.length;offset++){
    const c=cases[(offset+slot+sample)%cases.length]!,batch=Array.from({length:calls},()=>c.prepare()),before=c.world?worldHashes(c.world):undefined;
    const start=performance.now();for(const run of batch)run();const elapsed=(performance.now()-start)/calls;
    values.get(c.name)![slot]!.push(elapsed);
    if(c.world)assert.deepEqual(worldHashes(c.world),before);
  }
}
assert.equal(sha(JSON.stringify(records)),recordBefore);const sourceAfter=hashes();assert.deepEqual(sourceAfter,sourceBefore,'Sources changed during the isolated benchmark');
const percentile=(list:number[],p:number)=>{const sorted=[...list].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*p)-1]!;};
const results=cases.map(c=>({name:c.name,unit:c.unit,slots:values.get(c.name)!.map((v,slot)=>({slot,p50:percentile(v,.5),p95:percentile(v,.95),min:Math.min(...v),max:Math.max(...v),values:v}))}));
const report={date:new Date().toISOString(),runtime:{node:process.version,execArgv:process.execArgv},hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemory:os.totalmem(),platform:os.platform(),release:os.release(),arch:os.arch()},sources:{before:sourceBefore,after:sourceAfter,unchanged:true},prepared:true,map:[250,250],samples,slots,callsPerSample:calls,warmups,witnesses,results,sink,
  correctness:'Valid real pickup/work checkpoints prepared through patient admission, medicine collection and anesthesia before timing. Read-only queries preserve World and World/animal/weather PRNG hashes. Private anesthetic advancement intentionally mutates only precloned records, with no PRNG draw; 60 ticks equals three partitions of 20 for 200 records.',
  timing:'World preparation, real setup ticks, validation, serialized checkpoints, cloning, hashes and partition oracle excluded. Four rotated absolute slots; each slot has 20 samples of 50 calls. Percentiles describe batch means normalized per call, not the tail of individual calls. Invocation-loop overhead and native runtime allocation/GC remain included; no baseline subtraction. Room topology is prewarmed; each result consultation creates a fresh cleanliness capture and retains the actual room flood/roof-count work.',
  limits:'Isolated reconcileSurgery, 200 clinical reads/advances and two room consultations only. Healthy control actors are idle with no request or task; no synthetic movement is assigned. Empty prepared 250-square terrain; room interior625 cells and existing constructed roof. Single active patient/doctor, no surgery outcomes or general planner/navigation/tick throughput, worker transport, renderer, GPU or FPS measurement. No historical baseline, A/B gain, campaign claim or forced GC. Run successively only after coordinator confirms source freeze and targeted controls.'};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({path:output,results:results.map(r=>({...r,slots:r.slots.map(({values,...s})=>s)}))}));
