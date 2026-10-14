import {expect,test} from 'vitest';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {HYDROPONICS_RESEARCH_COST} from '../src/sim/research';
import {fixtureBuilding} from './scenarios/deconstruction';
import {medicalCamp} from './scenarios/health';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {FLORA_DEFINITIONS,type PlantSpecies} from '../src/sim/biome-flora';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {constructionRecipe} from '../src/sim/construction-materials';
import {constructionPlantBlocks,plantHarvestWorkCore,isConstructionLightPlant,constructionFinalWipesPlants,constructionFrameWipesPlants,clearanceOutputPending} from '../src/sim/construction-plants';
import {planConstructionPlantRetirement,commitConstructionPlantRetirement,retainClearingWorkAfterOutputRefusal} from '../src/sim/plant-retirement';
import {finishFloor} from '../src/sim/flooring';
import {clearingDuration} from '../src/sim/gathering';
import {actionProgress} from '../src/render/action-feedback';
import type {Command,Job,Resource,World,StructureKind} from '../src/sim/types';

// Prepared 32-cell feature scenes, not a reconstructed human campaign.
const LIGHT=['grass','tall-grass','brambles','moss','rice','potato','corn','cotton','haygrass'] as const;
type Light=typeof LIGHT[number];
function resource(w:World,kind:Light,x=12,z=10):Resource {
  const species=['grass','tall-grass','brambles','moss'].includes(kind)?kind as PlantSpecies:undefined,def=species&&FLORA_DEFINITIONS[species];
  return {id:w.nextId++,kind:def?def.kind:kind as 'rice'|'potato'|'corn'|'cotton'|'haygrass',...species?{species}:{},x,z,amount:def?def.yield:10,growth:1,growthTick:w.tick};
}
function camp(kind:Light='grass'){
  const w=medicalCamp(2);w.tick=2000;Object.assign(w.pawns[0]!,{x:8,z:10,name:'Salomé'});Object.assign(w.pawns[1]!,{x:5,z:20});w.pawns[0]!.priorities.build=1;
  const source=resource(w,kind),neighbor=resource(w,'grass',14,10);w.resources=[source,neighbor];addMaterial(w,'wood',60,{type:'ground',x:7,z:10},'wood');refreshStock(w);prepareConstructionFlora(w);valid(w);return {w,source,neighbor};
}
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function exact(w:World){valid(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const adopted=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1,true)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);}
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const target=(w:World,kind:Job['kind']):Job=>({id:w.nextId++,kind,x:12,z:10,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},...kind==='lay-floor'?{floor:'wood-planks' as const}:{}});
const command=(kind:'wall'|'table'|'lay-floor'):Command=>kind==='lay-floor'?{type:'designate',kind,floor:'wood-planks',x:12,z:10}:{type:'designate',kind,material:'wood',x:12,z:10};
const finished=(w:World,kind:'wall'|'table'|'lay-floor')=>kind==='lay-floor'?w.tiles[10*w.width+12]!.floor==='wood-planks':w.structures.some(s=>s.kind===kind&&s.x===12&&s.z===10);

const weights:readonly [Resource['kind'],PlantSpecies|undefined,number][]=[
  ['wild-plant','grass',40],['wild-plant','tall-grass',60],['wild-plant','brambles',60],['wild-plant','moss',60],
  ['rice',undefined,200],['potato',undefined,200],['corn',undefined,200],['cotton',undefined,200],['haygrass',undefined,200],
  ['tree','saguaro',210],['berries','berry-bush',250],['wild-plant','agave',300],['healroot',undefined,400],['wild-plant','healroot-wild',400],
  ['tree','drago',660],['tree','pine',710],['tree','poplar',800],['tree','birch',800],['tree','oak',1400],['tree',undefined,800],['berries',undefined,250],
];
test.each(weights)('V351 %s/%s has Core harvestWork %i and the strict Dandelion200 boundary',(kind,species,work)=>{
  const r={kind,...species?{species}:{}},j=target(medicalCamp(),'wall');expect(plantHarvestWorkCore(r)).toBe(work);expect(isConstructionLightPlant(r)).toBe(work<=200);expect(constructionPlantBlocks(j,{...r,id:10,x:12,z:10,amount:1})).toBe(work>200);
});
test('V351 a rock is never misclassified as an unproductive small plant',()=>{expect(isConstructionLightPlant({kind:'rock'})).toBe(false);expect(plantHarvestWorkCore({kind:'rock'})).toBe(Infinity);});

