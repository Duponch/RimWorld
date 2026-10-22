import {deconstructionCamp} from './deconstruction.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../../src/sim/ship-casket-state-277.ts';
import {createAnimalMedicalRecord256} from '../../src/sim/animal-clinical-age-v256.ts';
import {ANESTHETIC_UNIT,ANESTHETIC_DELAY_MAX_CORE} from '../../src/sim/anesthetic.ts';
import {reconcileAnimalHealth} from '../../src/sim/wildlife-health.ts';
import {adultAgeTicks,animalNutritionMax} from '../../src/sim/animal-life.ts';
import type {World} from '../../src/sim/types.ts';
import type {WildAnimal} from '../../src/sim/wildlife-state.ts';

/** Declared service-only preparation: clear32², full needs, no autonomous work,
 * same starting originals and installed empty spatial casket. Construction,
 * research, medicine consumption and organic acquisition are not claimed. */
export function shipCasketServiceCamp277(count=3){
 const w=deconstructionCamp(count);w.jobs=[];w.piles=[];w.packed=[];w.structures=[];w.stockpiles=[];delete w.wildlife;delete w.arrivals;delete w.raids;
 for(const [i,p]of w.pawns.entries()){
  delete p.background;delete p.traits;delete p.health;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');p.bedId=null;
  for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
  Object.assign(p,{x:4+i*3,z:10});
 }
 const casket:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};
 w.structures.push(casket);return {w,actor:w.pawns[0]!,patient:w.pawns[1],helper:w.pawns[2],casket};
}
/** Explicit anesthetic clinical fixture, no administered dose credited. The
 * real animal is carried/closed/ejected by the ordinary engine afterwards. */
export function shipCasketAnimal277(w:World):WildAnimal {
 const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),x:7,z:12,food:0,rest:1,state:'idle',path:[],nextDecision:w.tick};
 a.food=animalNutritionMax(a);
 a.health=createAnimalMedicalRecord256(w,a);
 // Authored clinical state, not a human-only administration call or a claimed
 // medication service. This exact initial severity actually incapacitates it.
 a.health.anesthetic={bornAt:w.tick,expiresAtCore:w.tick*10+ANESTHETIC_DELAY_MAX_CORE,severity:ANESTHETIC_UNIT,remainder:0};
 reconcileAnimalHealth(w,a);
 w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};return a;
}
