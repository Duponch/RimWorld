import { prepareConstructionFlora } from './scenarios/construction-flora-v348';
import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {FLORA_DEFINITIONS,type PlantSpecies} from '../src/sim/biome-flora';
import {plantGrowth,choppable} from '../src/sim/plants';
import {gatherResource,clearingDuration,clearingKind} from '../src/sim/gathering';
import {actionProgress} from '../src/render/action-feedback';
import {constructionRecipe} from '../src/sim/construction-materials';
import type {Command,World,Resource} from '../src/sim/types';

// Declared 32-cell regression fixtures, not a reconstruction of the player's save.
function camp(species:PlantSpecies='oak',growth=.1,count=1){
  const w=medicalCamp(count);w.tick=2000;Object.assign(w.pawns[0]!,{x:8,z:10,name:'Salomé'});w.pawns[0]!.priorities.build=1;
  const def=FLORA_DEFINITIONS[species];w.resources.push({id:w.nextId++,kind:def.kind,species,x:12,z:10,amount:def.yield,growth,growthTick:w.tick});
  addMaterial(w,'wood',8,{type:'ground',x:7,z:10},'wood');refreshStock(w);prepareConstructionFlora(w);valid(w);return w;
}
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function until(w:World,done:()=>boolean,max=900){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toBe(true);valid(w);}
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const wall:Command={type:'designate',kind:'wall',material:'wood',x:12,z:10};
const floor:Command={type:'designate',kind:'lay-floor',floor:'wood-planks',x:12,z:10};
function accept(w:World,c:Command){expect(applyCommand(w,c).ok).toBe(true);valid(w);}
function replay(w:World,ticks=3){const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);valid(w);}

test.each(['wall','floor'] as const)('V348 a young typed oak is physically cut once before the paid %s can finish',kind=>{
  const w=camp(),tree=w.resources[0]!,sourceId=tree.id,p=w.pawns[0]!,rng=w.rng;expect(choppable(w,tree)).toBe(false);accept(w,kind==='wall'?wall:floor);
  expect(w.rng).toBe(rng);expect(w.resources[0]).toBe(tree);expect(w.jobs[0]?.clearance).toBeUndefined();
  until(w,()=>(w.jobs[0]?.clearance?.progress??0)>10);const job=w.jobs[0]!,progress=actionProgress(w,p)!;
  expect(progress).toMatchObject({kind:'clearing',total:clearingDuration(tree)});expect(progress.completed).toBeGreaterThan(0);expect(plantGrowth(w,tree)).toBeLessThan(.4);expect(wood(w)).toBe(8);
  let previous=job.clearance!.progress;for(let n=0;n<600&&w.resources.some(r=>r.id===sourceId);n++){stepWorld(w);const next=job.clearance?.progress;if(next!==undefined){expect(next).toBeGreaterThanOrEqual(previous);previous=next;}expect(wood(w)).toBe(8);}
  expect(w.resources.some(r=>r.id===sourceId)).toBe(false);until(w,()=>kind==='wall'?w.structures.some(s=>s.kind==='wall'):w.tiles[10*w.width+12]!.floor==='wood-planks');
  expect(w.jobs).toEqual([]);expect(wood(w)).toBe(kind==='wall'?3:5);expect(w.events.filter(e=>e.message.includes('a dégagé le chantier'))).toHaveLength(1);valid(w);
});

test('V348 harvestability is decided at real resolution, so an oak maturing during clearance retains its wood yield',()=>{
  const w=camp('oak',.399999999),tree=w.resources[0]!,id=tree.id;expect(clearingKind(w,tree)).toBe('cut');accept(w,wall);
  until(w,()=>!!w.jobs[0]?.clearance);until(w,()=>choppable(w,tree));expect(w.resources.some(r=>r.id===id)).toBe(true);expect(clearingKind(w,tree)).toBe('chop');
  until(w,()=>!w.resources.some(r=>r.id===id));expect(wood(w)).toBeGreaterThan(8);until(w,()=>w.structures.some(s=>s.kind==='wall'));expect(wood(w)).toBeGreaterThan(3);
});

test('V348 mature clearance reuses the literal chop producer, preserving quantity, placement and RNG',()=>{
  const a=camp('oak',1),b=deserializeWorld(serializeWorld(a));expect(clearingKind(a,a.resources[0]!)).toBe('chop');
  const expected=gatherResource(b,b.resources[0]!,'chop',undefined,b.pawns[0]!);const actual=gatherResource(a,a.resources[0]!,clearingKind(a,a.resources[0]!),undefined,a.pawns[0]!);
  refreshStock(a);refreshStock(b);expect(expected).toBeGreaterThan(0);expect(actual).toBe(expected);expect(a).toEqual(b);valid(a);
});

