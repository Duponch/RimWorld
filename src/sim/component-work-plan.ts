import {cookingSpot,ingredientPlaceFree} from './cooking-bills.ts';
import {groundCapacity} from './ground-placement.ts';
import {reservedSource} from './materials.ts';
import {routeToJob,type Reachability} from './pathfinding.ts';
import type {CookingBill} from './cooking-types.ts';
import type {CookingPlan} from './cooking-planner.ts';
import type {Cell,Pawn,Structure,World} from './types.ts';

/** A bound component workpiece waits for its author; fresh steel cannot bypass it. */
export function planComponentWork(world:World,pawn:Pawn,station:Structure,bill:CookingBill,reach:Reachability,budget:{pairs:number}):{handled:boolean;plan?:CookingPlan} {
  if(bill.recipe!=='make-component')return {handled:false};
  const bound=world.piles.find(p=>p.componentWork?.billId===bill.id),spot=cookingSpot(station);
  const candidates=bound?[bound]:world.piles.filter(p=>p.componentWork?.recipe==='make-component'&&!p.componentWork.billId&&bill.filters.steel&&p.owner.type==='ground'&&(p.owner.x-station.x)**2+(p.owner.z-station.z)**2<=bill.radius**2)
    .sort((a,b)=>((a.owner as Cell).x-pawn.x)**2+((a.owner as Cell).z-pawn.z)**2-(((b.owner as Cell).x-pawn.x)**2+((b.owner as Cell).z-pawn.z)**2)||a.id-b.id);
  for(const piece of candidates){
    if(piece.componentWork!.authorId!==pawn.id||piece.owner.type!=='ground'||reservedSource(world,piece.id)>0)continue;
    if(budget.pairs--<=0){budget.pairs=0;return {handled:true};}
    const source=piece.owner,path=routeToJob(world,source,reach,true);if(!path)continue;
    const placed=ingredientPlaceFree(world,source,spot,bill.recipe,station);
    const cell=placed?source:[station,{x:spot.x-1,z:spot.z},{x:spot.x+1,z:spot.z},{x:spot.x,z:spot.z-1},{x:spot.x,z:spot.z+1}].find(c=>ingredientPlaceFree(world,c,spot,bill.recipe,station)&&groundCapacity(world,c,piece.item,pawn.id)>=1);
    if(!cell)continue;
    return {handled:true,plan:{station,priority:pawn.priorities.craft,target:source,path,task:{recipe:'make-component',stationId:station.id,billId:bill.id,spot,actionCell:{x:source.x,z:source.z},phase:'gather',ingredients:[{pileId:piece.id,item:'unfinished-component',quantity:1,stage:placed?'placed':'source',cell:{x:cell.x,z:cell.z}}],progress:0,productId:null,storageId:null}}};
  }
  return {handled:!!bound};
}
