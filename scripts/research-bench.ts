import { wildlifeLoad,injuredWildlifeLoad } from '../tests/scenarios/wildlife-load.ts';
import { coldStoreLoad } from '../tests/scenarios/cold-store-load.ts';
import { heatwaveLoad } from '../tests/scenarios/heatwave-load.ts';
import { cpus,platform,release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { researchLoad } from '../tests/scenarios/research-load.ts';
import { stepWorld,validateWorld } from '../src/sim/index.ts';
import { SnapshotEncoder } from '../src/bridge/snapshots.ts';
const stats=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],p99:s[Math.ceil(s.length*.99)-1],max:s.at(-1)};};
const animalCombat=process.env.ANIMAL_COMBAT==='1';
const wild=process.env.WILDLIFE==='1',cold=!wild&&process.env.COLD_STORE==='1',hot=!wild&&!cold&&process.env.HEATWAVE==='1',makeLoad=animalCombat?injuredWildlifeLoad:wild?wildlifeLoad:cold?coldStoreLoad:hot?heatwaveLoad:researchLoad,version=process.env.VALIDATION_VERSION??(wild?'v76':cold?'v75':hot?'v74':'v73'),label=animalCombat?'animal-combat':wild?'wildlife':cold?'cold-store':hot?'heatwave':'research',startTick=hot?4000:2000;
const rows=[];stepWorld(makeLoad(3),100);
for(const count of [3,30,100]){
  const w=makeLoad(count),enc=new SnapshotEncoder(),ticks:number[]=[],snapshots:number[]=[];enc.encode(w,0,6);const started=performance.now();
  for(let i=0;i<650;i++){let t=performance.now();stepWorld(w);ticks.push(performance.now()-t);if(i%5===0){t=performance.now();enc.encode(w,0,6);snapshots.push(performance.now()-t);}if(performance.now()-started>60000)throw Error('Mixed activity measurement exceeded 60s');}
  const errors=validateWorld(w);if(errors.length)throw Error(errors.join('; '));
  if(!hot&&!cold&&(w.tailoring?.completed??0)!==Array.from({length:count},(_,i)=>i).filter(i=>i%2===0&&i%3!==0).length)throw Error(`Incomplete garments ${count}: ${w.tailoring?.completed}`);
  rows.push({actors:count,animals:w.wildlife?.animals.length??0,animalNutrition:w.wildlife?.eatenNutrition??0,tickMs:stats(ticks),steadyTickMs:stats(ticks.slice(20)),snapshotMs:stats(snapshots),completed:w.tailoring?.completed??0,research:w.research!.points,exposed:w.pawns.filter(p=>p.health?.heatstroke||p.health?.hypothermia).length,coolers:w.structures.filter(s=>s.kind==='cooler').length,mined:w.tiles.filter(t=>t.terrain==='rough-stone').length});
}
const report={date:new Date().toISOString(),cpu:cpus()[0]!.model,os:platform()+' '+release(),node:process.version,protocol:(animalCombat?'Half of the hares have real tail gunshot injuries, blood loss and an initial bounded escape; no animal melee or corpse transport. ':'')+(wild?'Same number of wild hares as colonists, half start hungry, one third tired; vegetation and piles consumed physically. ':'')+(cold?'1/6/20 powered cold rooms and rice stores; one fifth of actors start at 34% hypothermia and physically seek warmth; ':'')+(hot?'Heatwave plateau 17°C offset, tick 4000–4650; half shirt-wearing actors start at 34% heatstroke, other half tribalwear; ':'')+'Natural 250² map, 3/30/100 actors with physical apparel. One third research at physical benches; others gather/craft tribalwear or mine/chop. 650 ticks, 100 separate warmup ticks, encoding every five ticks. Single pass, CPU only; no 6× guarantee.',wildlife:wild,coldStore:cold,heatwave:hot,rows};
writeFileSync(`artifacts/${label}-cpu-${version}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(rows));
