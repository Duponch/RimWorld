import {expect,test} from 'vitest';
import {prepareFunctionalAncientHuman256} from '../src/sim/functional-ancient-population-256.ts';
import {generatePlayableAncientLoot256,PLAYABLE_ANCIENT_LOOT_OPTIONS_256} from '../src/sim/functional-ancient-loot-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {medicalStatus} from '../src/sim/injury-state.ts';
import {validatePawnHealthRecord} from '../src/sim/health-save.ts';
import type {FunctionalAncientContents256} from '../src/sim/functional-ancient-population-256.ts';

/** Prepared branch draws, not a native PRNG receipt or a selected factory seed. */
class PreparedNpcDraws extends WorldGenerationRandom {
 constructor(readonly admission:number){super(1);}
 override integerValue(){return 197;}
 override integer(min:number,max:number){return max<=min?min:min;}
 override value(){return this.admission;}
}

test('five authored roles use actual existing persons/possessions without native provenance',()=>{
 for(const contents of ['ancient-friendly','ancient-incapped','ancient-half-eaten','ancient-hostile','slave'] as const){
  const result=prepareFunctionalAncientHuman256({id:20,nextId:21,cell:{x:81,z:133},tick:73,contents,random:new PreparedNpcDraws(.9)}),p=result.pawn;
  expect(p.id).toBe(20);expect([p.x,p.z]).toEqual([81,133]);expect(p.faction).toBe(contents==='ancient-hostile'?'outlaws':'outlanders');
  expect(p).not.toHaveProperty('nativeHuman');expect(p).not.toHaveProperty('nativeOrder');expect(p).not.toHaveProperty('raid');expect(p).not.toHaveProperty('prisoner');expect(p.background).toBeDefined();
  expect(result.items.every(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id)).toBe(true);expect(result.items.some(i=>i.owner.type==='apparel')).toBe(true);expect(result.items.some(i=>i.owner.type==='equipment')).toBe(contents!=='slave');
  expect(new Set([p.id,...result.items.map(i=>i.id)]).size).toBe(1+result.items.length);expect(result.nextId).toBe(Math.max(...result.items.map(i=>i.id))+1);
  expect(validatePawnHealthRecord(p,{schemaVersion:256,tick:73,width:250,height:250})).toEqual([]);
  if(['ancient-incapped','ancient-half-eaten','slave'].includes(contents)){expect(p.state).toBe('downed');expect(medicalStatus(p.health!)).toBe('downed');expect(p.health!.injuries.length).toBe(5);expect(p.health!.bloodLoss).toBe(0);expect(p.health!.injuries.every(i=>i.kind==='bruise'&&i.bornAt===73&&i.tended===undefined)).toBe(true);}
 }
});

test('selected dead captive has actual lethal anatomy, not a forced state or discarded person',()=>{
 const result=prepareFunctionalAncientHuman256({id:50,nextId:51,cell:{x:81,z:133},tick:73,contents:'slave',random:new PreparedNpcDraws(0)});
 expect(result.pawn.state).toBe('dead');expect(medicalStatus(result.pawn.health!)).toBe('dead');expect(result.pawn.health!.death?.tick).toBe(73);expect(result.pawn.health!.missing.some(m=>m.part==='head')).toBe(true);expect(result.items.every(i=>'pawnId'in i.owner&&i.owner.pawnId===50)).toBe(true);
});

test('new NPC generation has a reproducible explicit stream and never pads a native prefix',()=>{
 for(const contents of ['ancient-friendly','ancient-hostile','slave'] as FunctionalAncientContents256[]){
  const a=new WorldGenerationRandom(479492383),b=new WorldGenerationRandom(479492383),input={id:1547,nextId:1548,cell:{x:81,z:133},tick:0,contents};
  expect(prepareFunctionalAncientHuman256({...input,random:a})).toEqual(prepareFunctionalAncientHuman256({...input,random:b}));expect(a.state).toEqual(b.state);expect(a.state.counter).toBeGreaterThan(0);
 }
});

test('original loot table admits all four genuine existing goods or an honestly empty outcome',()=>{
 expect(PLAYABLE_ANCIENT_LOOT_OPTIONS_256.map(o=>o.item)).toEqual(['advanced-component','glitterworld-medicine','gold','plasteel']);
 const all=generatePlayableAncientLoot256(80,new PreparedNpcDraws(0));if(all.status!=='ready')throw Error(all.reason);
 expect(new Set(all.things.map(t=>t.item))).toEqual(new Set(['advanced-component','glitterworld-medicine','gold','plasteel']));expect(all.things.map(t=>t.id)).toEqual([80,81,82,83]);expect(all.nextId).toBe(84);
 for(const p of all.things){const option=PLAYABLE_ANCIENT_LOOT_OPTIONS_256.find(o=>o.item===p.item)!;expect(p.quantity).toBe(option.min);expect(p).not.toHaveProperty('owner');}
 const empty=generatePlayableAncientLoot256(80,new PreparedNpcDraws(.9));if(empty.status!=='ready')throw Error(empty.reason);expect(empty.things).toEqual([]);expect(empty.nextId).toBe(80);
});
