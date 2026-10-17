import {validAncientCasketOpenCommand256} from './ancient-casket-command-256.ts';
import {ancientCasketHasContents256,ancientCasketInteraction256,isAncientCasket256,type AncientCasket256,type AncientCasketCommand256} from './ancient-casket-state-256.ts';
import {isColonist} from './affiliation.ts';
import {medicalWorkRefusal} from './health-rules.ts';
import {allowedAreaReason} from './allowed-area-state.ts';
import {blockedCells,reachableCells,routeToCell,canStopAt} from './pathfinding.ts';
import {reservedServiceCells} from './service-reservations.ts';
import {groupOnMapMember} from './group-state.ts';
import {scoutOnMapId} from './caravan-trip.ts';
import {commercialOnMapId} from './commercial-trip.ts';
import type {Cell,Pawn,World} from './types.ts';

export const ancientCasketOpenerCapable256=(p:Pawn)=>isColonist(p)&&!p.prisoner&&!p.draft&&!p.mental?.crisis&&!p.burning&&!medicalWorkRefusal(p)&&!['dead','downed'].includes(p.state);
export const ancientCasketClaim256=(w:World,id:number,except?:number)=>w.pawns.some(p=>p.id!==except&&p.openCasket?.casketId===id);
export type AncientCasketOpenIntent256={ok:false;reason:string}|{ok:true;pawn:Pawn;target:AncientCasket256;path:Cell[]};
/** Worker menu query and committed order share these same true capability,
 * target, area, reservation and path predicates. Read only; no job or owner is
 * created. Cargo release and the actual opening commit keep their own owners. */
export function ancientCasketOpenIntent256(w:World,c:AncientCasketCommand256):AncientCasketOpenIntent256 {
 const fail=(reason:string):AncientCasketOpenIntent256=>({ok:false,reason});
 if(!validAncientCasketOpenCommand256(c,w.schemaVersion,w.nextId))return fail('Ordre d’ouverture invalide.');
 const p=w.pawns.find(p=>p.id===c.pawnId),target=w.structures.find((s):s is AncientCasket256=>s.id===c.casketId&&isAncientCasket256(s));
 if(!p||!ancientCasketOpenerCapable256(p)||!target||!ancientCasketHasContents256(target.casket))return fail('Colon libre et capable, et capsule ancienne occupée requis.');
 if(groupOnMapMember(w,p.id))return fail('Terminez ou annulez la préparation du groupe avant de donner un autre ordre.');
 if(p.id===(scoutOnMapId(w)??commercialOnMapId(w)))return fail('Terminez ou annulez le voyage et son déchargement avant de donner un autre ordre.');
 if(ancientCasketClaim256(w,target.id,p.id))return fail('Cette capsule est déjà réservée.');
 const cell=ancientCasketInteraction256(target),reason=allowedAreaReason(w,p,cell);if(reason)return fail(reason);
 const reserved=reservedServiceCells(w,p.id);if(reserved.has(cell.z*w.width+cell.x))return fail('La case d’interaction est déjà réservée.');
 const reach=reachableCells(w,p,blockedCells(w),reserved),path=canStopAt(w,cell,reach)?routeToCell(w,cell,reach):null;
 if(path===null)return fail('La vraie case d’interaction est inaccessible.');
 return {ok:true,pawn:p,target,path};
}
