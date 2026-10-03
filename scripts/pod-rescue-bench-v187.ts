import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { createWorld,stepWorld } from '../src/sim/engine.ts';
import { resolveSelectedPodRescue,advancePodRescues } from '../src/sim/pod-rescue.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { captureStandability } from '../src/sim/furniture-travel.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { isRoofed } from '../src/sim/roof-rules.ts';
import { validateWorld } from '../src/sim/serialization.ts';

const files=['src/sim/pod-rescue.ts','src/sim/pod-rescue-save.ts','src/sim/pod-rescue-patient.ts','src/sim/engine.ts'];
const hashes=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const frozen=hashes(),w=createWorld(187,250,250);
assert.ok(resolveSelectedPodRescue(w,4871));const c=w.podRescues!.pending!.cell;
w.pawns[0]!.x=c.x;w.pawns[0]!.z=c.z;
for(const p of w.pawns){Object.keys(p.priorities).forEach(k=>p.priorities[k as keyof typeof p.priorities]=0);p.hunger=p.rest=100;p.recreation.level=100;}
stepWorld(w,10);assert.ok(w.podRescues!.pending);assert.deepEqual(validateWorld(w),[]);
const before=JSON.stringify(w);
// Historical point check kept only as a performance oracle: it builds the
// entire grid/set even when a person blocks this one pending capsule cell.
function historicalPointCheck():void {
  const occupied=new Set([...w.structures.flatMap(s=>footprintCells(s).map(c=>c.z*w.width+c.x)),
    ...w.pawns.flatMap(p=>[p.z*w.width+p.x,...p.motion&&p.motion.end>w.tick?[p.motion.from.z*w.width+p.motion.from.x]:[]]),
    ...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*w.width+p.owner.x]:[]),
    ...w.packed.flatMap(p=>p.owner.type==='ground'?[p.owner.z*w.width+p.owner.x]:[])]);
  const key=c.z*w.width+c.x;
  const free=!blockedCells(w)[key]&&!occupied.has(key)&&captureStandability(w)(c)&&!isRoofed(w,key);
  assert.equal(free,false);
}
const percentile=(a:number[],p:number)=>a.slice().sort((x,y)=>x-y)[Math.floor((a.length-1)*p)]!;
const results:Array<{round:number;kind:string;p50:number;p95:number;values:number[]}>=[];
for(let round=0;round<4;round++){
  const order=round%2?['current','historical']:['historical','current'];
  for(const kind of order){const fn=kind==='current'?()=>advancePodRescues(w):historicalPointCheck;
    for(let i=0;i<100;i++)fn();const values:number[]=[];
    for(let i=0;i<20;i++){const start=performance.now();for(let n=0;n<20;n++)fn();values.push((performance.now()-start)/20);}
    results.push({round,kind,p50:percentile(values,.5),p95:percentile(values,.95),values});
    assert.equal(JSON.stringify(w),before);
  }
}
assert.deepEqual(hashes(),frozen);
const report={date:new Date().toISOString(),node:process.version,cpu:os.cpus()[0]?.model,size:[250,250],prepared:true,
  scope:'blocked pending capsule point check only; historical comparator reconstructed, not a full old engine',
  samples:20,callsPerSample:20,warmup:100,units:'ms/call',hashes:frozen,worldAndRngUnchanged:true,results,
  limits:'Not full tick, snapshot adoption, renderer CPU, worker, GPU or frame rate. No concurrent heavy/browser campaign.'};
mkdirSync('tmp',{recursive:true});writeFileSync('tmp/pod-rescue-bench-v187.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({path:'tmp/pod-rescue-bench-v187.json',results:results.map(({values,...r})=>r)}));
