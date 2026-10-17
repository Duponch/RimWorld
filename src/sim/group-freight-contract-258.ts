import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import type {PreparingGroup} from './group-capture.ts';
import type {MaterialPile,World} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import {groupCaravanUnitMass256,groupCaravanPileMass256} from './group-caravan-mass-256.ts';
import {groupPackedMassGrams258} from './group-freight-mass-258.ts';
import {validatePackedFurnitureRecords} from './furniture-transfer-save.ts';
export {groupPackedMassGrams258} from './group-freight-mass-258.ts';
/** Mass and admission are separate: known historical plant/corpse masses do not
 * extend the new regular freight selection to another gameplay domain. */
export function groupFreightUnitMass258(pile:MaterialPile,version:number):number|undefined {
 return groupCaravanPileMass256(pile,true,version);
}
export function regularGroupFreight258(pile:MaterialPile,version:number):boolean {
 return regularGroupFreightItem258(pile.item,version);
}
export function regularGroupFreightItem258(item:ItemId,version:number):boolean {
 return version>=258&&['medicine','component','advanced-component','weapon','apparel','blocks','gold','plasteel','uranium','jade','chemfuel','neutroamine','textile','wood','steel','chunk'].includes(ITEM_DEFINITIONS[item].kind)&&groupCaravanUnitMass256(item,true,version)!==undefined;
}
/** A historical source reference is not another owner: full pickup keeps its ID.
 * Food receipts retain their historical consumption rules. New ordinary freight
 * receipts stay bound to their actual original/split object until departure. */
export function validLoadedGroupFreight258(g:PreparingGroup,piles:ReadonlyMap<number,MaterialPile>,version:number):boolean {
 if(version<258||g.travelPreparation!==true)return true;
 const seen=new Set<number>();
 for(let i=0;i<g.cursor;i++){
  const line=g.manifest[i]!;if(!regularGroupFreightItem258(line.item,version))continue;
  if(line.carriedPileId===undefined||seen.has(line.carriedPileId))return false;seen.add(line.carriedPileId);
  const pile=piles.get(line.carriedPileId),holder=line.deliveredToAnimal?line.animalCarrierId:line.carrierId;
  if(!pile||pile.item!==line.item||pile.quantity!==line.quantity||pile.owner.type!=='inventory'||pile.owner.pawnId!==holder)return false;
 }
 return true;
}
/** Full existing furniture validator, with literal inner pose and current ground
 * owner coordinates. Never fabricate a miniature World or clamp the building. */
export function validGroupFreightPack258(pack:PackedFurniture,w:Pick<World,'width'|'height'|'tick'|'nextId'>,version:number):boolean {
 return groupPackedMassGrams258(pack,version)!==undefined&&validatePackedFurnitureRecords([pack],w,version,new Set()).length===0;
}