test.each(LIGHT.flatMap(plant=>(['wall','table','lay-floor'] as const).map(kind=>({plant,kind}))))('V351 a real paid $kind over $plant progresses without a preliminary cut, zero harvest or additional RNG',({plant,kind})=>{
  const {w,source,neighbor}=camp(plant),b=deserializeWorld(serializeWorld(w));b.resources=b.resources.filter(r=>r.id!==source.id);refreshStock(b);valid(b);
  expect(applyCommand(w,command(kind)).ok).toBe(true);expect(applyCommand(b,command(kind)).ok).toBe(true);const job=w.jobs.find(j=>j.kind===kind)!,jobId=job.id,cost=constructionRecipe(job).ingredients.find(c=>c.item==='wood')!.quantity;
  expect(w.resources.find(r=>r.id===source.id)).toBe(source);expect(w.jobs[0]!.clearance).toBeUndefined();let sawProgress=false,reloaded=false;
  for(let n=0;n<300&&!finished(w,kind);n++){
    stepWorld(w);stepWorld(b);const current=w.jobs.find(j=>j.id===jobId);
    expect(current?.clearance).toBeUndefined();expect(finished(w,kind)).toBe(finished(b,kind));
    if(current&&current.progress>0){sawProgress=true;
      // Terrain Frame does not wipe. For buildings, this assertion deliberately
      // leaves Frame-vs-final timing to ROOT's fresh generator qualification.
      if(kind==='lay-floor')expect(w.resources.find(r=>r.id===source.id)).toBe(source);
      if(!reloaded){exact(w);reloaded=true;}
    }
  }
  expect(finished(w,kind)).toBe(true);expect(sawProgress).toBe(true);expect(reloaded).toBe(true);expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(w.resources.find(r=>r.id===neighbor.id)).toBe(neighbor);expect(wood(w)).toBe(60-cost);expect(w.piles.some(p=>p.item!=='wood')).toBe(false);expect(w.events.some(e=>e.message.includes('a dégagé le chantier'))).toBe(false);
  // The plant-free control pays the same recipe and legitimate quality draw;
  // neither instant wiping nor any skipped cut adds harvest units or world RNG.
  expect(w.rng).toBe(b.rng);expect(wood(w)).toBe(wood(b));if(kind==='table')expect(w.structures.find(s=>s.kind==='table')?.quality).toBe(b.structures.find(s=>s.kind==='table')?.quality);exact(w);
});

test.each(['wall','table','lay-floor'] as const)('V351 an accepted historical grass clearance before %s keeps its actual counter and completes normally',kind=>{
  const {w,source}=camp(),p=w.pawns[0]!;expect(applyCommand(w,command(kind)).ok).toBe(true);const j=w.jobs.find(j=>j.kind===kind)!;
  Object.assign(p,{x:11,z:10,state:'working',jobId:j.id,path:[]});p.motion=null;p.moveCooldown=0;p.orders.active=j.id;j.status='active';j.reservedBy=p.id;j.clearance={resourceId:source.id,progress:12};
  expect(constructionPlantBlocks(j,source)).toBe(true);exact(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(j.clearance!.progress).toBeGreaterThan(12);expect(w.resources.includes(source)).toBe(true);expect(actionProgress(w,p)).toMatchObject({kind:'clearing',total:60});
  for(let n=0;n<300&&!finished(w,kind);n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);}expect(finished(w,kind)).toBe(true);expect(w.events.filter(e=>e.message.includes('a dégagé le chantier'))).toHaveLength(1);expect(w.resources.includes(source)).toBe(false);exact(w);
});

