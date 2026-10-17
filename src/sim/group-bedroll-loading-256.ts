import {groupHumanHandler257} from './group-human-admission-257.ts';
import {campaignAuthority} from './secondary-site-context.ts';
import type {World,Pawn,Cell} from './types.ts';
import type {PreparingGroup,GroupMassCapture} from './group-capture.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import {validBedrollBuilding256} from './bedroll-save-256.ts';
import {BEDROLL_MASS_GRAMS_256} from './group-bedroll-capture-256.ts';
import {allowedAreaReason} from './allowed-area-state.ts';
export interface GroupBedrollLoading256 {revision:1;manifest:{structureId:number;carrierId:number;loaded:boolean}[]}
export type PreparingBedrollGroup256=PreparingGroup&{bedrollLoading?:GroupBedrollLoading256};
export interface GroupBedrollPreview256 {loading:GroupBedrollLoading256;mass:GroupMassCapture}
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const integer=(v:unknown,min=1)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
function reserved(w:World,id:number,exceptGroupId?:number):boolean{return !!campaignAuthority(w).worldGroups?.groups.some(r=>r.state.id!==exceptGroupId&&'manifest'in r.state&&r.state.bedrollLoading?.manifest.some(line=>line.structureId===id&&!line.loaded))||w.jobs.some(j=>j.furniture?.structureId===id||j.deconstruction?.structureId===id)||w.pawns.some(p=>p.haul?.whole&&p.haul.sourcePileId===id);}
/** Extends the existing formation preflight after its material-pile manifest.
 * Uses that same mass capture, actual original members, and bounded local
 * reachability authority. No path search, ID allocation or RNG occurs here. */
