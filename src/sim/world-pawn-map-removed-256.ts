import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {prepareMapRemoved259} from './world-pawn-map-removed-259.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {registeredCampaign,registeredMap,registeredMapId} from './world-map-context.ts';
import {GEOGRAPHIC_FAUNA_PROFILE_256} from './geographic-fauna-profile-256.ts';
import {captureDuckMapRemovedOwners256} from './duck-owner-capture-256.ts';
import {captureHumanOwners} from './human-owners.ts';
import {cleanMapRemovedAnimal256} from './world-lost-owners.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import {geographicPlanetClimateDefinition256,geographicLongitudeOffsetCore256} from './site-climate.ts';
import {preparePassedToWorld256} from './world-pawn-transition-256.ts';
import {worldPawnActiveBoundary256} from './world-pawn-life-256.ts';
import {validateWorldPawnOwners256} from './world-pawn-save-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import type {World} from './types.ts';
import type {CampaignState,AbandonedMapContents} from './world-map-state.ts';
import {mutableWorldPawnOriginal256,type WorldPawnOwner256,type WorldPawnsState256} from './world-pawn-state-256.ts';
import type {WildAnimal} from './wildlife-state.ts';

export type CampMapRemoved256={ok:false;reason:string}|{ok:true;current():boolean;commit(compact:AbandonedMapContents):void};
const alive=(a:{state:string;health?:WildAnimal['health']})=>a.state!=='dead'&&!a.health?.death;
/** Same stored geographic civil anchor used by seasonal temperature/snow.
 * Reverse its TRUE longitude offset, never return local tick or infer tick0.
 * This does not retroactively certify a historical initial climate producer. */
export function actualCampRemovalAbsCore256(root:CampaignState,map:World):number {
 const p=root.planet,c=map.climate,m=root.worldMaps;
 if(p?.revision!==3||c?.revision!==4||!m||map.site?.revision!==3||c.tileId!==map.site.tileId)throw Error('Actual geographic Camp climate/clock owner required');
 const local=(c.calendarOrigin+map.tick-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude);
 const home=geographicPlanetClimateDefinition256(p,p.homeTile),shared=(m.calendarOrigin+root.tick)*10-geographicLongitudeOffsetCore256(home.longitude);
 if(!Number.isSafeInteger(local)||local<0||local!==shared)throw Error('Camp absolute clock differs from its actual shared geographic anchor');
 return local;
}

/** Bounded Camp MapDeiniter adapter: Decide ADDS each living original; no
 * immediate GC, KeepForever, archive promotion, new ID or source World clone.
 * Unsupported actual owners refuse BEFORE memories/cleanup/removal start. */
