import {clearingDuration} from './gathering.ts';
import {captureHumanOwners} from './human-owners.ts';
import {captureTreeOccurrences} from './tree-transfer-owners.ts';
import {validOriginalTreeResource} from './tree-transfer-resource-save.ts';
import {isColonist} from './affiliation.ts';
import {medicalWorkRefusal} from './health-rules.ts';
import {backgroundWorkRefusal} from './colonist-backgrounds.ts';
import type {World,Job} from './types.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
/** V349 sparse domain guards over actual candidate owners. */
import type {Pawn,Resource,MaterialPile} from './types.ts';
import {TREE_PACK_LIFETIME,TREE_SCHEMA,type TreeJob,type TreeOwnerOccurrence,type MinifiedTreePile} from './tree-transfer-state.ts';
import {extractTreeDefinition,treeExpiryQuantityRange} from './tree-transfer-rules.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>
  required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
export const hasTreePayload=(pile:unknown):boolean=>record(pile)&&(
  pile.kind==='plant'||pile.item==='minified-tree'||Object.hasOwn(pile,'innerResource')||Object.hasOwn(pile,'plantPack'));
export function validTreePileShape(pile:unknown,version:number,clock:number,nextId:number,
  resourceValidAt:(resource:unknown,tick:number)=>boolean):boolean {
  if(!record(pile))return false;
  if(!hasTreePayload(pile))return true;
  if(version<TREE_SCHEMA||!exact(pile,['id','kind','item','quantity','owner','innerResource','plantPack'],['damage'])||
    pile.kind!=='plant'||pile.item!=='minified-tree'||pile.quantity!==1||!integer(pile.id,1,nextId-1)||
    !record(pile.innerResource)||!record(pile.plantPack)||!record(pile.owner))return false;
  const tree=pile.innerResource,pack=pile.plantPack;
  if(!exact(pack,['packedAt','expiresAt'],version>=236?['pendingExpiry']:[])||!integer(pack.packedAt,0,clock)||
    !integer(pack.expiresAt,pack.packedAt+1)||pack.expiresAt-pack.packedAt!==TREE_PACK_LIFETIME||
    !integer(tree.id,1,nextId-1)||tree.id===pile.id||tree.kind!=='tree'||
    !extractTreeDefinition(tree as unknown as Resource)||!resourceValidAt(tree,pack.packedAt))return false;
  if(Object.hasOwn(pack,'pendingExpiry')){
    const pending=pack.pendingExpiry;
    if(version<236||clock<(pack.expiresAt as number)||!record(pending)||!exact(pending,['quantity','retryAt'])||
      !integer(pending.quantity,1,500000)||!integer(pending.retryAt,clock,clock+20)||
      !treeExpiryQuantityRange(pile as unknown as MinifiedTreePile).includes(pending.quantity))return false;
  }
  if(Object.hasOwn(pile,'damage')&&!integer(pile.damage,1,99))return false;
  const owner=pile.owner;
  return owner.type==='ground'?exact(owner,['type','x','z'])&&integer(owner.x)&&integer(owner.z)
    :owner.type==='pawn'||owner.type==='inventory'?exact(owner,['type','pawnId'])&&integer(owner.pawnId,1,nextId-1)
    :owner.type==='starting-pod'?exact(owner,['type','podId'])&&integer(owner.podId,1,nextId-1)
    :owner.type==='orbital-ship'?exact(owner,['type','shipId'])&&integer(owner.shipId,1,nextId-1)
    :owner.type==='orbital-cargo'?exact(owner,['type','deliveryId'])&&integer(owner.deliveryId,1,nextId-1)
    :false; // No construction escrow, equipment, apparel or grave ownership.
}
export function validTreeJobShape(job:unknown,version:number,nextId:number):boolean {
  if(!record(job))return false;
  const relevant=Object.hasOwn(job,'tree')||job.kind==='extract-tree'||job.kind==='replant-tree';
  if(!relevant)return true;
  if(!exact(job,['id','kind','x','z','orientation','footprint','status','reservedBy','progress','escrow','tree'],['workRemainder','clearance'])
    ||!integer(job.id,1,nextId-1)||!integer(job.x)||!integer(job.z)||!integer(job.progress)
    ||!['pending','active'].includes(String(job.status))||job.reservedBy!==null&&!integer(job.reservedBy,1,nextId-1)
    ||Object.hasOwn(job,'workRemainder')&&!integer(job.workRemainder,1,9999))return false;
  if(version<TREE_SCHEMA||!record(job.tree)||job.footprint!=='standard'||job.orientation!==0||
    Object.hasOwn(job,'material')||Object.hasOwn(job,'furniture')||
    Object.hasOwn(job,'growingZoneId')||Object.hasOwn(job,'flowerPotId')||!record(job.escrow)||
    !exact(job.escrow,['wood','food'])||job.escrow.wood!==0||job.escrow.food!==0)return false;
  const task=job.tree;
  if(job.kind==='extract-tree')return task.kind==='extract'&&exact(task,['kind','resourceId'])&&integer(task.resourceId,1,nextId-1);
  if(job.kind!=='replant-tree'||task.kind!=='replant'||
    !exact(task,['kind','sourcePileId','resourceId','phase','carryPileId','workCore'],['durationCore'])||
    !integer(task.sourcePileId,1,nextId-1)||!integer(task.resourceId,1,nextId-1)||
    !['pickup','carry','prepare'].includes(String(task.phase))||!integer(task.workCore))return false;
  if(Object.hasOwn(job,'clearance')&&(task.phase!=='carry'||!record(job.clearance)||!exact(job.clearance,['resourceId','progress'],['workRemainder'])||!integer(job.clearance.resourceId,1,nextId-1)||!integer(job.clearance.progress)||Object.hasOwn(job.clearance,'workRemainder')&&!integer(job.clearance.workRemainder,1,9999)))return false;
  if(job.progress!==task.workCore||Object.hasOwn(job,'workRemainder'))return false;
  if(task.phase==='pickup')return task.carryPileId===null&&task.workCore===0&&!Object.hasOwn(task,'durationCore');
  if(task.carryPileId!==task.sourcePileId)return false; // Whole identity; no cloned carry ID.
  if(task.phase==='carry')return task.workCore===0&&!Object.hasOwn(task,'durationCore');
  return integer(task.durationCore,1,version>=256?22500:17500)&&task.workCore<=task.durationCore;
}
export interface TreeDomainInput {
  version:number;tick:number;nextId:number;occurrences:readonly TreeOwnerOccurrence[];
  resources:readonly Resource[];jobs:readonly TreeJob[];pawns:readonly Pawn[];
  /** All outer Things already validated/registered, including away/archives. */
  outerIds:{has(id:number):boolean};
  resourceValidAt:(resource:unknown,tick:number)=>boolean;
  /** Geometry/actor checks use candidate indices, not per-consumer full scans. */
  activeJobValid:(job:TreeJob,pawn:Pawn,pile?:MinifiedTreePile)=>boolean;
}
export interface TreeDomainIndex {wrappers:ReadonlyMap<number,TreeOwnerOccurrence>;innerIds:ReadonlySet<number>;byResource:ReadonlyMap<number,TreeJob>}
export function validateTreeDomain(input:TreeDomainInput):TreeDomainIndex|undefined {
  const wrappers=new Map<number,TreeOwnerOccurrence>(),innerIds=new Set<number>(),byResource=new Map<number,TreeJob>();
  const local=new Map(input.resources.map(r=>[r.id,r])),actors=new Map(input.pawns.map(p=>[p.id,p]));
  for(const occurrence of input.occurrences){
    const pile=occurrence.pile;if(!hasTreePayload(pile))continue;
    if(!validTreePileShape(pile,input.version,occurrence.clock,input.nextId,input.resourceValidAt))return;
    const treePile=pile as MinifiedTreePile,id=treePile.innerResource.id;
    if(wrappers.has(treePile.id)||innerIds.has(id)||input.outerIds.has(id)||local.has(id)||
      occurrence.clock>=treePile.plantPack.expiresAt&&!treePile.plantPack.pendingExpiry)return;
    wrappers.set(treePile.id,occurrence);innerIds.add(id);
  }
  for(const job of input.jobs){
    if(!validTreeJobShape(job,input.version,input.nextId)||byResource.has(job.tree.resourceId))return;
    const task=job.tree,actor=job.reservedBy===null?undefined:actors.get(job.reservedBy);
    const queued=!!actor&&actor.orders.queue.includes(job.id);
    if(job.status==='active'?!actor||actor.jobId!==job.id&&!queued:job.reservedBy!==null)return;
    if(queued&&(job.progress!==0||job.workRemainder!==undefined||job.clearance||job.tree.kind==='replant'&&job.tree.phase!=='pickup'))return;
    if(task.kind==='extract'){
      const source=local.get(task.resourceId);
      if(!source||!extractTreeDefinition(source)||source.x!==job.x||source.z!==job.z||!integer(job.progress,0,extractTreeDefinition(source)!.workCore)||job.progress===extractTreeDefinition(source)!.workCore&&job.workRemainder!==undefined)return;
    } else {
      const occurrence=wrappers.get(task.sourcePileId),pile=occurrence?.pile as MinifiedTreePile|undefined;
      if(!occurrence?.active||!pile||pile.plantPack.pendingExpiry||pile.innerResource.id!==task.resourceId||task.durationCore!==undefined&&task.durationCore>Math.floor(extractTreeDefinition(pile.innerResource)!.workCore/.08))return;
      if(task.phase==='pickup'?pile.owner.type!=='ground'&&!(job.status==='pending'&&pile.owner.type==='pawn'&&actors.get(pile.owner.pawnId)?.interruptedCargo):
        !actor||pile.owner.type!=='pawn'||pile.owner.pawnId!==actor.id)return;
      if(actor&&!queued&&!input.activeJobValid(job,actor,pile))return;
    }
    if(actor&&!queued&&task.kind==='extract'&&!input.activeJobValid(job,actor))return;
    byResource.set(task.resourceId,job);
  }
  return {wrappers,innerIds,byResource};
}
/** Adoption uses this only when a new-domain marker/kind was found during the
 * ordinary pawn/pile/job pass. Absence must not build foreign-owner indices. */
