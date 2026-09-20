import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addMaterial } from '../src/sim/materials';
import { advanceHumanCorpses,humanCorpseAge,pawnBodyLocation } from '../src/sim/human-corpses';
import { initialGrave,planGraveRelease,commitGraveRelease } from '../src/sim/burial';
import { validateBurials } from '../src/sim/burial-save';
import { damagePile } from '../src/sim/thing-damage';
import { updateFoodTemperatures } from '../src/sim/thermal-food';
import { corpseStage } from '../src/sim/corpses';
import { newDoorState } from '../src/sim/door-rules';
import { updateDoors } from '../src/sim/doors';
import { funeralFixture } from './scenarios/hygiene-ui';
import { fixtureBuilding } from './scenarios/deconstruction';
import type { Command,Structure,World } from '../src/sim/types';

function grave(w:World,x=20,z=16):Structure {const s=fixtureBuilding(w,'grave',x,z) as Structure;s.grave=initialGrave();return s;}
function command(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});expect(validateWorld(w)).toEqual([]);}
function until(w:World,predicate:()=>boolean,max=1600){
  for(let i=0;i<max&&!predicate();i++){stepWorld(w);if(i%23===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,burial:p.burial})),graves:w.structures.filter(s=>s.grave)})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function replay(w:World,ticks=17){const restored=deserializeWorld(serializeWorld(w));for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(restored);}expect(serializeWorld(restored)).toBe(serializeWorld(w));}

test('real grave construction, exclusive bodily transport, fixed deposition, continuation and deconstruction retain one identity',()=>{
  const {w,actor,other,body}=funeralFixture();other.priorities.haul=0;
  const personId=body.id,health=structuredClone(body.health),pileId=body.body!.pileId!;
  const door=fixtureBuilding(w,'door',body.x,body.z) as Structure;
  door.material='wood';door.orientation=0;
  door.door={...newDoorState(w.tick),open:true,from:1,closeAt:w.tick};
  updateDoors(w);expect(door.door.open).toBe(true); // Physical ground corpse blocks closing.
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:body.id},'cloth-shirt');const shirt=w.piles.find(i=>i.item==='cloth-shirt')!;
  // Keep a real travel segment between pickup and deposition. With the grave
  // two cells away, one contact cell touches both and no carry-only tick exists.
  command(w,{type:'designate',kind:'grave',x:25,z:16});
  expect(w.jobs.find(j=>j.kind==='grave')!.escrow.wood??0).toBe(0);
  until(w,()=>w.structures.some(s=>s.kind==='grave'));const tomb=w.structures.find(s=>s.kind==='grave')!;
  command(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:tomb.id});
  other.priorities.haul=1;
  expect(applyCommand(w,{type:'order-bury',pawnId:other.id,bodyPawnId:body.id,graveId:tomb.id}).ok).toBe(false);
  until(w,()=>actor.burial?.phase==='carry');expect(w.piles.find(p=>p.id===pileId)!.owner).toEqual({type:'pawn',pawnId:actor.id});
  replay(w);until(w,()=>actor.burial?.phase==='bury');expect(tomb.grave!.corpseId).toBeUndefined();
  expect({x:body.x,z:body.z}).toEqual({x:door.x,z:door.z});
  expect(door.door.open).toBe(false); // Retained identity at the old cell is not a second body.
  const remaining=50-actor.burial!.progress;for(let i=1;i<remaining;i++)stepWorld(w);expect(tomb.grave!.corpseId).toBeUndefined();stepWorld(w);
  expect(tomb.grave!.corpseId).toBe(pileId);expect(w.piles.find(p=>p.id===pileId)!.owner).toEqual({type:'grave',graveId:tomb.id});
  expect(pawnBodyLocation(w,body)).toBeNull();expect(body.health).toEqual(health);expect(body.id).toBe(personId);expect(shirt.owner).toEqual({type:'apparel',pawnId:personId});replay(w);
  command(w,{type:'designate',kind:'deconstruct',targetId:tomb.id,x:tomb.x,z:tomb.z});until(w,()=>!w.structures.includes(tomb));
  expect(w.piles.find(p=>p.id===pileId)!.owner.type).toBe('ground');expect(w.pawns.filter(p=>p.id===personId)).toHaveLength(1);expect(w.piles.filter(p=>p.humanCorpse?.pawnId===personId)).toHaveLength(1);replay(w);
});

