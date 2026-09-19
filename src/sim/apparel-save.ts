import { adjacent } from './pathfinding.ts';
import { APPAREL,apparelDefinition,conflictsWith,isApparelItem } from './apparel-rules.ts';
import { WEAPON_QUALITIES } from './equipment-rules.ts';
import type { MaterialPile,World } from './types.ts';

const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function validApparelShape(p:Record<string,unknown>,version:number):boolean {
  if(p.kind!=='apparel')return p.apparel===undefined;
  const a=p.apparel;
  return version>=63&&typeof p.item==='string'&&Object.hasOwn(APPAREL,p.item)&&record(a)&&Object.keys(a).every(k=>['quality','hitPoints','forbidden'].includes(k))
    &&typeof a.quality==='string'&&(WEAPON_QUALITIES as readonly string[]).includes(a.quality)
    &&typeof a.hitPoints==='number'&&Number.isInteger(a.hitPoints)&&a.hitPoints>0&&a.hitPoints<=APPAREL[p.item as keyof typeof APPAREL].hitPoints
    &&(a.forbidden===undefined||a.forbidden===true)&&p.quantity===1&&record(p.owner)&&['ground','pawn','apparel'].includes(String(p.owner.type));
}
export function validateApparel(world:World):string[] {
  const errors:string[]=[],byPawn=new Map<number,MaterialPile[]>();
  for(const pile of world.piles)if(pile.owner.type==='apparel') {
    const id=pile.owner.pawnId,pawn=world.pawns.find(p=>p.id===id);
    if(!pawn||!isApparelItem(pile.item)||pile.kind!=='apparel'||!pile.apparel||pile.apparel.forbidden){errors.push('Invalid worn apparel owner.');continue;}
    const worn=byPawn.get(pawn.id)??[];
    if(worn.some(p=>conflictsWith(p,pile)))errors.push('Incompatible worn apparel.');
    worn.push(pile);byPawn.set(pawn.id,worn);
  }
  for(const pawn of world.pawns){
    const t=pawn.equipmentTask;if(t?.action!=='wear'&&t?.action!=='remove')continue;
    const pile=world.piles.find(p=>p.id===t.itemId);if(!pile||!isApparelItem(pile.item)){errors.push('Missing apparel task target.');continue;}
    if(t.action==='wear'&&t.progress>0&&(pile.owner.type!=='ground'||!adjacent(pawn,pile.owner)&&(pawn.x!==pile.owner.x||pawn.z!==pile.owner.z)))errors.push('Dressing without physical contact.');
    const base=apparelDefinition(pile).equipTicks;
    // The captured replacement duration outlives the earlier garment's removal.
    if(t.duration!==base&&(t.action!=='wear'||t.duration!==base*2))errors.push('Invalid captured apparel duration.');
  }
  return errors;
}
