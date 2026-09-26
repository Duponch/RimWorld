import {validatePawnAppearance} from './pawn-appearance.ts';
import {validateFurniture} from './furniture-transfer-save.ts';
import {validateArtObjects} from './art-save.ts';
import {isSculptureKind} from './furniture-stats.ts';
import { validApparelShape } from './apparel-save.ts';
import { conflictsWith } from './apparel-rules.ts';
import { validDisturbance } from './disturbance-state.ts';
import { validWeaponShape } from './equipment-save.ts';
import { isPerishable,ROT_DAYS,rotAge } from './food-preservation.ts';
import { validateMedicalRecord } from './injury-validation.ts';
import { validFoodContamination } from './food-poisoning-save.ts';
import { validFilthFeet } from './filth-save.ts';
import { medicalStatus } from './injury-state.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { validSkills } from './skills-save.ts';
import { pileMaxHp } from './thing-damage-rules.ts';
import { INTRO_VISITOR_TICK,VISITOR_FLOWS,VISITOR_INTERVAL,VISITOR_YEAR,type VisitorKind } from './visitor-state.ts';
import { TICKS_PER_DAY,type Cell,type MaterialPile,type World } from './types.ts';
import { APPAREL_POLICY_INTERVAL } from './apparel-renewal.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const range=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const cell=(v:unknown,w:World):v is Cell=>object(v)&&Object.keys(v).length===2&&integer(v.x,0,w.width-1)&&integer(v.z,0,w.height-1);
const edge=(v:Cell,w:World)=>v.x===0||v.z===0||v.x===w.width-1||v.z===w.height-1;
const phases=['arriving','staying','leaving'];

