import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld,refreshStock } from '../src/sim/index.ts';
import { plantClimateFixture } from '../tests/scenarios/plant-climate.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { updatePlantTemperatures } from '../src/sim/thermal-plants.ts';
import { plantGrowth } from '../src/sim/plants.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(a:number[])=>{const s=a.slice().sort((a,b)=>a-b);return {p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const results=[];
for(const count of [3,30,100])for(const temperature of [21,3]) {
  const w=createWorld(81,250,250),unit=plantClimateFixture(temperature);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.resources=[];w.pawns=[];w.piles=[];w.jobs=[];
  w.roofing={constructed:[],build:[],remove:[],cursor:0};
  for(let n=0;n<count;n++) {
    const dx=n%10*12,dz=Math.floor(n/10)*12;
    w.structures.push(...unit.structures.map(s=>({...s,id:w.nextId++,x:s.x+dx,z:s.z+dz})));
    w.resources.push(...unit.resources.map(p=>({...p,id:w.nextId++,x:p.x+dx,z:p.z+dz})));
    const p=structuredClone(unit.pawns[0]!);p.id=w.nextId++;p.x+=dx;p.z+=dz;p.name=`Culture ${n}`;w.pawns.push(p);
    w.roofing.constructed.push(...unit.roofing!.constructed.map(i=>(Math.floor(i/32)+dz)*250+i%32+dx));
    w.growingZones.push({id:w.nextId++,plant:'rice',allowSow:true,allowCut:true,cells:[(4+dz)*250+5+dx,(5+dz)*250+4+dx]});
  }
  w.roofing.constructed.sort((a,b)=>a-b);refreshStock(w);const layout=reconcileTemperature(w);for(const r of w.thermal!.regions)r.temperature=temperature;updatePlantTemperatures(w,layout);
  const before=w.resources.map(p=>({...p})),steps:number[]=[],clones:number[]=[];const encoder=new SnapshotEncoder(),deadline=performance.now()+45000;let peakGrowers=0;
  for(let t=0;t<900;t++) {
    if(performance.now()>deadline)throw Error('Plant temperature benchmark timeout');
    const start=performance.now();stepWorld(w);steps.push(performance.now()-start);peakGrowers=Math.max(peakGrowers,w.pawns.filter(p=>p.jobId!==null).length);
    if(t%10===0){const message=encoder.encode(w,0,6),at=performance.now();structuredClone(message);clones.push(performance.now()-at);}
  }
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join(' '));if(w.resources.length!==count*3)throw Error('Missing sown plants');
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(copy,20);if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation mismatch');
  const changed=before.filter(p=>JSON.stringify(p)!==JSON.stringify(w.resources.find(r=>r.id===p.id))).length;
  if(temperature===21&&changed)throw Error('Warm plants acquired unnecessary checkpoints');
  results.push({count,temperature,plants:w.resources.length,peakGrowers,stepMs:stats(steps),snapshotCloneMs:stats(clones),changedInitialPlants:changed,meanGrowth:w.resources.reduce((n,p)=>n+plantGrowth(w,p),0)/w.resources.length});
}
const report={date:new Date().toISOString(),cpu:os.cpus()[0]!.model,node:process.version,protocol:'CPU only, synthetic 250² grass map, 3/30/100 farmers in separate 16-cell rooms with 3 roof openings, one existing rice and two empty growing cells per room. 900 ticks of real sowing and natural air exchange at initial 21 or 3 °C. No forests, injected ongoing weather or rendering. Clone sampled every ten ticks, first checkpoint included; 45s watchdog per case.',results};
writeFileSync('artifacts/plant-temperature-cpu-v39.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
