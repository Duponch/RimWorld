/** V352 physical CUT clearance regression oracles.
 * Stocks, typed resources and saturation are declared UNIT preparation. Commands,
 * approach, pickup, movement, work, refusal, damage and retries then execute real
 * producers. This is not a natural campaign or replay of a player's camp.
 */
import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {damagePile} from '../src/sim/thing-damage';
import {infectCrop} from '../src/sim/plant-blight';
import {jobDuration} from '../src/sim/farming';
import {queryJobStatus} from '../src/sim/diagnostics';
import {specificWorkActivity} from '../src/ui/work-activity';
import {actionProgress} from '../src/render/action-feedback';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import type {World,Job,Resource} from '../src/sim/types';

function twoDrawState(seed:number){
 let state=BigInt(seed>>>0);const mask=0xffffffffn;
 for(let i=0;i<2;i++){state=(state^((state<<13n)&mask))&mask;state=(state^(state>>17n))&mask;state=(state^((state<<5n)&mask))&mask;}
 return Number(state);
}
function exact(w:World){
 expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 const raw=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1,true)));expect(raw.status).toBe('applied');if(raw.status==='applied')expect(raw.world).toEqual(w);
}
function until(w:World,done:()=>boolean,max=350){for(let n=0;n<max&&!done();n++)stepWorld(w);expect(done(),`tick=${w.tick}`).toBe(true);exact(w);}
function blockedScene(mode:'wall'|'replant'){
 const prepared=mode==='replant'?preparedTreeWrapper():undefined,w=prepared?.w??medicalCamp(2),p=w.pawns[0]!;
 Object.assign(p,{x:8,z:10,name:'Salomé'});p.priorities.build=1;p.priorities.grow=1;p.priorities.gather=1;p.skills.plants={level:8,xp:0,dailyXp:0,passion:0};
 const x=mode==='wall'?12:24,z=mode==='wall'?10:20;
 const source:Resource={id:w.nextId++,kind:'berries',species:'berry-bush',x,z,amount:10,growth:1,growthTick:w.tick};w.resources=[source];prepareConstructionFlora(w);
 for(let zz=0;zz<w.height;zz++)for(let xx=0;xx<w.width;xx++){
  if(w.piles.some(i=>i.owner.type==='ground'&&i.owner.x===xx&&i.owner.z===zz))continue;
  w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x:xx,z:zz}});
 }
 refreshStock(w);w.rng=42;exact(w);
 expect(applyCommand(w,mode==='wall'?{type:'designate',kind:'wall',material:'wood',x,z}:{type:'replant-tree',pileId:prepared!.pile.id,x,z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind===(mode==='wall'?'wall':'replant-tree'))!;
 if(prepared){
  until(w,()=>prepared.pile.owner.type==='pawn');
  // Declared second saturation boundary: pickup has freed the old ground slot.
  // Filling that slot here is explicit UNIT setup, not played production.
  addMaterial(w,'wood',75,{type:'ground',x:12,z:10},'wood');refreshStock(w);exact(w);
 }
 until(w,()=>job.clearance?.progress===59&&job.clearance.workRemainder===9999);
 expect(w.resources.includes(source)).toBe(true);expect(p.jobId).toBe(job.id);expect(job.reservedBy).toBe(p.id);
 return {w,p,source,job,prepared};
}

test.each(['wall','replant'] as const)('V352 saturated mature CUT clearance in %s retains its exact claimant and does no duplicate XP/RNG/work on retry',mode=>{
 const {w,p,source,job,prepared}=blockedScene(mode),copy=deserializeWorld(serializeWorld(w)),skill=structuredClone(p.skills.plants),rng=w.rng,nextId=w.nextId,piles=structuredClone(w.piles),wrapper=prepared?structuredClone(prepared.pile):undefined;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
 for(let n=1;n<=60;n++){
  stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(job.clearance).toMatchObject({resourceId:source.id,progress:59,workRemainder:9999});expect(job.reservedBy).toBe(p.id);expect(p.jobId).toBe(job.id);
  expect(p.skills.plants).toEqual(skill);expect(w.resources.includes(source)).toBe(true);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.piles).toEqual(piles);
  if(prepared){expect(prepared.pile).toEqual(wrapper);expect(job.tree?.kind).toBe('replant');}
  const delta=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(delta.status).toBe('applied');if(delta.status==='applied')expect(delta.world).toEqual(w);
 }
 exact(w);
 // True loss of an existing stack frees the cell. Preview failure consumed no
 // authoritative draws; level8 full-grown10berries use two common draws.
 const blocker=w.piles.find(i=>i.item==='wood'&&i.owner.type==='ground'&&i.owner.x===source.x&&i.owner.z===source.z)!;
 expect(damagePile(w,blocker,1000,'bullet')).toBe(true);exact(w);const afterSpace=deserializeWorld(serializeWorld(w));
 until(w,()=>!w.resources.some(r=>r.id===source.id));until(afterSpace,()=>!afterSpace.resources.some(r=>r.id===source.id));expect(afterSpace).toEqual(w);
 expect(w.piles.filter(i=>i.item==='berries').reduce((n,i)=>n+i.quantity,0)).toBe(10);expect(w.rng).toBe(twoDrawState(rng));expect(job.clearance).toBeUndefined();
 // Preparation/extraction never harvest the boxed original. It is still the
 // identical original and wrapper at the instant the destination cut resolves.
 if(prepared){expect(w.piles.find(i=>i.id===prepared.pile.id)).toBe(prepared.pile);expect(prepared.pile.innerResource).toEqual(wrapper!.innerResource);}
 exact(w);
});
/** Saturation is declared preparation. The claimant reaches the producer and
 * pays all work normally before the first output refusal. */
