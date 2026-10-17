import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {huntingCamp} from './scenarios/hunting.ts';
import {holdNewDuckArrival256,beginDuckFlyExit256,commitDuckFlyExits256,advanceDuckFlyers256,duckFlyExitUnsupportedReason256} from '../src/sim/duck-flyer-runtime-256.ts';
import {captureDuckFlyerOwners256,captureDuckMapRemovedOwners256} from '../src/sim/duck-owner-capture-256.ts';
import {captureActorBeds256} from '../src/sim/actor-bed-local-256.ts';
import {attachAnimalFire,autoExtinguishDuckForHolder256} from '../src/sim/fire.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {validDuckExitFlight256,validateDuckFlyers256} from '../src/sim/duck-flyer-save-256.ts';
import {initializeAnimalEggLayer256} from '../src/sim/animal-egg-local-v256.ts';
import {animalContentsOwner256,animalContentsLocation256,captureAnimalContentsOwners256} from '../src/sim/animal-local-contents-256.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {captureExplorationTransport256,prepareExplorationTransport256} from '../src/bridge/exploration-transport-256.ts';
import {actualExplorationAffiliation256,resolveActualExplorationApproacher256} from '../src/sim/exploration-actors-256.ts';
import {updateFoodTemperatures} from '../src/sim/thermal-food.ts';
import {advanceLocalEggs256} from '../src/sim/animal-egg-local-v256.ts';
import {heldDuckInventoryClock256} from '../src/sim/duck-held-item-clock-256.ts';
import {validEggPile256} from '../src/sim/animal-egg-save-v256.ts';
import {rotAge} from '../src/sim/food-preservation.ts';
import {wildlifeRandom} from '../src/sim/wildlife-state.ts';
function prepared(){
 const w=huntingCamp(),a=w.wildlife!.animals[0]!;
 preparedSchema256(w);w.resources=[];w.structures=[];w.jobs=[];delete w.roofing;w.wildlife!.animals=[a];
 a.species='duck';a.sex='female';a.ageTicks=adultAgeTicks('duck');a.x=10;a.z=10;a.food=animalSpecies('duck').nutrition*.8;a.rest=1;a.state='idle';a.path=[];a.nextDecision=w.tick+1;delete a.health;delete a.motion;
 initializeAnimalEggLayer256(a);return {w,a};
}
test('actual attached Fire survives exit preparation then autoextinguishes only at real holder addition, without healing',()=>{
 const {w,a}=prepared();a.health=createAnimalMedicalRecord256(w,a);a.health.bloodLoss=17;
 expect(attachAnimalFire(w,a.id)).toBe(true);const fire=w.fires!.items[0]!,health=structuredClone(a.health),ledger=structuredClone(w.fires!.ledger);
 expect(duckFlyExitUnsupportedReason256(w,a)).toBeUndefined();expect(beginDuckFlyExit256(w,a,w.tick*10,'exit')).toBe(true);
 expect(w.fires!.items).toContain(fire);expect(a.burning).toBeDefined();expect(validDuckExitFlight256(a,256,w.tick)).toBe(true);
 // The primary allows a zero wait: make this prepared ready state use its
 // actual stored readyAt without running a separate clinical/World loop.
 a.exitFlight!.readyAtCore=a.exitFlight!.startedAtCore;
 const rng=structuredClone(w.wildlife!),nextId=w.nextId;wildlifeRandom(rng);
 commitDuckFlyExits256(w);const holder=w.wildlife!.flyers![0]!;
 expect(holder.animal).toBe(a);expect(holder.personalTick).toBe(w.tick);expect(a.health).toEqual(health);expect(a.burning).toBeUndefined();
 expect(w.fires!.items).not.toContain(fire);expect(w.fires!.ledger).toEqual(ledger);expect(w.wildlife!.rng).toBe(rng.rng);expect(w.nextId).toBe(nextId+1);
 expect(validateDuckFlyers256(w,256)).toEqual([]);
});
test('inconsistent attached Fire refuses before RNG, path stop, ID or source-owner mutation; incoming producer never hides Fire',()=>{
 const {w,a}=prepared();a.burning={phase:'panic',remainingCore:0};const before=JSON.stringify(w);
 expect(beginDuckFlyExit256(w,a,w.tick*10,'exit')).toBe(false);expect(holdNewDuckArrival256(w,a)).toBe(false);expect(autoExtinguishDuckForHolder256(w,a)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
test('held original joins actual global actors once and compact removal captures exact suspended personal time, never dead contents',()=>{
 const {w,a}=prepared();expect(holdNewDuckArrival256(w,a)).toBe(true);const holder=w.wildlife!.flyers![0]!;
 w.tick++;advanceDuckFlyers256(w);expect(holder.personalTick).toBe(w.tick-1);
 const owners=captureDuckFlyerOwners256(w);expect(owners[0]!.holder).toBe(holder);expect(owners[0]!.animal).toBe(a);
 const beds=captureActorBeds256(w);expect(beds.actors.filter(v=>v===a)).toHaveLength(1);expect(beds.localMapFor(a)).toBeNull();
 const rows=captureDuckMapRemovedOwners256(w);expect(rows).toEqual([{animal:a,clock:holder.personalTick}]);expect(rows[0]!.animal).toBe(a);
 const archive=detachMapOwners(w,0,w.planet?.homeTile??0),retained=archive.animals.find(row=>row.animal===a)!;expect(retained.animal).toBe(a);expect(retained.clock).toBe(holder.personalTick);expect(archive.removedAt).toBe(w.tick);
 a.state='dead';expect(captureDuckMapRemovedOwners256(w)).toEqual([]);
});
test('real inventory remains under suspended flyer then retires exactly with Skyfaller.Destroy, without a corpse or resource draw',()=>{
 const {w,a}=prepared();addMaterial(w,'wood',4,{type:'inventory',pawnId:a.id},'wood');expect(w.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id&&p.item==='wood'&&p.quantity===4)).toBe(true);
 expect(beginDuckFlyExit256(w,a,w.tick*10,'exit')).toBe(true);a.exitFlight!.readyAtCore=a.exitFlight!.startedAtCore;commitDuckFlyExits256(w);
 const pack={building:{id:w.nextId++,kind:'bedroll' as const,x:10,z:10,orientation:0 as const,footprint:'standard' as const,material:'cloth' as const,quality:'normal' as const},owner:{type:'inventory' as const,pawnId:a.id}};w.packed.push(pack);
 const f=w.wildlife!.flyers![0]!,rng=w.wildlife!.rng,id=w.nextId,loss=w.destroyed?.items?.wood??0,cloth=w.destroyed?.lost.cloth??0,count=w.destroyed?.count??0;
 expect(animalContentsOwner256(w,a.id)).toMatchObject({kind:'animal',animal:a,holder:f});
 expect(captureAnimalContentsOwners256(w).get(a.id)).toMatchObject({kind:'animal',animal:a,holder:f});
 expect(animalContentsLocation256(w,a.id)).toEqual({cell:f.cell,suspended:true});
 for(let n=0;n<22;n++){w.tick++;advanceDuckFlyers256(w);}
 expect(w.wildlife!.flyers).toBeUndefined();expect(w.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id)).toBe(false);
 expect(w.destroyed!.items!.wood).toBe(loss+4);expect(w.packed).not.toContain(pack);expect(w.destroyed!.lost.cloth).toBe(cloth+40);expect(w.destroyed!.count).toBe(count+1);expect(w.piles.some(p=>p.item==='duck-corpse')).toBe(false);
 expect(w.wildlife!.rng).toBe(rng);expect(w.nextId).toBe(id);expect(w.wildlife!.exitedAnimals).toBe(1);
});
test('terminal loss saturation keeps original holder and cargo pending at zero remaining; retry commits once',()=>{
 const {w,a}=prepared();addMaterial(w,'wood',4,{type:'inventory',pawnId:a.id},'wood');
 expect(beginDuckFlyExit256(w,a,w.tick*10,'exit')).toBe(true);a.exitFlight!.readyAtCore=a.exitFlight!.startedAtCore;commitDuckFlyExits256(w);
 w.destroyed={...w.destroyed,count:w.destroyed?.count??0,lost:{...w.destroyed?.lost},items:{...w.destroyed?.items,wood:Number.MAX_SAFE_INTEGER}};
 for(let n=0;n<22;n++){w.tick++;advanceDuckFlyers256(w);}
 const f=w.wildlife!.flyers![0]!;expect(f.animal).toBe(a);expect(f.remainingCore).toBe(0);expect(w.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id)).toBe(true);
 expect(validateDuckFlyers256(w,256)).toEqual([]);expect(w.wildlife!.exitedAnimals??0).toBe(0);
 w.destroyed.items!.wood=0;w.tick++;advanceDuckFlyers256(w);expect(w.wildlife!.flyers).toBeUndefined();expect(w.destroyed.items!.wood).toBe(4);expect(w.wildlife!.exitedAnimals).toBe(1);
});
test('door metadata joins the actual held original before commit and rejects forged affiliation or accessor holder without invoking it',()=>{
 const {w,a}=prepared();expect(holdNewDuckArrival256(w,a)).toBe(true);w.site={revision:3,tileId:0,mapSeed:42,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','slate'],coastAngle:null,mutatorCode:0};w.exploration={revision:1};
 w.structures.push({id:w.nextId++,kind:'door',x:20,z:20,orientation:0,footprint:'standard',material:'wood',door:{open:false,holdOpen:false,forbidden:false,changedAt:0,from:0,lastTouch:-12,closeAt:null,explorationApproacherId:a.id}});
 expect(actualExplorationAffiliation256(a)).toEqual({id:a.id,playerOwned:false,hostPlayer:false});expect(resolveActualExplorationApproacher256(w,a.id)).toEqual(actualExplorationAffiliation256(a));
 const rows=captureExplorationTransport256(w,w)!;expect(rows).toEqual([{id:a.id,playerOwned:false,hostPlayer:false}]);expect(prepareExplorationTransport256({explorationApproachers:rows},w).ok).toBe(true);
 const before=JSON.stringify(w);expect(prepareExplorationTransport256({explorationApproachers:[{...rows[0],playerOwned:true}]},w).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
 let reads=0;const holder=w.wildlife!.flyers![0]!;Object.defineProperty(holder,'animal',{enumerable:true,get(){reads++;return a;}});
 expect(prepareExplorationTransport256({explorationApproachers:rows},w).ok).toBe(false);expect(reads).toBe(0);
});
test('historical and duplicate held owners remain refused; no future owner or inventory admission is offered to old255',()=>{
 const {w,a}=prepared();holdNewDuckArrival256(w,a);expect(validateDuckFlyers256(w,255).length).toBeGreaterThan(0);w.wildlife!.animals.push(a);expect(validateDuckFlyers256(w,256).length).toBeGreaterThan(0);expect(()=>captureAnimalContentsOwners256(w)).toThrow(/Duplicate/);
});
test('nested food/egg anchors stay on the captured personal frontier while held, with no fresh age or incoming cargo permission',()=>{
 const {w,a}=prepared();addMaterial(w,'food',2,{type:'inventory',pawnId:a.id},'berries');const fruit=w.piles.find(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id&&p.item==='berries')!;fruit.rot!.progress=31;
 const before=JSON.stringify(w);expect(holdNewDuckArrival256(w,a)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 addMaterial(w,'food',1,{type:'inventory',pawnId:a.id},'turkey-egg-fertilized',{egg:{progress:0,temperatureDamage:0,faction:'wild',atTick:w.tick}});
 const egg=w.piles.find(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id&&p.egg)!;
 expect(beginDuckFlyExit256(w,a,w.tick*10,'exit')).toBe(true);a.exitFlight!.readyAtCore=a.exitFlight!.startedAtCore;commitDuckFlyExits256(w);
 const anchor=structuredClone(fruit.rot),eggState=structuredClone(egg.egg),personal=w.wildlife!.flyers![0]!.personalTick;
 w.tick++;advanceDuckFlyers256(w);updateFoodTemperatures(w);advanceLocalEggs256(w);
 expect(fruit.rot).toEqual(anchor);expect(rotAge(fruit,w.tick)).toBe(31);expect(egg.egg).toEqual(eggState);expect(egg.egg!.atTick).toBe(personal);expect(validEggPile256(egg,256,heldDuckInventoryClock256(w,egg,256,w.tick),w.nextId)).toBe(true);expect(validEggPile256(egg,256,w.tick,w.nextId)).toBe(false);expect(w.nextId).toBeGreaterThan(a.id);
});
