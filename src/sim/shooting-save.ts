import type {NumericMembershipLookup} from './numeric-membership.ts';
import { huntingPermission } from './hunting-state.ts';
import { combatTarget } from './combat-target.ts';
import { validAutomaticAttack,automaticPost,automaticOwnership } from './automatic-combat-save.ts';
import { isColonist,hostileTo } from './affiliation.ts';
import { equippedWeapon,isRangedWeaponItem } from './equipment-rules.ts';
import { shootingOrderAuthority } from './shooting-state.ts';
import { validStunShape } from './melee-save.ts';
import { rangedWeaponProfile } from './ranged-statistics.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validShootingShape(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<56||!record(value)||!keys(value,['order','stance'])||value.order===null&&value.stance===null)return false;
  if(value.order!==null&&(!record(value.order)||!keys(value.order,['targetId','weaponId','startedDowned',...(version>=60?['auto']:[]),...(version>=79?['hunt']:[])])||!integer(value.order.targetId,1)||!integer(value.order.weaponId,1)||typeof value.order.startedDowned!=='boolean'||!validAutomaticAttack(value.order.auto,version,tick)||value.order.hunt!==undefined&&(value.order.hunt!==true||value.order.auto!==undefined||value.order.startedDowned!==false)))return false;
  const s=value.stance;if(s===null)return value.order!==null;
  if(!record(s)||version<198&&Object.hasOwn(s,'clock')||!keys(s,['phase','startedAtCore','endsAtCore',...(s.phase==='aim'?['targetStartedDowned']:[]),...(version>=88?['weaponItem']:[]),...(version>=198?['clock']:[])])||s.weaponItem!==undefined&&s.weaponItem!=='bolt-action-rifle'&&!(version>=208&&s.weaponItem==='emp-launcher')||!integer(s.startedAtCore,0,tick*10)||!integer(s.endsAtCore,tick*10+1))return false;
  if(s.phase!=='aim'&&s.phase!=='cooldown'||s.phase==='aim'&&(value.order===null||typeof s.targetStartedDowned!=='boolean'))return false;
  if(record(value.order)&&value.order.hunt&&s.weaponItem==='emp-launcher')return false;
  const emp=s.weaponItem==='emp-launcher'?rangedWeaponProfile('emp-launcher','normal'):undefined;
  if(s.weaponItem==='emp-launcher'&&!emp)return false;
  const duration=emp?(s.phase==='aim'?emp.warmupCoreTicks:emp.cooldownCoreTicks):s.phase==='aim'?(s.weaponItem?102:18):(s.weaponItem?90:96);
  if(version<198||!Object.hasOwn(s,'clock')&&s.clock===undefined)return s.endsAtCore-s.startedAtCore===duration;
  const c=s.clock;
  if(!Object.hasOwn(s,'clock')||!record(c)||Reflect.ownKeys(c).length!==2||!Object.hasOwn(c,'lastAdvancedAtCore')||!Object.hasOwn(c,'pausedCore')
    ||!integer(tick*10,0)||c.lastAdvancedAtCore!==tick*10||!integer(c.lastAdvancedAtCore,s.startedAtCore)
    ||!integer(c.pausedCore,0,c.lastAdvancedAtCore-s.startedAtCore))return false;
  return Number.isSafeInteger(s.startedAtCore+duration+c.pausedCore)&&s.endsAtCore-s.startedAtCore-c.pausedCore===duration;
}
/** Numeric human orders never captured a historical target kind. The mandate
 * still bounds the known categories, and a Thing cannot become a living target. */
