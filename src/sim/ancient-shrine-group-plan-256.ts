/** Original bounded transposition of the Core4871 AncientShrinesGroup placement.
 * A transient layout only: no World, Thing owner, loot or occupant is created. */
import {takeAncientCasketGroupId256,type AncientCasketGroupIds256} from './ancient-casket-group-ids-256.ts';
import type {Cell} from './types.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
export interface AncientShrineRect256 {minX:number;minZ:number;maxX:number;maxZ:number}
export type AncientSharedPodContents256='ancient-friendly'|'ancient-hostile'|'slave'|null;
export interface AncientShrinePlacement256 {
 rect:AncientShrineRect256;
 /** East-facing original1×2, occupying its anchor and the next east cell. */
 casket:{cell:Cell;orientation:1};
 interactionCell:Cell;
}
export interface AncientShrineGroupPlan256 {
 /** Present only when the caller supplies its real detached campaign allocator. */
 groupId?:number;
 /** null means the real per-casket producer must draw its PodContentsType.
  * It never means empty, peaceful or absent. */
 sharedContents:AncientSharedPodContents256;
 /** Source loop / symbol-push order. BaseGen consumes it last-in-first-out. */
 pushOrder:AncientShrinePlacement256[];
}
const integer=(v:number)=>Number.isSafeInteger(v)&&v>=0;
/** standable reads the actual unchanged map AFTER Temple Spawn. It is queried
 * only for the real casket interaction cell and never mutates or creates a map.
 * The optional actual allocator is used at the source allocation point,
 * after shared content selection and before any placement/skip draw. */
export function planAncientShrinesGroup256(
 rect:AncientShrineRect256,
 bounds:Readonly<{width:number;height:number}>,
 random:Pick<WorldGenerationRandom,'value'>,
 standable:(cell:Cell)=>boolean,
 requestedContents?:AncientSharedPodContents256,
 groupIds?:AncientCasketGroupIds256,
):AncientShrineGroupPlan256 {
 if(!integer(bounds.width)||!integer(bounds.height)||bounds.width<1||bounds.height<1||!integer(rect.minX)||!integer(rect.minZ)||!integer(rect.maxX)||!integer(rect.maxZ)||rect.maxX<rect.minX||rect.maxZ<rect.minZ||rect.maxX>=bounds.width||rect.maxZ>=bounds.height
  ||requestedContents!==undefined&&requestedContents!==null&&!['ancient-friendly','ancient-hostile','slave'].includes(requestedContents))throw Error('Invalid actual AncientShrinesGroup rectangle or content choice');
 if(groupIds!==undefined&&(!Number.isInteger(groupIds.nextId)||groupIds.nextId<0||groupIds.nextId>2147483646))throw Error('Actual casket group allocator missing or exhausted');
 let sharedContents=requestedContents??null;
 if(sharedContents===null){const draw=random.value();sharedContents=draw<.5?null:draw<Math.fround(.7)?'slave':'ancient-hostile';}
 const groupId=groupIds===undefined?undefined:takeAncientCasketGroupId256(groupIds);
 const columns=Math.floor((rect.maxX-rect.minX+1)/3),rows=Math.floor((rect.maxZ-rect.minZ+1)/2),pushOrder:AncientShrinePlacement256[]=[];
 for(let z=0;z<rows;z++)for(let x=0;x<columns;x++){
  // This draw precedes even the >=6 check. The inner break does not terminate
  // later rows; preserving it matters to the subsequent GenStep stream.
  if(random.value()<.25)continue;
  if(pushOrder.length>=6)break;
  const minX=rect.minX+x*3,minZ=rect.minZ+z*2,candidate={minX,minZ,maxX:minX+3,maxZ:minZ+2};
  if(candidate.maxX>rect.maxX||candidate.maxZ>rect.maxZ)continue;
  const cell={x:minX+1,z:minZ+1},interactionCell={x:cell.x,z:cell.z-1};
  if(!standable(interactionCell))continue;
  pushOrder.push({rect:candidate,casket:{cell,orientation:1},interactionCell});
 }
 return {sharedContents,pushOrder,...groupId===undefined?{}:{groupId}};
}
/** Caller iterates this sequence once while resolving the real child symbols.
 * It does not roll contents, allocate IDs or precommit a successful interior. */
export function ancientShrineExecutionOrder256(plan:AncientShrineGroupPlan256):readonly AncientShrinePlacement256[] {return [...plan.pushOrder].reverse();}
