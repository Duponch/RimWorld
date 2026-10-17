/** Real confirmed-map notifications. Geometry is captured only for a genuine
 * reveal, after the physical transaction; historical maps remain literal. */
import {wakeUnfoggedTempleMechs256} from './temple-mech-duty-256.ts';
import {footprintCells} from './definitions.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {captureActualFogPhysical256} from './exploration-physical-256.ts';
import {notifyFogBlockerRemoved256,notifyExplorationSpawn256,type FogReveal256} from './exploration-flood-256.ts';
import {explorationEnabled256} from './exploration-state-256.ts';
import {retireEmptyMinesAfterReveal256} from './exploration-mine-orders-256.ts';
import {resolveActualExplorationApproacher256} from './exploration-actors-256.ts';
import type {World,Structure,Cell} from './types.ts';
export interface RemovedFogBlocker256 {origin:number;cells:readonly number[];makeFog:true;wasSpawned:true;willReplace:false}
/** Capture the ORIGINAL installed Thing, never a minified inner building. */
export function prepareRemovedFogStructure256(world:World,structure:Structure):RemovedFogBlocker256|undefined {
 if(!explorationEnabled256(world)||!world.structures.includes(structure))return;
 const fact=START_STRUCTURE_PHYSICS_256[structure.kind];
 if(!fact)throw Error('Missing actual fog structure definition');
 if(!fact.fullFill)return;
 const cells=footprintCells(structure).map(c=>c.z*world.width+c.x);
 return {origin:structure.z*world.width+structure.x,cells,makeFog:true,wasSpawned:true,willReplace:false};
}
export function prepareRemovedFogMineable256(world:World,cell:number):RemovedFogBlocker256|undefined {
 if(!explorationEnabled256(world)||world.tiles[cell]?.terrain!=='rock')return;
 return {origin:cell,cells:[cell],makeFog:true,wasSpawned:true,willReplace:false};
}
/** Current completed mine is retired by its existing caller. All other newly
 * discovered empty intents use the same cancellation transaction as the UI. */
export function finishExplorationReveal256(world:World,result:FogReveal256,completedMineId?:number):void {
 const retired=retireEmptyMinesAfterReveal256(world,result.changedCells,completedMineId);
 if(!retired.ok)throw Error('Revealed mine cancellation failed: '+retired.reason);
 if(result.changedCells.length)wakeUnfoggedTempleMechs256(world);
}
export function commitRemovedFogBlocker256(world:World,removed:RemovedFogBlocker256|undefined,completedMineId?:number):void {
 if(!removed)return;
 const physical=captureActualFogPhysical256(world);
 finishExplorationReveal256(world,notifyFogBlockerRemoved256(world,removed,physical),completedMineId);
}
/** Spawn after a real owner transfer/pod opening, never decoding/restoration.
 * Current player faction is read from the original now owned by the campaign. */
export function notifyActualExplorationSpawn256(world:World,actor:Cell&{id:number}):void {
 if(!explorationEnabled256(world))return;
 const owner=resolveActualExplorationApproacher256(world,actor.id);
 if(!owner)throw Error('Actual exploration spawn has no physical actor owner');
 if(!owner.playerOwned)return;
 finishExplorationReveal256(world,notifyExplorationSpawn256(world,actor.z*world.width+actor.x,
  {playerOwned:owner.playerOwned,playerControlled:owner.playerOwned,respawningAfterLoad:false},captureActualFogPhysical256(world)));
}
