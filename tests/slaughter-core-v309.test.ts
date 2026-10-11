import { expect,test } from 'vitest';
import { animalHandlingClaimed,animalHandlingHolding,processHandling } from '../src/sim/animal-handling.ts';
import { designateSlaughter,processSlaughter,slaughterHandlerAvailable,slaughterProposal,slaughterWanted,startSlaughter,SLAUGHTER_WORK_TICKS,type SlaughterTask } from '../src/sim/animal-slaughter.ts';
import { advanceCorpses,corpseYield } from '../src/sim/corpses.ts';
import { reconcileDomesticWork } from '../src/sim/domestic-reconcile.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { planWork } from '../src/sim/work-planner.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { applyMeleeStun } from '../src/sim/stun.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { refreshStock } from '../src/sim/materials.ts';
import type { World } from '../src/sim/types.ts';
import { huntingCamp } from './scenarios/hunting.ts';

function camp(){
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];world.resources=[];world.piles=[];world.stockpiles=[];world.structures=[];
  delete pawn.background;pawn.priorities.hunt=0;pawn.priorities.handle=1;
  pawn.skills.animals={level:0,xp:0,dailyXp:0,passion:0};
  Object.assign(animal,{x:pawn.x+1,z:pawn.z,food:.2,rest:1,nextDecision:world.tick+80,path:[],motion:undefined});
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick};
  refreshStock(world);expect(validateWorld(world)).toEqual([]);
  return {world,pawn,animal};
}
function begin(world:World){
  const pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:true})).toEqual({ok:true});
  const proposal=slaughterProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()));
  expect(proposal).toBeDefined();startSlaughter(pawn,proposal!);return pawn.animalHandling as SlaughterTask;
}
function context(world:World){
  const pawn=world.pawns[0]!;
  return {search:()=>null,candidates:()=>null,blocked:()=>blockedCells(world),move:()=>{throw Error('Unexpected movement in physical contact fixture');},release:()=>releaseWork(world,pawn),event:()=>{}};
}
function gesture(world:World){processHandling(world,world.pawns[0]!,context(world));}

test('manual domestic designation requires ownership, takes no weapon, food or skill minimum, and cancels without damage or RNG',()=>{
  const {world,pawn,animal}=camp(),rng=world.rng;
  expect(slaughterWanted(world,pawn)).toBe(false);
  const domestic=animal.domestic;delete animal.domestic;
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:true}).ok).toBe(false);
  animal.domestic=domestic;const task=begin(world);
  expect(slaughterHandlerAvailable(pawn)).toBe(true);expect(world.piles).toEqual([]);
  gesture(world);expect(task.progress).toBe(1);expect(animal.health).toBeUndefined();
  expect(world.filth?.items.filter(f=>f.kind==='blood')??[]).toEqual([]);
  expect(animalHandlingClaimed(world,animal.id)).toBe(true);expect(animalHandlingHolding(world,animal.id)).toBe(true);
  expect(designateSlaughter(world,{type:'slaughter',animalId:animal.id,enabled:false})).toEqual({ok:true});
  expect(pawn.animalHandling).toBeUndefined();expect(animal.domestic!.slaughter).toBeUndefined();
  expect(animal.health).toBeUndefined();expect(world.rng).toBe(rng);expect(world.piles).toEqual([]);
  expect(world.filth?.items.filter(f=>f.kind==='blood')??[]).toEqual([]);
});

test('a pacifist and a handler without manipulation cannot begin or finish an abattage',()=>{
  const {world,pawn,animal}=camp();
  const task=begin(world);gesture(world);
  pawn.background={childhood:'quiet-child'};
  expect(slaughterHandlerAvailable(pawn)).toBe(false);gesture(world);
  expect(pawn.animalHandling).toBeUndefined();expect(animal.health).toBeUndefined();expect(task.progress).toBe(1);
  delete pawn.background;pawn.health=createMedicalRecord(world.tick);
  pawn.health.missing.push({part:'left-arm',bornAt:world.tick,tended:true},{part:'right-arm',bornAt:world.tick,tended:true});
  expect(slaughterHandlerAvailable(pawn)).toBe(false);expect(slaughterWanted(world,pawn)).toBe(false);
});

