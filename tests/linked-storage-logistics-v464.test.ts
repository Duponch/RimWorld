import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {startHaulOrder} from '../src/sim/player-hauling.ts';
import {prepareLinkedStorageCommand286} from '../src/sim/linked-storage-plan-286.ts';
import {prepareLinkedStorageLogistics286} from '../src/sim/linked-storage-logistics-286.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {TAMENESS_DECAY} from '../src/sim/animal-handling.ts';
import {advanceAnimalTraining282,canAnimalHaul282,completeAnimalTraining282,nextTrainable282,setAnimalTrainingWanted282} from '../src/sim/animal-training-282.ts';
import type {HaulTask,MaterialPile,Structure,World} from '../src/sim/types.ts';

/** Cold transaction fixtures prepare actual original holders/tasks; they do
 * not claim played construction, production, training, pickup or travel. */
function shelf(w:World,x=25,z=25):Structure{
 const s:Structure={id:w.nextId++,kind:'small-shelf',x,z,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++],286)};w.structures.push(s);return s;
}
function held(w:World,pawnId:number,item:'wood'|'steel'|'simple-meal',quantity=1,inventory=false):MaterialPile{
 const id=w.nextId;addMaterial(w,item==='simple-meal'?'food':item,quantity,{type:inventory?'inventory':'pawn',pawnId},item);
 const p=w.piles.find(p=>p.id===id);if(!p)throw Error('Declared cargo was not created');return p;
}
function task(p:MaterialPile,s:Structure):HaulTask{return {sourcePileId:p.id,quantity:p.quantity,phase:'deliver',carryPileId:p.id,destination:{type:'stockpile',stockpileId:s.shelf!.cells[0]!}};}
function adoption(w:World,s:Structure){
 const policy=prepareLinkedStorageCommand286(w,{type:'shelf-policy',structureId:s.id,settings:{priority:5}});if(!policy.ok)throw Error(policy.reason);
 const logistics=prepareLinkedStorageLogistics286(w,policy.changedCellIds);return {policy,logistics};
}

test('two humans share one finite drop preflight; lack of the last cell refuses before policy, then both same originals fit distinct cells',()=>{
 const w=deconstructionCamp(2),s=shelf(w);w.stockpiles=[];w.growingZones=[];
 const a=w.pawns[0]!,b=w.pawns[1]!,pa=held(w,a.id,'wood'),pb=held(w,b.id,'steel');
 for(const [p,pile]of[[a,pa],[b,pb]]as const){Object.assign(p,{x:5,z:5,state:'moving',motion:null});startHaulOrder(p,task(pile,s),[]);}
 w.tiles=w.tiles.map(()=>({terrain:'water'}));w.tiles[5*w.width+5]={terrain:'grass'};
 const before=JSON.stringify(w),blocked=adoption(w,s);expect(blocked.logistics.ok).toBe(false);expect(JSON.stringify(w)).toBe(before);expect(s.shelf!.settings.priority).toBe(3);
 w.tiles[5*w.width+6]={terrain:'grass'};const {policy,logistics}=adoption(w,s);if(!logistics.ok)throw Error(logistics.reason);
 const ids=w.piles.map(p=>p.id),rng=w.rng,nextId=w.nextId;
 expect(policy.current()).toBe(true);expect(logistics.current()).toBe(true);expect(policy.commit()).toBe(true);expect(logistics.current()).toBe(true);expect(logistics.commit()).toBe(true);expect(logistics.commit()).toBe(false);
 expect(pa.owner).toEqual({type:'ground',x:5,z:5});expect(pb.owner).toEqual({type:'ground',x:6,z:5});expect(w.piles.map(p=>p.id)).toEqual(ids);
 expect(a.haul).toBeNull();expect(b.haul).toBeNull();expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
});