export function validVisitorShape(p:Record<string,unknown>,version:number,w:World):boolean {
  const v=p.visitor;if(version<88)return v===undefined;
  if(v===undefined)return true;
  return object(v)&&Object.keys(v).length===5&&keys(v,['group','role','phase','goal','personalFoodIds'])&&integer(v.group,1)
    &&['traveler','visitor','trader'].includes(String(v.role))&&phases.includes(String(v.phase))&&(v.goal===null||cell(v.goal,w))
    &&Array.isArray(v.personalFoodIds)&&v.personalFoodIds.length<=8&&new Set(v.personalFoodIds).size===v.personalFoodIds.length&&v.personalFoodIds.every(id=>integer(id,1,w.nextId-1));
}
function validAgenda(value:unknown,kind:VisitorKind,w:World):boolean {
  if(!object(value)||Object.keys(value).length!==4||!keys(value,['rng','cycle','last','pending'])||!integer(value.rng,1,0xffffffff)||!integer(value.cycle,0)||!Array.isArray(value.pending))return false;
  const rule=VISITOR_FLOWS[kind],start=rule.minimum+value.cycle*VISITOR_YEAR,end=start+VISITOR_YEAR;
  return Number.isSafeInteger(end)&&start<=w.tick+VISITOR_YEAR+rule.minimum&&value.pending.length>=1&&value.pending.length<=rule.count&&integer(value.last,start,end)&&value.last===value.pending.at(-1)
    &&value.pending.every((t,i,array)=>integer(t,Math.max(start,w.tick+1),end)&&t%VISITOR_INTERVAL===0&&(!i||t-Number(array[i-1])>=rule.spacing));
}
function validArchivedPawn(value:unknown,w:World,tick:number):boolean {
  if(object(value)&&value.filthFeet!==undefined){if(w.schemaVersion<89||!validFilthFeet(value.filthFeet))return false;const copy={...value};delete copy.filthFeet;value=copy;}
  if(object(value)&&value.appearance!==undefined&&(w.schemaVersion<109||validatePawnAppearance(value.appearance).length))return false;
  if(!object(value)||!keys(value,[...(w.schemaVersion>=109?['appearance']:[]),'id','name','x','z','visitor','faction','medicalCare','skills','recreation','foodPolicyId','schedule','restZeroTicks','collapsePending','hunger','rest','mood','comfort',...(w.schemaVersion>=90?['beauty','apparelPolicyId','apparelAutomation','nextApparelCheckAt']:[]),'memories','orders','jobId','haul','cooking','need','bedId','needCooldown','state','priorities','path','moveCooldown','planCooldown','health','lastAttack','disturbance']))return false;
  if(!integer(value.id,1,w.nextId-1)||typeof value.name!=='string'||!value.name.trim()||value.name.length>48||!integer(value.x,0,w.width-1)||!integer(value.z,0,w.height-1)||!edge(value as unknown as Cell,w)
    ||value.faction!=='outlanders'||value.medicalCare!=='industrial'||value.state!=='idle'||!validVisitorShape(value,88,w)||!object(value.visitor)||value.visitor.phase!=='leaving'||value.visitor.goal!==null
    ||!['hunger','rest','mood','comfort',...(w.schemaVersion>=90?['beauty']:[])].every(k=>range(value[k],0,100))||value.collapsePending!==false||!integer(value.restZeroTicks,0)||!validSkills(value.skills,tick,w.schemaVersion)||!integer(value.foodPolicyId,1)
    ||w.schemaVersion>=90&&value.apparelPolicyId!==undefined&&(!integer(value.apparelPolicyId,1)||!w.apparelPolicies?.some(policy=>policy.id===value.apparelPolicyId)||typeof value.apparelAutomation!=='boolean'||!integer(value.nextApparelCheckAt,0,w.tick+APPAREL_POLICY_INTERVAL.max))
    ||!Array.isArray(value.schedule)||value.schedule.length!==24||!value.schedule.every(v=>['anything','work','sleep','recreation'].includes(String(v)))
    ||!object(value.orders)||Object.keys(value.orders).length!==2||value.orders.active!==null||!Array.isArray(value.orders.queue)||value.orders.queue.length!==0
    ||!['jobId','haul','cooking','need','bedId'].every(k=>value[k]===null)||!Array.isArray(value.path)||value.path.length!==0||value.moveCooldown!==0||!integer(value.needCooldown,0)||!integer(value.planCooldown,0)
    ||!object(value.priorities)||Object.keys(value.priorities).length!==15+(w.schemaVersion>=89&&value.priorities.clean!==undefined?1:0)+(w.schemaVersion>=104&&value.priorities.art!==undefined?1:0)+(w.schemaVersion>=106&&value.priorities.handle!==undefined?1:0)||!Object.keys(value.priorities).every(k=>[...(w.schemaVersion>=89?['clean']:[]),...(w.schemaVersion>=104?['art']:[]),...(w.schemaVersion>=106?['handle']:[]),'firefight','warden','basic','hunt','research','patient','bedrest','doctor','mine','gather','build','haul','grow','cook','craft'].includes(k))||!Object.values(value.priorities).every(v=>v===0))return false;
  const r=value.recreation;
  if(!object(r)||!keys(r,['level','tolerance','bored','task'])||!range(r.level,0,100)||r.task!==null||!object(r.tolerance)||!object(r.bored))return false;
  const tolerance=r.tolerance,bored=r.bored;
  if(Object.keys(tolerance).length!==2||Object.keys(bored).length!==2||!['solitary','dexterity'].every(k=>range(tolerance[k],0,100)&&typeof bored[k]==='boolean'))return false;
  if(!Array.isArray(value.memories)||value.memories.length>2||new Set(value.memories.map(m=>object(m)?m.kind:null)).size!==value.memories.length||!value.memories.every(m=>object(m)&&Object.keys(m).length===2&&['ate-without-table','ate-raw-food'].includes(String(m.kind))&&integer(m.expiresAt,tick+1,tick+TICKS_PER_DAY)))return false;
  if(value.health!==undefined&&(validateMedicalRecord(value.health,true,true,true,true,false,false,true,true,true,true,w.schemaVersion>=89)!==null||!object(value.health)||!integer(value.health.tick,0,tick)||medicalStatus(value.health as unknown as NonNullable<World['pawns'][number]['health']>)!=='mobile'))return false;
  if(!validDisturbance(value.disturbance,88,tick))return false;
  const a=value.lastAttack;if(a!==undefined&&(!object(a)||Object.keys(a).length!==2||!integer(a.targetId,1,w.nextId-1)||a.targetId===value.id||!integer(a.atCore,0,tick*10)))return false;
  return true;
}
function validExportedPile(value:unknown,pawnId:number,tick:number,w:World):value is MaterialPile {
  if(!object(value)||!keys(value,['id','kind','item','quantity','owner','rot','apparel','weapon','damage',...(w.schemaVersion>=89?['foodPoison']:[])])||!integer(value.id,1,w.nextId-1)||typeof value.item!=='string'||!Object.hasOwn(ITEM_DEFINITIONS,value.item)||!validFoodContamination(value.foodPoison,value.item as keyof typeof ITEM_DEFINITIONS,w.schemaVersion>=89)||!object(value.owner)||Object.keys(value.owner).length!==2||!['inventory','apparel','equipment'].includes(String(value.owner.type))||value.owner.pawnId!==pawnId)return false;
  const def=ITEM_DEFINITIONS[value.item as keyof typeof ITEM_DEFINITIONS];
  if(value.kind!==def.kind||!integer(value.quantity,1,def.stackLimit)||!validApparelShape(value,w.schemaVersion)||!validWeaponShape(value,w.schemaVersion)||value.owner.type==='apparel'&&value.kind!=='apparel'||value.owner.type==='equipment'&&value.kind!=='weapon')return false;
  if(value.damage!==undefined&&(value.apparel!==undefined||value.weapon!==undefined||!integer(value.damage,1,pileMaxHp(value as unknown as MaterialPile)-1)))return false;
  const r=value.rot;
  if(isPerishable(value.item as keyof typeof ITEM_DEFINITIONS)){
    if(!object(r)||!keys(r,['progress','atTick','rate'])||!range(r.progress,0,Number.MAX_SAFE_INTEGER)||!integer(r.atTick,0,tick)||r.rate!==undefined&&!range(r.rate,0,1))return false;
    if(rotAge(value as unknown as MaterialPile,tick)>=ROT_DAYS[value.item as keyof typeof ROT_DAYS]*TICKS_PER_DAY)return false;
  }else if(r!==undefined)return false;
  return true;
}
/** Before migration. Includes archived identities in the same global namespace;
 * frozen medical/food ages are checked at departure, not advanced off-map. */
