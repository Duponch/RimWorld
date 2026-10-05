import type { MiniTurretState } from './mini-turret-state.ts';
import type { World } from './types.ts';
import { miniTurretExplosive } from './bomb-creation.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const livingKey=(v:unknown,nextId:number,version:number)=>typeof v==='string'&&(version>=194||!v.startsWith('mech:'))&&/^(pawn|animal|mech):[1-9][0-9]*$/.test(v)&&int(Number(v.split(':')[1]),1,nextId-1);
const instigatorKey=(v:unknown,nextId:number,version:number)=>typeof v==='string'&&(version>=194||!v.startsWith('mech:'))&&/^(pawn|animal|mech|structure):[1-9][0-9]*$/.test(v)&&int(Number(v.split(':')[1]),1,nextId-1);

/** Shared exact shape. Context below requires it only on installed mini-turrets. */
export function validMiniTurretShape(value:unknown,version:number,atCore?:number,nextId=Number.MAX_SAFE_INTEGER):value is MiniTurretState {
  if(version<193||!record(value)||!keys(value,['ammoQ','autoReload','holdFire','targetKey','warmup','burst','cooldownCore'],['wick'])
    ||!int(value.ammoQ,0,240)||typeof value.autoReload!=='boolean'||typeof value.holdFire!=='boolean'
    ||value.targetKey!==null&&!livingKey(value.targetKey,nextId,version)||!int(value.cooldownCore,0,288))return false;
  const warmup=value.warmup,burst=value.burst;
  if(warmup!==null&&(!record(warmup)||!keys(warmup,['remainingCore','totalCore'])||!int(warmup.totalCore,15,45)||!int(warmup.remainingCore,1,Number(warmup.totalCore))
    ||value.targetKey===null||value.holdFire||burst!==null||value.cooldownCore!==0))return false;
  if(burst!==null&&(!record(burst)||!keys(burst,['targetKey','shotsLeft','delayCore'])||!livingKey(burst.targetKey,nextId,version)||burst.shotsLeft!==1||!int(burst.delayCore,1,8)
    ||warmup!==null||value.cooldownCore!==0))return false;
  if(Object.hasOwn(value,'wick')){
    const wick=value.wick;
    if(!record(wick)||!keys(wick,['startedAtCore','endCore'],['instigatorKey'])||!int(wick.startedAtCore,0)||!int(wick.endCore,0)||wick.endCore!==Number(wick.startedAtCore)+240
      ||atCore!==undefined&&(wick.startedAtCore>atCore||wick.endCore<=atCore)||Object.hasOwn(wick,'instigatorKey')&&!instigatorKey(wick.instigatorKey,nextId,version))return false;
  }
  return true;
}

/** A captured target can die/despawn after its owner's Core passage. No load retarget. */
function liveKeyHasCorrectType(w:World,key:string):boolean {
  const [type,raw]=key.split(':'),id=Number(raw);
  if(type==='pawn'&&w.pawns.some(p=>p.id===id)||type==='animal'&&w.wildlife?.animals.some(a=>a.id===id))return true;
  if(type==='mech'&&(w.mechanoids?.some(m=>m.id===id)||w.piles.some(p=>p.id===id&&p.mechCorpse)))return true;
  if(type==='animal'&&w.piles.some(p=>p.id===id&&p.kind==='corpse'&&p.corpse))return true;
  // Historical absent keys are legal; a current object of another type is not.
  return !w.pawns.some(p=>p.id===id)&&!w.wildlife?.animals.some(a=>a.id===id)&&!w.mechanoids?.some(m=>m.id===id)&&!w.structures.some(s=>s.id===id)
    &&!w.jobs.some(j=>j.id===id)&&!w.resources.some(r=>r.id===id)&&!w.piles.some(p=>p.id===id)&&!w.packed.some(p=>p.building.id===id)
    &&!w.projectiles?.some(p=>p.id===id)&&!w.bombWaves?.some(b=>b.id===id);
}
export function validateMiniTurrets(w:World,errors:string[]=[]):string[] {
  const version=w.schemaVersion,core=w.tick*10;
  for(const s of w.structures){
    if(s.kind!=='mini-turret'){
      if(Object.hasOwn(s,'turret'))errors.push('Unexpected intrinsic turret owner.');
      continue;
    }
    if(version<193||s.orientation!==0||s.footprint!=='standard'||s.material!=='steel'||s.quality!==undefined||!validMiniTurretShape(s.turret,version,core,w.nextId)){
      errors.push('Invalid intrinsic turret state.');continue;
    }
    if([s.turret.targetKey,s.turret.burst?.targetKey].some(k=>k!==null&&k!==undefined&&!liveKeyHasCorrectType(w,k)))errors.push('Invalid intrinsic turret target identity.');
    if(s.turret.wick&&!miniTurretExplosive(s.id))errors.push('Non-explosive turret has a wick.');
  }
  // Before schema26 the packed-owner registry does not exist yet. Validate
  // every registry actually present, including forbidden future turret fields.
  for(const pack of w.packed??[])if(pack.building.kind==='mini-turret'||Object.hasOwn(pack.building,'turret'))errors.push('Intrinsic turret cannot be minified.');
  for(const j of w.jobs)if(Object.hasOwn(j,'turret')||j.kind==='install'&&j.furniture?.kind==='mini-turret'||j.kind==='uninstall'&&j.furniture?.kind==='mini-turret')errors.push('Unexpected turret plan or minification.');
  return errors;
}
