import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {prepareAnimalAreaChange287} from '../src/sim/animal-area-change-287.ts';
import {prepareAnimalAreaAssignment287} from '../src/sim/animal-area-owners-287.ts';
import {reconcileAnimalAreaTasks287,releaseAnimalAreaReturn287} from '../src/sim/animal-area-runtime-287.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {cleanMapRemovedAnimal256,detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape} from '../src/sim/world-lost-save.ts';
import {validCaravanAnimalRecord256} from '../src/sim/group-animal-record-save-256.ts';
import {attachAnimalFire} from '../src/sim/fire.ts';
import {tryStartAnimalConfusionLocal256} from '../src/sim/animal-condition-mental-runtime-256.ts';
import {startAnimalManhunter} from '../src/sim/animal-manhunter.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {validCorpseShape} from '../src/sim/corpse-save.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {ANESTHETIC_UNIT,ANESTHETIC_DELAY_MAX_CORE} from '../src/sim/anesthetic.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import type {Cell,World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

// Existing finite32² colony and its one constructor-born Labrador. Clinical
// severity, prospective job and initial paths are declared owner/admission
// preparation, not an acquired illness or a played automatic refuge choice.
function camp(){
 const f=animalHaulingCamp459();initialWorldRegistry(f.world);
 const {world:w,animal:a}=f;a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=350_000_000;
 a.animalThermalRefuge288={mapId:registeredMapId(w)!,target:{x:a.x,z:a.z},phase:'wait',startedAtCore:w.tick*10};
 return f;
}
function travel(w:World,a:WildAnimal){
 const target={x:a.x+2,z:a.z};a.animalThermalRefuge288={mapId:registeredMapId(w)!,target,phase:'travel',startedAtCore:w.tick*10};
 a.path=[{x:a.x+1,z:a.z},target];const nav=animalNavigation(w);
 expect(moveAnimal(w,a,nav.step,1,nav.geometry)).toBe(true);return a.motion!;
}
function area(w:World,a:WildAnimal,cells:Cell[]){
 const id=w.nextId++;w.allowedAreas=[{id,label:'Refuge autorisé',color:0x123456,cells:cells.map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)}];
 a.animalMapAreas287={revision:1,assignments:[{mapId:registeredMapId(w)!,choice:{kind:'allowed',areaId:id}}]};return id;
}
function sameClinical(w:World,a:WildAnimal){return {record:a.health!,before:structuredClone(a.health),civil:medicalCivilTick271(a.health!),age:a.ageTicks,rng:w.rng};}
function clinicalUnchanged(w:World,a:WildAnimal,s:ReturnType<typeof sameClinical>){
 expect(a.health).toBe(s.record);expect(a.health).toEqual(s.before);expect(medicalCivilTick271(a.health!)).toBe(s.civil);expect(a.ageTicks).toBe(s.age);expect(w.rng).toBe(s.rng);
}

test('area shrink retires only the obsolete refuge future route while preserving its real captured edge and dossier',()=>{
 const {world:w,animal:a}=camp(),edge=travel(w,a),before=sameClinical(w,a);
 const id=area(w,a,[edge.from,edge.to,a.animalThermalRefuge288!.target]);
 const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'allowed',areaId:id},cells:[edge.to.z*w.width+edge.to.x]}]);
 expect(plan.ok,plan.ok?'':plan.reason).toBe(true);if(!plan.ok)throw Error(plan.reason);
 expect(a.animalThermalRefuge288).toBeDefined();expect(plan.commit()).toBe(true);
 expect(a.animalThermalRefuge288).toBeUndefined();expect(a.path).toEqual([]);expect(a.motion).toBe(edge);expect(a.state).toBe('moving');clinicalUnchanged(w,a,before);
});