const keep:readonly StructureKind[]=['power-conduit','sleeping-spot','animal-sleeping-spot','crafting-spot','butcher-spot','hydroponics-basin','flower-pot'];
test.each(keep)('V351 FINAL Core SupportsPlants/non-edifice %s is a pure no-wipe catalogue policy, independently of its Frame',kind=>{
  const {w,source}=camp('rice'),before=structuredClone(w);expect(constructionFinalWipesPlants(kind)).toBe(false);expect(w).toEqual(before);expect(w.resources.includes(source)).toBe(true);exact(w);
});
test.each(['sleeping-spot','animal-sleeping-spot','crafting-spot','butcher-spot'] as const)('V351 immediate %s can coexist with physical light grass without erasing it',kind=>{
  const {w,source}=camp();const rng=w.rng;expect(applyCommand(w,{type:'designate',kind,x:12,z:10}).ok).toBe(true);expect(w.structures.some(s=>s.kind===kind)).toBe(true);expect(w.resources.includes(source)).toBe(true);expect(w.rng).toBe(rng);expect(w.jobs).toEqual([]);exact(w);
});
test('V351 the actually paid flower pot is reinstalled over grass without a generated construction Frame, keeping both original identities',()=>{
  const {w,source}=camp();expect(applyCommand(w,{type:'designate',kind:'flower-pot',material:'wood',x:8,z:7}).ok).toBe(true);
  for(let n=0;n<350&&!w.structures.some(s=>s.kind==='flower-pot');n++)stepWorld(w);
  const pot=w.structures.find(s=>s.kind==='flower-pot')!;expect(pot).toBeDefined();const originalId=pot.id,quality=pot.quality,remainingWood=wood(w);exact(w);
  // Let the real ten-tick pot producer create cultivation work, then attach a
  // real worker and an unrelated queued cut. Withdrawal must retire only the
  // pot's exact cultivation intents, not disable sowing or discard all orders.
  for(let n=0;n<10&&!w.jobs.some(j=>j.flowerPotId===pot.id);n++)stepWorld(w);
  const sow=w.jobs.find(j=>j.flowerPotId===pot.id&&j.kind==='sow')!,grower=w.pawns[1]!;expect(sow).toBeDefined();grower.priorities.grow=1;grower.priorities.gather=1;
  expect(applyCommand(w,{type:'order-job',pawnId:grower.id,jobId:sow.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'cut',x:14,z:10}).ok).toBe(true);const foreign=w.jobs.find(j=>j.kind==='cut'&&j.x===14&&j.z===10)!;
  expect(applyCommand(w,{type:'order-job',pawnId:grower.id,jobId:foreign.id,queue:true}).ok).toBe(true);expect(grower.orders.queue).toContain(foreign.id);exact(w);
  expect(applyCommand(w,{type:'install',structureId:pot.id,x:12,z:10,orientation:0}).ok).toBe(true);let carried=false;
  for(let n=0;n<350&&w.jobs.some(j=>j.furniture?.structureId===pot.id);n++){
    stepWorld(w);expect(w.jobs.find(j=>j.furniture?.structureId===pot.id)?.clearance).toBeUndefined();expect(w.resources.includes(source)).toBe(true);
    if(w.packed.some(p=>p.building.id===pot.id&&p.owner.type==='pawn')){
      carried=true;expect(w.jobs.some(j=>j.flowerPotId===pot.id)).toBe(false);expect(w.jobs).toContain(foreign);expect(foreign.reservedBy).toBe(grower.id);expect(grower.orders.queue.includes(foreign.id)||grower.jobId===foreign.id).toBe(true);expect(pot.flower!.allowSow).toBe(true);exact(w);
    }
  }
  expect(carried).toBe(true);expect(w.jobs.some(j=>j.furniture?.structureId===pot.id)).toBe(false);expect(w.structures.find(s=>s.id===originalId)).toBe(pot);expect(pot).toMatchObject({x:12,z:10,quality});expect(w.resources.includes(source)).toBe(true);expect(wood(w)).toBe(remainingWood);expect(w.events.some(e=>e.message.includes('a dégagé le chantier'))).toBe(false);exact(w);
});
// Current Core1.6.4871 freshly requalified by ROOT: generated Frames have
// fill0.2/no SupportsPlants. These strict phase cases complement FINAL policy.