function blockedDirectCut(crop=false){
 const w=medicalCamp(2),p=w.pawns[0]!;Object.assign(p,{x:8,z:10,name:'Salomé'});
 p.priorities.gather=1;p.priorities.build=1;p.skills.plants={level:8,xp:0,dailyXp:0,passion:0};
 const source:Resource={id:w.nextId++,kind:crop?'rice':'berries',...crop?{}:{species:'berry-bush' as const},x:12,z:10,amount:crop?6:10,growth:crop?.7:1,growthTick:w.tick};
 // This real heavy source lets the queued wall start its clearance before
 // material delivery; an empty unpaid blueprint is not a valid work order.
 const foreignSource:Resource={id:w.nextId++,kind:'tree',x:2,z:2,amount:46};w.resources=[source,foreignSource];prepareConstructionFlora(w);
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
 refreshStock(w);w.rng=42;exact(w);
 expect(applyCommand(w,{type:'designate',kind:'cut',x:source.x,z:source.z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='cut')!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 // A real foreign queued construction must remain reserved for this actor.
 expect(applyCommand(w,{type:'designate',kind:'wall',material:'wood',x:foreignSource.x,z:foreignSource.z}).ok).toBe(true);
 const foreign=w.jobs.find(j=>j.kind==='wall')!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:foreign.id,queue:true}).ok).toBe(true);
 until(w,()=>job.progress===(crop?19:59)&&job.workRemainder===9999);
 expect(p.jobId).toBe(job.id);expect(job.reservedBy).toBe(p.id);expect(p.orders.active).toBe(job.id);expect(p.orders.queue).toEqual([foreign.id]);
 expect(p.skills.plants!.xp).toBeGreaterThan(0);return {w,p,source,job,foreign};
}