export function prepareCampMapRemoved256(input:CampaignState,map:World,mapId:number,automatic:boolean):CampMapRemoved256 {
 const root=registeredCampaign(input);if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||isSchema263OrLater(Number(root.schemaVersion)))))&&root.planet?.revision===3)return prepareMapRemoved259(root,map,mapId,automatic);const site=root.worldMaps?.sites.find(s=>s.id===mapId);
 const no=(reason:string):CampMapRemoved256=>({ok:false,reason});
 const noop:CampMapRemoved256={ok:true,current:()=>true,commit(){}};
 if(!isSchema256Or257(root.schemaVersion)||site?.kind!=='camp')return noop; // literal older/other-map path
 if(registeredCampaign(map)!==root||registeredMapId(map)!==mapId||registeredMap(root,mapId)!==map||map.tick!==root.tick)return no('MapRemoved requires its actual current registered Camp');
 const humans=captureHumanOwners(map,{},false).slots.filter(s=>s.pawn&&alive(s.pawn)&&!['scout-away','commercial-away','group-away','group-loss'].includes(s.kind));
 if(humans.length)return no('Les personnes restantes exigent leur vraie affiliation mondiale et transition Free ; le camp est conservé.');
 const living=[...(map.wildlife?.animals??[]).filter(alive).map(animal=>({animal,clock:map.tick})),...captureDuckMapRemovedOwners256(map)];
 if(!living.length)return noop; // corpses retain their literal terminal owners
 const state=root.worldPawns,factions=root.worldFactions;
 if(!state||!factions)return no('Le propriétaire WorldPawns doit être né avec cette campagne avant le retrait de ses originaux.');
 if(!Object.isExtensible(state.owners)||!Object.getOwnPropertyDescriptor(state.owners,'length')?.writable||!Object.getOwnPropertyDescriptor(map.wildlife!,'animals')?.writable||map.wildlife!.flyers&&!Object.getOwnPropertyDescriptor(map.wildlife!,'flyers')?.writable)return no('MapRemoved requires the mutable actual worker owners');
 const nativeBefore=state.nativeOrder;if(!nativeWorldPawnOrderCurrent256(state,nativeBefore))return no('Actual native MapRemoved order is not mutable/admitted');
 const now=root.tick*10,at=state.atCore;
 // Automatic retirement runs after local actors and BEFORE WorldPawns life.
 // A new row already at now receives delta0 in that ensuing real interval.
 if(at!==now&&!(automatic&&at+10===now))return no('La frontière réelle WorldPawns/Camp ne correspond pas au commit de retrait.');
 let enteredAtAbsCore:number;try{enteredAtAbsCore=actualCampRemovalAbsCore256(root,map);}catch(e){return no(e instanceof Error?e.message:String(e));}
 const originals=new Set<WildAnimal>(),ids=new Set<number>();
 const context={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}};
 // Null-faction animals cannot enter Notify_PassedToWorld's faction branch.
 // An unexpected draw blocks preparation; no alternate RNG implementation.
 const random={float:(_a:number,_b:number):number=>{throw Error('Neutral animal MapRemoved must not draw a faction choice');}};
 // Only row records/outcomes are staged, never map grids, gameplay owners or
 // another registry in the published campaign. Existing rows are not changed.
 const staged:WorldPawnsState256={...state,atCore:now,owners:state.owners.slice()},prepared:{original:WildAnimal;outcome:Extract<WorldPawnOwner256,{kind:'animal'}>;cleanedJson:string}[]=[];
 try{for(const {animal,clock} of living){
  if(originals.has(animal)||ids.has(animal.id))return no('Duplicate actual Camp animal owner');originals.add(animal);ids.add(animal.id);
  if(!mutableWorldPawnOriginal256(animal))return no('MapRemoved requires the original mutable animal');
  if(!animal.growthTracker||!animal.wander)return no('Animal historique sans propriétaire prospectif complet : aucun réétiquetage WorldPawn.');
  if(animal.domestic)return no('Le changement réel de faction Free de cet animal apprivoisé n’est pas encore représenté.');
  if(clock!==map.tick)return no('Le contenu vivant possède une autre horloge détenue ; aucun rattrapage biologique n’est offert.');
  const items=map.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===animal.id),packed=map.packed.filter(p=>p.owner.type!=='ground'&&p.owner.pawnId===animal.id);
  const actor=structuredClone(animal);cleanMapRemovedAnimal256(actor,map.tick);unclaimDetachedActorBed256(actor);const cleanedJson=JSON.stringify(actor);
  const row:Extract<WorldPawnOwner256,{kind:'animal'}>={kind:'animal',actor,factionId:null,originMapId:mapId,context,clockCore:now,enteredAtAbsCore,mode:'active',items,packed,...map.wildlife?.profile===GEOGRAPHIC_FAUNA_PROFILE_256&&map.wildlife.animals.includes(animal)?{everSeenByPlayer:true as const}:{}};
  const boundary=worldPawnActiveBoundary256(row);if(boundary)return no(boundary);
  const pass=preparePassedToWorld256(staged,row,factions,random,{situation:'Free'});if(!pass.ok)return no(pass.reason);pass.commit();
  if(pass.row.kind!=='animal')throw Error('Actual animal MapRemoved changed kind');
  prepared.push({original:animal,outcome:pass.row,cleanedJson});
 }}catch(e){return no(e instanceof Error?e.message:String(e));}
 // Same record, clinical, context, FK and Thing-ID guards as RAW/MAIN. The
 // source's already-admitted namespace is unchanged: no identity is allocated.
 const errors=validateWorldPawnOwners256(staged,root,new Set());if(errors.length)return no(errors[0]!);
 const rngBefore=root.rng,nextId=root.nextId,membership=state.owners.slice(),before=prepared.map(p=>JSON.stringify(p.original)),wildlife=map.wildlife;
 const sourceAnimals=wildlife!.animals,sourceFlyers=wildlife!.flyers,sourceRows=sourceAnimals.slice(),sourceHeld=sourceFlyers?.slice();let used=false;
 const header=()=>!used&&nativeWorldPawnOrderCurrent256(state,nativeBefore)&&root.tick*10===now&&root.nextId===nextId&&root.rng===rngBefore&&root.worldPawns===state&&state.atCore===at&&state.owners.length===membership.length&&state.owners.every((r,i)=>r===membership[i])&&map.wildlife===wildlife&&wildlife!.animals===sourceAnimals&&sourceAnimals.length===sourceRows.length&&sourceAnimals.every((a,i)=>a===sourceRows[i])&&wildlife!.flyers===sourceFlyers&&sourceFlyers?.length===sourceHeld?.length&&!sourceFlyers?.some((f,i)=>f!==sourceHeld![i]);
 return {ok:true,current:()=>header()&&prepared.every((p,i)=>JSON.stringify(p.original)===before[i]),commit(compact){
  if(!header())throw Error('Stale actual Camp MapRemoved transaction');
  if(compact.mapId!==mapId||compact.removedAt!==root.tick||prepared.some(p=>compact.animals.filter(r=>r.animal===p.original).length!==1))throw Error('MapRemoved cleanup lost an actual original');
  // detachMapOwners/bed cleanup has now run on the originals. Verify its
  // exact record-only result BEFORE moving or adopting any clinical outcome.
  for(const p of prepared)if(JSON.stringify(p.original)!==p.cleanedJson)throw Error('MapRemoved original differs from its preflight cleanup');
  used=true;cancelWorldPawnGC256(state);
  for(const {original,outcome} of prepared){for(const k of Object.keys(original))delete (original as unknown as Record<string,unknown>)[k];Object.assign(original,outcome.actor);outcome.actor=original;state.owners.push(outcome);}
  commitNativeWorldPawnOrder256(state,nativeBefore,staged.nativeOrder);
  compact.animals=compact.animals.filter(r=>!originals.has(r.animal));wildlife!.animals=sourceAnimals.filter(a=>!originals.has(a));if(sourceFlyers)wildlife!.flyers=sourceFlyers.filter(f=>!originals.has(f.animal));
 }};
}
