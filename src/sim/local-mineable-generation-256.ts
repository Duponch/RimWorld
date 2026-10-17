/** Narrow transient owner for actual generation callbacks, never saved.
 * No terrain synthesis, RNG, scene, replay or final-grid ID reconstruction. */
import {isStoneKind,type StoneKind} from './geology.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256,type NaturalTerrainId256} from './local-terrain-definitions-256.ts';
import {NATURAL_MINEABLE_DEFS_256,ORE_MINEABLE_DEFS_256,type LocalMineableOwner256,type MineableDef256} from './local-mineable-owner-256.ts';
import type {LocalOre256} from './local-ore-scattering-256.ts';
interface PendingMineable256 {id:number;def:MineableDef256;stone:StoneKind;terrain?:NaturalTerrainId256}
export interface MineableGenerationRecorder256 {
 naturalSpawn(cell:number,stone:StoneKind):void;
 oreSpawn(cell:number,ore:LocalOre256,stone:StoneKind):void;
 terrainDecided(cell:number,terrain:NaturalTerrainId256):void;
 vanish(cell:number):void;
 finish(actual:{edifices:Uint8Array;stones:readonly StoneKind[];ores?:readonly (LocalOre256|null)[];terrain:readonly NaturalTerrainId256[]}):{owners:ReadonlyMap<number,LocalMineableOwner256>;nextId:number};
}
/** nextId is the REAL campaign frontier before RocksFromGrid, not a seed.
 * Every spawn consumes an ID even if replaced/removed later in this pipeline. */
export function createMineableGenerationRecorder256(width:number,height:number,nextId:number):MineableGenerationRecorder256 {
 if(![width,height].every(v=>Number.isInteger(v)&&v>=8&&v<=400)||!Number.isSafeInteger(nextId)||nextId<1)throw Error('Invalid actual Mineable allocation frontier');
 const n=width*height,live=new Map<number,PendingMineable256>();let ended=false,frontier=nextId;
 const cell=(index:number)=>{if(ended||!Number.isInteger(index)||index<0||index>=n)throw Error('Invalid Mineable generation event');};
 const spawn=(index:number,def:MineableDef256,stone:StoneKind)=>{cell(index);if(!isStoneKind(stone)||!Number.isSafeInteger(frontier+1))throw Error('Unresolved Mineable definition/frontier');const previous=live.get(index);live.set(index,{id:frontier++,def,stone,...previous?.terrain!==undefined?{terrain:previous.terrain}:{}});};
 return {
  naturalSpawn(index,stone){cell(index);if(live.has(index)||!isStoneKind(stone))throw Error('Natural spawn is not an actual fresh cell');spawn(index,NATURAL_MINEABLE_DEFS_256[stone],stone);},
  oreSpawn(index,ore,stone){if(!Object.hasOwn(ORE_MINEABLE_DEFS_256,ore))throw Error('Unresolved actual mineral');spawn(index,ORE_MINEABLE_DEFS_256[ore],stone);},
  terrainDecided(index,terrain){cell(index);if(!Object.hasOwn(NATURAL_TERRAIN_DEFINITIONS_256,terrain))throw Error('Missing actual Terrain/PostTerrain decision');const owner=live.get(index);if(owner)owner.terrain=terrain;},
  vanish(index){cell(index);if(!live.delete(index))throw Error('Generation removed an absent Mineable original');},
  finish(actual){if(ended||actual.edifices.length!==n||actual.stones.length!==n||actual.terrain.length!==n||actual.ores!==undefined&&actual.ores.length!==n)throw Error('Incomplete actual Mineable generation output');
   const owners=new Map<number,LocalMineableOwner256>();
   for(let index=0;index<n;index++){const owner=live.get(index),ore=actual.ores?.[index]??null;if(actual.edifices[index]!==0&&actual.edifices[index]!==1||Boolean(actual.edifices[index])!==!!owner)throw Error('Mineable events disagree with actual final edifice grid');
    if(!owner){if(ore!==null)throw Error('Absent Mineable has an ore overlay');continue;}
    const def=ore===null?NATURAL_MINEABLE_DEFS_256[actual.stones[index]!]:ORE_MINEABLE_DEFS_256[ore];
    if(owner.terrain===undefined||owner.terrain!==actual.terrain[index]||owner.stone!==actual.stones[index]||owner.def!==def)throw Error('Actual Mineable definition/substrate mismatch; no reconstruction fallback');
    owners.set(index,{id:owner.id,def:owner.def,terrain:owner.terrain});
   }
   ended=true;return {owners,nextId:frontier};
  }
 };
}