export function hasTreeDomain(occurrences:readonly TreeOwnerOccurrence[],jobs:readonly unknown[]):boolean {
  return occurrences.some(o=>hasTreePayload(o.pile))||jobs.some(j=>record(j)&&(
    Object.hasOwn(j,'tree')||j.kind==='extract-tree'||j.kind==='replant-tree'));
}
export function validPlantTargetShape(raw:unknown,version:number,nextId:number):boolean {
  if(!record(raw))return false;
  if(!Object.hasOwn(raw,'plantTarget'))return true;
  return version>=235&&['chop','cut','harvest'].includes(String(raw.kind))&&record(raw.plantTarget)&&exact(raw.plantTarget,['resourceId'])&&integer(raw.plantTarget.resourceId,1,nextId-1);
}
function currentTreeDomain(w:World):boolean {
  if(w.piles.some(hasTreePayload)||w.jobs.some(j=>Object.hasOwn(j,'tree')||Object.hasOwn(j,'plantTarget')||j.kind==='extract-tree'||j.kind==='replant-tree'))return true;
  const collections=[w.scout&&'pawn' in w.scout?w.scout.items:[],w.commercialTrip&&'pawn' in w.commercialTrip?w.commercialTrip.items:[],w.group&&'members' in w.group?w.group.items:[],
    ...(w.groupLosses??[]).map(l=>l.items),...(w.visitors?.departed??[]).map(d=>d.items),...(w.podRescues?.departed??[]).map(d=>d.items),...(w.raids?.departed??[]).map(d=>d.items),...(w.prisonDepartures??[]).map(d=>d.items),
    ...(w.startingArrival&&w.startingArrival.phase!=='opened'?w.startingArrival.pods.map(p=>p.items):[])];
  return collections.some(c=>c.some(hasTreePayload))||!!w.civilianPost?.stock.some(hasTreePayload);
}
/** Shared RAW and isolated full/delta candidate domain. Never validates a whole
 * World or allocates tile arrays; ordinary archives are read only for markers. */
