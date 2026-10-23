import type {CampaignState} from './world-map-state.ts';
import type {PawnMapAreas} from './pawn-map-areas.ts';
import {prepareRemovedMapAreas,type RemovedMapAreaPlan} from './pawn-map-areas.ts';
import type {ReformDeparture260} from './group-reform-departure-260.ts';
/** Plan against true recipient references and the exact admitted alias values.
 * No temporary World or registry owner is constructed. */
export function prepareReformRemovalAreas260(root:CampaignState,mapId:number,ids:ReadonlySet<number>,departure:ReformDeparture260):RemovedMapAreaPlan {
 const ordinary=prepareRemovedMapAreas(root,mapId,ids),actors=[...new Set([...ordinary.updates.map(u=>u.pawn),...departure.people])];
 const updates:RemovedMapAreaPlan['updates']=[];
 for(const p of actors){const mapAreas=departure.valueAfter(p,'mapAreas') as PawnMapAreas|undefined,area=departure.valueAfter(p,'allowedAreaId') as number|undefined,back=departure.valueAfter(p,'allowedAreaReturn');
  const rows=mapAreas?.assignments,next=rows?.filter(r=>r.mapId!==mapId),clearAlias=area!==undefined&&ids.has(area);
  if(clearAlias||rows&&next!.length!==rows.length)updates.push({pawn:p,...rows?{next:{revision:1,assignments:next!}}:{},clearAlias,before:JSON.stringify([area,back,mapAreas])});
 }
 return {...ordinary,updates};
}
