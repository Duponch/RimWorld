import {requireOriginalStartingRoster256,consumeOriginalStartingRoster256,type StartingOriginalRoster256} from './starting-original-roster-256.ts';
import {prepareStartingPetBirth256} from './starting-pet-birth-256.ts';
import {captureStartingDropPhysics256} from './starting-drop-physics-256.ts';
import {findStartingPodDropSpot256} from './starting-cell-finder-256.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256,type CoreStartingPod256,type CoreStartingArrivalPending256} from './starting-pod-state-256.ts';
import {setMaterialForbidden256} from './material-permission-256.ts';
import {ITEM_DEFINITIONS} from './items.ts';
import {CORE_STARTING_SUPPLIES_256} from './starting-scenparts-data-256.ts';
export {CORE_STARTING_SUPPLIES_256,CORE_STARTING_SCENPARTS_SEED_PART_256} from './starting-scenparts-data-256.ts';
import {isApparelItem,newApparelState} from './apparel-rules.ts';
import {isWeaponItem,newWeaponState} from './equipment-rules.ts';
import {drawStartingApparelColor256} from './starting-apparel-color-256.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
import {localGenerationStepSeed} from './world-site-geography.ts';
import {CORE_STARTING_SCENPARTS_SEED_PART_256} from './starting-scenparts-data-256.ts';
import type {Cell,MaterialPile,World} from './types.ts';
type MadeSupply256=Omit<MaterialPile,'owner'>;
const scatterFrontiers=new WeakMap<CoreStartingArrivalPending256,{random:WorldGenerationRandom;seed:number;counter:number;consumed:boolean}>();
/** Same private875 stream owner, claimed once before its five scatter parts. */
export function claimCoreStartingScatterFrontier256(arrival:CoreStartingArrivalPending256,random:WorldGenerationRandom):void {
 const owner=scatterFrontiers.get(arrival),state=random.state;if(!owner||owner.consumed||owner.random!==random||owner.seed!==state.seed||owner.counter!==state.counter)throw Error('Actual post-pod875 stream is absent, changed or consumed');owner.consumed=true;
}
/** Actual unpublished875 map only. Refusal discards this whole candidate;
 * this function is never called on an active or loaded World. */
export function applyCoreStartingPodBirth256(world:World,roster:StartingOriginalRoster256,start850:number,random:WorldGenerationRandom):CoreStartingArrivalPending256 {
 requireOriginalStartingRoster256(world,roster);
 if(!(random instanceof WorldGenerationRandom)||random.state.seed!==(localGenerationStepSeed(world.seed,CORE_STARTING_SCENPARTS_SEED_PART_256,0)>>>0)||random.state.counter!==0)throw Error('Actual initial875 seed/counter frontier is missing');
 if(world.schemaVersion!==256||world.tick!==0||world.site?.revision!==3||world.planet?.revision!==3||Object.hasOwn(world,'startingArrival')||!Number.isInteger(start850)||start850<0||start850>=world.tiles.length||!Number.isSafeInteger(world.nextId+17))throw Error('Actual initial875 frontier is missing');
 for(const [item] of CORE_STARTING_SUPPLIES_256)if(!Object.hasOwn(ITEM_DEFINITIONS,item))throw Error('Actual875 supply definition missing: '+item);
 const center={x:start850%world.width,z:Math.floor(start850/world.width)},capture=captureStartingDropPhysics256(world,center);
 // Actual MakeThing sequence, BEFORE the pet and the three transporters.
 const supplies:MadeSupply256[]=CORE_STARTING_SUPPLIES_256.map(([item,quantity])=>{
  const id=world.nextId++,definition=ITEM_DEFINITIONS[item];
  const apparel=isApparelItem(item)?newApparelState(item):undefined,color=drawStartingApparelColor256(item,random);
  if(apparel&&color)apparel.birthColor=color;
  return {id,item,kind:definition.kind,quantity,...apparel?{apparel}:isWeaponItem(item)?{weapon:newWeaponState(item)}:{}};
 });
 const names=new Set(roster.all.map(e=>e.pawn.name));
 for(const row of world.worldPawns!.owners)if(row.kind==='human')names.add(row.actor.name);
 const pet=prepareStartingPetBirth256(world,roster,center,random,names);if('blocked'in pet)throw Error('Selected875 pet blocked: '+pet.blocked);
 world.nextId=pet.nextId;
 const pods:CoreStartingPod256[]=[],groups=roster.selected.map(e=>({entry:e,loose:[] as MadeSupply256[],pet:false}));
 supplies.forEach((pile,i)=>groups[i%3]!.loose.push(pile));groups[supplies.length%3]!.pet=true;
 for(const group of groups){
  let destination=findStartingPodDropSpot256(world.width,world.height,center,capture.readers,random);
  if(!destination)for(let attempt=0;attempt<1000;attempt++){const candidate={x:random.integer(0,world.width),z:random.integer(0,world.height)};if(capture.fallbackAllowed(candidate)){destination=candidate;break;}}
  if(!destination)throw Error('Actual875 drop search and random fallback exhausted');
  if(!Number.isSafeInteger(world.nextId+2))throw Error('Starting transporter namespace exhausted');
  const id=world.nextId++,skyfallerId=world.nextId++,pawn=group.entry.pawn;
  const items:MaterialPile[]=group.loose.map(born=>Object.assign(born,{owner:{type:'starting-pod' as const,podId:id}}));
  for(const item of items)setMaterialForbidden256(item,true);
  const animals=group.pet?[pet.animal]:[],order:CoreStartingPod256['order']=[{kind:'human',id:pawn.id},...items.map(item=>({kind:'item' as const,id:item.id})),...animals.map(animal=>({kind:'animal' as const,id:animal.id}))];
  // Birth possessions stay attached to their actual human; they are not
  // re-generated, round-robin supplies or independently placed floor stacks.
  items.push(...group.entry.items);
  const fallCore=random.integer(120,201);
  pods.push({id,skyfallerId,cell:destination,pawn,items,animals,order,phase:'incoming',fallCore,remainingCore:fallCore,ageCore:0,roofHit:false});capture.reservePod(destination);
 }
 pet.commit();
 // Every drop search/ID bound succeeded before any chosen original changes
 // its position. No failed second/third capsule leaves the first human moved.
 for(const pod of pods)for(const actor of [pod.pawn,...pod.animals]){actor.x=pod.cell.x;actor.z=pod.cell.z;}
 const maxFall=Math.max(...pods.map(p=>p.fallCore)),arrival:CoreStartingArrivalPending256={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'incoming',start:0,landAt:Math.ceil(maxFall/10),openAt:Math.ceil((maxFall+111)/10),personalTick:0,atCore:0,pods,openedCells:[]};
 world.startingArrival=arrival;consumeOriginalStartingRoster256(world,roster);scatterFrontiers.set(arrival,{random,...random.state,consumed:false});return arrival;
}