test('V351 no-yield retirement of mature crop releases only its exact queued designation and preserves the producer, neighbor, IDs and RNG',()=>{
  const {w,source,neighbor}=camp('rice');expect(applyCommand(w,{type:'designate',kind:'harvest',x:source.x,z:source.z}).ok).toBe(true);const harvest=w.jobs[0]!,cutter=w.pawns[1]!;
  // Declared queue projection uses real persisted Job shape; no played queue
  // admission, floor admission or harvest completion is claimed by this case.
  harvest.status='active';harvest.reservedBy=cutter.id;cutter.orders.queue=[harvest.id];const producer=target(w,'wall');producer.construction='blueprint';producer.material='wood';w.jobs.push(producer);exact(w);
  const before=structuredClone(w),plan=planConstructionPlantRetirement(w,producer,producer.id)!;expect(w).toEqual(before);expect(plan.obsoleteJobs.has(harvest.id)).toBe(true);expect(commitConstructionPlantRetirement(w,plan)).toBe(true);
  expect(w.jobs).toEqual([producer]);expect(cutter.orders.queue).toEqual([]);expect(w.resources.includes(source)).toBe(false);expect(w.resources.includes(neighbor)).toBe(true);expect(w.rng).toBe(before.rng);expect(w.nextId).toBe(before.nextId);expect(w.piles).toEqual(before.piles);exact(w);
});
test('V351 a stale crop retirement plan refuses before any Resource, queue, owner, counter or RNG mutation',()=>{
  const {w,source}=camp('rice'),producer=target(w,'wall');producer.construction='blueprint';producer.material='wood';w.jobs.push(producer);const plan=planConstructionPlantRetirement(w,producer,producer.id)!;source.growth=.8;const before=structuredClone(w);expect(commitConstructionPlantRetirement(w,plan)).toBe(false);expect(w).toEqual(before);
});
test('V351 a blocked paid clearance keeps a strictly valid bounded counter and its exact active claimant',()=>{
  const w=medicalCamp(),p=w.pawns[0]!,j=target(w,'wall'),r:Resource={id:w.nextId++,kind:'tree',x:12,z:10,amount:46};w.resources=[r];p.priorities.build=1;j.material='wood';j.construction='blueprint';j.status='active';j.reservedBy=p.id;j.clearance={resourceId:r.id,progress:100,workRemainder:1};w.jobs=[j];Object.assign(p,{x:11,z:10,state:'working',jobId:j.id,path:[],moveCooldown:0});p.motion=null;
  const rng=w.rng,nextId=w.nextId;expect(retainClearingWorkAfterOutputRefusal(j,clearingDuration(r))).toBe(true);expect(j.clearance).toEqual({resourceId:r.id,progress:99,workRemainder:9999});expect(j.reservedBy).toBe(p.id);expect(p.jobId).toBe(j.id);expect(w.resources).toEqual([r]);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);exact(w);
});


