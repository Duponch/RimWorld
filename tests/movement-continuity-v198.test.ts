import { expect,test,vi } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index.ts';
import { animalNavigation } from '../src/sim/wildlife-navigation.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { preparePredationDemo } from '../scripts/create-test-save-predation-v190.ts';
import { foodWorkstationCamp,fixtureFoodStation } from './scenarios/food-workstations.ts';
import type { World,Structure } from '../src/sim/types.ts';

function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function until(w:World,done:()=>boolean,limit=4000){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done()).toBe(true);valid(w);}
function congestedPredation(block=false,empty=false){
  const w=preparePredationDemo(),[fox,prey]=w.wildlife!.animals;
  until(w,()=>!!fox!.predation&&!!fox!.motion,10);
  while(w.tick+1<fox!.motion!.end)stepWorld(w);
  const decision=w.tick+1;
  w.wildlife!.animals=decision%2===0?[prey!,fox!]:[fox!,prey!];
  fox!.nextDecision=decision;prey!.nextDecision=decision;prey!.food=0;
  // Prepared moving-target boundary: prey owns the first query this tick.
  prey!.x=23;prey!.z=12;prey!.path=[];delete prey!.motion;prey!.state='idle';
  if(empty)fox!.path=[];
  const next=fox!.path[0]&&{...fox!.path[0]};
  if(block&&next)w.tiles[next.z*w.width+next.x]={terrain:'rock'};
  valid(w);return {w,fox:fox!,prey:prey!,next};
}
test('a predator keeps a safe route prefix when another animal spends the principal search budget',()=>{
  const {w,fox,prey,next}=congestedPredation(),before=structuredClone(fox.motion!),resumed=deserializeWorld(serializeWorld(w));
  expect(next).toBeDefined();expect(animalNavigation(w,false,true).step(fox,next!)).toBe(true);
  const query=vi.spyOn(WeightedSearch.prototype,'advance');
  try {stepWorld(w);expect(query).toHaveBeenCalledTimes(0); // no food/contact goal exists for the hungry domestic hare
    expect(prey.nextDecision).toBeGreaterThan(w.tick);expect(fox.motion!.start).not.toBe(before.start);expect(fox.motion!.to).toEqual(next);
    expect(fox.predation?.targetId).toBe(prey.id);valid(w);
  } finally {query.mockRestore();}
  stepWorld(resumed);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
});
test.each([{block:true,empty:false},{block:false,empty:true}])('a deferred predator query cannot move through a blocker or invent a missing route (%j)',({block,empty})=>{
  const {w,fox}=congestedPredation(block,empty),before=structuredClone(fox.motion);
  stepWorld(w);expect(fox.motion).toEqual(before);expect(fox.path).toEqual([]);valid(w);
});

for(const art of [false,true])for(const invalidate of [false,true])test(`a completed ${art?'sculpture':'meal'} physically reaches a free drop cell beyond the occupied neighbours${invalidate?' after the first destination becomes occupied':''}`,()=>{
  const w=foodWorkstationCamp(),p=w.pawns[0]!;
  p.priorities[art?'art':'cook']=1;p.skills.artistic={level:8,xp:0,dailyXp:0,passion:1};
  const station:Structure=art?{id:w.nextId++,kind:'art-bench',x:12,z:12,orientation:0,footprint:'standard',material:'wood',bills:[]}:fixtureFoodStation(w,'fueled-stove');
  if(art)w.structures.push(station);else station.fuel!.ticks=6000;
  addGroundMaterial(w,art?'wood':'food',art?50:10,{x:6,z:6},art?'wood':'rice');
  expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:art?'small-sculpture':'simple-meal'})).toMatchObject({ok:true});
  station.bills![0]!.destination='drop';
  until(w,()=>p.cooking?.phase==='output');
  const id=p.cooking!.productId!,getOwner=(world:World)=>art?world.packed.find(pack=>pack.building.id===id)!.owner:world.piles.find(pile=>pile.id===id)!.owner;
  expect(getOwner(w)).toEqual({type:'pawn',pawnId:p.id});
  for(const c of [{x:p.x,z:p.z},{x:p.x-1,z:p.z},{x:p.x+1,z:p.z},{x:p.x,z:p.z-1},{x:p.x,z:p.z+1}])
    addGroundMaterial(w,'wood',75,c,'wood');
  valid(w);const origin={x:p.x,z:p.z},before=p.motion?.start;
  stepWorld(w);valid(w);expect(p.path.length).toBeGreaterThan(0);
  const rejected={...p.cooking!.actionCell};
  if(invalidate)addGroundMaterial(w,'wood',75,rejected,'wood');
  const resumed=deserializeWorld(serializeWorld(w));
  if(!invalidate){
    // A valid selected route needs no new field, even under a planning delay.
    p.planCooldown=20;resumed.pawns[0]!.planCooldown=20;
    const query=vi.spyOn(WeightedSearch.prototype,'advance');
    try {stepWorld(w);expect(query).not.toHaveBeenCalled();}finally{query.mockRestore();}
    stepWorld(resumed);expect(serializeWorld(resumed)).toBe(serializeWorld(w));valid(w);
  }
  for(let i=0;i<40&&getOwner(w).type==='pawn';i++){
    stepWorld(w);stepWorld(resumed);expect(serializeWorld(resumed)).toBe(serializeWorld(w));valid(w);
  }
  expect(p.motion?.start).not.toBe(before);expect({x:p.x,z:p.z}).not.toEqual(origin);
  const owner=getOwner(w);expect(owner.type).toBe('ground');
  if(owner.type==='ground'){
    expect(Math.abs(p.x-owner.x)+Math.abs(p.z-owner.z)).toBeLessThanOrEqual(1);
    if(invalidate)expect({x:owner.x,z:owner.z}).not.toEqual(rejected);
  }
  expect(p.cooking).toBeNull();
  expect(art?w.packed.filter(pack=>pack.building.id===id).length:w.piles.filter(pile=>pile.id===id).length).toBe(1);
});
