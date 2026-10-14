import {expect,test} from 'vitest';
import {treeTransferScene,preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import {extractTreeReason,replantTreeReason,isMinifiedTree} from '../src/sim/tree-transfer';
import {extractTreeDefinition} from '../src/sim/tree-transfer-rules';
import {actionProgress} from '../src/render/action-feedback';
import {workType} from '../src/sim/work-types';
import {treeJobsForResource} from '../src/sim/tree-transfer';
import {mapObjectActions} from '../src/ui/map-object-actions';
import {addMaterial,refreshStock} from '../src/sim/materials';
import {fixtureBuilding} from './scenarios/deconstruction';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import {newShelfStorage} from '../src/sim/shelf-storage';
import type {Command,World} from '../src/sim/types';

function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function accept(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});valid(w);}
function until(w:World,done:()=>boolean,max=700){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns,piles:w.piles,resources:w.resources})).toBe(true);valid(w);}
function replay(w:World,ticks=3){const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);valid(w);}
const wrapper=(w:World)=>w.piles.find(isMinifiedTree);
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);

// Actual command / planner / movement / work tests, all in declared 32-cell scenes.
test.each(['oak','poplar','pine','birch','drago'] as const)('V349 young %s is extracted once, physically carried and replanted with its original ID',species=>{
  const w=treeTransferScene(species,.1),source=w.resources[0]!,sourceId=source.id,worker=w.pawns[0]!,damage=source.damage;
  valid(w);expect(extractTreeReason(w,source)).toBeUndefined();const before=serializeWorld(w),rng=w.rng,nextId=w.nextId;expect(extractTreeDefinition(source)).toBeDefined();expect(serializeWorld(w)).toBe(before);
  accept(w,{type:'extract-tree',resourceId:sourceId});expect(source.damage).toBe(damage);expect(w.resources[0]).toBe(source);expect(wrapper(w)).toBeUndefined();expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId+1);
  const extract=w.jobs.find(j=>j.kind==='extract-tree')!;expect(workType(extract)).toBe('gather');until(w,()=>extract.progress>10);expect(actionProgress(w,worker)?.total).toBe(extractTreeDefinition(source)!.workCore);replay(w,3);
  until(w,()=>!!wrapper(w));const pile=wrapper(w)!,wrapperId=pile.id,packedAt=pile.plantPack.packedAt,captured=structuredClone(pile.innerResource);
  expect(pile.innerResource).toBe(source);expect(pile.innerResource.id).toBe(sourceId);expect(pile.innerResource.damage).toBe(damage);expect(w.resources.some(r=>r.id===sourceId)).toBe(false);expect(wood(w)).toBe(0);expect(pile.quantity).toBe(1);expect(pile.plantPack.expiresAt-packedAt).toBe(42000);replay(w,3);
  expect(replantTreeReason(w,pile,{x:20,z:14})).toBeUndefined();accept(w,{type:'replant-tree',pileId:wrapperId,x:20,z:14});const replant=w.jobs.find(j=>j.kind==='replant-tree')!;expect(workType(replant)).toBe('grow');
  until(w,()=>wrapper(w)?.owner.type==='pawn');expect(wrapper(w)!.id).toBe(wrapperId);expect(wrapper(w)!.innerResource).toEqual(captured);expect(wrapper(w)!.plantPack.packedAt).toBe(packedAt);expect(w.resources.some(r=>r.id===sourceId)).toBe(false);replay(w,3);
  until(w,()=>w.resources.some(r=>r.id===sourceId&&r.x===20&&r.z===14));const tree=w.resources.find(r=>r.id===sourceId)!;expect(tree).toBe(source);expect(tree.damage).toBe(damage);expect(tree.species).toBe(species);expect(tree.growth).toBe(captured.growth);expect(w.piles.some(p=>p.id===wrapperId)).toBe(false);expect(w.jobs.some(j=>j.kind==='extract-tree'||j.kind==='replant-tree')).toBe(false);expect(wood(w)).toBe(0);expect(tree.plantLife?.since).toBe(captured.plantLife?.since);expect(tree.plantLife?.bornAt).toBe(captured.plantLife?.bornAt);replay(w,3);
});

