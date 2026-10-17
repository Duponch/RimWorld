import {captureActualFogPhysical256} from './exploration-physical-256.ts';
import {notifyExplorationSpawn256} from './exploration-flood-256.ts';
import {actualExplorationAffiliation256} from './exploration-actors-256.ts';
import {pendingBlindMine256} from './exploration-visibility-256.ts';
import {retireEmptyMinesAfterReveal256} from './exploration-mine-orders-256.ts';
import {notifyActualExplorationSpawn256} from './exploration-runtime-256.ts';
import {explorationEnabled256} from './exploration-state-256.ts';
import type {World,Cell} from './types.ts';
type ActualActor256=Parameters<typeof actualExplorationAffiliation256>[0];
/** Rare pod-open preflight on the sole fog-bearing tile view, not a World
 * clone. Geography/mineable records are shared read-only. No actor, job,
 * item, clinical clock or RNG is advanced here. */
export function prepareStartingSpawnFog256(world:World,spawns:readonly {actor:ActualActor256;cell:Readonly<Cell>}[]) {
 if(!explorationEnabled256(world))throw Error('New Core starting arrival lacks real exploration');
 const tiles=world.tiles,old=tiles.map(t=>t.fogged===true),jobs=world.jobs,jobsBefore=world.jobs.slice(),
  fog={schemaVersion:world.schemaVersion,site:world.site,exploration:world.exploration,width:world.width,height:world.height,tiles:tiles.map(t=>({...t}))},
  physical=captureActualFogPhysical256(world),changed=new Set<number>();
 for(const {actor,cell} of spawns){const affiliation=actualExplorationAffiliation256(actor),reveal=notifyExplorationSpawn256(fog,cell.z*world.width+cell.x,{playerOwned:affiliation.playerOwned,playerControlled:affiliation.playerOwned,respawningAfterLoad:false},physical);for(const cell of reveal.changedCells)changed.add(cell);}
 const touchedJobs=jobs.filter(j=>j.kind==='mine'&&changed.has(j.z*world.width+j.x)&&world.tiles[j.z*world.width+j.x]!.terrain!=='rock'&&!world.tiles[j.z*world.width+j.x]!.collapsedRock);
 if(touchedJobs.some(j=>!pendingBlindMine256(world,j)))throw Error('Starting reveal would retire a non-pending physical mine owner');
 for(const i of changed){const d=Object.getOwnPropertyDescriptor(tiles[i]!,'fogged');if(d&&!d.configurable)throw Error('Starting reveal tile is not mutable');}
 const jobSignature=JSON.stringify(touchedJobs),sameJobs=()=>world.jobs===jobs&&jobs.length===jobsBefore.length&&jobs.every((j,i)=>j===jobsBefore[i]);let used=false;
 return {changedCells:Object.freeze([...changed]),current:()=>!used&&world.tiles===tiles&&sameJobs()&&old.every((v,i)=>v===(tiles[i]!.fogged===true))&&JSON.stringify(touchedJobs)===jobSignature,
  commit(){if(used||world.tiles!==tiles||!sameJobs()||old.some((v,i)=>v!==(tiles[i]!.fogged===true))||JSON.stringify(touchedJobs)!==jobSignature)throw Error('Starting fog preflight is stale');used=true;
   for(const i of changed)delete tiles[i]!.fogged;
   // These exact newly empty intents have zero work/escrow and no claimant;
   // their existing cancellation path requires no allocation or restitution.
   const retired=retireEmptyMinesAfterReveal256(world,[...changed]);if(!retired.ok)throw Error('Preflighted starting mine cancellation changed: '+retired.reason);
   // Original owners are now installed. The ordinary hook is idempotent and
   // must find those originals, never a fabricated affiliation certificate.
   for(const {actor} of spawns)notifyActualExplorationSpawn256(world,actor);
  }};
}
