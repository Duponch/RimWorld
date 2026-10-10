import type {NumericMembershipLookup} from './numeric-membership.ts';
import { isMechanoidKind,type MechanoidKind } from './mechanoid-definition.ts';
import { mechanoidEnemy } from './combat-target.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { MechanoidRangedState } from './mechanoid-ranged-state.ts';
import type { World } from './types.ts';
import { empMechanoidActive } from './emp-state.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const target=(v:unknown):v is string=>typeof v==='string'&&/^(pawn|animal|mech):[1-9]\d*$/.test(v)&&integer(Number(v.slice(v.indexOf(':')+1)),1);
const clock=(kind:MechanoidKind,phase:'warmup'|'cooldown')=>kind==='lancer'?(phase==='warmup'?102:162):(phase==='warmup'?150:126);

/** Busy clocks advance only in the combat owner; pauses cannot forge elapsed time. */
export function validMechanoidRangedShape(value:unknown,kind:MechanoidKind,version:number,tick:number):value is MechanoidRangedState {
  if(version<197||!isMechanoidKind(kind)||kind==='scyther'||!integer(tick)||!integer(tick*10)
    ||!object(value)||!keys(value,['order','stance'])||value.order===null&&value.stance===null)return false;
  const core=tick*10,o=value.order,s=value.stance;
  if(o!==null&&(!object(o)||!keys(o,['targetKey','admittedAtCore','jobUntilCore'])||!target(o.targetKey)
    ||!integer(o.admittedAtCore,0,core)||!integer(o.jobUntilCore,core+1)||o.jobUntilCore-o.admittedAtCore<450||o.jobUntilCore-o.admittedAtCore>550))return false;
  if(s===null)return o!==null;
  if(!object(s)||!keys(s,['phase','targetKey','startedAtCore','lastAdvancedAtCore','remainingCore',...(s.phase==='warmup'?['targetStartedDowned']:[])])
    ||s.phase!=='warmup'&&s.phase!=='cooldown'||!target(s.targetKey)||!integer(s.startedAtCore,0,core)
    ||s.lastAdvancedAtCore!==core||!integer(s.remainingCore,1,clock(kind,s.phase))
    ||s.startedAtCore>Number(s.lastAdvancedAtCore)||Number(s.lastAdvancedAtCore)-s.startedAtCore<clock(kind,s.phase)-s.remainingCore)return false;
  return s.phase!=='warmup'||object(o)&&s.targetKey===o.targetKey&&s.startedAtCore>=Number(o.admittedAtCore)&&typeof s.targetStartedDowned==='boolean';
}

function historicalTarget(w:World,key:string,id:number):boolean {
  const kind=key.slice(0,key.indexOf(':'));
  if(kind==='pawn'){
    if(w.pawns.some(p=>p.id===id)||[w.scout,w.commercialTrip].some(g=>g&&'pawn' in g&&g.pawn.id===id)
      ||w.group&&'members' in w.group&&w.group.members.some(p=>p.id===id)||w.groupLosses?.some(l=>l.pawn.id===id))return true;
    return !!w.raids?.departed.some(d=>d.pawnId===id)||!!w.prisonDepartures?.some(d=>d.pawnId===id)
      ||!!w.visitors?.departed.some(d=>d.pawn.id===id)||!!w.podRescues?.departed.some(d=>d.pawn.id===id)
      ||w.piles.some(p=>p.humanCorpse?.pawnId===id);
  }
  if(kind==='animal')return !!w.wildlife?.animals.some(a=>a.id===id)||w.piles.some(p=>p.corpse?.animalId===id);
  return !!w.mechanoids?.some(m=>m.id===id)||w.piles.some(p=>p.id===id&&p.mechCorpse!==undefined);
}

/** ids, when supplied, is the COMPLETE Thing namespace after collective owners. */
export function validateMechanoidRanged(w:World,m:Mechanoid,version:number=w.schemaVersion,ids?:NumericMembershipLookup):string[] {
  const r=m.ranged;if(r===undefined)return [];
  if(!validMechanoidRangedShape(r,m.mechKind,version,w.tick))return ['Invalid mechanical ranged phase.'];
  const errors:string[]=[],o=r.order,s=r.stance,suspended=!!m.stun&&w.tick*10<m.stun.untilCore||empMechanoidActive(m,w.tick*10);
  if(o||s?.phase==='warmup'){
    if(m.state==='dead'||m.state==='downed'||m.melee?.order||m.melee?.strike)errors.push('Incapacitated or melee mechanoid retains a ranged intention.');
  }
  if(s&&(m.path.length||(m.motion?.end??0)>w.tick||m.melee?.strike))errors.push('Busy mechanoid retains a route or melee recovery.');
  for(const [key,active] of [[o?.targetKey,true],[s?.targetKey,s?.phase==='warmup']] as const){
    if(!key)continue;
    const id=Number(key.slice(key.indexOf(':')+1));
    if(id>=w.nextId||id===m.id){errors.push('Invalid mechanical ranged target identity.');continue;}
    const current=key.startsWith('pawn:')?w.pawns.find(p=>p.id===id):key.startsWith('animal:')?w.wildlife?.animals.find(a=>a.id===id):w.mechanoids?.find(a=>a.id===id);
    // Core suspends warmup checks during a real stun, including disappearance
    // and downing. It never turns a friendly machine into an intended enemy.
    if(active&&(key.startsWith('mech:')||!suspended&&(!current||!mechanoidEnemy(w,m,current)
      ||s?.phase==='warmup'&&!s.targetStartedDowned&&current.state==='downed')))errors.push('Mechanical ranged target is no longer an admissible enemy.');
    if((!active||suspended)&&ids?.has(id)&&!historicalTarget(w,key,id))errors.push('Mechanical ranged history aliases another owner.');
  }
  return errors;
}
