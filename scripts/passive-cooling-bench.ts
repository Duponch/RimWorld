import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld,refreshStock } from '../src/sim/index.ts';
import { passiveCoolingFixture,fixtureCooler } from '../tests/scenarios/passive-cooling.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { applyThermalSources } from '../src/sim/thermal-sources.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { woodAccount } from '../tests/scenarios/colony-player.ts';
const stats=(values:number[])=>{const a=values.slice().sort((a,b)=>a-b);return {p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],p99:a[Math.ceil(a.length*.99)-1],max:a.at(-1)};};
const results=[];
for(const count of [3,30,100]) {
  const w=createWorld(81,250,250),unit=passiveCoolingFixture();fixtureCooler(unit);
  w.tick=32000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.resources=[];w.pawns=[];w.piles=[];w.jobs=[];
  w.roofing={constructed:[],build:[],remove:[],cursor:0};
  for(let n=0;n<count;n++) {
    const dx=n%10*12-12,dz=Math.floor(n/10)*12-12;
    w.structures.push(...unit.structures.map(s=>({...structuredClone(s),id:w.nextId++,x:s.x+dx,z:s.z+dz,...s.fuel?{fuel:{ticks:0,burned:30000,autoRefuel:true}}:{}})));
    const pawn=structuredClone(unit.pawns[0]!);pawn.id=w.nextId++;pawn.x+=dx;pawn.z+=dz;pawn.name=`Transport ${n}`;w.pawns.push(pawn);
    for(const pile of unit.piles)if(pile.owner.type==='ground')w.piles.push({...structuredClone(pile),id:w.nextId++,quantity:pile.item==='wood'?25:pile.quantity,owner:{type:'ground',x:pile.owner.x+dx,z:pile.owner.z+dz}});
    w.roofing.constructed.push(...unit.roofing!.constructed.map(i=>(Math.floor(i/32)+dz)*250+i%32+dx));
  }
  w.roofing.constructed.sort((a,b)=>a-b);refreshStock(w);const layout=reconcileTemperature(w);for(const r of w.thermal!.regions)r.temperature=35;
  const total=woodAccount(w),steps:number[]=[],clones:number[]=[];const encoder=new SnapshotEncoder(),deadline=performance.now()+45000;let peakHaulers=0;
  for(let t=0;t<600;t++) {
    if(performance.now()>deadline)throw Error('Cooling benchmark timeout');
    const at=performance.now();stepWorld(w);steps.push(performance.now()-at);peakHaulers=Math.max(peakHaulers,w.pawns.filter(p=>p.haul!==null).length);
    if(t%10===0){const message=encoder.encode(w,0,6),start=performance.now();structuredClone(message);clones.push(performance.now()-start);}
  }
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join(' '));if(woodAccount(w)!==total)throw Error('Wood balance drift');
  const coolers=w.structures.filter(s=>s.kind==='passive-cooler');if(coolers.some(s=>!s.fuel?.ticks))throw Error('Cooler never refueled');
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(copy,20);if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation mismatch');
  // Isolate marginal thermal emitter work on a copy, without planner/renderer.
  const sources:number[]=[];for(let n=0;n<100;n++){for(const r of copy.thermal!.regions)r.temperature=35;const at=performance.now();applyThermalSources(copy,layout);sources.push(performance.now()-at);}
  results.push({count,peakHaulers,refueled:coolers.length,stepMs:stats(steps),snapshotCloneMs:stats(clones),sourceOnlyMs:stats(sources),temperatures:w.thermal!.regions.map(r=>r.temperature),woodConserved:true});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'CPU only; 250² synthetic grass; 3/30/100 independent covered 16-cell rooms, warm initial air, empty coolers, 25 real wood per room, one hauler each. 600 ticks of actual pickup, travel, service, needs and thermal integration; exact continuation. Snapshot clone every ten ticks includes first checkpoint. Separate emitter-only sample on a copy. 45s watchdog per case. No forest or rendering.',results};
writeFileSync('artifacts/passive-cooling-cpu-v40.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
