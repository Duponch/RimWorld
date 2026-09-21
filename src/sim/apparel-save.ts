import { V91_ITEM_IDS } from './biome-items.ts';
import { adjacent } from './pathfinding.ts';
import { APPAREL,apparelDefinition,conflictsWith,isApparelItem,newApparelState,type ApparelItem } from './apparel-rules.ts';
import { WEAPON_QUALITIES } from './equipment-rules.ts';
import type { MaterialPile,World } from './types.ts';

const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const capturedApparel=(item:ApparelItem):MaterialPile=>({id:0,kind:'apparel',item,quantity:1,owner:{type:'ground',x:0,z:0},apparel:newApparelState(item)});
const capturedApparelCandidates=(version:number):MaterialPile[]=>{
  const seen=new Set<string>(),out:MaterialPile[]=[];
  for(const item of Object.keys(APPAREL) as ApparelItem[]){
    const historical=item==='flak-vest'||item==='cloth-shirt'||version>=72&&item==='cloth-tribalwear';
    if(version<90&&!historical||version<91&&V91_ITEM_IDS.includes(item))continue;
    const key=APPAREL[item].family??item;
    if(seen.has(key))continue;
    seen.add(key);out.push(capturedApparel(item));
  }
  return out;
};
export function validApparelShape(p:Record<string,unknown>,version:number):boolean {
  if(p.kind!=='apparel')return p.apparel===undefined;
  const a=p.apparel;
  if(version<63||typeof p.item!=='string'||!Object.hasOwn(APPAREL,p.item)||!record(a))return false;
  const item=p.item as ApparelItem,definition=APPAREL[item];
  const historical=item==='flak-vest'||item==='cloth-shirt'||version>=72&&item==='cloth-tribalwear';
  if(version<90&&!historical||version<91&&V91_ITEM_IDS.includes(item))return false;
  return Object.keys(a).every(k=>['quality','hitPoints','forbidden',...(version>=90?['material','forced']:[])].includes(k))
    &&typeof a.quality==='string'&&(WEAPON_QUALITIES as readonly string[]).includes(a.quality)
    &&typeof a.hitPoints==='number'&&Number.isInteger(a.hitPoints)&&a.hitPoints>0&&a.hitPoints<=definition.hitPoints
    &&(version<90?a.material===undefined:definition.material===undefined?a.material===undefined:a.material===definition.material)
    &&(a.forbidden===undefined||a.forbidden===true)&&(a.forced===undefined||a.forced===true)
    &&!(a.forbidden===true&&a.forced===true)&&p.quantity===1&&record(p.owner)&&['ground','pawn','apparel'].includes(String(p.owner.type))
    &&(a.forced===undefined||p.owner.type==='apparel');
}
export function validateApparel(world:World,version:number=world.schemaVersion):string[] {
  const errors:string[]=[],byPawn=new Map<number,MaterialPile[]>();
  for(const pile of world.piles)if(pile.owner.type==='apparel') {
    const id=pile.owner.pawnId,pawn=world.pawns.find(p=>p.id===id);
    if(!pawn||!isApparelItem(pile.item)||pile.kind!=='apparel'||!pile.apparel||pile.apparel.forbidden||version>=90&&pile.apparel.material!==APPAREL[pile.item].material){errors.push('Invalid worn apparel owner.');continue;}
    const worn=byPawn.get(pawn.id)??[];
    if(worn.some(p=>conflictsWith(p,pile)))errors.push('Incompatible worn apparel.');
    worn.push(pile);byPawn.set(pawn.id,worn);
  }
  for(const pawn of world.pawns){
    const t=pawn.equipmentTask;if(t?.action!=='wear'&&t?.action!=='remove')continue;
    const pile=world.piles.find(p=>p.id===t.itemId);if(!pile||!isApparelItem(pile.item)){errors.push('Missing apparel task target.');continue;}
    if(t.action==='wear'&&t.progress>0&&(pile.owner.type!=='ground'||!adjacent(pawn,pile.owner)&&(pawn.x!==pile.owner.x||pawn.z!==pile.owner.z)))errors.push('Dressing without physical contact.');
    const base=apparelDefinition(pile).equipTicks;
    // A replacement captures the exact work for the new garment plus every
    // incompatible piece that could have been worn when the order started.
    // Reconstruct those possibilities from the versioned catalogue: current
    // ground piles are transient and cannot prove what was initially worn.
    // Materials with the same family are equivalent for duration purposes.
    const candidates=capturedApparelCandidates(version).filter(other=>conflictsWith(other,pile));
    const sums=new Set<number>([base]);
    const visit=(index:number,chosen:MaterialPile[],sum:number):void=>{
      for(let i=index;i<candidates.length;i++){
        const other=candidates[i]!;
        if(chosen.some(existing=>conflictsWith(existing,other)))continue;
        const next=sum+apparelDefinition(other).equipTicks;
        sums.add(next);visit(i+1,[...chosen,other],next);
      }
    };
    visit(0,[],base);
    const durationValid=t.action==='wear'?sums.has(t.duration!):t.duration===base;
    if(!durationValid)errors.push('Invalid captured apparel duration.');
  }
  return errors;
}
