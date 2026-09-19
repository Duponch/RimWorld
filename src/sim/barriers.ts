import { constructionRecipe } from './construction-materials.ts';
import type { ConstructionMaterial } from './construction-materials.ts';
import { releaseAssignments } from './work-release.ts';
import { reconcileRoofSupport } from './roofing.ts';
import type { Structure, World } from './types.ts';

/** First destructible catalogue: installed walls and manual doors only. */
export const isBarrier=(s:Pick<Structure,'kind'>):boolean=>s.kind==='wall'||s.kind==='door';
const FACTORS:Record<ConstructionMaterial,number>={wood:.65,steel:1,'granite-blocks':1.7,'limestone-blocks':1.55,'marble-blocks':1.2,'sandstone-blocks':1.4,'slate-blocks':1.3};
export const barrierMaxHp=(s:Pick<Structure,'kind'|'material'>):number=>Math.round((s.kind==='door'?160:300)*FACTORS[s.material??'wood']);
export const barrierHp=(s:Structure):number=>barrierMaxHp(s)-(s.damage??0);
export interface DestructionLedger { count:number; lost:Partial<Record<ConstructionMaterial,number>> }

/** No material drop for these two Core definitions. Destruction is not
 * deconstruction: record the entire incorporated recipe as a separate loss. */
export function damageBarrier(world:World,s:Structure,amount:number,rng=world.rng):boolean {
  if(!isBarrier(s)||!world.structures.includes(s)||!Number.isSafeInteger(amount)||amount<1)return false;
  const damage=(s.damage??0)+amount;
  if(damage<barrierMaxHp(s)){s.damage=damage;world.rng=rng;return true;}
  const ledger=world.destroyed??{count:0,lost:{}};
  const lost={...ledger.lost};
  for(const c of constructionRecipe(s).ingredients){const id=c.item as ConstructionMaterial;lost[id]=(lost[id]??0)+c.quantity;}
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
  world.rng=rng;reconcileRoofSupport(world,false,s);
  return true;
}
