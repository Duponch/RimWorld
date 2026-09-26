import { expect,test } from 'vitest';
import { animalHandlingClaimed,animalHandlingHolding,applyTaming,advanceTameness,
  handlingProposal,handlingWanted,handlingStepDuration,HANDLING_FEED_TICKS,processHandling,startHandling,tameChance,TAMENESS_DECAY,TAME_COOLDOWN,TRAIN_COOLDOWN } from '../src/sim/animal-handling';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { blockedCells,reachableCells } from '../src/sim/pathfinding';
import { initialSkills,startingSkills } from '../src/sim/skills';
import { releaseWork } from '../src/sim/work-release';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { huntingCamp } from './scenarios/hunting';
import { domesticColony } from './scenarios/domestic-colony';
import type { World } from '../src/sim/types';

function camp(){
  const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  w.pawns=w.pawns.slice(0,1);p.priorities.hunt=0;p.priorities.handle=1;
  p.skills.animals={level:8,xp:0,dailyXp:0,passion:0};p.x=4;p.z=10;
  a.x=5;a.z=10;a.path=[];a.state='idle';a.food=0;a.motion=undefined;a.nextDecision=w.tick+80;
  addMaterial(w,'food',2,{type:'ground',x:p.x,z:p.z},'berries');
  return {w,p,a};
}
function begin(w:World){
  const p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  expect(applyTaming(w,{type:'tame',animalId:a.id,enabled:true})).toEqual({ok:true});
  expect(handlingWanted(w,p)).toBe(true);
  const proposal=handlingProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()));
  expect(proposal).toBeDefined();startHandling(p,proposal!);
  return {p,a};
}
function act(w:World){
  const p=w.pawns[0]!;
  processHandling(w,p,{search:()=>null,candidates:()=>null,blocked:()=>new Uint8Array(),
    move:()=>{throw Error('unnecessary movement in adjacent test');},release:()=>releaseWork(w,p),event:()=>{}});
  refreshStock(w);
  w.tick++;
}

test('old skills remain absent; new scenario handlers have explicit levels',()=>{
  expect(initialSkills().animals).toBeUndefined();
  expect([0,1,2].map(i=>startingSkills(i).animals?.level)).toEqual([8,4,2]);
  expect(HANDLING_FEED_TICKS).toBe(45);
  expect([0,1,2,3,4,5].map(step=>handlingStepDuration({kind:'tame',step}))).toEqual([27,27,45,27,45,35]);
  expect(handlingStepDuration({kind:'maintain',step:5})).toBe(10);
});

test('apprivoisement reserves and carries two raw foods, consumes only at two physical feeds, then rolls once',()=>{
  const {w,p,a}=camp();w.rng=1;const before=w.rng,source=w.piles.find(i=>i.item==='berries')!;
  begin(w);expect(animalHandlingClaimed(w,a.id)).toBe(true);expect(animalHandlingHolding(w,a.id)).toBe(false);
  expect(a.taming?.lastAttempt).toBeUndefined();expect(source.quantity).toBe(2);
  act(w);expect(a.taming?.lastAttempt).toBeUndefined();
  expect(w.piles.find(i=>i.id===source.id)?.owner).toMatchObject({type:'pawn',pawnId:p.id});
  expect(animalHandlingHolding(w,a.id)).toBe(false);
  while(p.animalHandling?.step===0)act(w);
  expect(a.taming?.lastAttempt).toBeUndefined();
  expect(p.animalHandling?.step).toBe(1);expect(w.rng).toBe(before);expect(a.food).toBe(0);
  while(p.animalHandling && p.animalHandling.step<3)act(w);
  expect(p.animalHandling).toMatchObject({step:3,quantity:1,carryPileId:source.id});
  expect(a.food).toBeCloseTo(.05);expect(w.piles.find(i=>i.id===source.id)?.quantity).toBe(1);
  while(p.animalHandling?.step!==5)act(w);
  expect(p.animalHandling).toMatchObject({step:5,quantity:0,carryPileId:null});
  expect(w.piles.find(i=>i.id===source.id)).toBeUndefined();expect(a.food).toBeCloseTo(.1);
  expect(w.rng).toBe(before);
  act(w);expect(a.taming?.lastAttempt).toBe(w.tick-1);
  while(p.animalHandling)act(w);
  expect(a.domestic).toMatchObject({tameness:5,since:w.tick-1,nextDecay:w.tick-1+TAMENESS_DECAY});
  expect(a.taming).toBeUndefined();expect(w.rng).not.toBe(before);
  expect(p.skills.animals!.xp).toBeGreaterThan(0);
  expect(animalHandlingClaimed(w,a.id)).toBe(false);
});

