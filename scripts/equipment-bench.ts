import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { medicalCamp,controlledInjury } from '../tests/scenarios/health.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
const stats=(a:number[])=>{a.sort((x,y)=>x-y);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
const results=[],start=performance.now();
for(const count of [3,30,100]){
  const w=medicalCamp(count,250);
  w.pawns.forEach((p,i)=>{
    Object.assign(p,{x:10+i%10*8,z:10+Math.floor(i/10)*8});p.priorities.gather=1;p.priorities.mine=1;p.priorities.haul=2;
    if(i%3===0){p.selfTend=true;p.priorities.doctor=1;controlledInjury(w,p,'left-arm',5000,'bruise');}
    addMaterial(w,'weapon',1,{type:'ground',x:p.x+2,z:p.z},'revolver');const gun=w.piles.at(-1)!;
    if(!applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:gun.id,action:'equip',queue:false}).ok)throw Error('Equipment rejected');
    const x=p.x,z=p.z+2;w.resources.push({id:w.nextId++,kind:'tree',x,z,amount:12});
    if(!applyCommand(w,{type:'designate',kind:'chop',x,z}).ok)throw Error('Tree rejected');
    w.tiles[(z+2)*250+x]={terrain:'rock',stone:'sandstone'};
    if(!applyCommand(w,{type:'designate',kind:'mine',x,z:z+2}).ok)throw Error('Mine rejected');
    if(!applyCommand(w,{type:'stockpile',enabled:true,x:x+3,z,filters:{wood:true,food:false,weapon:true}}).ok)throw Error('Storage rejected');
  });
  const samples:number[]=[],copies:number[]=[],states:Record<string,number>={};
  for(let tick=0;tick<1200;tick++){
    const before=performance.now();stepWorld(w);samples.push(performance.now()-before);
    if(tick%60===0){const now=performance.now();structuredClone(w);copies.push(performance.now()-now);for(const p of w.pawns){const k=p.equipmentTask?'equipment':p.tend?'tend':p.haul?'haul':w.jobs.find(j=>j.id===p.jobId)?.kind??p.state;states[k]=(states[k]??0)+1;}}
    if(performance.now()-start>120000)throw Error('Equipment benchmark exceeded 120 seconds');
  }
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join(';'));
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,5);stepWorld(copy,5);if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation mismatch');
  const armed=w.piles.filter(p=>p.owner.type==='equipment').length;if(armed!==count)throw Error('Equipment conservation failed');
  results.push({count,armed,stepMs:stats(samples),cloneMs:stats(copies),states,treesRemaining:w.resources.length,remainingMining:w.jobs.filter(j=>j.kind==='mine').length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,os:`${platform()} ${release()}`,scope:'250² cleared synthetic site; 3/30/100 adults, physical equipment then mining, trees, storage and self-care; 1200 ticks, snapshots and continuation; no GPU claim',durationMs:performance.now()-start,results};
writeFileSync('artifacts/equipment-cpu-v52.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
