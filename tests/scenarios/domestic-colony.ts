import { createWorld } from '../../src/sim/index.ts';
import { addResolvedInjury,createMedicalRecord } from '../../src/sim/injury-state.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { enableWildlife } from '../../src/sim/wildlife.ts';
import { reconcileAnimalHealth } from '../../src/sim/wildlife-health.ts';
import type { World } from '../../src/sim/types.ts';

/** Prepared V106 lesson, not a naturally progressed Crashlanded colony. */
export function domesticColony(seed=106817):World {
  const w=createWorld(seed,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[
    {id:w.nextId++,kind:'berries',x:15,z:10,amount:10,growth:1,growthTick:w.tick},
    {id:w.nextId++,kind:'berries',x:16,z:12,amount:10,growth:1,growthTick:w.tick},
  ];
  w.jobs=[];w.structures=[];w.piles=[];w.stockpiles=[];w.growingZones=[];w.pawns=w.pawns.slice(0,1);
  const handler=w.pawns[0]!;handler.x=8;handler.z=10;handler.hunger=100;handler.rest=100;
  handler.schedule.fill('work');handler.recreation.level=100;handler.bedId=null;
  for(const key of Object.keys(handler.priorities) as (keyof typeof handler.priorities)[])handler.priorities[key]=0;
  handler.priorities.handle=1;handler.priorities.doctor=2;
  handler.skills.animals={level:8,xp:0,dailyXp:0,passion:0};handler.skills.medicine.level=8;
  addMaterial(w,'food',12,{type:'ground',x:8,z:10},'berries');
  addMaterial(w,'medicine',4,{type:'ground',x:8,z:11},'herbal-medicine');
  enableWildlife(w,2);
  const [wild,patient]=w.wildlife!.animals;
  if(!wild||!patient)throw Error('Prepared domestic colony needs two local hares.');
  Object.assign(wild,{x:12,z:10,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick+80});
  Object.assign(patient,{x:11,z:12,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick+80});
  patient.domestic={since:w.tick-100,care:'herbal',tameness:4,lastTraining:w.tick-100,nextDecay:w.tick+45000-100};
  patient.health={...createMedicalRecord(w.tick),body:'hare'};
  addResolvedInjury(patient.health,'left-rear-leg','cut',900,()=>.9);
  reconcileAnimalHealth(w,patient);
  refreshStock(w);
  return w;
}