test('an in-flight human keeps the real original cargo and captured edge, while only affected queued destinations retire',()=>{
 const w=deconstructionCamp(1),s=shelf(w),other=shelf(w,27,25),p=w.pawns[0]!,cargo=held(w,p.id,'wood');
 Object.assign(p,{x:6,z:5,state:'moving',motion:{from:{x:5,z:5},to:{x:6,z:5},start:w.tick,end:w.tick+3},moveCooldown:3});
 startHaulOrder(p,task(cargo,s),[{x:7,z:5}]);
 const sourceId=w.nextId;addMaterial(w,'wood',2,{type:'ground',x:8,z:8},'wood');
 const affected={...task(cargo,s),sourcePileId:sourceId,phase:'pickup' as const,carryPileId:null},independent={...task(cargo,other),sourcePileId:sourceId,phase:'pickup' as const,carryPileId:null};p.orders.queue=[affected,independent];
 const motion=p.motion,owner=cargo.owner,{policy,logistics}=adoption(w,s);if(!logistics.ok)throw Error(logistics.reason);
 const before=JSON.stringify(w);expect(policy.current()).toBe(true);expect(logistics.current()).toBe(true);expect(JSON.stringify(w)).toBe(before);
 expect(policy.commit()).toBe(true);expect(logistics.commit()).toBe(true);expect(cargo.owner).toBe(owner);expect(p.motion).toBe(motion);expect(p.moveCooldown).toBe(3);
 expect(p.interruptedCargo).toBe(true);expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();expect(p.orders.queue).toEqual([independent]);expect(p.orders.queue[0]).toBe(independent);
});

test('production invalidates only output reservation and route, preserving the same task, product, recipe and work history',()=>{
 const w=deconstructionCamp(1),s=shelf(w),p=w.pawns[0]!,bill=newCookingBill(w.nextId++,'cook-simple-meal-bulk');
 const station:Structure=fixtureBuilding(w,'campfire',16,10);station.bills=[bill];
 const product=held(w,p.id,'simple-meal',4);p.orders.active='cook';p.path=[{x:17,z:10}];
 p.cooking={recipe:'cook-simple-meal-bulk',stationId:station.id,billId:bill.id,spot:{x:17,z:10},actionCell:{x:s.x,z:s.z},phase:'output',ingredients:[],progress:90000,workTicks:9,productId:product.id,storageId:s.shelf!.cells[0]!,storageQuantity:4};
 const cooking=p.cooking,ingredients=cooking.ingredients,owner=product.owner,{policy,logistics}=adoption(w,s);if(!logistics.ok)throw Error(logistics.reason);
 expect(policy.commit()).toBe(true);expect(logistics.current()).toBe(true);expect(logistics.commit()).toBe(true);
 expect(p.cooking).toBe(cooking);expect(cooking.ingredients).toBe(ingredients);expect(cooking).toMatchObject({recipe:'cook-simple-meal-bulk',progress:90000,workTicks:9,productId:product.id,storageId:null});
 expect(Object.hasOwn(cooking,'storageQuantity')).toBe(false);expect(product.owner).toBe(owner);expect(product.quantity).toBe(4);expect(p.orders.active).toBe('cook');expect(p.path).toEqual([]);
});

test('human Near occupies its admitted cell before animal Near, and an animal without space retains its exact original inventory in holding',()=>{
 const f=animalHaulingCamp459(),w=f.world,p=f.handler,a=f.animal,s=shelf(w),human=held(w,p.id,'wood'),animal=held(w,a.id,'steel',1,true);
 Object.assign(p,{x:5,z:5,state:'moving',motion:null});startHaulOrder(p,task(human,s),[]);
 Object.assign(a,{x:5,z:5,state:'moving',path:[]});delete a.motion;a.haul={...task(animal,s),destination:{type:'stockpile',stockpileId:s.shelf!.cells[0]!},startedAtCore:w.tick*10};
 w.tiles=w.tiles.map(()=>({terrain:'water'}));w.tiles[5*w.width+5]={terrain:'grass'};
 const before=JSON.stringify(w),nextId=w.nextId,rng=w.rng,{policy,logistics}=adoption(w,s);if(!logistics.ok)throw Error(logistics.reason);expect(JSON.stringify(w)).toBe(before);
 expect(policy.commit()).toBe(true);expect(logistics.current()).toBe(true);expect(logistics.commit()).toBe(true);
 expect(human.owner).toEqual({type:'ground',x:5,z:5});expect(animal.owner).toEqual({type:'inventory',pawnId:a.id});expect(a.haul).toEqual({phase:'holding',carryPileId:animal.id,sinceCore:w.tick*10});
 expect(w.piles.filter(q=>q.id===animal.id)).toEqual([animal]);expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);
});

