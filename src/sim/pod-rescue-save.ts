import { isBedKind } from './bed-kinds.ts';
import { visitorAtEdge } from './visitor-navigation.ts';
import { POD_RESCUE_FALL_TICKS,POD_RESCUE_OPEN_TICKS,POD_RESCUE_LIMIT,type PodRescueDeparture } from './pod-rescue-state.ts';
import type { Pawn,World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
type Bounds=Pick<World,'tick'|'width'|'height'>;
function cell(v:unknown,w:Bounds):boolean {return object(v)&&keys(v,['x','z'])&&int(v.x,0,w.width-1)&&int(v.z,0,w.height-1);}
/** Transport check: metadata only; full human/item validation is centralized. */
export function validPawnPodRescue(p:Pick<Pawn,'podRescue'>|Record<string,unknown>,version:number,w:Bounds):boolean {
  const v=p.podRescue;
  return v===undefined||version>=175&&object(v)&&keys(v,['incidentId'],['admittedAt'])&&int(v.incidentId,1,POD_RESCUE_LIMIT)
    &&(v.admittedAt===undefined||int(v.admittedAt,0,w.tick));
}
export function validPodRescueShape(value:unknown,version:number,w:Bounds):boolean {
  if(value===undefined)return true;
  if(version<175||!object(value)||!keys(value,['profile','serial','incidents','departed'],['pending'])||value.profile!=='civilian-pod-rescue-v1'
    ||!int(value.serial,1,POD_RESCUE_LIMIT)||!Array.isArray(value.incidents)||!Array.isArray(value.departed)||value.incidents.length>POD_RESCUE_LIMIT||value.departed.length>POD_RESCUE_LIMIT)return false;
  const p=value.pending;
  if(p!==undefined&&(!object(p)||!keys(p,['id','start','landAt','openAt','cell','seed'],version>=199?['origin']:[])||p.origin!==undefined&&(typeof p.origin!=='string'||!['independent','outlander'].includes(p.origin))||!int(p.id,1,value.serial)||p.id!==value.serial
    ||!int(p.start,0,w.tick)||!int(p.landAt)||p.landAt!==p.start+POD_RESCUE_FALL_TICKS||!int(p.openAt)||p.openAt!==p.landAt+POD_RESCUE_OPEN_TICKS
    ||!int(p.seed,1,0xffffffff)||!cell(p.cell,w)||!object(p.cell)||!int(p.cell.x,1,w.width-2)||!int(p.cell.z,1,w.height-2)))return false;
  const ids=new Set<number>();
  for(const i of value.incidents){
    if(!object(i)||!keys(i,['id','start','openedAt','pawnId'],['tendedAt','result','resolvedAt',...version>=199?['origin','decision']:[]])||i.origin!==undefined&&(typeof i.origin!=='string'||!['independent','outlander'].includes(i.origin))||!int(i.id,1,value.serial)||ids.has(i.id)||object(p)&&i.id===p.id
      ||!int(i.start,0,w.tick)||!int(i.openedAt,i.start+POD_RESCUE_FALL_TICKS+POD_RESCUE_OPEN_TICKS,w.tick)||!int(i.pawnId,1)
      ||i.tendedAt!==undefined&&!int(i.tendedAt,i.openedAt,w.tick)
      ||(i.result===undefined?i.resolvedAt!==undefined:typeof i.result!=='string'||!['dead','captured','departed',...version>=199?['joined']:[]].includes(i.result)||!int(i.resolvedAt,i.openedAt,w.tick))
      ||i.tendedAt!==undefined&&i.resolvedAt!==undefined&&Number(i.tendedAt)>Number(i.resolvedAt))return false;
    const decision=i.decision;
    if(decision!==undefined&&(!object(decision)||!keys(decision,['at','outcome','admittedAt'])||i.origin!=='independent'
      ||!int(decision.admittedAt,i.openedAt,w.tick)||!int(decision.at,decision.admittedAt,i.resolvedAt===undefined?w.tick:Number(i.resolvedAt))
      ||typeof decision.outcome!=='string'||!['joined','left'].includes(decision.outcome)
      ||(decision.outcome==='joined'?(i.result!=='joined'||i.resolvedAt!==decision.at):i.result==='joined'))
      ||i.result==='joined'&&(!object(decision)||decision.outcome!=='joined'))return false;
    ids.add(i.id);
  }
  if(ids.size+(p===undefined?0:1)!==value.serial)return false;
  const departed=new Set<number>();
  for(const d of value.departed){
    if(!object(d)||!keys(d,['incidentId','tick','pawn','items'],['packed'])||!int(d.incidentId,1,value.serial)||departed.has(d.incidentId)
      ||!int(d.tick,0,w.tick)||!object(d.pawn)||!Array.isArray(d.items)||d.items.length>32768||!d.items.every(object)
      ||d.packed!==undefined&&(!Array.isArray(d.packed)||!d.packed.length||d.packed.length>32768||!d.packed.every(object)))return false;
    departed.add(d.incidentId);
    const i=value.incidents.find(i=>object(i)&&i.id===d.incidentId);
    if(!object(i)||i.result!=='departed'||i.resolvedAt!==d.tick||i.pawnId!==d.pawn.id
      ||!validPawnPodRescue(d.pawn,version,{...w,tick:d.tick})||!object(d.pawn.podRescue)||d.pawn.podRescue.incidentId!==d.incidentId
      ||d.pawn.health!==undefined&&(!object(d.pawn.health)||d.pawn.health.tick!==d.tick))return false;
  }
  return true;
}
export type ValidatePodRescueDeparture=(departure:PodRescueDeparture,version:number,world:World)=>string[];
export type PodRescueTransportWorld=Pick<World,'tick'|'width'|'height'|'nextId'|'pawns'|'podRescues'|'schemaVersion'>;
const colonialWorkFields=['draft','trade','animalHandling','animalCare','research','hunting','burial','cleaning','firefighting','ward',
  'equipmentTask','priorityWork','rescue','tend','surgery','surgeryRequest','feed'];
function uncommandedGuest(p:Pawn):boolean {
  return object(p.orders)&&p.orders.active===null&&Array.isArray(p.orders.queue)&&p.orders.queue.length===0
    &&p.jobId===null&&p.haul===null&&p.cooking===null&&object(p.recreation)&&p.recreation.task===null
    &&colonialWorkFields.every(k=>(p as unknown as Record<string,unknown>)[k]===undefined)
    &&!p.melee?.order&&!p.shooting?.order&&object(p.priorities)&&Object.values(p.priorities).every(n=>n===0);
}
function transportBindings(w:PodRescueTransportWorld,version:number):boolean {
  if(!validPodRescueShape(w.podRescues,version,w)||!Array.isArray(w.pawns))return false;
  const s=w.podRescues;
  if(!s)return w.pawns.every(p=>p.podRescue===undefined);
  const byId=new Map<number,Pawn>(),marked=new Set<number>();
  for(const p of w.pawns){
    byId.set(p.id,p);
    if(p.podRescue===undefined)continue;
    const i=s.incidents.find(i=>i.id===p.podRescue?.incidentId&&i.pawnId===p.id);
    if(!validPawnPodRescue(p,version,w)||!int(p.id,1,w.nextId-1)||!i||marked.has(p.id)||p.visitor||p.raid||i.result==='departed'||i.result==='joined'
      ||p.podRescue.admittedAt!==undefined&&p.podRescue.admittedAt<i.openedAt
      ||i.decision!==undefined&&i.decision.admittedAt!==p.podRescue.admittedAt
      ||!(p.faction==='outlanders'||p.faction==='colony'&&i.result==='captured')
      ||p.faction==='outlanders'&&!uncommandedGuest(p))return false;
    marked.add(p.id);
  }
  const people=new Set<number>();
  for(const i of s.incidents){
    const p=byId.get(i.pawnId),d=s.departed.find(d=>d.incidentId===i.id);
    if(!int(i.pawnId,1,w.nextId-1)||people.has(i.pawnId)||(i.result==='departed'?!d||!!p:!!d)
      ||p&&i.result!=='joined'&&p.podRescue?.incidentId!==i.id
      ||i.result==='joined'&&p?.podRescue!==undefined
      ||!i.result&&(!p||p.faction!=='outlanders'||p.prisoner)
      ||i.result==='dead'&&(!p||p.state!=='dead'||p.health?.death?.tick!==i.resolvedAt))return false;
    people.add(i.pawnId);
  }
  return s.departed.every(d=>!byId.has(d.pawn.id));
}
/** Cheap role/incident bindings for transport; no map possession scans or
 * archived human projection. Complete clinical/ownership checks stay below. */
export function validPodRescueTransportBindings(w:PodRescueTransportWorld):boolean {
  return transportBindings(w,w.schemaVersion);
}
const inactiveFields=['animalHandling','animalCare','burial','cleaning','trade','firefighting','burning','raid','ward','hunting','heatRefuge','research',
  'tactics','flee','melee','stun','shooting','stagger','draft','equipmentTask','equipmentDropPending','feed','tend','surgery','surgeryRequest','rescue','medicalSleep',
  'interruptedCargo','priorityWork','transitExit','motion'];
/** Cross references and ownership. The callback validates each frozen human
 * and its items at that departure's clock using the central schema validator,
 * avoiding a second incomplete list of human fields or recursive imports. */
export function validatePodRescues(w:World,version:number,ids:Set<number>,validateDeparture?:ValidatePodRescueDeparture):string[] {
  if(!validPodRescueShape(w.podRescues,version,w))return ['Invalid pod rescue state.'];
  const s=w.podRescues;
  if(!s)return w.pawns.some(p=>p.podRescue)?['Pod rescue pawn without incident.']:[];
  const errors:string[]=[];
  if(!transportBindings(w,version))errors.push('Invalid pod rescue transport bindings.');
  for(const p of w.pawns)if(p.podRescue){
    const i=s.incidents.find(i=>i.id===p.podRescue!.incidentId&&i.pawnId===p.id);
    if(!i?.result&&p.podRescue.admittedAt===undefined&&(p.need?.kind==='sleep'&&p.need.bedId!==null
      ||p.bedId!==null&&(!w.structures.some(b=>b.id===p.bedId&&isBedKind(b.kind)&&(version>=187||b.kind==='bed'))||!w.pawns.some(q=>q.rescue?.patientId===p.id&&q.rescue.bedId===p.bedId&&q.orders.active==='rescue'))))
      errors.push('Unadmitted pod rescue patient retains an unreserved colonial bed.');
  }
  const archived=new Set<number>();
  for(const d of s.departed){
    const p=d.pawn,i=s.incidents.find(i=>i.id===d.incidentId);
    if(!i||i.result!=='departed'||i.resolvedAt!==d.tick||i.pawnId!==p.id||p.podRescue?.incidentId!==d.incidentId
      ||!validPawnPodRescue(p,version,{...w,tick:d.tick})||i?.decision!==undefined&&i.decision.admittedAt!==p.podRescue?.admittedAt||p.faction!=='outlanders'||p.prisoner||!cell({x:p.x,z:p.z},w)||!visitorAtEdge(w,p)
      ||p.state!=='idle'||p.moveCooldown!==0||!Array.isArray(p.path)||p.path.length||p.bedId!==null||p.need!==null||p.jobId!==null||p.haul!==null||p.cooking!==null
      ||!object(p.orders)||p.orders.active!==null||!Array.isArray(p.orders.queue)||p.orders.queue.length||!object(p.recreation)||p.recreation.task!==null
      ||inactiveFields.some(k=>((p as unknown as Record<string,unknown>)[k]??null)!==null)||p.mental?.crisis||p.body
      ||!object(p.priorities)||Object.values(p.priorities).some(n=>n!==0))errors.push('Invalid frozen pod rescue departure.');
    if(!int(p.id,1,w.nextId-1)||ids.has(p.id)||archived.has(p.id))errors.push('Duplicate pod rescue departure identity.');
    ids.add(p.id);archived.add(p.id);
    for(const item of d.items){
      if(!int(item.id,1,w.nextId-1)||ids.has(item.id)||!object(item.owner)||!['apparel','equipment','inventory'].includes(item.owner.type)||!('pawnId' in item.owner)||item.owner.pawnId!==p.id)errors.push('Invalid exported pod rescue item ownership.');
      ids.add(item.id);
    }
    for(const pack of d.packed??[]){
      if(!object(pack.building)||!int(pack.building.id,1,w.nextId-1)||ids.has(pack.building.id)||!object(pack.owner)||pack.owner.type!=='inventory'||pack.owner.pawnId!==p.id)errors.push('Invalid exported pod rescue furniture ownership.');
      ids.add(pack.building?.id);
    }
    if(validateDeparture)errors.push(...validateDeparture(d,version,w));else errors.push('Pod rescue departure requires common schema validation.');
  }
  for(const i of s.incidents){
    if(i.result==='captured'&&!w.pawns.some(p=>p.id===i.pawnId)&&!w.prisonDepartures?.some(d=>d.pawnId===i.pawnId))errors.push('Missing captured pod rescue person.');
  }
  return errors;
}
