import type {CampaignState,LocalMapState} from './world-map-state.ts';
import type {AwayGroup} from './group-capture.ts';
import type {PreparedCampCenterEntry256} from './camp-center-entry-256.ts';
import type {Pawn} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {MapAreaEntryPlan} from './pawn-map-areas.ts';
/** Only the write/delete/append operations of NEW Camp entry, not a generic
 * mutability certificate. No cells/geometry/old World are scanned or cloned. */
function write(o:object,key:PropertyKey):boolean {const d=Object.getOwnPropertyDescriptor(o,key);return d?Object.hasOwn(d,'value')&&d.writable===true:!(key in o)&&Object.isExtensible(o);}
function remove(o:object,key:PropertyKey):boolean {const d=Object.getOwnPropertyDescriptor(o,key);return !d||d.configurable===true;}
function append(a:readonly unknown[],n:number):boolean {return Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&Object.getOwnPropertyDescriptor(a,'length')?.writable===true&&(n===0||Object.isExtensible(a))&&a.length+n<=4294967295;}
export function campAnimalArrayWritable256(wildlife:object):boolean {return write(wildlife,'animals');}
export function campRuntimeSlotWritable256(root:CampaignState):boolean {return !!root.worldMaps&&write(root.worldMaps,'generationRuntime');}
type BedAlias256={actor:Pawn|WildAnimal;alias:{bedId:number|null;slot?:0|1}};
export function actualNewCampEntryRecipients256(root:CampaignState,body:LocalMapState,g:AwayGroup,select:boolean,center:PreparedCampCenterEntry256,areas:readonly MapAreaEntryPlan[]|undefined,beds:readonly BedAlias256[],settlement=false):boolean {
 const maps=root.worldMaps,groups=root.worldGroups;
 if(!maps||!groups||!append(maps.sites,1)||!write(maps,'nextMapId')||!write(root,'nextId')||!write(root,'rng')||!campRuntimeSlotWritable256(root)||!write(groups,'groups')||groups.selectedGroupId===g.id&&!write(groups,'selectedGroupId')||select&&!write(maps,'selectedMapId'))return false;
 // events.push and possible splice(0, excess) both write the real array.
 const events=groups.events;if(!append(events,1))return false;
 if(events.length+1>80)for(let i=0;i<events.length;i++){const d=Object.getOwnPropertyDescriptor(events,String(i));if(!d||!Object.hasOwn(d,'value')||!d.writable||!d.configurable)return false;}
 if(settlement&&(!write(maps,'nextLordId')||!write(maps,'nextAncientCasketGroupId')||[...body.piles,...g.items,...body.packed,...g.packed??[]].some(p=>!write(p,'owner'))))return false;
 if(!body.wildlife||!campAnimalArrayWritable256(body.wildlife)||!append(body.pawns,g.members.length)||!append(body.piles,g.items.length)||g.packed&&!append(body.packed,g.packed.length)||body.jobs.length)return false;
 // The wildlife array is replaced by the private phase's fresh map result,
 // so its former array is not an append recipient.
 // flushRegisteredMap reassigns each actual local top-level value. The
 // temporary view has writable own slots; the stored body must do so too.
 if(Object.keys(body).some(k=>!write(body,k))||!write(body,'stock')||!body.filth&&!write(body,'filth'))return false;
 if(maps.rootMapId===null&&(!write(maps,'rootMapId')||Object.keys(body).some(k=>!write(root,k))||!body.filth&&!write(root,'filth')))return false;
 for(let i=0;i<g.members.length;i++){const a=g.members[i]!;if(['x','z','path','moveCooldown','planCooldown'].some(k=>!write(a,k))||!remove(a,'motion')||a.state!=='downed'&&!write(a,'state'))return false;
  const plan=areas?.[i];if(plan?.mapAreas&&!write(a,'mapAreas')||!remove(a,'allowedAreaReturn')||(plan?.areaId===undefined?!remove(a,'allowedAreaId'):!write(a,'allowedAreaId')))return false;
 }
 for(const a of g.animalOwners?.members??[])if(['x','z','path','nextDecision'].some(k=>!write(a,k))||!remove(a,'motion')||a.state!=='downed'&&!write(a,'state'))return false;
 for(const {actor,alias}of beds){if('species'in actor){if(actor.domestic&&(alias.bedId===null?!remove(actor.domestic,'bedId'):!write(actor.domestic,'bedId')))return false;}else if(!write(actor,'bedId')||(alias.slot===undefined?!remove(actor,'bedSlot'):!write(actor,'bedSlot')))return false;}
 for(const p of center.placements)if(!write(p.actor,'arrivalRotation'))return false;
 // applyPreparedCampCenterFog only deletes these actually revealed flags.
 for(const cell of center.revealedCells)if(!remove(body.tiles[cell]!,'fogged'))return false;
 return true;
}
