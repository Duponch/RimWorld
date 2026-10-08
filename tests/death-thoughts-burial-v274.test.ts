import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {moodThoughts} from '../src/sim/mood.ts';
import {initialGrave,planGraveRelease,commitGraveRelease} from '../src/sim/burial.ts';
import {pawnBodyLocation} from '../src/sim/human-corpses.ts';
import {funeralFixture} from './scenarios/hygiene-ui.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Pawn,Structure,World} from '../src/sim/types.ts';

const observed=(p:Pawn)=>p.deathThoughts?.filter(m=>m.kind.includes('corpse'))??[];
function until(w:World,predicate:()=>boolean,max=600){
  for(let i=0;i<max&&!predicate();i++)stepWorld(w);
  expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,burial:p.burial,thoughts:p.deathThoughts}))})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function replay(w:World,ticks=17){
  const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
}

test('a real body is observed, carried, saved and buried; burial stops renewal without erasing death memories',()=>{
  const {w,actor,other,body}=funeralFixture();actor.x=14;other.x=12;actor.priorities.haul=0;other.priorities.haul=0;
  until(w,()=>observed(actor).length>0);
  const death=moodThoughts(w,actor).filter(t=>t.id.includes('witness')||t.id.includes('colonist-died'));
  expect(death.length).toBeGreaterThanOrEqual(1);
  const grave=fixtureBuilding(w,'grave',27,16) as Structure;grave.grave=initialGrave();actor.priorities.haul=1;
  expect(applyCommand(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:grave.id}).ok).toBe(true);
  until(w,()=>actor.burial?.phase==='carry');const corpseId=body.body!.pileId!;
  expect(w.piles.find(p=>p.id===corpseId)!.owner).toEqual({type:'pawn',pawnId:actor.id});replay(w);
  until(w,()=>grave.grave!.corpseId===corpseId);expect(pawnBodyLocation(w,body)).toBeNull();
  const atBurial=structuredClone(observed(actor));expect(atBurial.length).toBeGreaterThan(0);
  replay(w,150);expect(observed(actor)).toEqual(atBurial);
  for(const thought of death)expect(moodThoughts(w,actor).find(t=>t.id===thought.id)).toEqual(thought);
  expect(w.pawns.filter(p=>p.id===body.id)).toHaveLength(1);
});

test('releasing the grave exposes the same physical corpse at its new location and renews only observation memories',()=>{
  const {w,actor,other,body}=funeralFixture();other.priorities.haul=0;
  const grave=fixtureBuilding(w,'grave',26,16) as Structure;grave.grave=initialGrave();
  expect(applyCommand(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:grave.id}).ok).toBe(true);
  until(w,()=>grave.grave!.corpseId===body.body!.pileId);actor.priorities.haul=0;
  const corpseId=body.body!.pileId!,death=actor.deathThoughts?.filter(m=>!m.kind.includes('corpse'));
  const plan=planGraveRelease(w,grave);expect(plan?.cell).toBeDefined();expect(commitGraveRelease(w,grave,plan!)).toBe(true);
  // The shared deconstruction consumer removes the container after committing
  // this spill. Keeping the grave would leave its blocking footprint in place.
  w.structures=w.structures.filter(s=>s!==grave);
  const releasedAt=w.tick;expect(pawnBodyLocation(w,body)).toEqual({type:'ground',...plan!.cell});expect(plan!.cell).not.toEqual({x:body.x,z:body.z});
  until(w,()=>observed(actor).some(m=>m.at>releasedAt));replay(w);
  expect(actor.deathThoughts?.filter(m=>!m.kind.includes('corpse'))).toEqual(death);
  expect(w.piles.filter(p=>p.humanCorpse?.pawnId===body.id).map(p=>p.id)).toEqual([corpseId]);
});
