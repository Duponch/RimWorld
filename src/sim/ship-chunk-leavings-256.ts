import {addFilth} from './filth.ts';
import {groundCapacity,planGroundPlacement,groundPile} from './ground-placement.ts';
import {addMaterial,materialCanFit} from './materials.ts';
import {materialAllowedForPlayer256,setMaterialForbidden256} from './material-permission-256.ts';
import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import {footprintCells} from './definitions.ts';
import type {Cell,Structure,World} from './types.ts';
/** Existing gameplay stream adaptation, staged until the same physical commit.
 * Numeric/ordering facts are Core; no cross-engine seed parity is claimed. */
export function shipChunkNextRandom256(rng:number):{rng:number;value:number}{
 rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;return {rng,value:Math.fround(((rng|0)+2147483648)/4294967295)};
}
/** GenLeaving rounds EACH CostListAdjusted entry, including integer Steel20.
 * Source order is Component11 then Steel40; damage never scales deconstruction. */
export function shipChunkRefund256(quantity:number,rng:number){const next=shipChunkNextRandom256(rng),half=Math.fround(quantity*Math.fround(.5));return {rng:next.rng,quantity:Math.trunc(half)+(next.value<Math.fround(half%1)?1:0)};}
function rectangleOrder(s:Structure,at:Cell,rng:number){
 const remaining=footprintCells(s).map(c=>({x:c.x-s.x+at.x,z:c.z-s.z+at.z})),order:Cell[]=[];
 for(let count=remaining.length;count>0;count--){const next=shipChunkNextRandom256(rng);rng=next.rng;const index=Math.abs((next.rng|0)%count);order.push(remaining[index]!);remaining[index]=remaining[count-1]!;}
 return {rng,order};
}
export function drawShipChunkDeconstruction256(s:Structure,rng:number){
 const component=shipChunkRefund256(11,rng),steel=shipChunkRefund256(40,component.rng),ordered=rectangleOrder(s,s,steel.rng);
 return {rng:ordered.rng,entries:[{item:'component' as const,quantity:component.quantity,origin:ordered.order[0]!},{item:'steel' as const,quantity:steel.quantity,origin:ordered.order[1]!}]};
}

/** KillFinalize only. No source mutation, material production or RNG advance on
 * a failed Near preflight. Existing unrelated originals remain read-only. */
export function planShipChunkKill256(w:World,s:Structure,at:Cell,rng:number){
 if(w.schemaVersion!==256||s.kind!=='ship-chunk')throw Error('Actual256 ShipChunk required');
 const view:World={...w,piles:w.piles.map(p=>({...p,owner:{...p.owner}})),jobs:w.jobs.map(j=>({...j,escrow:{...j.escrow}})),filth:w.filth?{...w.filth,items:w.filth.items.map(f=>({...f}))}:undefined};
 const cells=footprintCells(s).map(c=>({x:c.x-s.x+at.x,z:c.z-s.z+at.z}));
 for(const c of cells){const next=shipChunkNextRandom256(rng);rng=next.rng;addFilth(view,c,'building-rubble',1+Math.abs((next.rng|0)%3));}
 // InRandomOrder chooses an index from the unchosen prefix then swaps its
 // last element into that slot; the singleton endpoint still consumes a draw.
 const shuffled=rectangleOrder(s,at,rng),order=shuffled.order;rng=shuffled.rng;
 const rubble={rng,nextId:view.nextId,filth:view.filth};
 const drops:{item:ItemId;quantity:number;cell:Cell;forbidden:boolean}[]=[];
 const products=[{item:'slag-steel-chunk',quantity:1},{item:'slag-steel-chunk',quantity:1},{item:'component',quantity:1}] as const;
 for(let i=0;i<products.length;i++){
  const product=products[i]!,origin=order[i%order.length]!,forbidden=!(w.home??[]).includes(origin.z*w.width+origin.x);
  // A whole stack can merge only with the same actual permission. Reserving
  // an incompatible existing stack in the preview makes Near search farther;
  // it never forbids somebody else's previously usable stock.
  const placementView:World={...view,piles:view.piles.map(p=>p.owner.type==='ground'&&p.item===product.item&&materialAllowedForPlayer256(p)===forbidden?{...p,quantity:ITEM_DEFINITIONS[p.item].stackLimit}:p)};
  const places=groundCapacity(placementView,origin,product.item)>=product.quantity?[{cell:origin,quantity:product.quantity}]:planGroundPlacement(placementView,product.quantity,origin,product.item);
  if(!places)return null;
  for(const d of places){
   if(view.piles.length+(!groundPile(view,d.cell)?1:0)>32768||!Number.isSafeInteger(view.nextId+1)||!materialCanFit(view,ITEM_DEFINITIONS[product.item].kind,d.quantity,{type:'ground',...d.cell},product.item))return null;
   drops.push({...d,item:product.item,forbidden});addMaterial(view,ITEM_DEFINITIONS[product.item].kind,d.quantity,{type:'ground',...d.cell},product.item);
   const result=groundPile(view,d.cell);if(!result||result.item!==product.item)return null;
   setMaterialForbidden256(result,forbidden);
  }
 }
 return {rng,drops,returned:new Map<ItemId,number>([['component',1]]),rubble};
}