test('an area transaction never clears the new meal owners route when removing a stale refuge field',()=>{
 const f=camp(),{world:w,animal:a}=f,edge=travel(w,a),before=sameClinical(w,a),food=w.piles.find(p=>p.id===f.kibbleId)!;
 if(food.owner.type!=='ground')throw Error('Existing real ration must be on ground');
 const id=area(w,a,[edge.from,edge.to,a.animalThermalRefuge288!.target,food.owner]);
 // Deliberate replacement boundary: new owner installed; old sparse job must
 // retire without stealing the replacement path. This is not a saved double job.
 a.meal={kind:'pile',id:food.id,quantity:1,progress:0};const next=[{x:a.x-1,z:a.z}];a.path=next;
 const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'allowed',areaId:id},cells:[food.owner.z*w.width+food.owner.x]}]);
 expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);
 expect(a.animalThermalRefuge288).toBeUndefined();expect(a.meal?.id).toBe(food.id);expect(a.path).toBe(next);expect(a.motion).toBe(edge);clinicalUnchanged(w,a,before);
});

test('an allowed edit retaining the same waiting position preserves the actual start clock',()=>{
 const {world:w,animal:a}=camp(),job=a.animalThermalRefuge288!,id=area(w,a,[a,{x:a.x+1,z:a.z}]),before=sameClinical(w,a);
 const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'allowed',areaId:id},cells:[a.z*w.width+a.x]}]);
 expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);
 expect(a.animalThermalRefuge288).toBe(job);clinicalUnchanged(w,a,before);
});

test('area policy reconciliation does not let an old return erase the active refuges route',()=>{
 const {world:w,animal:a}=camp(),edge=travel(w,a),next=a.path;
 area(w,a,[edge.from,edge.to,a.animalThermalRefuge288!.target]);a.animalAreaReturn287={mapId:registeredMapId(w)!,target:{...edge.to}};
 releaseAnimalAreaReturn287(w,a);expect(a.animalAreaReturn287).toBeUndefined();expect(a.path).toBe(next);expect(a.motion).toBe(edge);
});

test('a mutable area mask removes a now forbidden refuge but retains its physical edge',()=>{
 const {world:w,animal:a}=camp(),edge=travel(w,a),before=sameClinical(w,a);area(w,a,[edge.to]);
 reconcileAnimalAreaTasks287(w,a);expect(a.animalThermalRefuge288).toBeUndefined();expect(a.path).toEqual([]);expect(a.motion).toBe(edge);clinicalUnchanged(w,a,before);
});

test('owner assignment preflight becomes stale when the same refuge object changes after capture',()=>{
 const {world:w,animal:a}=camp();const id=area(w,a,[a]);
 const plan=prepareAnimalAreaAssignment287(w,a,null);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.current()).toBe(true);
 a.animalThermalRefuge288!.target={x:a.x+1,z:a.z};expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);
 expect(a.animalMapAreas287!.assignments[0]!.choice).toEqual({kind:'allowed',areaId:id});
});

test('actual DeSpawn cleanup stops at the occupied origin and removes only spatial work, retaining clinical clocks and inventory',()=>{
 const f=camp(),{world:w,animal:a}=f,edge=travel(w,a),before=sameClinical(w,a),wood=w.piles.find(p=>p.id===f.woodId)!;
 wood.owner={type:'inventory',pawnId:a.id};const owner=wood.owner;cleanMapRemovedAnimal256(a,w.tick);
 expect(a.animalThermalRefuge288).toBeUndefined();expect(a.motion).toBeUndefined();expect(a).toMatchObject(edge.from);expect(a.path).toEqual([]);
 expect(w.piles.find(p=>p.id===wood.id)).toBe(wood);expect(wood.owner).toBe(owner);clinicalUnchanged(w,a,before);
});

test('real classic map retirement puts the same animal and held pile in its archive without a refuge job',()=>{
 const f=camp(),{world:w,animal:a}=f,before=sameClinical(w,a),wood=w.piles.find(p=>p.id===f.woodId)!;wood.owner={type:'inventory',pawnId:a.id};
 const archive=detachMapOwners(w,0,52),row=archive.animals.find(r=>r.animal===a)!;
 expect(row.animal).toBe(a);expect(row.items).toContain(wood);expect(row.animal.animalThermalRefuge288).toBeUndefined();clinicalUnchanged(w,a,before);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,288,w)).toBe(true);
 const invalid=structuredClone(archive);invalid.animals.find(r=>r.animal.id===a.id)!.animal.animalThermalRefuge288={mapId:0,target:{x:a.x,z:a.z},phase:'wait',startedAtCore:w.tick*10};
 expect(validLostArchiveShape(invalid,w.tick,w.nextId,288,w)).toBe(false);
});