export function validateTreeTransport(w:World,version:number=w.schemaVersion,collectWrapper?:(pile:MinifiedTreePile)=>void):boolean {
  try{
    if(!currentTreeDomain(w))return true;
    if(version<235)return false;
    const people=captureHumanOwners(w),occurrences=captureTreeOccurrences(w,people);if(!occurrences)return false;
    const ids=new Set<number>();
    for(const collection of [w.pawns,w.resources,w.structures,w.jobs,w.piles,w.stockpiles,w.growingZones,w.wildlife?.animals??[],w.mechanoids??[],w.filth?.items??[],w.fires?.items??[],w.fires?.embers??[],w.projectiles??[],w.bombWaves??[]])for(const value of collection)ids.add(value.id);
    for(const p of people.slots){ids.add(p.id);for(const i of p.items)ids.add(i.id);for(const pack of p.packed){ids.add(pack.building.id);for(const b of pack.building.bills??[])ids.add(b.id);}}
    for(const s of [...w.structures,...w.packed.map(p=>p.building)]){ids.add(s.id);for(const id of s.shelf?.cells??[])ids.add(id);for(const b of s.bills??[])ids.add(b.id);}
    for(const p of w.civilianPost?.stock??[])ids.add(p.id);for(const s of w.orbital?.ships??[])ids.add(s.id);for(const d of w.orbital?.pending??[])ids.add(d.id);
    const jobs=w.jobs.filter(j=>Object.hasOwn(j,'tree')||j.kind==='extract-tree'||j.kind==='replant-tree');
    if(jobs.some(j=>!record(j.tree)||!integer(j.x,0,w.width-1)||!integer(j.z,0,w.height-1)))return false;
    const legacyCells=new Map<string,number|undefined>();
    for(const j of w.jobs)if(j.status==='active'&&j.reservedBy!==null&&!j.plantTarget&&['chop','cut','harvest'].includes(j.kind))legacyCells.set(`${j.x}:${j.z}`,undefined);
    const byResource=new Map<number,Resource>(),byPawn=new Map(w.pawns.map(p=>[p.id,p]));
    for(const r of w.resources){byResource.set(r.id,r);if(legacyCells.size){const key=`${r.x}:${r.z}`;if(legacyCells.has(key))legacyCells.set(key,r.id);}}
    const claimed=new Map<number,number>();
    for(const j of w.jobs){
      if(!validPlantTargetShape(j,version,w.nextId))return false;
      if(j.plantTarget){const r=byResource.get(j.plantTarget.resourceId);if(!r||r.x!==j.x||r.z!==j.z)return false;}
      const source=j.clearance?.resourceId??j.tree?.resourceId??j.plantTarget?.resourceId??(['chop','cut','harvest'].includes(j.kind)?legacyCells.get(`${j.x}:${j.z}`):undefined);
      if(j.status==='active'&&j.reservedBy!==null&&byPawn.get(j.reservedBy)?.jobId===j.id&&source!==undefined){const owner=claimed.get(source);if(owner!==undefined&&owner!==j.id)return false;claimed.set(source,j.id);}
    }
    const activeJobValid=(j:TreeJob,p:Pawn):boolean=>{
      if(!isColonist(p)||p.prisoner||p.draft||p.visitor||p.raid||p.body||p.state==='dead'||p.state==='downed'||medicalWorkRefusal(p)||backgroundWorkRefusal(p,j.tree.kind==='extract'?'gather':'grow')||
        p.burning||p.mental?.crisis||p.bombRefuge||p.heatRefuge||p.tactics||p.stun&&p.stun.untilCore>w.tick*10||p.haul||p.need||p.cooking||p.research||p.deepWork||p.tend||p.surgery||p.rescue||p.feed||p.ward||p.equipmentTask||p.burial||p.cleaning||p.animalHandling||p.animalCare||p.animalFeed||p.animalRescue||p.orbitalTrade||p.interruptedCargo)return false;
      if(!['moving','working'].includes(p.state))return false;
      if(j.tree.kind==='replant'&&j.tree.phase==='prepare')return p.state==='working'&&p.moveCooldown===0&&!p.path.length&&(!p.motion||p.motion.end<=w.tick)&&Math.abs(p.x-j.x)+Math.abs(p.z-j.z)===1;
      return true;
    };
    const index=validateTreeDomain({version,tick:w.tick,nextId:w.nextId,occurrences,resources:w.resources,jobs:jobs as TreeJob[],pawns:w.pawns,outerIds:ids,
      resourceValidAt:(raw,tick)=>validOriginalTreeResource(raw,w,version,tick),activeJobValid});
    if(!index)return false;
    for(const j of jobs)if(j.clearance){const r=byResource.get(j.clearance.resourceId);if(!r||r.kind==='tree'||r.kind==='rock'||r.x!==j.x||r.z!==j.z||j.clearance.progress>=clearingDuration(r))return false;}
    const held=new Map<number,MaterialPile[]>();for(const pile of w.piles)if(pile.owner.type==='pawn'){const group=held.get(pile.owner.pawnId)??[];group.push(pile);held.set(pile.owner.pawnId,group);}
    for(const occurrence of index.wrappers.values()){
      const pile=occurrence.pile as MinifiedTreePile;
      if(occurrence.ownerKey==='map-piles'&&pile.owner.type==='pawn'){
        const p=byPawn.get(pile.owner.pawnId);if(!p||held.get(p.id)?.length!==1||w.packed.some(x=>x.owner.type==='pawn'&&x.owner.pawnId===p.id))return false;
        if(!p.interruptedCargo&&!(p.haul?.phase==='deliver'&&p.haul.carryPileId===pile.id&&p.haul.quantity===1)&&!jobs.some(j=>j.reservedBy===p.id&&j.tree?.kind==='replant'&&j.tree.carryPileId===pile.id&&j.tree.phase!=='pickup'))return false;
      }
      collectWrapper?.(pile);
    }
    return true;
  }catch{return false;}
}
/** Register source owners after legacy registrars have registered outer Things. */
export function registerTreeThingIds(w:World,ids:NumericMembershipSink):string[] {
  try{
    if(!currentTreeDomain(w))return [];
    const occurrences=captureTreeOccurrences(w,captureHumanOwners(w));if(!occurrences)return ['Invalid contained tree catalogue.'];
    for(const o of occurrences)if(hasTreePayload(o.pile)){
      const id=o.pile.innerResource?.id;if(!integer(id,1,w.nextId-1)||ids.has(id))return ['Duplicate or invalid contained tree identity.'];ids.add(id);
    }
    return [];
  }catch{return ['Invalid contained tree ownership.'];}
}