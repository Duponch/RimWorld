import type {Structure,Cell} from './types.ts';
import type {CaveInsectSpecies256} from './cave-insect-constructor-256.ts';
/** References only: actual insects stay in WildlifeState.animals. No actor is
 * duplicated in a hive or Lord, and no grid is retained by a component. */
export interface CaveHiveComponents256 {
 revision:1;madeAtCore:number;awakeAtCore:number|null;temple?:true;lastCore?:number;chosenKind:CaveInsectSpecies256|null;
 spawnedPawnIds:number[];canSpawnPawns:boolean;nextPawnSpawnCore:number;
 canSpawnHives:boolean;nextHiveSpawnCore:number;wasActivated:boolean;
 jellyLeftCore:number;podLeftCore:number;healCore:number;maintenanceCore:number;
}
export interface HiveLord256 {id:number;factionId:number;aggressive:boolean;phase:'defend-expand'|'defend-aggressive'|'assault';lastHarmCore:number;memberIds:number[];assignedHives:{pawnId:number;hiveId:number}[]}
export interface GlowPodComponents256 {revision:1;madeAtCore:number;ageCore:number;lastCore?:number}
export type CaveHiveKind256='insect-hive'|'glow-pod';
export const isCaveHiveKind256=(kind:unknown):kind is CaveHiveKind256=>kind==='insect-hive'||kind==='glow-pod';
export type ActualHive256=Structure&{kind:'insect-hive';factionId:number;caveHive:CaveHiveComponents256};
export type ActualGlowPod256=Structure&{kind:'glow-pod';factionId:number|null;glowPod:GlowPodComponents256};
export const CAVE_HIVE_DEFS_256=Object.freeze({
 'insect-hive':Object.freeze({defId:'Hive',maxHp:130,flammability:1,walkCore:42,standable:false,fill:.5,holdsRoof:false,blockWind:true,light:0}),
 'glow-pod':Object.freeze({defId:'GlowPod',maxHp:50,flammability:1,walkCore:0,standable:false,fill:.2,holdsRoof:false,blockWind:false,light:6,massGrams:4000,lifespanCore:1200000}),
});
export function hiveCell256(w:{width:number},s:Cell):number{return s.z*w.width+s.x;}
