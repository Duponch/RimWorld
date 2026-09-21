import { coolerSalvage } from './cooler-salvage.ts';
import { addMaterial } from './materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { constructionRecipe } from './construction-materials.ts';
import type { ConstructionMaterial } from './construction-materials.ts';
import { releaseAssignments } from './work-release.ts';
import { reconcileRoofSupport } from './roofing.ts';
import type { Structure, World } from './types.ts';

/** Installed barriers: walls, manual doors and the solid cooler. */
export const isBarrier=(s:Pick<Structure,'kind'>):boolean=>s.kind==='wall'||s.kind==='door'||s.kind==='cooler';
const FACTORS:Record<ConstructionMaterial,number>={wood:.65,steel:1,'granite-blocks':1.7,'limestone-blocks':1.55,'marble-blocks':1.2,'sandstone-blocks':1.4,'slate-blocks':1.3,cloth:1,'light-leather':1};
export const barrierMaxHp=(s:Pick<Structure,'kind'|'material'>):number=>s.kind==='cooler'?100:Math.round((s.kind==='door'?160:300)*FACTORS[s.material??'wood']);
export const barrierHp=(s:Structure):number=>barrierMaxHp(s)-(s.damage??0);
export interface DestructionLedger { count:number; lost:Partial<Record<ConstructionMaterial|'component',number>> }

/** Walls/doors drop nothing; the cooler salvages one quarter of its recipe.
 * Record only destroyed material, independently of deconstruction losses. */
export function damageBarrier(world:World,s:Structure,amount:number,rng=world.rng):boolean {
  if(!isBarrier(s)||!world.structures.includes(s)||!Number.isSafeInteger(amount)||amount<1)return false;
  const damage=(s.damage??0)+amount;
  if(damage<barrierMaxHp(s)){s.damage=damage;world.rng=rng;return true;}
  const salvage=s.kind==='cooler'?coolerSalvage(world,s,rng):undefined;if(salvage===null)return false;
  const ledger=world.destroyed??{count:0,lost:{}};
  const lost={...ledger.lost};
  for(const c of constructionRecipe(s).ingredients){const id=c.item as ConstructionMaterial;lost[id]=(lost[id]??0)+c.quantity-(salvage?.returned.get(c.item)??0);}
  if(!Number.isSafeInteger(ledger.count+1)||Object.values(lost).some(n=>!Number.isSafeInteger(n)))return false;
  const removed=new Set(world.jobs.filter(j=>j.repair?.structureId===s.id||j.deconstruction?.structureId===s.id).map(j=>j.id));
  for(const p of world.pawns){
    if(p.jobId!==null&&removed.has(p.jobId))releaseAssignments(world,p);
    p.orders.queue=p.orders.queue.filter(o=>typeof o!=='number'||!removed.has(o));
    if(p.melee?.order?.structure&&p.melee.order.targetId===s.id){p.melee.order=null;p.path=[];if(!p.melee.strike)delete p.melee;}
  }
  world.jobs=world.jobs.filter(j=>!removed.has(j.id));
  world.structures=world.structures.filter(b=>b!==s);
  world.destroyed={count:ledger.count+1,lost};
  if(salvage)for(const d of salvage.drops)addMaterial(world,ITEM_DEFINITIONS[d.item].kind,d.quantity,{type:'ground',...d.cell},d.item);
  world.rng=salvage?.rng??rng;reconcileRoofSupport(world,false,s);
  return true;
}