export function validateVisitors(w:World,version:number,ids:Set<number>):string[] {
  const state:unknown=w.visitors;
  if(version<88)return state!==undefined||w.pawns.some(p=>p.visitor)?['Legacy save contains visitor state.']:[];
  if(state===undefined)return w.pawns.some(p=>p.visitor)?['Visitor without calendar.']:[];
  if(!object(state)||Object.keys(state).length!==9||!keys(state,['profile','adoptedAt','rng','serial','introAt','traveler','visitor','groups','departed'])||state.profile!=='cassandra-visitors-v1'||!integer(state.adoptedAt,0,w.tick)||!integer(state.rng,1,0xffffffff)||!integer(state.serial,0)
    ||state.introAt!==null&&(state.adoptedAt!==0||state.introAt!==INTRO_VISITOR_TICK||w.tick>=INTRO_VISITOR_TICK)||!validAgenda(state.traveler,'traveler',w)||!validAgenda(state.visitor,'visitor',w)||!Array.isArray(state.groups)||state.groups.length>w.width*w.height||!Array.isArray(state.departed)||state.departed.length>w.width*w.height)return ['Invalid visitor calendar.'];
  const errors:string[]=[],s=w.visitors!,groups=new Set<number>(),members=new Set<number>(),departed=new Set<number>();
  for(const d of s.departed){
    if(!object(d)||!keys(d,['group','tick','pawn','items',...(version>=105?['packed']:[])])||d.packed!==undefined&&(version<105||!Array.isArray(d.packed)||d.packed.length===0||d.packed.length>32768)||!integer(d.group,1,s.serial)||!integer(d.tick,s.adoptedAt,w.tick)||!validArchivedPawn(d.pawn,w,d.tick)||!Array.isArray(d.items)||d.items.length>32768){errors.push('Invalid frozen visitor departure.');continue;}
    const p=d.pawn;if(ids.has(p.id)||p.visitor!.group!==d.group||departed.has(p.id)){errors.push('Duplicate visitor departure identity.');continue;}ids.add(p.id);departed.add(p.id);
    const worn:MaterialPile[]=[];let equipped=0;
    for(const pile of d.items){
      if(!validExportedPile(pile,p.id,d.tick,w)||ids.has(pile.id)){errors.push('Invalid exported visitor possession.');continue;}ids.add(pile.id);
      if(pile.owner.type==='equipment'&&++equipped>1)errors.push('Duplicate exported primary equipment.');
      if(pile.owner.type==='apparel'){if(worn.some(other=>conflictsWith(other,pile)))errors.push('Conflicting exported apparel.');worn.push(pile);}
    }
    for(const pack of d.packed??[]){
      if(!object(pack)||!object(pack.building)||!object(pack.owner)||!isSculptureKind(pack.building.kind)||pack.owner.type!=='inventory'||pack.owner.pawnId!==p.id){errors.push('Invalid exported sculpture.');continue;}
      const view={...w,tick:d.tick,packed:[pack],structures:[],jobs:[],piles:[],pawns:[...w.pawns,p]};
      errors.push(...validateFurniture(view,version,ids,true),...validateFurniture(view,version,new Set(),false),...validateArtObjects(view,version));
    }
    if(!p.visitor!.personalFoodIds.every(id=>d.items.some(i=>i.id===id&&i.kind==='food'&&i.owner.type==='inventory')))errors.push('Invalid exported visitor food.');
  }
  for(const g of s.groups){
    if(!object(g)||!keys(g,['id','kind','members','entry','spot','phase','startedAt','arrivedAt','durationCore','hostile','reason'])||!integer(g.id,1,s.serial)||groups.has(g.id)||!['traveler','visitor'].includes(String(g.kind))||!Array.isArray(g.members)||!g.members.length||g.members.length>12||new Set(g.members).size!==g.members.length||!g.members.every(id=>integer(id,1,w.nextId-1))||!cell(g.entry,w)||!edge(g.entry,w)||!cell(g.spot,w)||!phases.includes(String(g.phase))||!integer(g.startedAt,s.adoptedAt,w.tick)||g.arrivedAt!==null&&!integer(g.arrivedAt,g.startedAt,w.tick)||typeof g.hostile!=='boolean'||(g.kind==='traveler'?g.durationCore!==0:g.durationCore<8000||g.durationCore>=22000)||!integer(g.durationCore,0)||g.phase==='staying'&&(g.arrivedAt===null||g.kind!=='visitor')||g.phase==='arriving'&&g.arrivedAt!==null||(g.phase==='leaving'?!['timeout','danger','hostile','blocked'].includes(String(g.reason)):g.reason!==undefined)){errors.push('Invalid visitor group.');continue;}
    groups.add(g.id);
    if(g.hostile&&g.reason!=='hostile')errors.push('Hostile visitor group without hostile departure.');
    for(const id of g.members){if(members.has(id)||!w.pawns.some(p=>p.id===id&&p.visitor?.group===g.id)&&!s.departed.some(d=>d.pawn.id===id&&d.group===g.id))errors.push('Invalid visitor group membership.');members.add(id);}
  }
  for(const p of w.pawns)if(p.visitor){const v=p.visitor,g=s.groups.find(g=>g.id===v.group);
    if(!validVisitorShape(p as unknown as Record<string,unknown>,version,w)||p.faction!=='outlanders'||p.prisoner||p.raid||p.trade||p.draft||!g||!g.members.includes(p.id)||v.phase!==g.phase||g.kind==='traveler'&&v.role!=='traveler'||g.kind==='visitor'&&v.role==='traveler')errors.push('Invalid visitor mandate.');
    if(!v.personalFoodIds.every(id=>w.piles.some(i=>i.id===id&&i.kind==='food'&&(i.owner.type==='inventory'||i.owner.type==='pawn')&&i.owner.pawnId===p.id)))errors.push('Invalid visitor personal food ownership.');
    if(p.orders.active!==null||p.orders.queue.length||p.jobId!==null||p.haul||p.cooking||p.bedId!==null||p.need?.kind==='sleep'&&p.need.bedId!==null)errors.push('Visitor retains colonial work or bed.');
  }
  return errors;
}