test.each(LIGHT.flatMap(plant=>(['power-conduit','flower-pot','hydroponics-basin'] as const).map(kind=>({plant,kind}))))('V351 $kind wipes $plant at its first physical Thing Frame even though the FINAL entity supports plants',({plant,kind})=>{
  const {w,source,neighbor}=camp(plant);Object.assign(neighbor,{x:22,z:20});
  if(kind==='power-conduit')addMaterial(w,'steel',1,{type:'ground',x:7,z:11},'steel');
  if(kind==='hydroponics-basin'){w.research??={points:0,project:null};w.research.hydroponics={points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick};addMaterial(w,'steel',75,{type:'ground',x:7,z:11},'steel');addMaterial(w,'steel',25,{type:'ground',x:8,z:11},'steel');addMaterial(w,'component',1,{type:'ground',x:7,z:12},'component');}
  refreshStock(w);exact(w);const material=kind==='flower-pot'?'wood':'steel';expect(applyCommand(w,{type:'designate',kind,material,x:12,z:10}).ok).toBe(true);
  const job=w.jobs.find(j=>j.kind===kind)!;expect(job.construction).toBe('blueprint');expect(w.resources.includes(source)).toBe(true);expect(constructionFrameWipesPlants(kind)).toBe(true);expect(constructionFinalWipesPlants(kind)).toBe(false);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
  let frame=false;for(let n=0;n<300&&!frame;n++){
    stepWorld(w);expect(job.clearance).toBeUndefined();frame=job.construction==='frame';if(!frame)expect(w.resources.includes(source)).toBe(true);
    const raw=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(raw.status).toBe('applied');if(raw.status==='applied')expect(raw.world).toEqual(w);
  }
  expect(frame).toBe(true);expect(w.resources.includes(source)).toBe(false);expect(job.progress).toBe(0);expect(w.resources.includes(neighbor)).toBe(true);expect(w.piles.every(p=>['wood','steel','component'].includes(p.item))).toBe(true);expect(w.events.some(e=>e.message.includes('a dégagé le chantier'))).toBe(false);exact(w);
  // A first payment is10 units, not the full100-steel recipe. The bounded
  // window includes ten remaining physical deliveries and280 local work.
  const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<2000&&w.jobs.some(j=>j.id===job.id);n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);}expect(w.structures.some(s=>s.kind===kind),JSON.stringify({tick:w.tick,job,pawns:w.pawns,piles:w.piles})).toBe(true);expect(w.resources.includes(neighbor)).toBe(true);exact(w);
});

test.each(['wall','grave'] as const)('V351 an existing %s Frame retains the original light plant across load and retires it only at the next actual work contact',kind=>{
  const {w,source}=camp('rice'),p=w.pawns[0]!;expect(applyCommand(w,{type:'designate',kind,...kind==='wall'?{material:'wood' as const}:{},x:12,z:10}).ok).toBe(true);const j=w.jobs.find(job=>job.kind===kind)!;
  if(kind==='wall'){const supply=w.piles.find(p=>p.item==='wood')!;supply.quantity-=5;addMaterial(w,'wood',5,{type:'job',jobId:j.id},'wood');j.construction='frame';refreshStock(w);}
  const rng=w.rng;Object.assign(p,{x:11,z:10,state:'working',jobId:j.id,path:[],moveCooldown:0});p.motion=null;j.status='active';j.reservedBy=p.id;exact(w);expect(w.resources.includes(source)).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));expect(copy.resources.some(r=>r.id===source.id)).toBe(true);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(w.resources.includes(source)).toBe(false);expect(j.progress).toBeGreaterThan(0);expect(w.piles.every(p=>p.item==='wood')).toBe(true);expect(w.rng).toBe(rng);exact(w);
});

test.each(['crafting-spot','butcher-spot','flower-pot'] as const)('V351 %s/light coexistence is admitted in235 checkpoints and deltas while the literal234 guard still refuses',kind=>{
  const {w,source}=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));expect(first.status).toBe('applied');
  if(kind==='flower-pot'){const object=fixtureBuilding(w,kind,12,10);Object.assign(object,{material:'wood',flower:{allowSow:true}});}else expect(applyCommand(w,{type:'designate',kind,x:12,z:10}).ok).toBe(true);
  expect(w.resources.includes(source)).toBe(true);exact(w);const packet=structuredClone(encoder.encode(w,0,1,false));expect(packet.kind).toBe('delta');const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  const old={...structuredClone(w),schemaVersion:234} as unknown as World,before=structuredClone(old);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Resource overlaps a structure/);expect(old).toEqual(before);
});