test('two handlers and medical, feed, milk or rope claims share the same animal identity',()=>{
  const {world,pawn,animal}=camp(),other=structuredClone(pawn);other.id=world.nextId++;world.pawns.push(other);
  const task=begin(world);
  expect(slaughterProposal(world,other,reachableCells(world,other,blockedCells(world),new Set()))).toBeUndefined();
  releaseWork(world,pawn);
  other.animalCare={animalId:animal.id,spot:{x:other.x,z:other.z},phase:'approach',progress:0};
  expect(slaughterWanted(world,pawn)).toBe(false);delete other.animalCare;
  other.animalFeed={animalId:animal.id,sourcePileId:0,carryPileId:null,quantity:0,phase:'pickup',progress:0,spot:{x:other.x,z:other.z}};
  expect(slaughterWanted(world,pawn)).toBe(false);delete other.animalFeed;
  for(const kind of ['milk','lead'] as const){other.animalHandling={...task,kind};expect(slaughterWanted(world,pawn)).toBe(false);}
  delete other.animalHandling;expect(slaughterWanted(world,pawn)).toBe(true);
});

test('progress and holding require finished movement and a real contact, including legal diagonal contact',()=>{
  const {world,pawn,animal}=camp(),task=begin(world);
  animal.motion={from:{x:animal.x,z:animal.z-1},to:{x:animal.x,z:animal.z},start:world.tick,end:world.tick+1};
  gesture(world);expect(task.progress).toBe(0);expect(animalHandlingHolding(world,animal.id)).toBe(false);
  world.tick++;gesture(world);expect(task.progress).toBe(1);
  animal.z=pawn.z+1;gesture(world);expect(task.progress).toBe(2);expect(animalHandlingHolding(world,animal.id)).toBe(true);
  world.tiles[pawn.z*world.width+animal.x]={terrain:'rock'};
  world.tiles[animal.z*world.width+pawn.x]={terrain:'rock'};
  expect(animalHandlingHolding(world,animal.id)).toBe(false);
  let moved=false;processSlaughter(world,pawn,task,{...context(world),move:()=>{moved=true;}});
  expect(moved).toBe(true);expect(task.progress).toBe(0);expect(animal.health).toBeUndefined();
});

test.each(['draft','danger','designation','ownership','natural-death'] as const)('%s interrupts contact work without spending a kill',reason=>{
  const {world,pawn,animal}=camp();begin(world);gesture(world);const rng=world.rng;
  if(reason==='draft')pawn.draft={lastActiveTick:world.tick,target:null,queue:[]};
  if(reason==='danger')animal.burning={phase:'panic',remainingCore:100};
  if(reason==='designation')delete animal.domestic!.slaughter;
  if(reason==='ownership')delete animal.domestic;
  if(reason==='natural-death'){animal.health={...createMedicalRecord(world.tick),body:animal.species,death:{tick:world.tick,cause:'blood-loss'}};animal.state='dead';}
  gesture(world);expect(pawn.animalHandling).toBeUndefined();expect(world.rng).toBe(rng);
  expect(animal.health?.injuries.some(i=>i.kind==='execution-cut')??false).toBe(false);
  expect(animal.health?.death?.cause).toBe(reason==='natural-death'?'blood-loss':undefined);
});

test('abattage precedes other handling work and reaches one whole corpse only after all contact ticks',()=>{
  const {world,pawn,animal}=camp(),id=animal.id;animal.domestic!.slaughter=true;
  planWork(world,pawn,()=>blockedCells(world),new Set(),{remaining:4,pairs:32768});
  expect(pawn.animalHandling?.kind).toBe('slaughter');
  for(let i=1;i<SLAUGHTER_WORK_TICKS;i++){gesture(world);expect(animal.health?.death).toBeUndefined();}
  gesture(world);expect(animal.health!.death!.cause).toBe('execution');expect(pawn.animalHandling).toBeUndefined();
  const blood=world.filth!.items.filter(f=>f.kind==='blood');
  expect(blood).toHaveLength(1);expect(blood[0]).toMatchObject({x:animal.x,z:animal.z});
  expect(blood[0]!.thickness).toBeGreaterThanOrEqual(1);expect(blood[0]!.thickness).toBeLessThanOrEqual(2);
  expect(animal.health!.missing.some(i=>i.part==='neck')).toBe(false);
  advanceCorpses(world);advanceCorpses(world);reconcileDomesticWork(world);
  expect(world.wildlife!.animals.some(a=>a.id===id)).toBe(false);
  const corpse=world.piles.find(p=>p.id===id)!;
  expect(world.piles.filter(p=>p.id===id)).toHaveLength(1);expect(corpse.quantity).toBe(1);expect(corpse.owner.type).toBe('ground');
  const intact=structuredClone(corpse);intact.corpse!.health.injuries=[];
  expect(corpseYield(corpse)).toEqual(corpseYield(intact));
});

