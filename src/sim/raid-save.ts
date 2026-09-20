import { validApparelShape,validateApparel } from './apparel-save.ts';
import { validCassandraAgenda } from './cassandra-raids.ts';
import { validWeaponShape,validateEquipment } from './equipment-save.ts';
import { TICKS_PER_DAY,type World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validateRaids(w:World,version:number,ids:Set<number>):string[] {
  const errors:string[]=[],state:unknown=w.raids;
  const cell=(v:unknown):boolean=>object(v)&&Object.keys(v).length===2&&integer(v.x,0,w.width-1)&&integer(v.z,0,w.height-1);
  if(version<68)return state!==undefined||w.pawns.some(p=>p.raid!==undefined)?['Legacy save contains raid state.']:[];
  if(state===undefined)return w.pawns.some(p=>p.raid!==undefined)?['Raider without calendar.']:[];
  if(!object(state)||!keys(state,['profile','rng','nextCheck','serial','completed','active','last','departed','cassandra'])||!['camp-raids-v1','cassandra-raids-v1'].includes(String(state.profile))||!integer(state.rng,1,4294967295)||!integer(state.serial,0)||!integer(state.completed,0,state.serial)||!Array.isArray(state.departed)||state.departed.length>w.width*w.height)return ['Invalid raid calendar.'];
  const cassandra=state.profile==='cassandra-raids-v1';
  if(cassandra?version<82||!w.gameProfile||!validCassandraAgenda(state.cassandra,w.tick):state.cassandra!==undefined)return ['Invalid Cassandra raid agenda.'];
  const s=w.raids!,a:unknown=s.active,last:unknown=s.last;
  // Cassandra's already-validated agenda fixes its exact future window. The
  // gap from an early opportunity to the next cycle's late opportunity can
  // exceed one cycle; a rolling cycle-length bound would reject that save.
  const validNext=a===undefined?(cassandra?s.nextCheck===s.cassandra!.pending[0]:integer(s.nextCheck,w.tick+1,w.tick+8*TICKS_PER_DAY)):s.nextCheck===null;
  if(s.completed!==s.serial-(a===undefined?0:1)||!validNext)errors.push('Invalid raid schedule or count.');
  if(s.completed===0?last!==undefined:!object(last)||!keys(last,['id','tick','reason','killed','downed','escaped',...(version>=86?['captured']:[])])||last.id!==s.completed||!integer(last.tick,0,w.tick)||!['defended','withdrawn','colony-down'].includes(String(last.reason))||!['killed','downed','escaped'].every(k=>integer(last[k],0,2))||last.captured!==undefined&&(version<86||!integer(last.captured,1,2))||Number(last.killed)+Number(last.downed)+Number(last.escaped)+Number(last.captured??0)!==(s.completed===1?1:2))errors.push('Invalid raid outcome.');
  for(const d of s.departed){
    if(!object(d)||!keys(d,['group','pawnId','name','cell','tick','items'])||!integer(d.group,1,s.serial)||!integer(d.pawnId,1,w.nextId-1)||ids.has(d.pawnId)||typeof d.name!=='string'||!d.name.trim()||d.name.length>48||!integer(d.tick,0,w.tick)||!cell(d.cell)||!(d.cell.x===0||d.cell.z===0||d.cell.x===w.width-1||d.cell.z===w.height-1)||!Array.isArray(d.items)||d.items.length>3){errors.push('Invalid raid departure.');continue;}
    ids.add(d.pawnId);
    let valid=true;
    for(const i of d.items){
      if(!object(i)||!keys(i,['id','kind','item','quantity','owner','apparel','weapon'])||!integer(i.id,1,w.nextId-1)||ids.has(i.id)||!object(i.owner)||!keys(i.owner,['type','pawnId'])||!('pawnId' in i.owner)||i.owner.pawnId!==d.pawnId||!(i.kind==='weapon'&&i.item==='revolver'&&i.owner.type==='equipment'||i.kind==='apparel'&&i.owner.type==='apparel')||!validWeaponShape(i,version>=86?version:68)||!validApparelShape(i,version>=86?version:68)){valid=false;continue;}
      ids.add(i.id);
    }
    if(!valid){errors.push('Invalid exported raid equipment.');continue;}
    // Reuse physical ownership/layer contracts on a minimal owner, not a second
    // weaker interpretation of the same apparel and primary-equipment data.
    const owner={...w.pawns[0]!,id:d.pawnId,state:'idle' as const,health:undefined,need:null,equipmentTask:undefined,equipmentDropPending:undefined,droppedWeaponId:undefined};
    const exported={...w,pawns:[owner],piles:d.items};
    errors.push(...validateApparel(exported),...validateEquipment(exported));
  }
  if(a!==undefined){
    if(!object(a)||!keys(a,['id','startedAt','deadline','lossPermille','members','lost','phase','reason'])||a.id!==s.serial||!integer(a.startedAt,0,w.tick)||!integer(a.deadline,a.startedAt+2600,a.startedAt+3800)||!integer(a.lossPermille,400,700)||!['assault','withdraw'].includes(String(a.phase))||!Array.isArray(a.members)||a.members.length!==(s.serial===1?1:2)||new Set(a.members).size!==a.members.length||!a.members.every(id=>integer(id,1,w.nextId-1))||!Array.isArray(a.lost)||!a.lost.every((id,i)=>a.members instanceof Array&&a.members.includes(id)&&(i===0||Number(id)>Number((a.lost as unknown[])[i-1])))||!(a.phase==='assault'?a.reason===undefined:['losses','timeout','colony-down'].includes(String(a.reason))))return [...errors,'Invalid active raid group.'];
    const group=s.active!;
    if(group.phase==='withdraw'&&(group.reason==='timeout'&&w.tick<group.deadline||group.reason==='losses'&&group.lost.length*1000<group.members.length*group.lossPermille))errors.push('Premature raid withdrawal.');
    for(const id of a.members)if(!w.pawns.some(p=>p.id===id&&(p.raid?.group===a.id||version>=86&&p.recruitment?.raidGroup===a.id))&&!s.departed.some(d=>d.pawnId===id&&d.group===a.id))errors.push('Missing raid participant.');
  }
  for(const p of w.pawns){const r:unknown=p.raid;if(r===undefined)continue;
    if(!object(r)||!keys(r,['group','exiting','goal'])||!integer(r.group,1,s.serial)||typeof r.exiting!=='boolean'||r.goal!==null&&!cell(r.goal)||p.faction!=='outlaws'||(r.group===s.active?.id?!s.active?.members.includes(p.id)||(p.prisoner?!r.exiting||r.goal!==null:r.exiting!==(s.active.phase==='withdraw')):!r.exiting)){errors.push('Invalid raider mandate.');continue;}
    if(p.prisoner&&(!r.exiting||r.goal!==null))errors.push('Captive retains a raid navigation mandate.');
    if(!(version>=87&&p.burning)&&!p.prisoner&&p.path.length&&!p.melee&&!p.tactics&&!p.need&&(!r.goal||p.path.at(-1)!.x!==(r.goal as {x:number}).x||p.path.at(-1)!.z!==(r.goal as {z:number}).z))errors.push('Raid route misses its goal.');
    if(r.exiting&&(p.tactics?.targetId!=null||p.shooting?.order||p.melee?.order&&!p.melee.order.structure))errors.push('Retreating raider retains a human target.');
  }
  return errors;
}