test('V348 an existing mid-clearance save resumes its original fields and finishes without resetting the cut cycle',()=>{
  const w=camp();accept(w,wall);until(w,()=>(w.jobs[0]?.clearance?.progress??0)>20);const jobId=w.jobs[0]!.id,clearance=structuredClone(w.jobs[0]!.clearance),copy=deserializeWorld(serializeWorld(w));
  expect(copy.jobs[0]!.clearance).toEqual(clearance);expect(copy.jobs[0]!.id).toBe(jobId);replay(w,5);stepWorld(copy,5);expect(copy).toEqual(w);
  until(w,()=>w.structures.some(s=>s.kind==='wall'));stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(wood(w)).toBe(3);
});

test('V348 cancelling a real unfinished cut releases the chantier without killing its immature tree or granting wood',()=>{
  const w=camp();accept(w,wall);until(w,()=>(w.jobs[0]?.clearance?.progress??0)>10);const tree=structuredClone(w.resources[0]),rng=w.rng;
  accept(w,{type:'cancel',x:12,z:10});expect(w.jobs).toEqual([]);expect(w.resources[0]).toEqual(tree);expect(wood(w)).toBe(8);expect(w.rng).toBe(rng);expect(w.pawns[0]!.jobId).toBeNull();expect(w.pawns[0]!.orders.active).toBeNull();replay(w,2);
});

test.each(['grass','tall-grass','brambles','moss'] as const)('V348 floor over %s skips preliminary cutting and removes the plant only at its paid finish',species=>{
  const w=camp(species,.5),id=w.resources[0]!.id;accept(w,floor);expect(w.resources.some(r=>r.id===id)).toBe(true);
  until(w,()=>w.jobs[0]?.construction==='frame'&&w.jobs[0].progress>0);expect(w.jobs[0]!.clearance).toBeUndefined();expect(w.resources.some(r=>r.id===id)).toBe(true);expect(w.tiles[10*w.width+12]!.floor).toBeUndefined();
  expect(w.piles.filter(p=>p.owner.type==='job').reduce((n,p)=>n+p.quantity,0)).toBe(constructionRecipe(w.jobs[0]!).ingredients[0]!.quantity);replay(w,0);
  until(w,()=>w.tiles[10*w.width+12]!.floor==='wood-planks');expect(w.resources.some(r=>r.id===id)).toBe(false);expect(wood(w)).toBe(5);expect(w.events.some(e=>e.message.includes('a dégagé le chantier'))).toBe(false);
});

test('V348 heavier agave still requires a real cut before a floor, while neighboring grass survives',()=>{
  const w=camp('agave',.5),id=w.resources[0]!.id,neighbor:Resource={id:w.nextId++,kind:'wild-plant',species:'grass',x:13,z:10,amount:0,growth:.5,growthTick:w.tick};w.resources.push(neighbor);prepareConstructionFlora(w);valid(w);accept(w,floor);
  until(w,()=>(w.jobs[0]?.clearance?.progress??0)>0);expect(w.resources.some(r=>r.id===id)).toBe(true);until(w,()=>w.tiles[10*w.width+12]!.floor==='wood-planks');
  expect(w.resources.some(r=>r.id===id)).toBe(false);expect(w.resources.find(r=>r.id===neighbor.id)).toBe(neighbor);expect(wood(w)).toBe(5);
});

test('V348 a floor cannot silently erase another actors real cutting claim',()=>{
  const w=camp('grass',.5,2),cutter=w.pawns[1]!;Object.assign(cutter,{x:11,z:9});cutter.priorities.gather=1;accept(w,{type:'designate',kind:'cut',x:12,z:10});const cut=w.jobs[0]!;
  accept(w,{type:'order-job',pawnId:cutter.id,jobId:cut.id,queue:false});const before=serializeWorld(w);expect(applyCommand(w,floor).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(w.resources).toHaveLength(1);expect(cutter.jobId).toBe(cut.id);
});
// Declared pre-fix accepted phase: current admission now skips this grass cut.
test('V348 an already saved grass clearance keeps its real elapsed work and replays before floor completion',()=>{
  const w=camp('grass',.5),p=w.pawns[0]!,grass=w.resources[0]!;accept(w,floor);const j=w.jobs[0]!;
  Object.assign(p,{x:11,z:10,state:'working',jobId:j.id,path:[]});p.orders.active=j.id;j.status='active';j.reservedBy=p.id;j.clearance={resourceId:grass.id,progress:12};valid(w);
  const copy=deserializeWorld(serializeWorld(w));expect(copy.jobs[0]!.clearance).toEqual(j.clearance);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(j.clearance?.progress).toBeGreaterThan(12);expect(w.resources.some(r=>r.id===grass.id)).toBe(true);expect(actionProgress(w,p)?.total).toBe(60);
  until(w,()=>w.tiles[10*w.width+12]!.floor==='wood-planks');stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(wood(w)).toBe(5);
});