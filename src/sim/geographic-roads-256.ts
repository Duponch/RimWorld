/** Step390 on the ONE actual new map. Planning sees the unmodified terrain;
 * effects retire true Mineables/props and allocate true generated owners.
 * The returned angular implementation remains a declared numeric boundary. */
import type {World,Tile} from './types.ts';
import {captureFreshGeographicRoadMap256,type GenerationUsedRect256} from './geographic-road-capture-256.ts';
import {generateLocalRoads256,initialLocalRoadEdges256,LOCAL_ROAD_SEED_PART_256,type LocalRoadAngularMath256} from './local-road-generation-256.ts';
import type {LocalRoadPlacement256,ActualRoadTerrain256} from './local-road-placement-256.ts';
import {createLocalRoadProp256,isLocalRoadProp256} from './local-road-props-256.ts';
import {NATURAL_TERRAIN_DEFINITIONS_256,isNaturalTerrain256} from './local-terrain-definitions-256.ts';
import {terrainSupportsAffordance256} from './natural-terrain-runtime-256.ts';
import {isRoadFloor256,type RoadFlagstone256} from './road-ground-256.ts';
import {vanishNaturalMineable256} from './local-mineable-owner-256.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {surfaceNaturalRocks,localGenerationStepSeed} from './world-site-geography.ts';
import {worldSphericalHeading} from './world-spherical-heading.ts';
import {visibleWorldRoads} from './world-roads.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
const DRIES:Readonly<Record<string,string>>={'marshy-soil':'soil-natural',mud:'soil-natural','soft-sand':'sand','water-shallow':'gravel','ocean-shallow':'gravel',marsh:'soil-natural'};
const alias=(id:string)=>id==='ocean-deep'?'water-ocean-deep':id==='ocean-shallow'?'water-ocean-shallow':id;
const actual=(id:string)=>id==='water-ocean-deep'?'ocean-deep':id==='water-ocean-shallow'?'ocean-shallow':id;
/** Pure creation-only adapter; no all-clear runtime/old map is accepted. */
export function prepareFreshGeographicRoadPlacement256(world:World,usedRects:readonly GenerationUsedRect256[]) {
 const captured=captureFreshGeographicRoadMap256(world,usedRects),mineables=new Map<number,number>();
 for(let i=0;i<world.tiles.length;i++){const o=world.tiles[i]!.mineable;if(o)mineables.set(o.id,i);}
 const edgeCells:number[]=[],edges=new Set<number>();let regionalFloor='';
 const terrain=(cell:number):ActualRoadTerrain256=>{
  const t=world.tiles[cell];if(!t)throw Error('Road terrain outside actual map');
  if(t.bridge)return {id:'bridge',bridge:true,water:false,river:false,road:false,removable:true,impassable:false,driesTo:null};
  if(t.floor)return {id:t.floor,bridge:false,water:false,river:false,road:isRoadFloor256(t.floor),removable:true,impassable:false,driesTo:null};
  const id=t.mineable?.terrain??t.terrain;if(id==='packed-dirt')return {id,bridge:false,water:false,river:false,road:true,removable:false,impassable:false,driesTo:null};
  if(!isNaturalTerrain256(id))throw Error('Unknown actual road terrain');const d=NATURAL_TERRAIN_DEFINITIONS_256[id];
  return {id:alias(id),bridge:false,water:d.water,river:d.river,road:false,removable:false,impassable:!d.affordances.includes('Walkable'),driesTo:DRIES[id]?alias(DRIES[id]!):null};
 };
 const placement:LocalRoadPlacement256={
  terrain,
  things(cell){const t=world.tiles[cell];if(!t)throw Error('Road Thing cell outside map');const list:{id:number;impassable:boolean;destroyable:boolean}[]=[];if(t.mineable)list.push({id:t.mineable.id,impassable:true,destroyable:true});for(const p of world.structures)if(p.x===cell%world.width&&p.z===Math.floor(cell/world.width))list.push({id:p.id,impassable:false,destroyable:true});return list;},
  canBuild(target,cell){const top=terrain(cell),original=world.tiles[cell]!,t=original.mineable?{...original,terrain:original.mineable.terrain}:original;
   // TerrainDef.changeable=false for deep water. Things ask their actual
   // support, rather than this terrain-only replacement permission.
   if(isLocalRoadProp256(target))return terrainSupportsAffordance256(t,'Light',world);
   if(top.id==='water-deep'||top.id==='water-ocean-deep')return false;
   return target==='bridge'?terrainSupportsAffordance256(t,'Bridgeable',world):target==='regional-flagstone'?terrainSupportsAffordance256(t,'Heavy',world):true;
  },
  vanish(id){const cell=mineables.get(id);if(cell!==undefined){if(!vanishNaturalMineable256(world,cell,id))throw Error('Road Mineable retirement lost its original');mineables.delete(id);return;}const at=world.structures.findIndex(p=>p.id===id&&isLocalRoadProp256(p.kind));if(at<0)throw Error('Unknown road generation owner');world.structures.splice(at,1);},
  setTerrain(cell,id){const source=world.tiles[cell];if(!source||source.mineable)throw Error('Road terrain effect still overlaps a Mineable');const next:Tile={...source};delete next.floor;delete next.bridge;
   if(isRoadFloor256(id))next.floor=id;
   else {const value=actual(id);if(value!=='packed-dirt'&&!isNaturalTerrain256(value))throw Error('Unknown road target');next.terrain=value;if(value!=='rough-stone')delete next.stone;}
   world.tiles[cell]=next;
  },
  setFoundation(cell){const t=world.tiles[cell];if(!t||!terrainSupportsAffordance256(t,'Bridgeable',world))throw Error('Bridge requires its actual support');t.bridge=true;},
  get regionalFloor(){return regionalFloor;},
  hasSamePropNear(target,cell,radius){const x=cell%world.width,z=Math.floor(cell/world.width);return world.structures.some(p=>p.kind===target&&(p.x-x)**2+(p.z-z)**2<=radius*radius);},
  spawnProp(target,cell,random){if(world.nextId>=2147483647)throw Error('Road edifice namespace exhausted');world.structures.push(createLocalRoadProp256(target,world.nextId++,cell%world.width,Math.floor(cell/world.width),random));},
  addRoadEdge(cell){if(!edges.has(cell)){edges.add(cell);edgeCells.push(cell);}},
 };
 return {captured,placement,edgeCells,selectRegionalFloor(id:string){if(!(surfaceNaturalRocks(world.site!.revision===3?world.site!.tileId:-1).map(s=>s+'-flagstone') as string[]).includes(id))throw Error('Road regional rock is not from this actual tile');regionalFloor=id;}};
}
export function populateGeographicRoads256(world:World,usedRects:readonly GenerationUsedRect256[],angular:LocalRoadAngularMath256) {
 if(world.planet?.revision!==3||world.site?.revision!==3||'roadInfo'in world)throw Error('Roads need their ungenerated actual geographic owner');
 const owner=planetGeography256(world.planet),tile=owner.surface.tiles[world.site.tileId]!,adapter=prepareFreshGeographicRoadPlacement256(world,usedRects);
 const visible=visibleWorldRoads(tile,owner.roads[tile.id]!);
 // GetTileNeighbors order, then the default visible GetRoadDef lookup. The
 // stored overlay insertion order is not this local generation order.
 const links=tile.neighbours.flatMap(id=>{const link=visible.find(l=>l.neighbour===id);if(!link)return [];const neighbour=owner.surface.tiles[id];if(!neighbour)throw Error('Actual local road leaves its geographic neighbours');return [{...link,angle:worldSphericalHeading(tile.center,neighbour.center)}];});
 const random=new WorldGenerationRandom(localGenerationStepSeed(world.site.mapSeed,LOCAL_ROAD_SEED_PART_256,0));
 const result=generateLocalRoads256({map:adapter.captured.map,links,edgeState:initialLocalRoadEdges256(world.width,world.height),services:{angular,central:adapter.captured.central,curve:adapter.captured.curve,placement:adapter.placement,canReach:(from,to,mode)=>adapter.captured.reachability.canReach(from===null?-1:from[1]*world.width+from[0],to,mode),regionalRockFloors:world.site.stones.map(s=>(s+'-flagstone') as RoadFlagstone256),selectRegionalFloor:adapter.selectRegionalFloor}},random);
 world.roadInfo={revision:1,edgeCells:adapter.edgeCells};return result;
}
