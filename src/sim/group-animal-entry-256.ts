import type {World,Cell} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import type {WildAnimal,WildlifeState} from './wildlife-state.ts';
import {MAX_WILDLIFE} from './wildlife-state.ts';
import {animalNavigation} from './wildlife-navigation.ts';
import {duckPhysicalOwnerCount256} from './duck-flyer-runtime-256.ts';
import {animalCore256,isAnimalSpecies256} from './animal-core-v256.ts';
/** Pure placement on the ACTUAL destination. No tile/resource is rewritten;
 * downed originals need a free physical cell just like standing arrivals. */
export function prepareGroupAnimalEntry256(map:World,g:AwayGroup,centre:Cell,humanCells:readonly Cell[]):{animal:WildAnimal;cell:Cell}[]|undefined {
 const animals=g.animalOwners?.members??[];centre={x:Math.max(0,Math.min(map.width-1,centre.x)),z:Math.max(0,Math.min(map.height-1,centre.z))};if(!animals.length)return [];if(map.schemaVersion<256||duckPhysicalOwnerCount256(map)+animals.length>MAX_WILDLIFE)return;
 const used=new Set([...map.pawns,...map.wildlife?.animals??[],...humanCells].map(p=>p.z*map.width+p.x)),placed:{animal:WildAnimal;cell:Cell}[]=[];let fenced:ReturnType<typeof animalNavigation>|undefined,unfenced:ReturnType<typeof animalNavigation>|undefined;
 for(const animal of animals){const noFence=isAnimalSpecies256(animal.species)?animalCore256(animal.species).race.roamMtbDays===null:animal.species==='hare'||animal.species==='snow-hare'||animal.species==='red-fox';const nav=noFence?(unfenced??=animalNavigation(map,false,true)):(fenced??=animalNavigation(map));let selected:Cell|undefined;
  for(let r=0;r<Math.max(map.width,map.height)&&!selected;r++)for(let z=Math.max(0,centre.z-r);z<=Math.min(map.height-1,centre.z+r)&&!selected;z++)for(let x=Math.max(0,centre.x-r);x<=Math.min(map.width-1,centre.x+r);x++){if(Math.max(Math.abs(x-centre.x),Math.abs(z-centre.z))!==r||used.has(z*map.width+x)||!nav.free({x,z}))continue;selected={x,z};break;}
  if(!selected)return;used.add(selected.z*map.width+selected.x);placed.push({animal,cell:selected});
 }return placed;
}
/** Same empty wildlife owner shape as explicit enableWildlife(count0), created
 * only because real animals physically enter; no population/RNG draw offered. */
export function commitGroupAnimalEntry256(map:World,placements:readonly {animal:WildAnimal;cell:Cell}[]):void {
 if(!placements.length)return;map.wildlife??={profile:'temperate-hares-v1',rng:(map.seed^0x784caf31)>>>0||1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};
 for(const {animal:a,cell}of placements){a.x=cell.x;a.z=cell.z;a.path=[];delete a.motion;if(a.state!=='downed')a.state='idle';a.nextDecision=map.tick;map.wildlife.animals.push(a);}
}
