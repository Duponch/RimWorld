import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { advanceQuests } from '../src/sim/quests.ts';
import { initializeCampRelationships } from '../src/sim/relationship-generation.ts';
import { relationshipIndex,tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { familyOfferWorld } from './helpers/family-v214.ts';
import type { World } from '../src/sim/types.ts';

function fillKnownParents(w:World,childId:number):void {
  for(const p of w.pawns.filter(p=>p.id!==childId))
    expect(tryAddRelationship(w,{kind:'parent',aId:childId,bId:p.id,recordedAt:w.tick})).toBe(true);
}
function blockEdges(w:World):void {
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)
    if(!x||!z||x===w.width-1||z===w.height-1)w.tiles[z*w.width+x]={terrain:'rock'};
}

test('a genuine related arrival preserves its announcement through save and intervening IDs; physical and family refusals are atomic',()=>{
  const {world:w,otherId,beforeIds,beforeWorldRng}=familyOfferWorld('arrival'),offer=structuredClone(w.arrivals!.pending!);
  expect(w.nextId).toBe(beforeIds);expect(w.rng).toBe(beforeWorldRng);expect(w.pawns).toHaveLength(3);expect(w.relationships).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
  const noAge=structuredClone(w);delete noAge.arrivals!.pending!.age;delete noAge.arrivals!.pending!.background;
  expect(validateWorld(noAge)).not.toEqual([]);expect(()=>deserializeWorld(JSON.stringify(noAge))).toThrow();
  const ready=deserializeWorld(serializeWorld(w));expect(ready).toEqual(w);
  const blocked=structuredClone(w);blockEdges(blocked);const frozen=JSON.stringify(blocked);
  expect(applyCommand(blocked,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(false);expect(JSON.stringify(blocked)).toBe(frozen);
  const full=structuredClone(w);full.nextId=Number.MAX_SAFE_INTEGER-1;const limit=JSON.stringify(full);
  expect(applyCommand(full,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(false);expect(JSON.stringify(full)).toBe(limit);
  fillKnownParents(w,otherId);const conflicted=serializeWorld(w),privateRng=w.arrivals!.rng;
  expect(applyCommand(w,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(conflicted);expect(w.arrivals!.rng).toBe(privateRng);expect(w.arrivals!.pending).toEqual(offer);
  expect(deserializeWorld(conflicted)).toEqual(w); // A later conflict does not corrupt the announcement.
  addGroundMaterial(ready,'wood',1,{x:5,z:5});const candidateId=ready.nextId,rng=ready.rng,arrivalRng=ready.arrivals!.rng;
  expect(candidateId).toBeGreaterThan(beforeIds);
  expect(applyCommand(ready,{type:'answer-arrival',offerId:offer.id,accept:true}).ok).toBe(true);
  const newcomer=ready.pawns.find(p=>p.id===candidateId)!;
  expect(newcomer.age).toEqual(offer.age);expect(newcomer.background).toEqual(offer.background);
  expect(ready.relationships!.links).toEqual([{kind:'parent',aId:otherId,bId:candidateId,recordedAt:ready.tick}]);
  expect(relationshipIndex(ready).kinds(candidateId,otherId)).toContain('child');
  expect(ready.piles.find(p=>p.id===candidateId+1)?.owner).toEqual({type:'apparel',pawnId:candidateId});
  expect(ready.nextId).toBe(candidateId+2);expect(ready.rng).toBe(rng);expect(ready.arrivals!.rng).toBe(arrivalRng);
  expect(validateWorld(ready)).toEqual([]);expect(deserializeWorld(serializeWorld(ready))).toEqual(ready);
});

test('asylum acceptance creates no family; actual entry commits the captured relative, while a conflict waits without retargeting or draws',()=>{
  const {world:w,otherId,beforeIds,beforeWorldRng}=familyOfferWorld('quest'),q=w.quests!.entries[0]!,announcement=structuredClone(q.relationship);
  expect(w.nextId).toBe(beforeIds);expect(w.rng).toBe(beforeWorldRng);expect(w.relationships).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'answer-quest',questId:q.id,accept:true}).ok).toBe(true);
  expect(w.relationships).toBeUndefined();expect(w.pawns).toHaveLength(3);
  const ready=deserializeWorld(serializeWorld(w));expect(ready).toEqual(w);
  fillKnownParents(w,otherId);stepWorld(w,q.acceptedAt!+q.joinDelay-w.tick);
  const before=JSON.stringify(w),rng=w.quests!.rng;advanceQuests(w);
  expect(JSON.stringify(w)).toBe(before);expect(q.relationship).toEqual(announcement);expect(q.pawnId).toBeUndefined();expect(w.quests!.rng).toBe(rng);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  stepWorld(w,100);const retry=JSON.stringify(w);advanceQuests(w);expect(JSON.stringify(w)).toBe(retry);expect(w.quests!.rng).toBe(rng);
  const resumedQuest=ready.quests!.entries[0]!,advertisedAge=structuredClone(resumedQuest.age);
  addGroundMaterial(ready,'wood',1,{x:5,z:5});const candidateId=ready.nextId,questRng=ready.quests!.rng;
  stepWorld(ready,resumedQuest.acceptedAt!+resumedQuest.joinDelay-ready.tick-1);
  const worldRng=ready.rng;stepWorld(ready);
  expect(resumedQuest.pawnId).toBe(candidateId);expect(resumedQuest.relationship).toEqual(announcement);expect(resumedQuest.arrivedAt).toBe(ready.tick);
  expect(ready.pawns.find(p=>p.id===candidateId)!.age).toEqual(advertisedAge);
  expect(ready.relationships!.links).toEqual([{kind:'parent',aId:otherId,bId:candidateId,recordedAt:ready.tick}]);
  expect(ready.nextId).toBe(candidateId+2);expect(ready.quests!.rng).toBe(questRng);expect(ready.rng).toBe(worldRng);
  expect(validateWorld(ready)).toEqual([]);expect(deserializeWorld(serializeWorld(ready))).toEqual(ready);
});

test('the new-game initial couple phase uses its private seed and adult fractional ages, without changing other owners or RNG',()=>{
  const w=createScenarioWorld(0x214c017^1,32,'survivors');delete w.relationships;
  for(const p of w.pawns)p.age={biologicalTicks:30*HUMAN_YEAR_TICKS+17,chronologicalTicks:80*HUMAN_YEAR_TICKS+17};
  const owners=JSON.stringify(w.pawns),rng=w.rng,arrivalRng=w.arrivals!.rng,ids=w.nextId;
  initializeCampRelationships(w);expect(w.relationships!.links).toHaveLength(1);
  expect(['lover','spouse']).toContain(w.relationships!.links[0]!.kind);
  expect(w.relationships!.links[0]!.recordedAt).toBe(0);expect(JSON.stringify(w.pawns)).toBe(owners);
  expect(w.rng).toBe(rng);expect(w.arrivals!.rng).toBe(arrivalRng);expect(w.nextId).toBe(ids);expect(validateWorld(w)).toEqual([]);
});
