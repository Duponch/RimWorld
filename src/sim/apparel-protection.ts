import { releaseAssignments } from './work-release.ts';
import { resolveArmor,type ArmorCategory,type ArmorWear } from './armor.ts';
import { armorPiece,wornApparel } from './apparel-rules.ts';
import type { BodyPartId } from './body-definition.ts';
import type { Pawn,World } from './types.ts';

export type ImpactProtection=(part:BodyPartId,amount:number)=>{amount:number;converted:boolean};
/** Snapshot instances before impact; commit durability with anatomy and the
 * caller's local random stream. No per-frame or per-pawn armor cache. */
export function apparelProtection(world:World,pawn:Pawn,category:ArmorCategory,penetration:number,random:()=>number) {
  if(!Number.isFinite(penetration)||penetration<0)throw new RangeError('Invalid penetration');
  const pieces=wornApparel(world,pawn).map(armorPiece);
  let wear:readonly ArmorWear[]=[];
  const protect:ImpactProtection|undefined=pieces.length?(part,amount)=>{
    const result=resolveArmor({part,amount,category,penetration},pieces,{sharp:0,blunt:0,heat:0},random);
    wear=result.wear;return {amount:result.amount,converted:category==='sharp'&&result.category==='blunt'};
  }:undefined; // Preserve the existing unarmored PRNG contract in historical saves.
  return {protect,commit:()=>{
    for(const entry of wear){const pile=world.piles.find(p=>p.id===entry.id)!;
      if(entry.remaining)pile.apparel!.hitPoints=entry.remaining;
      else {world.piles.splice(world.piles.indexOf(pile),1);if(pawn.equipmentTask?.itemId===entry.id)releaseAssignments(world,pawn);}
    }
  }};
}