test('real fire admission revokes refuge before panic without rewriting the committed edge or held object',()=>{
 const f=camp(),{world:w,animal:a}=f,edge=travel(w,a),record=a.health!,wood=w.piles.find(p=>p.id===f.woodId)!;wood.owner={type:'inventory',pawnId:a.id};
 expect(attachAnimalFire(w,a.id)).toBe(true);expect(a.burning).toBeDefined();expect(a.animalThermalRefuge288).toBeUndefined();expect(a.motion).toBe(edge);expect(a.path).toEqual([]);
 expect(a.health).toBe(record);expect(w.piles.find(p=>p.id===wood.id)).toBe(wood);expect(wood.owner).toEqual({type:'inventory',pawnId:a.id});
});

test('real local confusion admission retires refuge with the same dossier, age and captured edge',()=>{
 const {world:w,animal:a}=camp(),edge=travel(w,a),before=sameClinical(w,a);
 expect(tryStartAnimalConfusionLocal256(w,a,w.tick*10)).toBe(true);expect(a.confusion).toBeDefined();expect(a.animalThermalRefuge288).toBeUndefined();expect(a.motion).toBe(edge);expect(a.path).toEqual([]);clinicalUnchanged(w,a,before);
});

test('returned-wild rage admission also retires a stale local refuge before it takes over movement',()=>{
 const {world:w,animal:a}=camp(),edge=travel(w,a),before=sameClinical(w,a);delete a.domestic;
 // Explicit SetFaction/untaming boundary: no saved wild refuge is admitted.
 expect(startAnimalManhunter(w,a)).toBe(true);expect(a.manhunter).toBeDefined();expect(a.animalThermalRefuge288).toBeUndefined();expect(a.motion).toBe(edge);clinicalUnchanged(w,a,before);
});

test('the existing caravan guard rejects local refuge while preserving current288 thermal clinical admission after cleanup',()=>{
 const {world:w,animal:a}=camp(),before=sameClinical(w,a),context={context:w,tick:w.tick,nextId:w.nextId,version:288};
 expect(validCaravanAnimalRecord256(a,context)).toBe(false);cleanMapRemovedAnimal256(a,w.tick);
 expect(validCaravanAnimalRecord256(a,context)).toBe(true);clinicalUnchanged(w,a,before);
 const old=structuredClone(a);expect(validCaravanAnimalRecord256(old,{...context,version:287})).toBe(true);
 expect(validCaravanAnimalRecord256(old,{...context,version:289})).toBe(false);
});

test('terminal real blood loss removes refuge before the same dossier becomes the actual same-ID body',()=>{
 const {world:w,animal:a}=camp(),record=a.health!;record.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(record);reconcileAnimalHealth(w,a);
 expect(a.animalThermalRefuge288).toBeUndefined();expect(a.state).toBe('dead');advanceCorpses(w);const body=w.piles.find(p=>p.id===a.id)!;
 expect(body.corpse?.health).toBe(record);expect(validCorpseShape(body as unknown as Record<string,unknown>,288)).toBe(true);
 const invalid=structuredClone(body) as unknown as {corpse:Record<string,unknown>};invalid.corpse.animalThermalRefuge288={mapId:0,target:{x:a.x,z:a.z},phase:'wait',startedAtCore:w.tick*10};
 expect(validCorpseShape(invalid as unknown as Record<string,unknown>,288)).toBe(false);
});

