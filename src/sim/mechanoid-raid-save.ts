import { validMechanoidComposition } from './mechanoid-raid-composition.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export const validMechComposition=(value:unknown,ranged=false):boolean=>validMechanoidComposition(value,ranged);
export function validateMechanoidRaids(w:World,version:number=w.schemaVersion,registeredIds?:ReadonlySet<number>):string[] {
  const s=w.raids,errors:string[]=[];
  if(!s)return (w.mechanoids??[]).some(m=>m.raid)?['Mechanoid mandate without calendar.']:[];
  const p:unknown=s.mechanoid,g:unknown=s.mechActive;
  if(version<194&&(p!==undefined||g!==undefined||s.last?.mechanoid!==undefined||s.last?.mechComposition!==undefined))return ['Future mechanoid raid state.'];
  if(p!==undefined&&(!object(p)||!keys(p,['adoptedAt','rng','lastFaction',...(version>=197?['ranged']:[])])||!int(p.adoptedAt,0,w.tick)||!int(p.rng,1,0xffffffff)
    ||p.lastFaction!==undefined&&(typeof p.lastFaction!=='string'||!['outlaws','mechanoid'].includes(p.lastFaction))||s.profile!=='cassandra-raids-v1'
    ||p.ranged!==undefined&&(!object(p.ranged)||Object.keys(p.ranged).length!==1||!keys(p.ranged,['adoptedAt'])||!int(p.ranged.adoptedAt,p.adoptedAt,w.tick))))errors.push('Invalid mechanoid raid policy.');
  const rangedAt=version>=197&&object(p)&&object(p.ranged)&&int(p.ranged.adoptedAt)?p.ranged.adoptedAt:undefined;
  if(g!==undefined){
    const cell=(v:unknown)=>object(v)&&Object.keys(v).length===2&&keys(v,['x','z'])&&int(v.x,0,w.width-1)&&int(v.z,0,w.height-1);
    if(!p||s.active||!object(g)||!keys(g,['id','startedAt','members','lost','phase','stage','composition'])||g.id!==s.serial||!int(g.startedAt,object(p)&&int(p.adoptedAt)?p.adoptedAt:0,w.tick)
      ||!validMechComposition(g.composition,rangedAt!==undefined&&Number(g.startedAt)>=rangedAt)||!Array.isArray(g.members)||!object(g.composition)||!Array.isArray(g.composition.roster)||g.members.length!==g.composition.roster.length
      ||!g.members.every(id=>int(id,1,w.nextId-1))||new Set(g.members).size!==g.members.length||!Array.isArray(g.lost)
      ||!g.lost.every((id,i)=>Array.isArray(g.members)&&g.members.includes(id)&&(i===0||Number(id)>Number((g.lost as unknown[])[i-1])))
      ||typeof g.phase!=='string'||!['staging','assault'].includes(g.phase)||!object(g.stage)||Object.keys(g.stage).length!==3||!keys(g.stage,['point','activatedAtCore','delayCore'])
      ||!cell(g.stage.point)||g.stage.activatedAtCore!==Number(g.startedAt)*10||!int(g.stage.delayCore,5000,14999))return [...errors,'Invalid mechanoid raid group.'];
    const group=s.mechActive!;
    if(group.phase==='staging'&&(w.tick*10>group.stage.activatedAtCore+group.stage.delayCore||group.lost.length*10>=group.members.length*3))errors.push('Stale mechanoid staging.');
    if(group.phase==='assault'&&w.tick*10<=group.stage.activatedAtCore+group.stage.delayCore&&group.lost.length*10<group.members.length*3)errors.push('Premature mechanoid assault.');
    const incompatible=new Set(registeredIds);
    for(const owners of [w.pawns,w.wildlife?.animals??[],w.piles,w.jobs,w.resources,w.structures,w.stockpiles,w.growingZones,w.filth?.items??[],w.fires?.items??[],w.fires?.embers??[],w.projectiles??[],w.bombWaves??[]])for(const owner of owners)incompatible.add(owner.id);
    for(const pack of w.packed)incompatible.add(pack.building.id);
    for(const [index,id] of group.members.entries()){
      const actor=w.mechanoids?.find(m=>m.id===id),corpse=w.piles.find(i=>i.id===id&&i.mechCorpse);
      if(!actor&&!corpse&&incompatible.has(id))errors.push('Mechanical historical identity reused by another owner.');
      if(actor&&actor.mechKind!==group.composition.roster[index]||corpse&&corpse.mechCorpse!.mechKind!==group.composition.roster[index])errors.push('Mechanical participant kind disagrees with its roster.');
      if(actor?actor.raid?.group!==group.id||group.lost.includes(id)!==(actor.state==='dead'):!group.lost.includes(id)||corpse?.mechCorpse&&!corpse.mechCorpse.health.death)errors.push('Missing or inconsistent mechanoid raid participant.');
    }
  }
  const last=s.last;
  if(last?.mechanoid!==undefined||last?.mechComposition!==undefined){
    if(version<194||!p||last!.tick<(s.mechanoid?.adoptedAt??0)||last?.mechanoid!==true||!validMechComposition(last.mechComposition,rangedAt!==undefined&&last!.tick>=rangedAt)||last.composition!==undefined||last.originQuestId!==undefined
      ||last.reason!=='defended'||last.downed!==0||last.escaped!==0||last.captured!==undefined||last.killed!==last.mechComposition?.roster.length)errors.push('Invalid mechanoid raid outcome.');
  }
  return errors;
}
