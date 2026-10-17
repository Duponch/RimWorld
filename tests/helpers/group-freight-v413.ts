import {prepareGroupScenario} from '../../src/sim/group-scenario.ts';
import {applyCommand} from '../../src/sim/index.ts';
import {fixtureBuilding} from '../scenarios/deconstruction.ts';
import {registeredMap,flushRegisteredMap} from '../../src/sim/world-map-context.ts';
import {adultAgeTicks} from '../../src/sim/animal-life.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../../src/sim/research.ts';
import type {PackedFurniture} from '../../src/sim/furniture-rules.ts';
import type {WildAnimal} from '../../src/sim/wildlife-state.ts';

export interface NativeFreight413Manifest {
 revision:1;schemaVersion:258;fixtureSHA256:string;tick:number;mapId:number;
 memberIds:number[];residentIds:number[];animalId:number;destination:52;
 medicine:{sourceId:number;preparedQuantity:6;selectedQuantity:2;remainingQuantity:4};
 pack:{id:number;kind:'double-bed';grams:50000;ground:{x:number;z:number};building:PackedFurniture['building']};
 notice:string;
}

/** The SAME registryCamp32² and payload producers as the final real-engine
 * group-packed-animal-v258 case. All finite edits precede the first import.
 * No loading, contact, clock step, departure or acquisition story is prepared. */
export function preparedNativeFreight413(){
 // Literal registryCamp construction, with ordinary assertions instead of a
 // runtime Vitest import. No preparation transition is replaced by an edit.
 // Historical V413 preparation before its validation baseline. No step or
 // prospective259 field is granted; later guards still reject future data.
 const root=prepareGroupScenario();(root as {schemaVersion:number}).schemaVersion=258;const adoption=applyCommand(root,{type:'planet-adopt'});if(!adoption.ok)throw Error(adoption.reason??'The actual planet-adopt command refused');
 const mapId=root.worldMaps!.rootMapId!,map=registeredMap(root,mapId)!;
 if(Number(root.schemaVersion)!==258||map.width!==32||map.height!==32||root.tick!==0)throw Error('V413 requires the actual unplayed258 registryCamp32²');
 root.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:root.tick}};
 const animal:WildAnimal={id:map.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:16,z:15,food:1,rest:1,state:'idle',path:[],nextDecision:map.tick,
  domestic:{since:map.tick,care:'herbal',tameness:5,nextDecay:map.tick+6000,productFullness:0}};
 map.wildlife={profile:'temperate-hares-v1',rng:1,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
 const building:PackedFurniture['building']=fixtureBuilding(map,'double-bed',220,17);building.material='wood';map.structures=map.structures.filter(s=>s!==building);
 const ground={x:8,z:14},pack:PackedFurniture={building,owner:{type:'ground',...ground}};map.packed.push(pack);
 const medicine=map.piles.find(p=>p.item==='medicine'&&p.owner.type==='ground'&&p.quantity===6);if(!medicine)throw Error('The declared registryCamp six medicines are absent');
 flushRegisteredMap(map);
 const manifest:NativeFreight413Manifest={revision:1,schemaVersion:258,fixtureSHA256:'',tick:root.tick,mapId,memberIds:map.pawns.slice(0,2).map(p=>p.id),residentIds:map.pawns.slice(2).map(p=>p.id),animalId:animal.id,destination:52,
  medicine:{sourceId:medicine.id,preparedQuantity:6,selectedQuantity:2,remainingQuantity:4},pack:{id:building.id,kind:'double-bed',grams:50000,ground,building:structuredClone(building)},
  notice:'Declared finite registryCamp32² preparation: three existing humans and shirts, existing24 survival meals/500 silver/60 cloth/6 medicines and prepared habitat; Complex Furniture research explicitly complete before baseline, one new adult female domestic muffalo and one original wood normal double-bed minified wrapper50kg. Same existing test producers, inner building pose220,17 retained. UI selects the first two humans, the animal,2/6 medicines and the bed. No tick, gathered group, pickup, handoff, departure, harvest, deconstruction history, Aulnes or geographic Camp generation is claimed.'};
 return {root,manifest};
}
