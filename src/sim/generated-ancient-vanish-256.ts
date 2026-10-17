import {unpublishedAncientGeneration256,ancientGenerationRemovalConflict256} from './ancient-generation-frontier-256.ts';
/** Fresh private generation only. ClearSpace invokes Destroy(Vanish), not a
 * hit, deconstruction, minification or product-generating destruction. */
import {footprintCells} from './definitions.ts';
import {isAncientNeutralKind256} from './ancient-monument-runtime-256.ts';
import {validAncientMonumentBuilding256} from './ancient-monument-save-256.ts';
import {isLocalRoadProp256} from './local-road-props-256.ts';
import {validLocalRoadPropStructure256} from './local-road-props-save-256.ts';
import {validConstructionMaterial} from './construction-materials.ts';
import {structureMaxHp} from './thing-damage-rules.ts';
import {newDoorState} from './door-rules.ts';
import type {World,Structure} from './types.ts';
type GenerationMap256=Pick<World,'schemaVersion'|'seed'|'worldMaps'|'worldGroups'|'width'|'height'|'site'|'planet'|'nextId'|'tick'|'rng'|'structures'|'pawns'|'jobs'|'piles'|'packed'|'wildlife'|'mechanoids'|'exploration'|'startingArrival'|'visitors'|'raids'|'geysers'|'fires'|'snow'>;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const data=(v:object,keys:readonly string[])=>Reflect.ownKeys(v).every(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return typeof k==='string'&&keys.includes(k)&&'value'in d&&d.enumerable;});
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function fresh(w:GenerationMap256,mapInitializing:boolean):boolean {
 return unpublishedAncientGeneration256(w,mapInitializing);
 // A true Base_Player875 may already own capsules, stock, actors and calendars.
 // Their mere existence never authorizes touching them or blocks another prop.
}
function original(w:GenerationMap256,s:Structure):boolean {
 if(!plain(s)||!data(s,['id','kind','x','z','orientation','footprint','material','quality','damage','door','factionId','grave'])||Object.values(s).some(v=>v===undefined)||s.factionId!==null||!integer(s.id,1,w.nextId-1)||s.footprint!=='standard')return false;
 if(isLocalRoadProp256(s.kind))return validLocalRoadPropStructure256(s,256,w)&&s.material===undefined&&s.quality===undefined&&s.door===undefined&&s.grave===undefined;
 if(!isAncientNeutralKind256(s.kind)||!validAncientMonumentBuilding256(s,256)||typeof s.material!=='string'||!validConstructionMaterial(s.kind,s.material,256)||!integer(s.orientation,0,3)||s.damage!==undefined&&!integer(s.damage,1,structureMaxHp(s)-1))return false;
 if(['table','table-square','sarcophagus'].includes(s.kind)?s.quality!=='normal':s.quality!==undefined)return false;
 if(s.kind==='sarcophagus'){
  if(!plain(s.grave)||!data(s.grave,['colonists','strangers'])||Reflect.ownKeys(s.grave).length!==2||s.grave.colonists!==true||s.grave.strangers!==false)return false;
 }else if(Object.hasOwn(s,'grave'))return false;
 if(s.kind==='door'){
  const expected=newDoorState(w.tick);if(!plain(s.door)||!data(s.door,Object.keys(expected))||Reflect.ownKeys(s.door).length!==Object.keys(expected).length||Object.entries(expected).some(([k,v])=>!Object.is(s.door![k as keyof typeof expected],v)))return false;
 }else if(Object.hasOwn(s,'door'))return false;
 return footprintCells(s).every(c=>integer(c.x,0,w.width-1)&&integer(c.z,0,w.height-1));
}
/** A null plan is a real unsupported/stale owner, never a successful no-op.
 * ROOT supplies the true MapInitializing frontier; imported/played objects
 * and occupied/assigned sarcophagi cannot enter this creation-only operation. */
export function planVanishGeneratedAncient256(w:GenerationMap256,cell:number,mapInitializing:true):{id:number;commit():void}|null {
 if(!fresh(w,mapInitializing)||!integer(cell,0,w.width*w.height-1))return null;
 const matches=w.structures.filter(s=>footprintCells(s).some(c=>c.z*w.width+c.x===cell));
 if(matches.length!==1)return null;const source=matches[0]!;if(!original(w,source)||w.structures.filter(s=>s.id===source.id).length!==1||ancientGenerationRemovalConflict256(w,source))return null;
 const id=source.id,frontier=w.nextId,clock=w.tick,rng=w.rng,stamp=JSON.stringify(source);
 return {id,commit(){
  // Other preflighted Vanish callbacks may have removed different structures.
  // The source original, fields and global allocation frontier must not move.
  const index=w.structures.indexOf(source);
  if(index<0||w.nextId!==frontier||w.tick!==clock||w.rng!==rng||ancientGenerationRemovalConflict256(w,source)||!fresh(w,mapInitializing)||!original(w,source)||JSON.stringify(source)!==stamp||w.structures.some(s=>s!==source&&s.id===id))throw Error('Actual generated edifice changed after Vanish preflight');
  w.structures.splice(index,1);
  // No refund/leavings/filth, terrain/roof/plant edit, RNG or ID rewind.
  // Core Notify_RoofHolderDespawned is Playing-only; this frontier is Init.
 }};
}
