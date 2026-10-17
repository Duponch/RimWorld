import {glowPodAgeAtCore256} from './cave-hive-clocks-256.ts';
/** Narrow prospective shape/owner guards. These are shared by RAW, full and
 * reconstructed-delta callsites; no migration installs any component. */
import {isCaveHiveKind256,CAVE_HIVE_DEFS_256} from './cave-hive-state-256.ts';
import {isCaveInsectSpecies256} from './cave-insect-constructor-256.ts';
import type {World} from './types.ts';
type Data=Record<string,unknown>;
const plain=(v:unknown):v is Data=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function closed(v:unknown,names:readonly string[],required=names):v is Data {if(!plain(v)||Reflect.ownKeys(v).some(k=>typeof k!=='string'||!names.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')||Object.getOwnPropertyDescriptor(v,k)!.enumerable!==true))return false;return required.every(k=>Object.hasOwn(v,k));}
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function dense(v:unknown):v is unknown[] {if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||Reflect.ownKeys(v).length!==v.length+1)return false;for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return false;}return true;}
function descriptor(v:object,k:string):{value:unknown}|undefined {const d=Object.getOwnPropertyDescriptor(v,k);return d&&Object.hasOwn(d,'value')&&d.enumerable?{value:d.value}:undefined;}
const ids=(v:unknown,nextId:number):v is number[]=>dense(v)&&v.every(id=>integer(id,1,nextId-1))&&new Set(v).size===v.length;
export function validCaveHiveBuilding256(value:unknown,version:number,h:{width:number;height:number;tick:number;nextId:number},packed=false):boolean {
 if(!plain(value))return false;const kind=descriptor(value,'kind');if(!kind)return false;
 if(!isCaveHiveKind256(kind.value))return !('caveHive'in value)&&!('glowPod'in value);
 const common=['id','kind','x','z','orientation','footprint','factionId','damage'],component=kind.value==='insect-hive'?'caveHive':'glowPod';
 if(version!==256||!closed(value,[...common,component],[...common.filter(k=>k!=='damage'),component])||!integer(value.id,1,h.nextId-1)||!integer(value.x,0,h.width-1)||!integer(value.z,0,h.height-1)||value.orientation!==0||value.footprint!=='standard'||!(integer(value.factionId,1)||component==='glowPod'&&value.factionId===null)||Object.hasOwn(value,'damage')&&!integer(value.damage,1,CAVE_HIVE_DEFS_256[kind.value].maxHp-1))return false;
 const now=h.tick*10,c=value[component];if(component==='glowPod'){if(!closed(c,['revision','madeAtCore','ageCore','lastCore'],['revision','madeAtCore','ageCore'])||c.revision!==1||!integer(c.madeAtCore,0,now)||(!integer(c.ageCore,-1,1199999)||(c.ageCore+1)%250!==0||c.ageCore>glowPodAgeAtCore256(Number(value.id),c.madeAtCore,now)))return false;return Object.hasOwn(c,'lastCore')?integer(c.lastCore,c.madeAtCore,now)&&(packed||c.lastCore===now):c.ageCore===glowPodAgeAtCore256(Number(value.id),c.madeAtCore,now);}
 if(!closed(c,['temple','revision','madeAtCore','awakeAtCore','chosenKind','spawnedPawnIds','canSpawnPawns','nextPawnSpawnCore','canSpawnHives','nextHiveSpawnCore','wasActivated','jellyLeftCore','podLeftCore','healCore','maintenanceCore','lastCore'],['revision','madeAtCore','awakeAtCore','chosenKind','spawnedPawnIds','canSpawnPawns','nextPawnSpawnCore','canSpawnHives','nextHiveSpawnCore','wasActivated','jellyLeftCore','podLeftCore','healCore','maintenanceCore'])||c.revision!==1||!integer(c.madeAtCore,0,now)||(Object.hasOwn(c,'temple')?c.temple!==true||!(c.awakeAtCore===null||integer(c.awakeAtCore,c.madeAtCore,now)):c.awakeAtCore!==c.madeAtCore)||!(c.chosenKind===null||isCaveInsectSpecies256(c.chosenKind))||!ids(c.spawnedPawnIds,h.nextId)||(c.temple===true?c.canSpawnPawns!==true||c.canSpawnHives!==true:c.canSpawnPawns!==false||c.canSpawnHives!==false)||typeof c.wasActivated!=='boolean'||!(c.temple===true&&c.nextPawnSpawnCore===-1||integer(c.nextPawnSpawnCore,c.madeAtCore))||!integer(c.nextHiveSpawnCore,c.madeAtCore)||!integer(c.jellyLeftCore,1,30000)||!integer(c.podLeftCore,1,60000)||!integer(c.healCore,0,5999)||!integer(c.maintenanceCore,0)||Object.hasOwn(c,'lastCore')&&c.lastCore!==now)return false;
 if(c.temple===true&&c.awakeAtCore===null&&(c.spawnedPawnIds.length||c.wasActivated||c.nextPawnSpawnCore!==-1||c.maintenanceCore!==0))return false;
 return true;
}
export function validHiveInsectField256(value:unknown,version:number,nextId:number):boolean {
 if(!plain(value))return false;const d=Object.getOwnPropertyDescriptor(value,'hive');if(!d)return !('hive'in value);
 const h=descriptor(value,'hive');return version===256&&!!h&&isCaveInsectSpecies256(descriptor(value,'species')?.value)&&closed(h.value,['factionId','lordId','spawnerId'])&&integer(h.value.factionId,1)&&(h.value.lordId===null||integer(h.value.lordId,0,2147483645))&&(h.value.spawnerId===null||integer(h.value.spawnerId,1,nextId-1));
}
export function validHiveLordHeader256(value:unknown,version:number,nextId:number,tick:number):boolean {
 if(!plain(value))return false;const d=Object.getOwnPropertyDescriptor(value,'hiveLords');if(!d)return !('hiveLords'in value);
 const field=descriptor(value,'hiveLords');if(version!==256||!field||!dense(field.value))return false;
 const seen=new Set<number>();for(const row of field.value){if(!closed(row,['id','factionId','aggressive','phase','lastHarmCore','memberIds','assignedHives'])||!integer(row.id,0,2147483645)||seen.has(row.id)||!integer(row.factionId,1)||typeof row.aggressive!=='boolean'||!['defend-expand','defend-aggressive','assault'].includes(String(row.phase))||!integer(row.lastHarmCore,0,tick*10)||!ids(row.memberIds,nextId)||!dense(row.assignedHives))return false;seen.add(row.id);const assigned=new Set<number>();for(const assignment of row.assignedHives){if(!closed(assignment,['pawnId','hiveId'])||!integer(assignment.pawnId,1,nextId-1)||!integer(assignment.hiveId,1,nextId-1)||assigned.has(assignment.pawnId)||!row.memberIds.includes(assignment.pawnId))return false;assigned.add(assignment.pawnId);}}
 return true;
}
export function validateCaveHiveOwners256(w:Pick<World,'schemaVersion'|'width'|'height'|'tick'|'nextId'|'structures'|'packed'|'wildlife'|'worldFactions'|'worldMaps'|'campaignMap'>,version:number,actualConstructorCounter?:{readonly nextId:number}):string[] {
 const errors:string[]=[],s=w.wildlife;
 if(w.structures.some(h=>isCaveHiveKind256(h.kind))&&!s)return ['Missing actual Hive wildlife owner'];
 if(s&&!validHiveLordHeader256(s,version,w.nextId,w.tick))return ['Invalid or future insect Lord header'];
 const insectFaction=w.worldFactions?.factions.find(f=>f.def==='Insect');
 for(const structure of w.structures)if(!validCaveHiveBuilding256(structure,version,w))return ['Invalid or future Hive/GlowPod'];
 for(const pack of w.packed)if(pack.building.kind==='insect-hive'||pack.building.kind==='glow-pod'&&pack.building.factionId!==null&&pack.building.factionId!==w.worldFactions?.playerFactionId||!validCaveHiveBuilding256(pack.building,version,w,true))return ['Invalid or future packed Hive/GlowPod'];
 const lords=s?.hiveLords??[],mapCounter=w.worldMaps?.nextLordId,projection=w.campaignMap,nextLordId=actualConstructorCounter?.nextId??mapCounter??(projection?.revision===2?projection.nextLordId:undefined);
 if(lords.length&&(!integer(nextLordId,1,2147483646)||lords.some(l=>l.id>=nextLordId)))return ['Missing actual separate Lord ID authority'];
 const hives=w.structures.filter(h=>h.kind==='insect-hive');
 for(const lord of lords){if(!insectFaction||lord.factionId!==insectFaction.id)return ['Unknown or duplicate actual insect Lord identity'];for(const id of lord.memberIds){const a=s!.animals.find(a=>a.id===id);if(!a||!isCaveInsectSpecies256(a.species)||a.hive?.lordId!==lord.id||a.hive.factionId!==lord.factionId)return ['Insect Lord references a different physical owner'];}for(const assignment of lord.assignedHives){if(!hives.some(h=>h.id===assignment.hiveId&&h.factionId===lord.factionId))return ['Insect duty references an absent Hive'];}}
 for(const a of s?.animals??[]){if(!validHiveInsectField256(a,version,w.nextId))return ['Invalid or future insect faction/Lord membership'];if(!a.hive)continue;if(!w.worldFactions?.factions.some(f=>f.id===a.hive!.factionId))return ['Unknown actual insect faction'];if((a.hive.lordId!==null||a.hive.spawnerId!==null)&&a.hive.factionId!==insectFaction?.id)return ['Local insect duty uses a different faction'];if(a.hive.lordId!==null&&!lords.some(l=>l.id===a.hive!.lordId&&l.memberIds.includes(a.id)))return ['Missing original insect Lord'];if(a.hive.spawnerId!==null&&!hives.some(h=>h.id===a.hive!.spawnerId&&h.caveHive!.spawnedPawnIds.includes(a.id)))return ['Missing actual insect spawner'];}
 for(const h of hives){if(!insectFaction||h.factionId!==insectFaction.id)return ['Unknown actual Hive faction'];for(const id of h.caveHive!.spawnedPawnIds)if(!s?.animals.some(a=>a.id===id&&a.hive?.spawnerId===h.id))return ['Hive references an absent original insect'];}
 for(const pod of [...w.structures,...w.packed.map(p=>p.building)])if(pod.kind==='glow-pod'&&pod.factionId!==null&&(!insectFaction||pod.factionId!==insectFaction.id)&&pod.factionId!==w.worldFactions?.playerFactionId)return ['Unknown actual GlowPod faction'];
 return errors;
}

/** Frozen off-map originals retain faction, never a dead map's Lord/spawner. */
export function validDetachedHiveInsect256(value:unknown,version:number,nextId:number):boolean {
 if(!validHiveInsectField256(value,version,nextId)||!plain(value))return false;const h=descriptor(value,'hive');return !h||plain(h.value)&&h.value.lordId===null&&h.value.spawnerId===null;
}
