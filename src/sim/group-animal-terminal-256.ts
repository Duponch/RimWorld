import {recordCaravanInventoryEffect256} from './group-animal-food-256.ts';
import type {World} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {GroupAnimalOrigin256,GroupAnimalLoss256} from './group-animal-state-256.ts';
import {groupPhysicalPawns256} from './group-mixed-pawns-256.ts';
import {draftSplitInventory,splitInventoryDraftCurrent,commitSplitInventory} from './group-inventory-reorganization.ts';
import {registeredCampaign} from './world-map-context.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
/** Pawn.Strip -> real inventories of the actual remaining cohort. Private RNG
 * and fragment IDs are committed with the same originals, never fake stock. */
export function stripTerminalCaravanMember256(w:World,g:AwayGroup,id:number):void {
 const members=groupPhysicalPawns256(g);if(!members.some(p=>p.id===id)||!g.members.some(p=>p.id!==id&&p.state!=='dead'&&!p.health?.death))throw Error('Terminal strip needs another actual Owner');
 const draft=draftSplitInventory(members,g.items,new Set([id]),[],w.nextId,w.rng,w.tick,g.packed??[],[],id,w.schemaVersion);if(!draft||draft.child.length||draft.childPacked.length||!splitInventoryDraftCurrent(g.items,draft,g.packed??[]))throw Error('Actual terminal possessions cannot transfer');
 const intoInventory=g.items.filter(p=>(p.owner.type==='apparel'||p.owner.type==='equipment')&&p.owner.pawnId===id);const staged={...g,reorganization:g.reorganization?{...g.reorganization,inventoryEffects:{...g.reorganization.inventoryEffects}}:undefined};for(const p of intoInventory)recordCaravanInventoryEffect256(staged,p.item,p.quantity);
 commitSplitInventory(draft);if(staged.reorganization)g.reorganization=staged.reorganization;g.items=draft.source;if(draft.sourcePacked.length)g.packed=draft.sourcePacked;else delete g.packed;w.nextId=draft.nextId;w.rng=draft.rng;
}
function retain(w:World,g:AwayGroup,a:WildAnimal,o:GroupAnimalOrigin256,reason:GroupAnimalLoss256['reason'],personalTick=w.tick):void {
 const root=registeredCampaign(w);if(!root.worldGroups||!g.animalOwners?.members.includes(a))throw Error('Missing real terminal animal owner');
 const items=g.items.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===a.id),packed=g.packed?.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===a.id)??[];
 const loss:GroupAnimalLoss256={reason,groupId:g.id,tile:g.tile,tick:reason==='death'?a.health!.death!.tick:personalTick,animal:a,origin:o,items,...packed.length?{packed}:{}};
 (root.worldGroups.animalLosses??=[]).push(loss);const removed=new Set(items);g.items=g.items.filter(p=>!removed.has(p));if(g.packed){const remove=new Set(packed);g.packed=g.packed.filter(p=>!remove.has(p));if(!g.packed.length)delete g.packed;}
 g.animalOwners.members=g.animalOwners.members.filter(p=>p!==a);g.animalOwners.origins=g.animalOwners.origins.filter(p=>p.pawnId!==a.id);g.animalOwners.order=g.animalOwners.order.filter(id=>id!==a.id);
}
export function retireCaravanAnimal256(w:World,g:AwayGroup,a:WildAnimal,o:GroupAnimalOrigin256):void {
 if(a.state!=='dead'||!a.health?.death)throw Error('Animal terminal is not a true death');
 if(g.members.some(p=>p.state!=='dead'&&!p.health?.death))stripTerminalCaravanMember256(w,g,a.id);
 unclaimDetachedActorBed256(a);retain(w,g,a,o,'death');
}
/** Last human Owner disappears: living animals remain original frozen world
 * records, not a newly actionable animal caravan or a synthetic local corpse. */
export function archiveOwnerlessCaravanAnimals256(w:World,g:AwayGroup,personalTick:number):void {
 if(!Number.isSafeInteger(personalTick)||personalTick<0||personalTick>w.tick)throw Error('Invalid lost animal personal capture');
 for(const a of [...g.animalOwners?.members??[]]){const o=g.animalOwners!.origins.find(o=>o.pawnId===a.id);if(!o)throw Error('Missing lost animal origin');retain(w,g,a,o,a.state==='dead'?'death':'caravan-lost',personalTick);}
}
