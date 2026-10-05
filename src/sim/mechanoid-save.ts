import { validateScytherMedicalRecord } from './injury-validation.ts';
import { medicalStatus } from './injury-state.ts';
import { travelEnd,validSlowIntervals,validStunIntervals } from './travel-timing.ts';
import { validStagger } from './stagger.ts';
import { validStunShape } from './melee-save.ts';
import { isBarrier } from './barriers.ts';
import { footprintCells } from './definitions.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const finite=(v:unknown,min=0,max=Number.MAX_VALUE):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const cell=(v:unknown)=>object(v)&&keys(v,['x','z'])&&integer(v.x)&&integer(v.z);
const TOOLS=['left-blade-cut','left-blade-stab','right-blade-cut','right-blade-stab','head'];

/** Sparse clock: mechanical records advance only on a real impact. A carcass
 * freezes that last clock, not the current World clock. Human owners never call
 * this guard and still reject the mechanical body in their ordinary validator. */
export function validMechaMedicalRecord(value:unknown,worldTick:number,dead:boolean):value is MedicalRecord {
  if(!integer(worldTick)||validateScytherMedicalRecord(value,194))return false;
  const record=value as MedicalRecord;
  return record.tick<=worldTick&&!!record.death===dead;
}
export function validMechanoidShape(value:unknown,version:number,tick:number):value is Mechanoid {
  if(version<194||!integer(tick)||!object(value)||!keys(value,['id','mechKind','x','z','state','health','path','motion','heading','moveCooldown','planCooldown','raid','melee','stagger','stun'])
    ||!integer(value.id,1)||value.mechKind!=='scyther'||!integer(value.x)||!integer(value.z)
    ||!['idle','moving','working','downed','dead'].includes(String(value.state))||!finite(value.heading,-Math.PI*2,Math.PI*2)
    ||!finite(value.moveCooldown,0,1000)||!integer(value.planCooldown,0,1000)||!Array.isArray(value.path)||!value.path.every(cell)
    ||!validStagger(value.stagger,version,tick)||!validStunShape(value.stun,version,tick))return false;
  const m=value as unknown as Mechanoid;
  if(m.health!==undefined&&!validMechaMedicalRecord(m.health,tick,m.state==='dead'))return false;
  if(!m.health&&(m.state==='downed'||m.state==='dead'))return false;
  if(m.raid!==undefined&&(!object(m.raid)||!keys(m.raid,['group','goal'])||!integer(m.raid.group,1)||m.raid.goal!==null&&!cell(m.raid.goal)))return false;
  if(m.motion!==undefined){
    const motion=m.motion;
    if(!object(motion)||!keys(motion,['from','to','start','end','speedFactor','terrainDelay','stagger','stuns'])||!cell(motion.from)||!cell(motion.to)
      ||!finite(motion.start,0,tick)||!finite(motion.end,0,tick+1000)||motion.end<=motion.start
      ||motion.speedFactor!==undefined&&!finite(motion.speedFactor,.001,4.7/4.6)||motion.terrainDelay!==undefined&&!finite(motion.terrainDelay,0,50)
      ||!validSlowIntervals(motion.stagger,version,motion.start,tick)||!validStunIntervals(motion.stuns,version,motion.start,tick)
      ||Math.max(Math.abs(motion.from.x-motion.to.x),Math.abs(motion.from.z-motion.to.z))!==1
      ||motion.to.x!==m.x||motion.to.z!==m.z||Math.abs(motion.end-travelEnd(motion))>1e-7
      ||Math.abs(m.moveCooldown-Math.max(0,motion.end-tick))>1e-7)return false;
  }else if(m.moveCooldown>0)return false;
  if(m.melee!==undefined){
    const melee=m.melee;
    if(!object(melee)||!keys(melee,['order','strike'])||melee.order===null&&melee.strike===null)return false;
    const o=melee.order,s=melee.strike;
    if(o!==null&&(!object(o)||!keys(o,['structure','targetId','startedDowned','jobUntilCore'])||!integer(o.targetId,1)||o.startedDowned!==false
      ||o.structure!==undefined&&o.structure!==true||(o.structure?o.jobUntilCore!==undefined:!integer(o.jobUntilCore,tick*10+1,tick*10+480))))return false;
    if(s!==null&&(!object(s)||!keys(s,['structure','targetId','atCore','untilCore','tool','outcome'])||!integer(s.targetId,1)
      ||!integer(s.atCore,0,tick*10)||!integer(s.untilCore,tick*10+1)||s.untilCore-s.atCore!==120||!TOOLS.includes(String(s.tool))
      ||!['hit','miss','dodge'].includes(String(s.outcome))||s.structure!==undefined&&(!cell(s.structure)||s.outcome!=='hit')))return false;
  }
  return true;
}

