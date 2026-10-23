import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {isShelfKind} from './shelf-storage.ts';
import type {Structure,World} from './types.ts';
import type {CampaignState,LocalMapState} from './world-map-state.ts';
import type {PackedFurniture} from './furniture-rules.ts';

export type LinkedStorageHolderKind286='map'|'caravan'|'group-loss'|'animal-loss'|'encounter'|'world-pawn'|'player-casket'|'ship-casket'|'archive';
export interface LinkedStorageOwner286 {
 readonly building:Structure;
 readonly installed:boolean;
 /** Physical map only, not the group's origin. Off-map holders have null. */
 readonly mapId:number|null;
 readonly map:World|LocalMapState|null;
 readonly packed:PackedFurniture|null;
 readonly holderKind:LinkedStorageHolderKind286;
 /** Actual containing record and collection, never an invented World. */
 readonly holder:object;
 readonly container:readonly unknown[];
}
export interface LinkedStorageOwners286 {
 readonly root:CampaignState;
 readonly members:readonly LinkedStorageOwner286[];
 readonly byId:ReadonlyMap<number,LinkedStorageOwner286>;
 readonly valid:boolean;
 current():boolean;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
/** Cold custody census after the existing physical owner guards. Only known
 * structures/packed envelopes are visited; no grid, actor or human census. */
export function captureLinkedStorageOwners286(input:CampaignState,options:{seal?:boolean}={}):LinkedStorageOwners286 {
 const root=registeredCampaign(input),members:LinkedStorageOwner286[]=[],byId=new Map<number,LinkedStorageOwner286>();
 const arrays=new Set<unknown[]>(),active=new Set<object>(),checks:(()=>boolean)[]=[],watched=new WeakMap<object,Set<string>>();let valid=true,budget=2_000_000;
 const seal=options.seal!==false;
 const relevant=(b:Record<string,unknown>):boolean=>{const kind=Object.getOwnPropertyDescriptor(b,'kind');return !kind||!('value'in kind)||isShelfKind(kind.value)||'shelf'in b||'cryptosleep'in b||'shipCryptosleep277'in b;};
 const data=(v:object,k:string):unknown=>{const d=Object.getOwnPropertyDescriptor(v,k);if(seal){let keys=watched.get(v);if(!keys){keys=new Set();watched.set(v,keys);}if(!keys.has(k)){keys.add(k);checks.push(()=>{const now=Object.getOwnPropertyDescriptor(v,k);return d?!!now&&'value'in now&&now.value===d.value:!now&&!(k in v);});}}if(!d){if(k in v)valid=false;return undefined;}if(!('value'in d)){valid=false;return undefined;}return d.value;};
 const list=(v:object,k:string,visit:(row:Record<string,unknown>,array:unknown[])=>void)=>{
  const values=data(v,k);if(values===undefined)return;if(!Array.isArray(values)){valid=false;return;}if(arrays.has(values))return;arrays.add(values);
  if(seal){const originals=values.slice();checks.push(()=>values.length===originals.length&&values.every((r,i)=>r===originals[i]));}
  for(let i=0;i<values.length;i++){if(--budget<0){valid=false;return;}const d=Object.getOwnPropertyDescriptor(values,String(i));if(!d||!('value'in d)||!object(d.value)){valid=false;continue;}visit(d.value,values);}
 };
 const add=(b:Record<string,unknown>,location:Omit<LinkedStorageOwner286,'building'>)=>{
  const kind=data(b,'kind');if(typeof kind!=='string'){valid=false;return;}
  if(!isShelfKind(kind)){if('shelf'in b)valid=false;return;}
  const id=data(b,'id');if(!Number.isSafeInteger(id)||byId.has(id as number)){valid=false;return;}
  const building=b as unknown as Structure,row={building,...location};members.push(row);byId.set(id as number,row);
  if(seal){const shelf=data(b,'shelf');let signature:string;try{signature=JSON.stringify(shelf);}catch{valid=false;return;}
   checks.push(()=>JSON.stringify(shelf)===signature);}
 };
 const packs=(holder:Record<string,unknown>,kind:LinkedStorageHolderKind286,mapId:number|null=null,map:World|LocalMapState|null=null)=>list(holder,'packed',(p,array)=>{
  const b=data(p,'building');if(!object(b)){valid=false;return;}if(seal){const owner=data(p,'owner'),ownerSignature=JSON.stringify(owner);checks.push(()=>JSON.stringify(owner)===ownerSignature);}
  if(relevant(b))building(b,{installed:false,mapId,map,packed:p as unknown as PackedFurniture,holderKind:kind,holder,container:array});
 });
 const building=(b:Record<string,unknown>,location:Omit<LinkedStorageOwner286,'building'>)=>{
  if(active.has(b)){valid=false;return;}active.add(b);add(b,location);
  for(const [key,kind]of [['cryptosleep','player-casket'],['shipCryptosleep277','ship-casket']] as const){const h=data(b,key);if(h!==undefined){if(!object(h))valid=false;else packs(h,kind,location.mapId,location.map);}}
  active.delete(b);
 };
 const groupRecord=(row:Record<string,unknown>)=>{const state=data(row,'state');if(state!==undefined){if(!object(state))valid=false;else packs(state,'caravan');}const pending=data(row,'pending261');if(pending!==undefined){if(!object(pending))valid=false;else packs(pending,'encounter');}};
 const losses=(v:Record<string,unknown>,key:string,kind:'group-loss'|'animal-loss')=>list(v,key,row=>packs(row,kind));
 const projection=(v:Record<string,unknown>)=>{list(v,'groups',groupRecord);losses(v,'groupLosses','group-loss');losses(v,'animalLosses','animal-loss');};
 const world=(v:Record<string,unknown>,mapId:number|null)=>{
  if(active.has(v)){valid=false;return;}active.add(v);const map=v as unknown as World|LocalMapState;
  list(v,'structures',(b,array)=>{if(relevant(b))building(b,{installed:true,mapId,map,packed:null,holderKind:'map',holder:v,container:array});});packs(v,'map',mapId,map);
  const g=data(v,'group');if(g!==undefined){if(!object(g))valid=false;else packs(g,'caravan');}
  losses(v,'groupLosses','group-loss');losses(v,'animalLosses','animal-loss');
  const p=data(v,'campaignMap');if(p!==undefined){if(!object(p))valid=false;else projection(p);}
  // Literal groupWorld(summary,null) for classic campaigns has top-level rows.
  projection(v);active.delete(v);
 };
 try{
  const raw=root as unknown as Record<string,unknown>,maps=data(raw,'worldMaps');
  if(maps!==undefined){if(!object(maps))valid=false;else {const rootId=data(maps,'rootMapId');if(rootId!==null)world(raw,typeof rootId==='number'?rootId:null);list(maps,'sites',site=>{const body=data(site,'map');if(body!==undefined){if(!object(body))valid=false;else world(body,typeof site.id==='number'?site.id:null);}});}}
  else world(raw,Array.isArray(data(raw,'structures'))?registeredMapId(root as World)??null:null);
  const secondary=data(raw,'secondarySite');if(object(secondary)){const map=data(secondary,'map');if(object(map))world(map,1);}
  const groups=data(raw,'worldGroups');if(object(groups)){list(groups,'groups',groupRecord);losses(groups,'losses','group-loss');losses(groups,'animalLosses','animal-loss');list(groups,'abandonedPawns',h=>packs(h,'archive'));list(groups,'abandonedContents',a=>{list(a,'humans',h=>packs(h,'archive'));list(a,'animals',h=>packs(h,'archive'));});}
  const pawns=data(raw,'worldPawns');if(object(pawns)){list(pawns,'owners',h=>packs(h,'world-pawn'));for(const [key,kind]of [['heldPlayerCaskets271','player-casket'],['heldShipCaskets277','ship-casket']] as const)list(pawns,key,h=>{const c=data(h,'casket');if(object(c))building(c,{installed:false,mapId:null,map:null,packed:null,holderKind:kind,holder:h,container:[]});else valid=false;});}
 }catch{valid=false;}
 return {root,members,byId,valid,current(){try{
  if(!valid||!checks.every(check=>check()))return false;
  if(!seal)return true;
  // Cold recheck catches a formerly ordinary building becoming a shelf or a
  // newly attached holder without retaining per-wall policy/shape seals.
  const now=captureLinkedStorageOwners286(root,{seal:false});return now.valid&&now.members.length===members.length&&members.every(old=>{const row=now.byId.get(old.building.id);return !!row&&row.building===old.building&&row.packed===old.packed&&row.holder===old.holder&&row.container===old.container&&row.mapId===old.mapId&&row.installed===old.installed;});
 }catch{return false;}}};
}
