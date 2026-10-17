import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Actual rare-capture edifice facts. Nothing is inferred from roof, water,
 * pawn access, light, hostility, closed/open door state or camera visibility. */
import {footprintCells} from './definitions.ts';
import {START_STRUCTURE_PHYSICS_256,type StartThingPhysics256} from './player-start-physics-256.ts';
import {assertExplorationDimensions256,type ExplorationMap256} from './exploration-state-256.ts';
import type {World} from './types.ts';
export interface FogPhysicalReaders256 {makeFog(cell:number):boolean;door(cell:number):boolean;fullFootprint(cell:number):readonly number[]}
export type ActualFogMap256=ExplorationMap256&Pick<World,'structures'|'jobs'>;
const EMPTY_FOOTPRINT:readonly number[]=Object.freeze([]);
const definitions=new Map<string,StartThingPhysics256>(Object.entries(START_STRUCTURE_PHYSICS_256));
export function captureActualFogPhysical256(map:ActualFogMap256):FogPhysicalReaders256 {
 assertExplorationDimensions256(map);if(!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3)throw Error('Actual Site3 fog geometry required');
 const n=map.tiles.length,flags=new Uint8Array(n),edifices=new Uint8Array(n),large=new Map<number,readonly number[]>();
 const valid=(cell:number)=>Number.isInteger(cell)&&cell>=0&&cell<n;
 const cells=(owner:Parameters<typeof footprintCells>[0])=>footprintCells(owner).map(c=>{if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||c.x<0||c.z<0||c.x>=map.width||c.z>=map.height)throw Error('Fog owner outside actual map');return c.z*map.width+c.x;});
 for(let i=0;i<n;i++)if(map.tiles[i]!.terrain==='rock'||map.tiles[i]!.collapsedRock){flags[i]=1;edifices[i]=1;}
 for(const structure of map.structures){
  const fact=definitions.get(structure.kind);if(!fact)throw Error('Unresolved actual fog edifice definition');const footprint=cells(structure);
  for(const cell of footprint){if(fact.edifice){if(edifices[cell])throw Error('Ambiguous actual fog edifice owner');edifices[cell]=1;if(fact.fullFill)flags[cell]!|=1;if(fact.door)flags[cell]!|=2;}
   if(fact.fullFill&&footprint.length>1)large.set(cell,footprint);}
 }
 // Thing Frames have fill.2, never Full/MakeFog, and never Door. Terrain
 // frames/blueprints are not fog blockers either. Reject unknown real frames.
 for(const job of map.jobs)if(job.construction==='frame'&&job.kind!=='lay-floor'&&job.kind!=='build-bridge'){
  const fact=definitions.get(job.furniture?.kind??job.kind);if(!fact)throw Error('Unresolved actual fog Frame');if(fact.edifice)for(const cell of cells(job)){if(edifices[cell])throw Error('Ambiguous actual fog Frame owner');edifices[cell]=1;}
 }
 return {makeFog:cell=>valid(cell)&&!!(flags[cell]!&1),door:cell=>valid(cell)&&!!(flags[cell]!&2),fullFootprint:cell=>valid(cell)?large.get(cell)??(flags[cell]!&1?[cell]:EMPTY_FOOTPRINT):EMPTY_FOOTPRINT};
}
