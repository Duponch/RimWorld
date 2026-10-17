import {ancientCasketCells256} from './ancient-casket-physical-256.ts';
import {shipChunkNextRandom256,shipChunkRefund256} from './ship-chunk-leavings-256.ts';
import {addFilth} from './filth.ts';
import {groundCapacity,planGroundPlacement} from './ground-placement.ts';
import {addMaterial,materialCanFit} from './materials.ts';
import {materialAllowedForPlayer256,setMaterialForbidden256} from './material-permission-256.ts';
import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import type {AncientCasket256} from './ancient-casket-state-256.ts';
import type {Cell,World} from './types.ts';
export type AncientCasketLeaving256={item:ItemId;quantity:number;cell:Cell;forbidden:boolean;resultId:number};
const at=(p:World['piles'][number],c:Cell)=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z;
const quantities=(w:World,c:Cell)=>new Map(w.piles.filter(p=>at(p,c)).map(p=>[p.id,p.quantity]));
/** The last actual absorption/spawn, not the first pile at the chosen cell. */
const lastResult=(w:World,c:Cell,before:ReadonlyMap<number,number>)=>w.piles.filter(p=>at(p,c)&&p.quantity!==(before.get(p.id)??0)).at(-1);
/** Only a bounded physical draft is mutated. GenLeaving's fixed products own
 * no shared random draw; the occupied-rect shuffle DOES draw for its singleton.
 * The existing word stream/Near search are explicit representation adaptations. */
export function prepareAncientCasketLeavings256(view:World,s:AncientCasket256,mode:'deconstruct'|'kill-finalize',rng:number){
 const cells=ancientCasketCells256(s,s.orientation),entries:{item:ItemId;quantity:number}[]=[];
 if(mode==='kill-finalize'){
  for(const cell of cells){const n=shipChunkNextRandom256(rng);rng=n.rng;addFilth(view,cell,'building-rubble',1+Math.abs((n.rng|0)%3));}
  entries.push({item:'slag-steel-chunk',quantity:1},{item:'steel',quantity:25},{item:'uranium',quantity:3});
 }else{
  const steel=shipChunkRefund256(180,rng),uranium=shipChunkRefund256(5,steel.rng);rng=uranium.rng;
  entries.push({item:'steel',quantity:steel.quantity},{item:'uranium',quantity:uranium.quantity});
 }
 const order:Cell[]=[];for(let n=cells.length;n>0;n--){const draw=shipChunkNextRandom256(rng);rng=draw.rng;const i=Math.abs((draw.rng|0)%n);order.push(cells[i]!);cells[i]=cells[n-1]!;}
 const rubble={nextId:view.nextId,filth:view.filth},drops:AncientCasketLeaving256[]=[],ignoredThingKeys=new Set<string>();
 for(let i=0;i<entries.length;i++){
  const e=entries[i]!,origin=order[i%order.length]!,forbidden=mode==='kill-finalize'&&!(view.home??[]).includes(origin.z*view.width+origin.x);
  // Never feed addMaterial an incompatible same-item stack, including shelves
  // with a spare third slot. No third-party permission is rewritten to fit.
  const compatible=(cell:Cell)=>!view.piles.some(p=>at(p,cell)&&p.item===e.item&&materialAllowedForPlayer256(p)===forbidden);
  const places=compatible(origin)&&groundCapacity(view,origin,e.item)>=e.quantity?[{cell:origin,quantity:e.quantity}]:planGroundPlacement(view,e.quantity,origin,e.item,compatible);
  if(!places)return null;
  let finalResultId:number|undefined;
  for(const part of places){
   if(!Number.isSafeInteger(view.nextId+1)||!materialCanFit(view,ITEM_DEFINITIONS[e.item].kind,part.quantity,{type:'ground',...part.cell},e.item))return null;
   const before=quantities(view,part.cell);
   addMaterial(view,ITEM_DEFINITIONS[e.item].kind,part.quantity,{type:'ground',...part.cell},e.item);
   const result=lastResult(view,part.cell,before);if(!result||result.item!==e.item)return null;
   setMaterialForbidden256(result,forbidden);drops.push({...part,item:e.item,forbidden,resultId:result.id});
   finalResultId=result.id;
  }
  // GenLeaving records ONLY the final TryDrop out Thing for this source stack.
  // Earlier partially filled stacks are NOT protected by this explosion.
  if(finalResultId===undefined)return null;ignoredThingKeys.add(`pile:${finalResultId}`);
 }
 return {rng,rubble,drops,entries,ignoredThingKeys:[...ignoredThingKeys].sort()};
}
export function commitAncientCasketLeavings256(w:World,plan:NonNullable<ReturnType<typeof prepareAncientCasketLeavings256>>):void {
 w.nextId=plan.rubble.nextId;if(plan.rubble.filth)w.filth=plan.rubble.filth;
 for(const drop of plan.drops){const before=quantities(w,drop.cell);addMaterial(w,ITEM_DEFINITIONS[drop.item].kind,drop.quantity,{type:'ground',...drop.cell},drop.item);const actual=lastResult(w,drop.cell,before);
  if(!actual||actual.item!==drop.item||actual.id!==drop.resultId)throw Error('Actual casket leaving identity changed inside synchronous commit');setMaterialForbidden256(actual,drop.forbidden);
 }
 w.rng=plan.rng;
}