test('refusal and cancellation leave food and RNG unchanged; an interrupted partial feed drops only the remainder',()=>{
  const {w,p,a}=camp();const rng=w.rng;
  expect(applyTaming(w,{type:'tame',animalId:a.id,enabled:true})).toEqual({ok:true});
  expect(applyTaming(w,{type:'tame',animalId:a.id,enabled:true})).toEqual({ok:true});
  expect(w.rng).toBe(rng);
  begin(w);act(w);
  while(p.animalHandling?.step!==3)act(w);
  expect(a.food).toBeCloseTo(.05);
  expect(applyTaming(w,{type:'tame',animalId:a.id,enabled:false})).toEqual({ok:true});
  expect(p.animalHandling).toBeUndefined();
  expect(w.piles.filter(i=>i.item==='berries').reduce((n,i)=>n+i.quantity,0)).toBe(1);
  expect(w.piles.some(i=>i.item==='berries'&&i.owner.type==='ground')).toBe(true);
  expect(w.rng).toBe(rng);
  expect(a.taming?.designated).toBe(false);
  expect(a.taming?.lastAttempt).toBeUndefined();
  expect(handlingWanted(w,p)).toBe(false);
  a.taming!.designated=true;expect(handlingWanted(w,p)).toBe(true);
  expect(handlingProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()))).toBeUndefined(); // one feed remains
});

test('a failed final attempt starts the half-day cooldown only after both physical feeds',()=>{
  const {w,p,a}=camp();w.rng=81733;begin(w);
  while(p.animalHandling?.step!==5)act(w);
  expect(a.taming?.lastAttempt).toBeUndefined();
  expect(a.food).toBeCloseTo(.1);
  act(w);const attempted=a.taming?.lastAttempt;
  expect(attempted).toBe(w.tick-1);
  while(p.animalHandling)act(w);
  expect(a.domestic).toBeUndefined();expect(a.taming?.designated).toBe(true);
  addMaterial(w,'food',2,{type:'ground',x:p.x,z:p.z},'berries');
  w.tick=attempted!+TAME_COOLDOWN-1;expect(handlingWanted(w,p)).toBe(false);
  w.tick++;expect(handlingWanted(w,p)).toBe(true);
});

test('maintenance cooldown starts at final interaction, survives save, and never resets decay',()=>{
  const {w,p,a}=camp();w.rng=81733;
  a.domestic={since:0,care:'herbal',tameness:4,lastTraining:w.tick-TRAIN_COOLDOWN,nextDecay:w.tick+TAMENESS_DECAY};
  const decayAt=a.domestic.nextDecay,previous=a.domestic.lastTraining;
  expect(handlingWanted(w,p)).toBe(true);
  const proposal=handlingProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()));
  expect(proposal?.task.kind).toBe('maintain');startHandling(p,proposal!);
  while(p.animalHandling?.step!==5)act(w);
  expect(a.domestic.lastTraining).toBe(previous);
  expect(a.domestic.nextDecay).toBe(decayAt);
  act(w);const started=a.domestic.lastTraining!;
  expect(started).toBe(w.tick-1);
  expect(p.animalHandling).toMatchObject({phase:'interact',step:5,progress:1});
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  while(p.animalHandling){act(w);act(resumed);}
  expect(resumed).toEqual(w);
  expect(a.domestic).toMatchObject({tameness:4,lastTraining:started,nextDecay:decayAt});
  w.tick=started+TRAIN_COOLDOWN-1;expect(handlingWanted(w,p)).toBe(false);
  w.tick++;expect(handlingWanted(w,p)).toBe(true);
});

test('five tame steps decay at 7.5-day boundaries and the last restores wilderness without inventing an animal',()=>{
  const {w,p,a}=camp();const id=a.id;
  a.domestic={since:w.tick,care:'herbal',tameness:5,lastTraining:w.tick,nextDecay:w.tick+TAMENESS_DECAY};
  expect(handlingWanted(w,p)).toBe(false);
  for(let remaining=4;remaining>=0;remaining--){w.tick+=TAMENESS_DECAY;advanceTameness(w);
    if(remaining)expect(a.domestic).toMatchObject({tameness:remaining,nextDecay:w.tick+TAMENESS_DECAY});
    else expect(a.domestic).toBeUndefined();
  }
  expect(w.wildlife!.animals.find(v=>v.id===id)).toBe(a);
  expect(tameChance(p)).toBeCloseTo(.14);
});

test('engine work, midway save and resume retain one lièvre and the physical food balance',()=>{
  const w=domesticColony(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  expect(validateWorld(w)).toEqual([]);
  p.priorities.doctor=0;w.rng=1;
  expect(applyCommand(w,{type:'tame',animalId:a.id,enabled:true})).toEqual({ok:true});
  for(let i=0;i<100&&!p.animalHandling;i++)stepWorld(w);
  expect(p.animalHandling).toBeDefined();
  for(let i=0;i<150&&p.animalHandling?.step!==3;i++)stepWorld(w);
  expect(p.animalHandling?.step).toBe(3);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300&&!w.wildlife!.animals.find(v=>v.id===a.id)?.domestic;i++){stepWorld(w);stepWorld(resumed);}
  expect(w.wildlife!.animals.find(v=>v.id===a.id)?.domestic?.tameness).toBe(5);
  expect(resumed).toEqual(w);
  expect(w.piles.filter(i=>i.item==='berries').reduce((n,i)=>n+i.quantity,0)).toBe(10);
  expect(validateWorld(w)).toEqual([]);
});