/** Context after owner shapes and the prior global namespace have been read.
 * This adopts only mechanical identities into the supplied common set. */
export function validateMechanoids(w:World,version:number=w.schemaVersion,ids=new Set<number>()):string[] {
  const errors:string[]=[];
  if(w.mechanoids===undefined)return errors;
  if(version<194||!Array.isArray(w.mechanoids)){errors.push('Invalid mechanoid population.');return errors;}
  const inBounds=(c:{x:number;z:number})=>c.x>=0&&c.z>=0&&c.x<w.width&&c.z<w.height;
  for(const m of w.mechanoids){
    if(!validMechanoidShape(m,version,w.tick)){errors.push('Invalid mechanoid shape.');continue;}
    if(m.id>=w.nextId||ids.has(m.id))errors.push('Invalid mechanoid identity.');ids.add(m.id);
    if(!inBounds(m)||m.path.length>w.width*w.height||m.path.some(c=>!inBounds(c))||m.motion&&(!inBounds(m.motion.from)||!inBounds(m.motion.to))||m.raid?.goal&&!inBounds(m.raid.goal))errors.push('Mechanoid position is outside the map.');
    let previous={x:m.x,z:m.z};for(const c of m.path){if(Math.max(Math.abs(c.x-previous.x),Math.abs(c.z-previous.z))!==1)errors.push('Disconnected mechanoid route.');previous=c;}
    const status=m.health?medicalStatus(m.health):'mobile',stopped=status!=='mobile';
    if(stopped?m.state!==status:m.state==='dead'||m.state==='downed')errors.push('Inconsistent mechanoid medical state.');
    if(stopped&&(m.path.length||m.melee?.order||m.raid?.goal||m.stun))errors.push('Incapacitated mechanoid retains an intention.');
    if(m.motion&&m.motion.end>w.tick&&!['moving','downed','dead'].includes(m.state))errors.push('Mechanoid edge has no movement owner.');
    const group=w.raids?.mechActive;
    if(m.raid&&(stopped?m.raid.group>(w.raids?.serial??0):!group||group.id!==m.raid.group||!group.members.includes(m.id)))errors.push('Mechanoid raid has no owner.');
    const o=m.melee?.order,s=m.melee?.strike;
    if(o){
      if(o.targetId>=w.nextId||o.targetId===m.id)errors.push('Invalid mechanoid melee target.');
      if(o.structure){
        if(w.raids?.mechActive?.phase!=='assault'||!w.structures.some(t=>t.id===o.targetId&&isBarrier(t)))errors.push('Invalid mechanoid barrier order.');
      }else if(!w.pawns.some(t=>t.id===o.targetId)&&!w.wildlife?.animals.some(t=>t.id===o.targetId))errors.push('Mechanoid living target is missing.');
    }
    if(s){
      if(s.targetId>=w.nextId||s.targetId===m.id||m.path.length||(m.motion?.end??0)>w.tick)errors.push('Invalid mechanoid recovery.');
      if(s.structure){
        const structure=w.structures.find(t=>t.id===s.targetId);
        if(!inBounds(s.structure)||structure&&(!isBarrier(structure)||!footprintCells(structure).some(c=>c.x===s.structure!.x&&c.z===s.structure!.z))
          ||!structure&&[w.pawns,w.mechanoids??[],w.piles,w.jobs,w.resources,w.wildlife?.animals??[]].some(owners=>owners.some(t=>t.id===s.targetId))
          ||w.packed.some(p=>p.building.id===s.targetId))errors.push('Invalid mechanoid barrier recovery.');
      }else if(!w.pawns.some(t=>t.id===s.targetId)&&!w.wildlife?.animals.some(t=>t.id===s.targetId)
        &&!w.piles.some(p=>p.id===s.targetId&&(!!p.corpse||!!p.humanCorpse||!!p.mechCorpse))&&!w.raids?.departed.some(t=>t.pawnId===s.targetId))errors.push('Mechanoid recovery has no historical target.');
    }
  }
  return errors;
}
