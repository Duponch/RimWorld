import {expect,test} from 'vitest';
import {domesticColony} from './scenarios/domestic-colony.ts';
import {applyTaming,handlingProposal,startHandling} from '../src/sim/animal-handling.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {reconcileDomesticWork} from '../src/sim/domestic-reconcile.ts';
import {expireFood} from '../src/sim/food-expiration.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {TICKS_PER_DAY} from '../src/sim/types.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';

type Kind='care'|'handle';
function begin(kind:Kind){
  const w=domesticColony(),p=w.pawns[0]!,target=w.wildlife!.animals[kind==='care'?1:0]!;
  if(kind==='care'){
    p.priorities.handle=0;target.state='sleeping';target.rest=.2;
  }else{
    p.priorities.doctor=0;
    expect(applyTaming(w,{type:'tame',animalId:target.id,enabled:true}).ok).toBe(true);
  }
  for(let i=0;i<180;i++){
    stepWorld(w);
    const task=kind==='care'?p.animalCare:p.animalHandling;
    if(task?.phase==='approach'&&p.moveCooldown>0&&
      (kind==='care'?!!p.animalCare?.medicine?.carryPileId:!!p.animalHandling?.carryPileId)){
      expect(validateWorld(w)).toEqual([]);
      return {w,p,target,task};
    }
  }
  throw new Error(`${kind} did not carry a physical supply while travelling`);
}
function supply(w:World,pawnId:number):MaterialPile {
  const pile=w.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawnId);
  if(!pile)throw Error('Missing carried supply');
  return pile;
}
function count(w:World,item:MaterialPile['item']){return w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);}
function saved(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}

for(const kind of ['care','handle'] as const){
  test(`${kind}: a carried supply expiring during a real movement clears its claim without duplication`,()=>{
    const {w,p}=begin(kind),held=supply(w,p.id),id=held.id,item=held.item,total=count(w,item),rng=w.rng;
    held.rot={progress:ROT_DAYS[item as keyof typeof ROT_DAYS]*TICKS_PER_DAY,atTick:w.tick};
    // The engine expires supplies before the travelling worker can resume.
    stepWorld(w);
    expect(kind==='care'?p.animalCare:p.animalHandling).toBeUndefined();
    expect(w.piles.some(p=>p.id===id)).toBe(false);
    expect(count(w,item)).toBe(total-held.quantity);
    expect(w.spoiled[item as keyof typeof ROT_DAYS]).toBeGreaterThanOrEqual(held.quantity);
    expect(w.rng).toBe(rng);
    saved(w);
  });
  test(`${kind}: destruction of a carried supply clears the task and preserves unrelated stock`,()=>{
    const {w,p}=begin(kind),held=supply(w,p.id),item=held.item,total=count(w,item),id=held.id;
    expect(damagePile(w,held,1000)).toBe(true);
    expect(kind==='care'?p.animalCare:p.animalHandling).toBeUndefined();
    expect(w.piles.some(p=>p.id===id)).toBe(false);
    expect(count(w,item)).toBe(total-held.quantity);
    saved(w);
  });
}

test('expiry of a reserved ground source releases a handler before pickup',()=>{
  const w=domesticColony(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  p.priorities.doctor=0;expect(applyTaming(w,{type:'tame',animalId:a.id,enabled:true}).ok).toBe(true);
  startHandling(p,handlingProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()))!);
  expect(p.animalHandling?.phase).toBe('pickup');
  const source=w.piles.find(i=>i.id===p.animalHandling!.sourcePileId)!;
  source.rot={progress:ROT_DAYS.berries*TICKS_PER_DAY,atTick:w.tick};
  stepWorld(w);
  expect(p.animalHandling).toBeUndefined();
  expect(w.piles.some(i=>i.id===source.id)).toBe(false);
  saved(w);
});

test('death and corpse replacement release a travelling veterinarian before saving the original identity',()=>{
  const {w,p,target}=begin('care'),held=supply(w,p.id),id=target.id,total=count(w,held.item);
  target.health!.tick=w.tick;target.health!.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(target.health!);target.state='dead';
  advanceCorpses(w);reconcileDomesticWork(w);
  expect(w.wildlife!.animals.some(a=>a.id===id)).toBe(false);
  expect(w.piles.find(i=>i.id===id)?.corpse?.animalId).toBe(id);
  expect(p.animalCare).toBeUndefined();
  expect(count(w,held.item)).toBe(total);
  saved(w);
});

test('last tameness loss releases a travelling veterinarian and returns unused medicine',()=>{
  const {w,p,target}=begin('care'),held=supply(w,p.id),total=count(w,held.item),id=target.id;
  target.domestic!.tameness=1;target.domestic!.nextDecay=w.tick+1;
  stepWorld(w);
  expect(w.wildlife!.animals.find(a=>a.id===id)).toBe(target);
  expect(target.domestic).toBeUndefined();
  expect(p.animalCare).toBeUndefined();
  expect(count(w,held.item)).toBe(total);
  saved(w);
});