test('V349 legacy TreeBase retains its original representation through extraction and replantation',()=>{
  const w=treeTransferScene(null),source=w.resources[0]!,id=source.id;valid(w);accept(w,{type:'extract-tree',resourceId:id});until(w,()=>!!wrapper(w));const pile=wrapper(w)!;expect(pile.innerResource).toBe(source);expect(Object.hasOwn(source,'species')).toBe(false);expect(Object.hasOwn(source,'growth')).toBe(false);expect(Object.hasOwn(source,'plantLife')).toBe(false);replay(w,3);
  accept(w,{type:'replant-tree',pileId:pile.id,x:20,z:14});until(w,()=>w.resources.some(r=>r.id===id&&r.x===20));expect(w.resources.find(r=>r.id===id)).toBe(source);expect(Object.hasOwn(source,'growthTick')).toBe(false);replay(w,3);
});

test.each(['saguaro','agave','berry-bush','grass','tall-grass','moss','brambles','healroot-wild'] as const)('V349 refuses extracting %s without replacing it with a cut',species=>{
  const w=treeTransferScene(species,1),source=w.resources[0]!,before=serializeWorld(w);valid(w);expect(extractTreeReason(w,source)).toBeTruthy();expect(applyCommand(w,{type:'extract-tree',resourceId:source.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(w.resources[0]).toBe(source);expect(wrapper(w)).toBeUndefined();
});

test('V349 a plant order remains available under a wall ghost and targeted cancellation preserves the other layer',()=>{
  const w=treeTransferScene('oak',1),source=w.resources[0]!;valid(w);accept(w,{type:'designate',kind:'wall',material:'wood',x:source.x,z:source.z});const wallId=w.jobs.find(j=>j.kind==='wall')!.id;
  const actions=mapObjectActions(w,{kind:'resource',id:source.id});expect(actions.some(a=>a.id==='chop')).toBe(true);expect(actions.some(a=>a.id==='cut')).toBe(true);expect(actions.some(a=>a.id==='extract')).toBe(true);
  accept(w,{type:'extract-tree',resourceId:source.id});expect(treeJobsForResource(w,source.id).some(j=>j.kind==='extract-tree')).toBe(true);replay(w,0);
  accept(w,{type:'cancel-resource',resourceId:source.id});expect(w.jobs.some(j=>j.id===wallId)).toBe(true);expect(treeJobsForResource(w,source.id)).toEqual([]);expect(w.resources[0]).toBe(source);expect(wrapper(w)).toBeUndefined();
  accept(w,{type:'extract-tree',resourceId:source.id});const extractId=w.jobs.find(j=>j.kind==='extract-tree')!.id;accept(w,{type:'cancel-job',jobId:wallId});expect(w.jobs.some(j=>j.id===extractId)).toBe(true);expect(w.jobs.some(j=>j.id===wallId)).toBe(false);replay(w,2);
});

test('V349 extraction promised under a wall wins source custody once; the builder waits instead of cutting it concurrently',()=>{
  const w=treeTransferScene('oak',.1),source=w.resources[0]!,cutter=w.pawns[0]!,builder=w.pawns[1]!;Object.assign(builder,{x:8,z:12});builder.priorities.build=1;addMaterial(w,'wood',5,{type:'ground',x:7,z:12},'wood');refreshStock(w);valid(w);
  accept(w,{type:'designate',kind:'wall',material:'wood',x:source.x,z:source.z});accept(w,{type:'extract-tree',resourceId:source.id});until(w,()=>w.jobs.find(j=>j.kind==='extract-tree')?.reservedBy===cutter.id);
  expect(w.jobs.find(j=>j.kind==='wall')?.clearance).toBeUndefined();until(w,()=>!!wrapper(w));expect(wrapper(w)!.innerResource.id).toBe(source.id);expect(wood(w)).toBe(5);expect(w.events.some(e=>e.message.includes('a dégagé le chantier'))).toBe(false);replay(w,1);
});

test.each(['rock','water','roof','another-tree','wall-ghost'] as const)('V349 replant refuses %s without consuming a source wrapper',mode=>{
  const {w,pile}=preparedTreeWrapper();const target={x:20,z:14};if(mode==='rock')w.tiles[target.z*w.width+target.x]={terrain:'rock',stone:'granite'};if(mode==='water')w.tiles[target.z*w.width+target.x]={terrain:'water'};
  if(mode==='roof')w.roofing={constructed:[target.z*w.width+target.x],build:[],remove:[],cursor:0};
  if(mode==='another-tree'){w.resources.push({...structuredClone(pile.innerResource),id:w.nextId++,...target});w.flora!.capacity++;}
  if(mode==='wall-ghost')accept(w,{type:'designate',kind:'wall',material:'wood',...target});const before=JSON.stringify(w);expect(replantTreeReason(w,pile,target)).toBeTruthy();expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,...target}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);expect(w.piles[0]).toBe(pile);
});

test('V349 cancellation while a wrapper is carried keeps a single physical tree and its original deadline',()=>{
  const {w,pile}=preparedTreeWrapper();valid(w);accept(w,{type:'replant-tree',pileId:pile.id,x:24,z:20});until(w,()=>pile.owner.type==='pawn'&&!!w.pawns[0]!.motion&&w.pawns[0]!.motion!.end>w.tick);const job=w.jobs.find(j=>j.kind==='replant-tree')!;
  const worker=w.pawns[0]!,motion=structuredClone(worker.motion),deadline=pile.plantPack.expiresAt;
  accept(w,{type:'cancel-job',jobId:job.id});expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(pile.owner.type).toBe('pawn');expect(worker.interruptedCargo).toBe(true);expect(worker.motion).toEqual(motion);expect(pile.plantPack.expiresAt).toBe(deadline);replay(w,0);
  until(w,()=>pile.owner.type==='ground');expect(w.piles.filter(p=>p.item==='minified-tree')).toEqual([pile]);expect(pile.plantPack.expiresAt).toBe(deadline);expect(w.resources.some(r=>r.id===pile.innerResource.id)).toBe(false);expect(worker.interruptedCargo).toBeUndefined();replay(w,3);
});

test('V349 ordinary transport into a real shelf preserves the wrapper and inner identities',()=>{
  const {w,pile}=preparedTreeWrapper(),worker=w.pawns[0]!;worker.priorities.gather=0;worker.priorities.grow=0;worker.priorities.haul=1;
  const base=fixtureBuilding(w,'small-shelf',20,14),shelf=w.structures.find(s=>s.id===base.id)!;shelf.material='wood';delete shelf.quality;shelf.shelf=newShelfStorage([w.nextId++]);shelf.shelf.settings.filters={...shelf.shelf.settings.filters,plant:true};shelf.shelf.settings.items={'minified-tree':true};shelf.shelf.settings.priority=3;refreshStock(w);valid(w);
  const ids=[pile.id,pile.innerResource.id],deadline=pile.plantPack.expiresAt;until(w,()=>pile.owner.type==='pawn');expect([pile.id,pile.innerResource.id]).toEqual(ids);replay(w,3);until(w,()=>pile.owner.type==='ground'&&pile.owner.x===20&&pile.owner.z===14);expect([pile.id,pile.innerResource.id]).toEqual(ids);expect(pile.plantPack.expiresAt).toBe(deadline);expect(w.piles.filter(p=>p.item==='minified-tree')).toEqual([pile]);replay(w,3);
});


test('V349 the Grower clears physical grass at the replant destination before putting back the original tree',()=>{
  const {w,pile}=preparedTreeWrapper(),treeId=pile.innerResource.id,grass={id:w.nextId++,kind:'wild-plant' as const,species:'grass' as const,x:20,z:14,amount:0,growth:.5,growthTick:w.tick};w.resources.push(grass);prepareConstructionFlora(w);valid(w);
  accept(w,{type:'replant-tree',pileId:pile.id,x:20,z:14});expect(w.resources.some(r=>r.id===grass.id)).toBe(true);expect(pile.owner.type).toBe('ground');
  until(w,()=>!!w.jobs.find(j=>j.kind==='replant-tree')?.clearance);const job=w.jobs.find(j=>j.kind==='replant-tree')!;expect(job.tree).toMatchObject({kind:'replant',phase:'carry',workCore:0});expect(pile.owner.type).toBe('pawn');expect(w.resources.some(r=>r.id===grass.id)).toBe(true);replay(w,3);
  until(w,()=>w.resources.some(r=>r.id===treeId));expect(w.resources.some(r=>r.id===grass.id)).toBe(false);expect(w.resources.find(r=>r.id===treeId)).toMatchObject({x:20,z:14});expect(wood(w)).toBe(0);expect(w.piles.some(p=>p.id===pile.id)).toBe(false);replay(w,3);
});
