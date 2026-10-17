import {groupPhysicalPawns256} from './group-mixed-pawns-256.ts';
import type {CaravanPhysicalPawn256} from './group-animal-state-256.ts';
import type {Pawn,World,CommandResult} from './types.ts';
import type {AwayGroup} from './group-capture.ts';
import type {GroupTravelRevision} from './group-reorganization-state.ts';
import {groupPlayerOwner256} from './group-route-interval-256.ts';
import {pawnBody} from './health-rules.ts';
import {hasMentalBreak} from './mental-state.ts';
import {infectionNeedsRest} from './infection-state.ts';
import {fluNeedsRest} from './flu-state.ts';
import {immuneDiseasesNeedRest} from './immune-diseases-state.ts';
export type GroupCaravanCarryPawn256=Pawn&{caravanCarrySick?:boolean};
export type GroupCaravanCarryCommand256={type:'group-carry-sick';groupId:number;pawnId:number;enabled:boolean};
/** Core predicate is an immunizable, not-yet-immune condition. Injury, hunger,
 * rest deficit or Downed alone must never fabricate a carried patient. */
export function groupWouldBenefitFromCarrying256(p:CaravanPhysicalPawn256):boolean {
 const h=p.health;return p.state!=='dead'&&!h?.death&&!!h&&(infectionNeedsRest(h)||fluNeedsRest(h)||immuneDiseasesNeedRest(h));
}
export function groupWantsToBeCarried256(p:CaravanPhysicalPawn256&{caravanCarrySick?:boolean}):boolean{return p.caravanCarrySick!==false&&groupWouldBenefitFromCarrying256(p);}
/** Derived carrier tracker, not another Pawn owner. One healthy manipulator
 * per actual patient, consumed from the end of the eligible carrier list. */
export function recalculateGroupCarried256(g:AwayGroup,movingNow:boolean):ReadonlySet<number> {
 const carried=new Set<number>();if(!movingNow)return carried;
 const carriers=g.members.filter(p=>p.state!=='dead'&&!p.health?.death&&p.state!=='downed'&&!hasMentalBreak(p)&&pawnBody(p).capacities.manipulation>0&&!groupWantsToBeCarried256(p));
 for(const p of groupPhysicalPawns256(g)){if(!carriers.length)break;if(groupWantsToBeCarried256(p)){carried.add(p.id);carriers.pop();}}
 return carried;
}
const closed=(v:unknown):v is GroupCaravanCarryCommand256=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(v);if(keys.length!==4||!['type','groupId','pawnId','enabled'].every(k=>keys.includes(k)))return false;
 const d=Object.getOwnPropertyDescriptors(v);if(Object.values(d).some(p=>!Object.hasOwn(p,'value')||!p.enumerable))return false;
 return d.type!.value==='group-carry-sick'&&Number.isSafeInteger(d.groupId!.value)&&d.groupId!.value>0&&Number.isSafeInteger(d.pawnId!.value)&&d.pawnId!.value>0&&typeof d.enabled!.value==='boolean';
};
export const validGroupCaravanCarryCommand256=closed;
/** Called in the actual bound group view after correlated command dispatch. */
export function setGroupCaravanCarrySick256(w:World,value:unknown):CommandResult {
 const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
 if(!closed(value)||w.schemaVersion<256)return fail('Préférence de portage invalide.');
 const g=w.group as (AwayGroup&{travel?:GroupTravelRevision})|undefined;
 if(!g||!('members' in g)||g.id!==value.groupId||g.travel?.revision!==1&&!g.animalOwners?.interval||g.lastPersonalTick!==w.tick)return fail('Choisissez une caravane actuelle confirmée.');
 const p=groupPhysicalPawns256(g).find(p=>p.id===value.pawnId);if(!p||('species'in p?!p.domestic:g.travel?.revision!==1||!groupPlayerOwner256(p)))return fail('Ce membre joueur n’est plus disponible.');
 (p as CaravanPhysicalPawn256&{caravanCarrySick?:boolean}).caravanCarrySick=value.enabled;return {ok:true};
}

/** Apply at each real Pawn boundary (local/away/terminal/lost), before personal
 * guards read the flag. Absence is the Core human default only in new travel. */
export function validGroupCaravanCarryPawnField256(p:unknown,version:number):boolean {
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const d=Object.getOwnPropertyDescriptor(p,'caravanCarrySick');if(!d)return true;
 return version>=256&&Object.hasOwn(d,'value')&&d.enumerable===true&&typeof d.value==='boolean';
}