function historicalTargetKind(w:World,id:number):'pawn'|'animal'|'mech'|undefined {
  if(w.pawns.some(p=>p.id===id)||[w.scout,w.commercialTrip].some(g=>g&&'pawn' in g&&g.pawn.id===id)
    ||w.group&&'members' in w.group&&w.group.members.some(p=>p.id===id)||w.groupLosses?.some(l=>l.pawn.id===id)
    ||w.raids?.departed.some(d=>d.pawnId===id)||w.prisonDepartures?.some(d=>d.pawnId===id)
    ||w.visitors?.departed.some(d=>d.pawn.id===id)||w.podRescues?.departed.some(d=>d.pawn.id===id)
    ||w.piles.some(p=>p.humanCorpse?.pawnId===id))return 'pawn';
  if(w.wildlife?.animals.some(a=>a.id===id)||w.piles.some(p=>p.corpse?.animalId===id))return 'animal';
  if(w.mechanoids?.some(m=>m.id===id)||w.piles.some(p=>p.id===id&&p.mechCorpse!==undefined))return 'mech';
  return undefined;
}
/** registeredIds is the COMPLETE Thing namespace, after collective owners.
 * It is never a set of group/relationship references or a projected World. */
export function validateShooting(world:World,version:number=world.schemaVersion,registeredIds?:NumericMembershipLookup):string[] {
  const errors:string[]=[];
  for(const p of world.pawns)if(p.shooting!==undefined) {
    if(!validShootingShape(p.shooting,version,world.tick)||!validStunShape(p.stun,version,world.tick)){errors.push('Invalid shooting state for schema.');continue;}
    const {order,stance}=p.shooting;
    const suspended=version>=198&&stance?.phase==='aim'&&!!p.stun&&world.tick*10<p.stun.untilCore;
    if(order){const weapon=equippedWeapon(world,p);if(!weapon||!isRangedWeaponItem(weapon.item)||order.hunt&&weapon.item==='emp-launcher'||stance?.phase==='aim'&&(stance.weaponItem??'revolver')!==weapon.item)errors.push('Invalid ranged weapon/aim profile.');}
    if(order?.auto&&(order.startedDowned||stance?.phase==='aim'&&stance.targetStartedDowned||order.auto.kind==='draft'&&p.draft?.holdFire||order.auto.kind==='response'&&order.auto.remaining===0&&stance?.phase!=='cooldown'))errors.push('Invalid automatic shooting phase.');
    if(p.state==='dead'||p.state==='downed'||p.jobId!==null||p.haul||p.cooking||p.equipmentTask||p.tend||p.ward||p.feed||p.rescue||p.need||p.recreation.task||p.orders.active!==null||(p.priorityWork||p.orders.queue.length)&&!(version>=79&&(!order||order.hunt)))errors.push('Shooting conflicts with another activity.');
    if(order){
      const target=combatTarget(world,order.targetId);
      const legacyOwnership=order.hunt?huntingPermission(world,p,order.targetId):order.auto?automaticOwnership(world,p,order.targetId,order.auto.kind)
        :isColonist(p)?!!p.draft:world.pawns.some(t=>t.id===order.targetId&&hostileTo(p,t))||version>=194&&!p.prisoner&&!!world.mechanoids?.some(m=>m.id===order.targetId);
      if((version>=198&&!shootingOrderAuthority(world,p,order))||(!suspended&&!legacyOwnership)||(!order.auto&&p.draft?.target)||order.auto?.kind==='draft'&&!automaticPost(p)
        ||p.draft?.queue.length||p.path.length||(!suspended&&!target)||order.targetId===p.id||equippedWeapon(world,p)?.id!==order.weaponId)errors.push('Invalid shooting order ownership.');
      if(version>=198){
        if(!integer(order.targetId,1,world.nextId-1))errors.push('Invalid shooting target identity.');
        if(suspended){
          const kind=historicalTargetKind(world,order.targetId);
          if(!target&&!registeredIds||registeredIds?.has(order.targetId)&&!kind||order.hunt&&kind!==undefined&&kind!=='animal'||!isColonist(p)&&kind==='animal')errors.push('Suspended shooting history aliases another owner.');
        }
      }
    }
    if(stance&&(p.motion?.end??0)>world.tick)errors.push('Shooting stance during a captured edge.');
    if(!stance&&!p.melee?.strike&&!p.stun&&(!order||!p.motion||(p.motion.end<=world.tick)))errors.push('Shooting wait without active travel.');
  }
  return errors;
}
