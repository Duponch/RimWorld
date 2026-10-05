import { releaseAssignments } from './work-release.ts';
import { resolveArmor,type ArmorCategory,type ArmorWear } from './armor.ts';
import { armorPiece,wornApparel } from './apparel-rules.ts';
import type { BodyPartId } from './body-definition.ts';
import type { Pawn,World } from './types.ts';
import { neutralLossPlan } from './destruction-losses.ts';
import { removeIdentity } from './collection-remove.ts';

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

/** Bomb's fragments share one transaction, but a garment destroyed by an early
 * fragment must stop protecting later fragments. Historical Bullet is unchanged. */
export function fragmentedApparelProtection(world:World,pawn:Pawn,penetration:number,random:()=>number){
  const piles=wornApparel(world,pawn),pieces=piles.map(armorPiece),remaining=new Map(pieces.map(p=>[p.id,p.hitPoints]));
  const protect:ImpactProtection=(part,amount)=>{
    const active=pieces.flatMap(p=>remaining.get(p.id)!>0?[{...p,hitPoints:remaining.get(p.id)!}]:[]);
    const result=resolveArmor({part,amount,category:'sharp',penetration},active,{sharp:0,blunt:0,heat:0},random);
    for(const wear of result.wear)remaining.set(wear.id,wear.remaining);
    return {amount:result.amount,converted:result.category==='blunt'};
  };
  return {protect,commit:()=>{
    const items:NonNullable<NonNullable<World['destroyed']>['items']>={};
    for(const p of piles)if(!remaining.get(p.id))items[p.item]=(items[p.item]??0)+p.quantity;
    const ledger=Object.keys(items).length?neutralLossPlan(world,{items}):undefined;
    if(ledger===null)throw new RangeError('Bomb apparel losses exhausted');
    for(const p of piles){const hp=remaining.get(p.id)!;if(hp)p.apparel!.hitPoints=hp;else {removeIdentity(world.piles,p);if(pawn.equipmentTask?.itemId===p.id)releaseAssignments(world,pawn);}}
    if(ledger)world.destroyed=ledger;
  }};
}