test('all three interrupted animal slot reservations retire before the human Near decision, without manufacturing owners or losing their inventory',()=>{
 const f=animalHaulingCamp459(),w=f.world,p=f.handler,animals=[f.animal],random=WorldGenerationRandom.fromState(f.preparation.constructorState);
 // Two additional originals continue the one actual constructor stream. A
 // blocked construction fails this fixture; no reseed, healing or retry.
 for(let i=0;i<2;i++){
  const made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.LabradorRetriever,id:w.nextId,cell:{x:4,z:5},tick:w.tick,random});
  if(made.status!=='ready')throw Error('Declared original Labrador refused: '+made.reason);
  const a=made.animal;w.nextId++;a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+TAMENESS_DECAY};w.wildlife!.animals.push(a);animals.push(a);
 }
 // Real tracker helpers prepare the acquired capability on explicit scalar
 // lesson clocks. Food/service/training interaction is not claimed as played.
 for(const a of animals)expect(setAnimalTrainingWanted282(w,a.id,'haul',true).ok).toBe(true);
 for(const skill of ['obedience','haul']as const)for(let i=0;i<(skill==='obedience'?3:7);i++){
  const last=Math.max(...animals.map(a=>a.training!.lastAttemptCore??-15000));w.tick=Math.max(w.tick,Math.ceil((last+15000)/10));
  for(const a of animals){advanceAnimalTraining282(w,a);expect(nextTrainable282(w,a)).toBe(skill);expect(completeAnimalTraining282(w,a,skill,true,p.id)).toBe(true);}
 }
 for(const a of animals)expect(canAnimalHaul282(w,a)).toBe(true);
 const s=shelf(w,5,5),cargo:MaterialPile[]=[];
 for(const [i,item]of(['wood','steel','rice']as const).entries()){
  const a=animals[i]!,id=w.nextId;addMaterial(w,item==='rice'?'food':item,1,{type:'inventory',pawnId:a.id},item);
  const pile=w.piles.find(q=>q.id===id);if(!pile)throw Error('Prepared real animal inventory missing');cargo.push(pile);
  Object.assign(a,{x:4,z:5,state:'idle',path:[]});delete a.motion;
  a.haul={...task(pile,s),destination:{type:'stockpile',stockpileId:s.shelf!.cells[0]!},startedAtCore:w.tick*10};
 }
 const id=w.nextId;addMaterial(w,'silver',1,{type:'pawn',pawnId:p.id},'silver');const human=w.piles.find(q=>q.id===id)!;
 Object.assign(p,{x:4,z:5,state:'moving',motion:null});startHaulOrder(p,task(human,s),[]);
 // This genuinely occupied origin is not a fourth free drop slot. The empty
 // shelf is the sole connected Near candidate, initially promised as three
 // distinct item stacks by the very animal services being interrupted.
 w.tiles=w.tiles.map(()=>({terrain:'water'}));for(const x of[4,5])w.tiles[5*w.width+x]={terrain:'grass'};
 addMaterial(w,'food',1,{type:'ground',x:4,z:5},'rice');
 const before=JSON.stringify(w),next=w.nextId,rng=w.rng,{policy,logistics}=adoption(w,s);if(!logistics.ok)throw Error(logistics.reason);
 expect(JSON.stringify(w)).toBe(before);expect(policy.current()).toBe(true);expect(logistics.current()).toBe(true);expect(policy.commit()).toBe(true);expect(logistics.current()).toBe(true);expect(logistics.commit()).toBe(true);
 expect(human.owner).toEqual({type:'ground',x:5,z:5});
 for(const [i,a]of animals.entries()){expect(cargo[i]!.owner).toEqual({type:'inventory',pawnId:a.id});expect(a.haul).toEqual({phase:'holding',carryPileId:cargo[i]!.id,sinceCore:w.tick*10});expect(w.piles.filter(q=>q.id===cargo[i]!.id)).toEqual([cargo[i]]);}
 expect(w.nextId).toBe(next);expect(w.rng).toBe(rng);
});