export function previewGroupBedrollLoading256(w:World,ids:readonly number[],members:readonly Pawn[],mass:GroupMassCapture,reachable:(p:Pawn,cell:Cell)=>'reachable'|'unreachable'|'deferred'):{kind:'ready';preview:GroupBedrollPreview256}|{kind:'refused';reason:string}|{kind:'deferred'} {
 const fail=(reason:string)=>({kind:'refused' as const,reason});
 if(w.schemaVersion<256||new Set(ids).size!==ids.length||ids.some(id=>!integer(id)||id>=w.nextId)||members.some(p=>!w.pawns.includes(p))||new Set(mass.carriers.map(c=>c.pawnId)).size!==mass.carriers.length||members.some(p=>!mass.carriers.some(c=>c.pawnId===p.id))||mass.carriers.some(c=>!members.some(p=>p.id===c.pawnId)&&!w.wildlife?.animals.some(a=>a.id===c.pawnId&&a.domestic&&a.state!=='dead')))return fail('Chargement de couchages invalide.');
 const carriers=mass.carriers.map(c=>({...c})),manifest:GroupBedrollLoading256['manifest']=[];
 for(const id of ids){const pack=w.packed.find(p=>p.building.id===id);if(!pack||pack.owner.type!=='ground'||pack.building.kind!=='bedroll'||!validBedrollBuilding256(pack.building,w.schemaVersion)||reserved(w,id))return fail('Le sac de couchage doit être disponible au sol.');
  let carrier:typeof carriers[number]|undefined;
  for(const c of [...carriers].sort((a,b)=>a.grams-b.grams||a.pawnId-b.pawnId)){if(c.capacityGrams-c.grams<BEDROLL_MASS_GRAMS_256)continue;const person=members.find(p=>p.id===c.pawnId);if(!person||w.schemaVersion>=257&&!groupHumanHandler257(person)||allowedAreaReason(w,person,pack.owner))continue;const access=reachable(person,pack.owner);if(access==='deferred')return {kind:'deferred'};if(access==='reachable'){carrier=c;break;}}
  if(!carrier)return fail('Aucun porteur admissible ne peut charger ce couchage.');carrier.grams+=BEDROLL_MASS_GRAMS_256;manifest.push({structureId:id,carrierId:carrier.pawnId,loaded:false});
 }
 const grams=carriers.reduce((n,p)=>n+p.grams,0);if(!Number.isSafeInteger(grams))return fail('Masse de chargement invalide.');
 return {kind:'ready',preview:{loading:{revision:1,manifest},mass:{grams,capacityGrams:mass.capacityGrams,...mass.ridingFactor!==undefined?{ridingFactor:mass.ridingFactor}:{},carriers}}};
}
/** Original RAW owner binding. A loaded receipt is never a replacement package. */
export function validGroupBedrollLoading256(value:unknown,w:World,g:PreparingGroup,version:number):value is GroupBedrollLoading256|undefined {
 if(value===undefined)return true;if(version<256||!plain(value)||Reflect.ownKeys(value).length!==2||value.revision!==1||!Array.isArray(value.manifest)||Object.getPrototypeOf(value.manifest)!==Array.prototype||value.manifest.length>w.packed.length||Reflect.ownKeys(value.manifest).length!==value.manifest.length+1)return false;
 const ids=new Set<number>();let pending=false;
 for(let i=0;i<value.manifest.length;i++){const d=Object.getOwnPropertyDescriptor(value.manifest,String(i));if(!d||!Object.hasOwn(d,'value')||!plain(d.value))return false;const row=d.value;if(Reflect.ownKeys(row).length!==3||!integer(row.structureId)||!integer(row.carrierId)||!g.memberIds.includes(Number(row.carrierId))||typeof row.loaded!=='boolean'||ids.has(Number(row.structureId)))return false;ids.add(Number(row.structureId));if(!row.loaded)pending=true;else if(pending)return false;
  const pack=w.packed.find(p=>p.building.id===row.structureId);if(!pack||pack.building.kind!=='bedroll'||!validBedrollBuilding256(pack.building,version)||(row.loaded?(pack.owner.type!=='inventory'||pack.owner.pawnId!==row.carrierId):pack.owner.type!=='ground'||reserved(w,Number(row.structureId),g.id)))return false;
 }
 if(g.phase==='gathering'&&value.manifest.some(row=>(row as {loaded:boolean}).loaded)||g.phase==='leaving'&&pending)return false;return true;
}
export function validGroupBedrollLoadingField256(g:PreparingBedrollGroup256,w:World,version:number):boolean {const d=Object.getOwnPropertyDescriptor(g,'bedrollLoading');return !d||version>=256&&Object.hasOwn(d,'value')&&d.enumerable===true&&d.value!==undefined&&validGroupBedrollLoading256(d.value,w,g,version);}
export function nextGroupBedrollPickup256(w:World,g:PreparingBedrollGroup256):{pack:PackedFurniture;carrier:Pawn;line:GroupBedrollLoading256['manifest'][number]}|undefined {
 if(!validGroupBedrollLoadingField256(g,w,w.schemaVersion))throw Error('Invalid actual bedroll loading');
 const line=g.bedrollLoading?.manifest.find(row=>!row.loaded);if(!line)return;const pack=w.packed.find(p=>p.building.id===line.structureId)!,carrier=w.pawns.find(p=>p.id===line.carrierId);if(!carrier)throw Error('Missing actual bedroll carrier');return {pack,carrier,line};
}
/** Contact transition only, called by the ordinary on-map group driver after
 * movement completion. Existing cursor/exit logic waits for all lines loaded. */
export function commitGroupBedrollPickup256(w:World,g:PreparingBedrollGroup256,p:Pawn):boolean {
 if(w.group!==g||g.phase!=='loading'||g.cursor!==g.manifest.length)return false;const next=nextGroupBedrollPickup256(w,g);if(!next||next.carrier!==p||next.pack.owner.type!=='ground'||p.moveCooldown!==0||(p.motion?.end??0)>w.tick||Math.abs(p.x-next.pack.owner.x)+Math.abs(p.z-next.pack.owner.z)>1||reserved(w,next.pack.building.id,g.id))return false;
 next.pack.owner={type:'inventory',pawnId:p.id};next.line.loaded=true;p.path=[];p.state='idle';return true;
}

/** Pure source rows for the existing formation panel, same reservation and
 * shape predicates as previewGroupBedrollLoading256. No reachability claim. */
export function groupBedrollChoices256(w:World):readonly {pack:PackedFurniture;ok:boolean;reason?:string}[] {
 if(w.schemaVersion<256)return [];
 return w.packed.filter(pack=>pack.owner.type==='ground'&&pack.building.kind==='bedroll').map(pack=>{
  const reason=w.group?'Une caravane est déjà engagée.':!validBedrollBuilding256(pack.building,w.schemaVersion)?'Ce sac de couchage n’est pas disponible.':reserved(w,pack.building.id)?'Ce sac de couchage est réservé à un autre travail.':undefined;
  return {pack,ok:!reason,...reason?{reason}:{}};
 });
}