test('the same refuge patient really carries into suspension and returns without any local job or replayed waiting time',()=>{
 const f=camp(),{world:w,animal:a}=f;
 const c:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};w.structures.push(c);
 a.health!.anesthetic={bornAt:w.tick,expiresAtCore:w.tick*10+ANESTHETIC_DELAY_MAX_CORE,severity:ANESTHETIC_UNIT,remainder:0};reconcileAnimalHealth(w,a);
 expect(a.state).toBe('downed');expect(a.animalThermalRefuge288).toBeUndefined();const record=a.health!;
 const ordered=applyCommand(w,{type:'order-carry-ship-casket',pawnId:f.handlerId,patient:{kind:'animal',id:a.id},casketId:c.id});expect(ordered.ok,ordered.reason).toBe(true);
 for(let i=0;i<1500&&c.shipCryptosleep277.occupant?.kind!=='animal';i++)stepWorld(w);
 expect(c.shipCryptosleep277.occupant).toEqual({kind:'animal',animal:a});expect(a.health).toBe(record);expect(a.animalThermalRefuge288).toBeUndefined();
 const frozen=structuredClone(a),active=record.tick;stepWorld(w,12);expect(a).toEqual(frozen);
 const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 expect(applyCommand(w,{type:'eject-ship-casket',casketId:c.id}).ok).toBe(true);expect(w.wildlife!.animals.find(r=>r.id===a.id)).toBe(a);
 expect(a.health).toBe(record);expect(record.tick).toBe(active);expect(medicalCivilTick271(record)).toBe(w.tick);expect(a.animalThermalRefuge288).toBeUndefined();expect(validateWorld(w)).toEqual([]);
},30_000);

test('an admitted real formation replaces a waiting refuge without erasing the same patient or property',()=>{
 const f=camp(),{world:w,animal:a}=f,record=a.health!,age=a.ageTicks,civil=medicalCivilTick271(record);
 expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
 const food=w.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=2)!;expect(food).toBeDefined();
 const source=food.owner,quantity=food.quantity;
 const result=applyCommand(w,{type:'group-start',originMapId:0,memberIds:[f.handlerId],animalIds:[a.id],sources:[{pileId:food.id,quantity:2}],destination:52});
 expect(result.ok,result.reason).toBe(true);expect(a.animalThermalRefuge288).toBeUndefined();expect(w.wildlife!.animals).toContain(a);
 expect(a.health).toBe(record);expect(a.ageTicks).toBe(age);expect(medicalCivilTick271(record)).toBe(civil);
 expect(w.piles.find(p=>p.id===food.id)).toBe(food);expect(food.owner).toBe(source);expect(food.quantity).toBe(quantity);
 const row=w.worldGroups!.groups.find(r=>'manifest'in r.state&&r.state.animalPreparation?.lines.some(l=>l.animalId===a.id));
 expect(row).toBeDefined();expect('manifest'in row!.state&&row!.state.animalPreparation!.lines.find(l=>l.animalId===a.id)!.gathered).toBe(false);
});

test('a held cargo is a real inventory owner rather than a replacement route when an area edit retires refuge',()=>{
 for(const transactional of [false,true]){
  const f=camp(),{world:w,animal:a}=f,edge=travel(w,a),wood=w.piles.find(p=>p.id===f.woodId)!,before=sameClinical(w,a);wood.owner={type:'inventory',pawnId:a.id};
  const held={phase:'holding' as const,carryPileId:wood.id,sinceCore:w.tick*10};a.haul=held;
  const id=area(w,a,[edge.from,edge.to,a.animalThermalRefuge288!.target]);
  if(transactional){const plan=prepareAnimalAreaChange287(w,[{animal:a,choice:{kind:'allowed',areaId:id},cells:[edge.to.z*w.width+edge.to.x]}]);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);}
  else {w.allowedAreas![0]!.cells=[edge.to.z*w.width+edge.to.x];reconcileAnimalAreaTasks287(w,a);}
  expect(a.animalThermalRefuge288).toBeUndefined();expect(a.path).toEqual([]);expect(a.motion).toBe(edge);expect(a.haul).toBe(held);
  expect(w.piles.find(p=>p.id===wood.id)).toBe(wood);expect(wood.owner).toEqual({type:'inventory',pawnId:a.id});clinicalUnchanged(w,a,before);
 }
});