test('blocked death cell stays retained, direct pickup preserves the blocking pile, interruption and grave filters remain conservative',()=>{
  const {w,actor,other,body}=funeralFixture(true),tomb=grave(w);other.priorities.haul=0;
  const blocked=w.piles.find(p=>p.item==='wood')!;expect(body.body!.pileId).toBeUndefined();
  command(w,{type:'grave-policy',graveId:tomb.id,colonists:false,strangers:false});expect(applyCommand(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id}).ok).toBe(false);
  command(w,{type:'assign-grave',graveId:tomb.id,pawnId:body.id});command(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id});
  until(w,()=>actor.burial?.phase==='carry');const id=body.body!.pileId!;expect(blocked.owner).toEqual({type:'ground',x:18,z:16});expect(blocked.quantity).toBe(1);
  command(w,{type:'clear-orders',pawnId:actor.id});expect(actor.burial).toBeUndefined();expect(w.piles.find(p=>p.id===id)!.owner.type).toBe('ground');
  command(w,{type:'order-bury',pawnId:actor.id,bodyPawnId:body.id});replay(w);until(w,()=>tomb.grave!.corpseId===id);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'grave-policy',graveId:tomb.id,colonists:true,strangers:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  const full=structuredClone(w);for(let z=0;z<full.height;z++)for(let x=0;x<full.width;x++)if(!full.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))full.piles.push({id:full.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x,z}});
  const fullGrave=full.structures.find(s=>s.id===tomb.id)!,snapshot=JSON.stringify(full);expect(planGraveRelease(full,fullGrave)).toBeNull();expect(JSON.stringify(full)).toBe(snapshot);
});

test('thermal age is first-observation based, grave suspension is not age reset, and corruption cannot resurrect or duplicate a body',()=>{
  const {w,actor,body}=funeralFixture(),pile=w.piles.find(i=>i.id===body.body!.pileId)!;
  // Temperature boundary only: advance the authoritative corpse timeline, not
  // the rest of a fake colony. No simulated days are claimed for this fixture.
  const observed=body.body!.observedAt;expect(humanCorpseAge(w,body)).toBe(0);
  w.thermal={regions:[{cells:[body.z*w.width+body.x],temperature:-10}]};updateFoodTemperatures(w);w.tick+=6000;updateFoodTemperatures(w);expect(humanCorpseAge(w,body)).toBe(0);
  w.thermal.regions[0]!.temperature=20;updateFoodTemperatures(w);w.tick+=15000;updateFoodTemperatures(w);expect(corpseStage(pile,w.tick)).toBe('rotting');
  advanceHumanCorpses(w);expect(pile.humanCorpse!.nextBileTick).toBe(w.tick+6000);
  pile.owner={type:'pawn',pawnId:actor.id};w.tick+=6000;advanceHumanCorpses(w);
  expect(w.filth?.items.some(f=>f.kind==='corpse-bile')??false).toBe(false);expect(pile.humanCorpse!.nextBileTick).toBe(w.tick+6000);
  pile.owner={type:'ground',x:body.x,z:body.z};w.tick+=6000;advanceHumanCorpses(w);
  expect(w.filth!.items.some(f=>f.kind==='corpse-bile'&&f.x===body.x&&f.z===body.z)).toBe(true);
  const tomb=grave(w);pile.owner={type:'grave',graveId:tomb.id};tomb.grave!.corpseId=pile.id;updateFoodTemperatures(w);const age=humanCorpseAge(w,body);
  w.tick+=30000;updateFoodTemperatures(w);expect(humanCorpseAge(w,body)).toBe(age);expect(body.health!.death!.tick).toBe(observed);
  const plan=planGraveRelease(w,tomb)!;expect(commitGraveRelease(w,tomb,plan)).toBe(true);expect(humanCorpseAge(w,body)).toBe(age);
  expect(validateBurials(w,89)).toEqual([]);
  const bad=structuredClone(w);bad.pawns.find(p=>p.id===actor.id)!.body=structuredClone(body.body);expect(validateBurials(bad,89).length).toBeGreaterThan(0);
  expect(validateBurials(w,88).length).toBeGreaterThan(0);
});

test('fire destroys the physical corpse and only still attached possessions, retaining the deceased and exact cumulative losses',()=>{
  const {w,body}=funeralFixture(),pile=w.piles.find(p=>p.id===body.body!.pileId)!;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:body.id},'cloth-shirt');addMaterial(w,'weapon',1,{type:'ground',x:19,z:16},'revolver');
  const shirt=w.piles.find(p=>p.item==='cloth-shirt')!,gun=w.piles.find(p=>p.item==='revolver')!,beforeHealth=structuredClone(body.health);
  expect(damagePile(w,pile,99)).toBe(true);expect(w.piles.includes(pile)).toBe(true);expect(body.body!.lostAt).toBeUndefined();
  expect(damagePile(w,pile,1)).toBe(true);expect(w.piles.includes(pile)).toBe(false);expect(w.piles.includes(shirt)).toBe(false);expect(w.piles.includes(gun)).toBe(true);
  expect(w.fires!.ledger.items['human-corpse']).toBe(1);expect(w.fires!.ledger.items['cloth-shirt']).toBe(1);expect(body.body!.lostAt).toBe(w.tick);expect(body.health).toEqual(beforeHealth);
  advanceHumanCorpses(w);expect(w.piles.some(p=>p.humanCorpse?.pawnId===body.id)).toBe(false);expect(validateWorld(w)).toEqual([]);replay(w);
});
