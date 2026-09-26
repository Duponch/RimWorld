import { apparelProtection,type ImpactProtection } from './apparel-protection.ts';
import { selectBulletPart } from './bullet-impact.ts';
import { medicalModel } from './body-model.ts';
import { updatePawnHealth,reconcilePawnHealth } from './health.ts';
import { addResolvedInjury,createMedicalRecord,remainingPartHealth,medicalStatus } from './injury-state.ts';
import { HP_UNIT } from './injury-rules.ts';
import { advanceAnimalHealth,reconcileAnimalHealth } from './wildlife-health.ts';
import { ensureFireState,fireRandom } from './fire-rules.ts';
import { damagePile } from './thing-damage.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { Pawn,World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';

function localizedBurn(record:MedicalRecord,amount:number,random:()=>number,protect?:ImpactProtection):boolean {
  const part=selectBulletPart(record,random,undefined,'outside');if(!part)return false;
  const damage=protect?.(part,amount).amount??amount;if(!damage)return false;
  const model=medicalModel(record),hp=remainingPartHealth(record,part);let severity=damage*HP_UNIT;
  if(part!=='torso'&&severity>=hp&&random()>=Math.min(1,(severity-hp)/(model.byId[part].hp*HP_UNIT*.7)))severity=Math.max(0,hp-HP_UNIT);
  if(severity)addResolvedInjury(record,part,'burn',severity,random);return true;
}
/** Shared anatomy and Heat armor. Fire owns draws, not the combat weapon stream. */
export function burnPawn(world:World,pawn:Pawn,amount:number):boolean {
  if(pawn.state==='dead'||!Number.isSafeInteger(amount)||amount<1)return false;
  // Reserve exact integer capacity before health, wear or random state changes.
  // Armor wear never exceeds ceil(incoming damage / 4), even at later layers.
  // Accumulate by item so multiple destroyed instances share the same bound.
  const pendingLoss={...world.fires?.ledger.items};
  for(const pile of world.piles)if(pile.owner.type==='apparel'&&pile.owner.pawnId===pawn.id&&pile.apparel!.hitPoints<=Math.ceil(amount/4)){
    const total=(pendingLoss[pile.item]??0)+pile.quantity;
    if(!Number.isSafeInteger(total))return false;
    pendingLoss[pile.item]=total;
  }
  updatePawnHealth(world,pawn);if(pawn.health?.death)return false;
  const state=ensureFireState(world),random=()=>fireRandom(state);
  const record=structuredClone(pawn.health??createMedicalRecord(world.tick));
  const worn=world.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id).map(p=>({id:p.id,item:p.item,quantity:p.quantity}));
  const guard=apparelProtection(world,pawn,'heat',0,random),penetrated=localizedBurn(record,amount,random,guard.protect);guard.commit();
  for(const p of worn)if(!world.piles.some(i=>i.id===p.id))state.ledger.items[p.item]=(state.ledger.items[p.item]??0)+p.quantity;
  pawn.health=record;reconcilePawnHealth(world,pawn,undefined,true);
  const apparel=world.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id);
  if(apparel.length)damagePile(world,apparel[Math.floor(random()*apparel.length)]!,amount);return penetrated;
}
export function burnAnimal(world:World,animal:WildAnimal,amount:number):void {
  if(animal.state==='dead'||!Number.isSafeInteger(amount)||amount<1)return;
  advanceAnimalHealth(world,animal);if(animal.health?.death)return;
  const state=ensureFireState(world),random=()=>fireRandom(state),record=structuredClone(animal.health??{...createMedicalRecord(world.tick),body:animal.species});
  localizedBurn(record,amount,random);
  if(animal.state!=='downed'&&medicalStatus(record)==='downed'&&random()<.5)record.death={tick:world.tick,cause:'downed'};
  animal.health=record;reconcileAnimalHealth(world,animal);
}
