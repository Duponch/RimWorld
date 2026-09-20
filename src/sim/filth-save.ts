import { isColonist } from './affiliation.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { FILTH_DEFINITIONS,filthCheckPeriod,isFilthKind,type FilthFeet } from './filth-rules.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:object,names:readonly string[])=>Object.keys(v).every(k=>names.includes(k));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validFilthFeet(v:unknown):v is FilthFeet {
  if(!object(v)||!keys(v,['lastTerrain','carried'])||v.lastTerrain!==undefined&&v.lastTerrain!=='dirt'||!Array.isArray(v.carried)||v.carried.length>6)return false;
  const kinds=new Set<string>();for(const f of v.carried){if(!object(f)||!keys(f,['kind','thickness'])||!isFilthKind(f.kind)||!int(f.thickness,1,5)||kinds.has(f.kind))return false;kinds.add(f.kind);}return !!v.carried.length||v.lastTerrain!==undefined;
}
/** Call after ordinary World/Pawn collection shapes, before accepting current
 * saves. Legacy validation rejects the domain before any neutral migration. */
export function validateFilth(w:World,version:number,ids?:Set<number>):string[] {
  const errors:string[]=[],s=w.filth,now=w.tick*10,seen=ids??new Set<number>(),cells=new Set<string>();
  if(s!==undefined){
    if(version<89||!object(s)||!keys(s,['rng','items','cleaned'])||!int(s.rng,1,0xffffffff)||!int(s.cleaned)||!Array.isArray(s.items)||s.items.length>w.width*w.height*6)return ['Invalid filth state.'];
    const period=filthCheckPeriod(w);
    for(const f of s.items){
      if(!object(f)||!keys(f,['id','kind','x','z','thickness','grownCore','expiresAfterCore','nextCheckCore'])||!isFilthKind(f.kind)||!int(f.id,1,w.nextId-1)||seen.has(f.id)||!int(f.x,0,w.width-1)||!int(f.z,0,w.height-1)||!int(f.thickness,1,5)||!int(f.grownCore,0,now)||!int(f.nextCheckCore,now+1,now+period)){errors.push('Invalid filth record.');continue;}
      const d=FILTH_DEFINITIONS[f.kind],key=`${f.x}:${f.z}:${f.kind}`;
      if(!int(f.expiresAfterCore,d.minDays*60000,d.maxDays*60000-1)||cells.has(key)||['rock','water'].includes(w.tiles[f.z*w.width+f.x]!.terrain))errors.push('Invalid filth lifetime or position.');
      seen.add(f.id);cells.add(key);
    }
  }
  const reserved=new Set<number>();
  for(const p of w.pawns){
    if(p.filthFeet!==undefined&&(version<89||!s||!validFilthFeet(p.filthFeet)))errors.push('Invalid carried filth.');
    const t=p.cleaning;if(t===undefined)continue;
    if(version<89||!s||!object(t)||!keys(t,['targets','forced','phase','progress'])||!Array.isArray(t.targets)||!t.targets.length||t.targets.length>s.items.length||typeof t.forced!=='boolean'||!['approach','clean'].includes(String(t.phase))||typeof t.progress!=='number'||!Number.isFinite(t.progress)||t.progress<0||!isColonist(p)||p.prisoner||p.draft||p.mental?.crisis||p.burning||medicalWorkRefusal(p)||!t.forced&&!p.priorities.clean){errors.push('Invalid cleaning activity.');continue;}
    const active=s.items.find(f=>f.id===t.targets[0]);if(!active||t.progress>FILTH_DEFINITIONS[active.kind].work)errors.push('Invalid cleaning progress.');
    for(const id of t.targets){if(!int(id,1)||reserved.has(id)||!s.items.some(f=>f.id===id))errors.push('Invalid cleaning reservation.');reserved.add(id);}
    if(p.orders?.active!==null||p.jobId!==null||p.haul||p.cooking||p.need||p.research||p.ward||p.feed||p.tend||p.rescue||p.firefighting||p.trade||p.burial||p.hunting||p.equipmentTask||p.recreation.task)errors.push('Conflicting cleaning activity.');
  }
  return errors;
}