test('a newborn also leaves blood at contact without waiting for bleed ticks',()=>{
  const {world,animal}=camp();animal.ageTicks=0;begin(world);
  for(let i=0;i<SLAUGHTER_WORK_TICKS;i++)gesture(world);
  expect(animal.health!.death).toBeDefined();expect(world.filth!.items.filter(f=>f.kind==='blood').reduce((n,f)=>n+f.thickness,0)).toBeGreaterThanOrEqual(1);
});

test('the actual engine connects manual abattage to ordinary transport and butchering',()=>{
  const {world,pawn,animal}=camp(),id=animal.id;
  pawn.priorities.haul=2;pawn.priorities.cook=3;pawn.skills.cooking={level:8,xp:0,dailyXp:0,passion:0};
  expect(applyCommand(world,{type:'stockpile',x:8,z:8,enabled:true,filters:{wood:false,food:false,corpse:true}}).ok).toBe(true);
  expect(applyCommand(world,{type:'designate',kind:'butcher-spot',x:8,z:10}).ok).toBe(true);
  const spot=world.structures.find(s=>s.kind==='butcher-spot')!;
  expect(applyCommand(world,{type:'bill-add',structureId:spot.id}).ok).toBe(true);
  expect(designateSlaughter(world,{type:'slaughter',animalId:id,enabled:true}).ok).toBe(true);
  for(let i=0;i<1800&&!world.butchery?.completed;i++)stepWorld(world);
  expect(world.butchery?.completed).toBe(1);expect(world.butchery!.meat).toBeGreaterThan(0);
  expect(world.piles.filter(p=>p.item==='hare-meat').reduce((n,p)=>n+p.quantity,0)).toBe(world.butchery!.meat);
  expect(world.piles.some(p=>p.id===id)).toBe(false);expect(world.wildlife!.animals.some(a=>a.id===id)).toBe(false);
});

for(const phase of ['approach','interact'] as const){
  test.each(['stun','manipulation'] as const)(`ordinary engine publishes canonical ${phase} interruption after %s`,reason=>{
    const {world,pawn,animal}=camp();
    if(phase==='approach')animal.x=pawn.x+5;
    begin(world);
    if(phase==='approach'){
      for(let i=0;i<30&&pawn.moveCooldown===0;i++)stepWorld(world);
      expect(pawn.moveCooldown).toBeGreaterThan(0);expect(pawn.animalHandling?.phase).toBe('approach');
    }else {gesture(world);expect(pawn.animalHandling?.progress).toBe(1);}
    if(reason==='stun')applyMeleeStun(world,pawn,world.tick*10);
    else {
      pawn.health=createMedicalRecord(world.tick);
      pawn.health.missing.push({part:'left-arm',bornAt:world.tick,tended:true},{part:'right-arm',bornAt:world.tick,tended:true});
    }
    const rng=world.rng;stepWorld(world);
    expect(pawn.animalHandling).toBeUndefined();expect(animal.domestic!.slaughter).toBe(true);
    expect(animal.health?.death).toBeUndefined();expect(world.rng).toBe(rng);
    expect(world.filth?.items.filter(f=>f.kind==='blood')??[]).toEqual([]);
    expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
    const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,1)));
    expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(decoded.world).toEqual(world);
    const other=structuredClone(pawn);other.id=world.nextId++;other.name='Remplaçant';
    delete other.stun;delete other.health;other.motion=null;other.moveCooldown=0;other.path=[];other.state='idle';
    world.pawns.push(other);expect(slaughterWanted(world,other)).toBe(true);
  });
}

test.each(['priority','draft'] as const)('paused %s command releases slaughter before any next tick or snapshot',reason=>{
  const {world,pawn,animal}=camp();begin(world);gesture(world);const rng=world.rng;
  const command=reason==='priority'?{type:'priority' as const,pawnId:pawn.id,work:'handle' as const,value:0}
    :{type:'draft' as const,pawnIds:[pawn.id],enabled:true};
  expect(applyCommand(world,command).ok).toBe(true);
  expect(pawn.animalHandling).toBeUndefined();expect(animal.domestic!.slaughter).toBe(true);
  expect(animal.health).toBeUndefined();expect(world.rng).toBe(rng);
  expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,1)))).toMatchObject({status:'applied'});
});