test('V352 current direct CUT retains its paid claim for60 wait ticks and exact RAW deltas, then resolves once after real pile damage',()=>{
 const {w,p,source,job,foreign}=blockedDirectCut(),copy=deserializeWorld(serializeWorld(w)),skill=structuredClone(p.skills.plants),rng=w.rng,nextId=w.nextId,piles=structuredClone(w.piles);
 const readBefore=structuredClone(w);
 expect(specificWorkActivity(w,p)).toBe('En attente · place pour les produits de la coupe');
 expect(queryJobStatus(w,job)).toMatchObject({code:'blocked',reason:'Attend de la place pour les produits de la coupe.'});
 expect(actionProgress(w,p)).toEqual({kind:'job',completed:59.9999,total:60,fraction:59.9999/60});expect(w).toEqual(readBefore);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
 for(let n=1;n<=60;n++){
  stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(job).toMatchObject({progress:59,workRemainder:9999,status:'active',reservedBy:p.id});expect(p.jobId).toBe(job.id);expect(p.orders.active).toBe(job.id);expect(p.orders.queue).toEqual([foreign.id]);
  expect(p.skills.plants).toEqual(skill);expect(w.resources.includes(source)).toBe(true);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.piles).toEqual(piles);
  const delta=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(delta.status).toBe('applied');if(delta.status==='applied')expect(delta.world).toEqual(w);
 }
 exact(w);const blocker=w.piles.find(i=>i.item==='wood'&&i.owner.type==='ground'&&i.owner.x===source.x&&i.owner.z===source.z)!;
 expect(damagePile(w,blocker,1000,'bullet')).toBe(true);exact(w);const afterSpace=deserializeWorld(serializeWorld(w));
 until(w,()=>!w.resources.some(r=>r.id===source.id));until(afterSpace,()=>!afterSpace.resources.some(r=>r.id===source.id));expect(afterSpace).toEqual(w);
 expect(p.skills.plants).toEqual(skill);expect(w.rng).toBe(twoDrawState(rng));expect(w.piles.filter(i=>i.item==='berries').reduce((n,i)=>n+i.quantity,0)).toBe(10);
 expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.jobs.some(j=>j.id===foreign.id)).toBe(true);expect(p.orders.queue).toEqual([foreign.id]);exact(w);
});

test('V352 paid direct CUT wait can be cancelled by its own ID without erasing the foreign queued order or source',()=>{
 const {w,p,source,job,foreign}=blockedDirectCut(),skill=structuredClone(p.skills.plants),rng=w.rng,nextId=w.nextId,piles=structuredClone(w.piles);
 expect(applyCommand(w,{type:'cancel-job',jobId:job.id}).ok).toBe(true);
 expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.resources.includes(source)).toBe(true);expect(p.jobId).toBeNull();expect(p.orders.active).toBeNull();expect(p.orders.queue).toEqual([foreign.id]);
 expect(w.jobs.find(j=>j.id===foreign.id)).toBe(foreign);expect(foreign.reservedBy).toBe(p.id);expect(p.skills.plants).toEqual(skill);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.piles).toEqual(piles);exact(w);
});

test('V352 real infection at the paid direct crop CUT boundary survives interruption, strict adoption and a zero-product resume without new work or draws',()=>{
 const {w,p,source,job}=blockedDirectCut(true),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 expect(job).toMatchObject({progress:19,workRemainder:9999});expect(jobDuration(w,job)).toBe(20);
 expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
 expect(infectCrop(w,source,123)).toBe(true);expect(source.blight).toBeDefined();expect(jobDuration(w,job)).toBe(20);exact(w);
 const infected=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(infected.status).toBe('applied');if(infected.status==='applied')expect(infected.world).toEqual(w);
 const skill=structuredClone(p.skills.plants),rng=w.rng,nextId=w.nextId,piles=structuredClone(w.piles);
 // This is the real player interruption boundary; no counter is fabricated.
 expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);
 expect(p.jobId).toBeNull();expect(job).toMatchObject({status:'pending',reservedBy:null,progress:19,workRemainder:9999});expect(jobDuration(w,job)).toBe(20);exact(w);
 const interrupted=decoder.adopt(structuredClone(encoder.encode(w,0,1,false)));expect(interrupted.status).toBe('applied');if(interrupted.status==='applied')expect(interrupted.world).toEqual(w);
 const copy=deserializeWorld(serializeWorld(w));
 expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 expect(applyCommand(copy,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 for(let n=0;n<60&&w.resources.some(r=>r.id===source.id);n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);}
 expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(w.jobs.some(j=>j.id===job.id)).toBe(false);
 expect(p.skills.plants).toEqual(skill);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.piles).toEqual(piles);exact(w);
});