test('V351 a floor designation coexists with a real manual crop harvest, then destructive terrain commit retires exactly that target without harvest output',()=>{
  const {w,source,neighbor}=camp('rice');expect(applyCommand(w,{type:'designate',kind:'harvest',x:12,z:10}).ok).toBe(true);const harvest=w.jobs[0]!,cutter=w.pawns[1]!;cutter.priorities.gather=1;
  expect(applyCommand(w,{type:'order-job',pawnId:cutter.id,jobId:harvest.id,queue:true}).ok).toBe(true);expect(applyCommand(w,command('lay-floor')).ok).toBe(true);const j=w.jobs.find(j=>j.kind==='lay-floor')!;expect(w.jobs.some(k=>k.id===harvest.id)).toBe(true);exact(w);
  // Stop all execution while directly qualifying the real finish transaction.
  // No forced harvest completion or constructor path is invented by this case.
  const supply=w.piles.find(p=>p.item==='wood')!;supply.quantity-=3;addMaterial(w,'wood',3,{type:'job',jobId:j.id},'wood');j.construction='frame';refreshStock(w);const rng=w.rng,ids=w.nextId;
  expect(finishFloor(w,j)).toBe(true);expect(w.resources.includes(source)).toBe(false);expect(w.resources.includes(neighbor)).toBe(true);expect(w.jobs.some(k=>k.id===harvest.id)).toBe(false);expect(cutter.orders.queue.includes(harvest.id)).toBe(false);expect(w.piles.every(p=>p.item==='wood')).toBe(true);expect(w.rng).toBe(rng);expect(w.nextId).toBe(ids);w.jobs=w.jobs.filter(k=>k!==j);exact(w);
});

test.each(['water','rock'] as const)('V351 admitting coexisting plant orders does not allow a floor on actual %s terrain',terrain=>{
  const {w,source}=camp('rice');source.x=13;expect(applyCommand(w,{type:'designate',kind:'harvest',x:13,z:10}).ok).toBe(true);w.tiles[10*w.width+12]!.terrain=terrain;exact(w);const before=structuredClone(w);expect(applyCommand(w,command('lay-floor')).ok).toBe(false);expect(w).toEqual(before);
});

test('V351 a producer target removed from its registry invalidates retirement before any crop, queue, cargo or RNG mutation',()=>{
  const {w,source}=camp('rice');expect(applyCommand(w,command('wall')).ok).toBe(true);const producer=w.jobs.find(j=>j.kind==='wall')!,plan=planConstructionPlantRetirement(w,producer,producer.id,'frame')!;expect(plan).not.toBeNull();w.jobs=w.jobs.filter(j=>j!==producer);const before=structuredClone(w);expect(commitConstructionPlantRetirement(w,plan)).toBe(false);expect(w).toEqual(before);expect(w.resources.includes(source)).toBe(true);exact(w);
});

test('V351 paid output boundary requires the exact valid duration and fraction, not an ordinary unfinished clearance',()=>{
  expect(clearanceOutputPending({clearance:{resourceId:1,progress:99,workRemainder:9999}},100)).toBe(true);
  for(const clearance of [undefined,{resourceId:1,progress:99},{resourceId:1,progress:99,workRemainder:9998},{resourceId:1,progress:98,workRemainder:9999}])expect(clearanceOutputPending({clearance},100)).toBe(false);
  expect(clearanceOutputPending({clearance:{resourceId:1,progress:99,workRemainder:9999}},99)).toBe(false);
});
