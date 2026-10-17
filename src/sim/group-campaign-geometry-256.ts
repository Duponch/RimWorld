/** Actual planet/world-object adapter for the worker-owned caravan runtime.
 * Geometry is read from the admitted owner; neither tile-count heuristics nor
 * a synthetic globe are supplied. Tangent projection uses the same orthogonal
 * basis as LookRotation. Native quaternion rounding remains a numerical
 * comparison boundary, as for world-spherical-heading, not seed-bit parity. */
import type {CampaignState} from './world-map-state.ts';
import type {PlanetState} from './planet-state.ts';
import type {GroupCampaignGeometry256} from './group-campaign-runtime-256.ts';
import type {GroupDrawPoint} from './group-motion-runtime.ts';
import {planetTile,planetTiles} from './planet-geography-256.ts';
import {geographicAverageTileSize256} from './planet-route-256.ts';
import {worldSurfaceAverageTileSize} from './world-surface-distances.ts';
import {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
const dot=(a:GroupDrawPoint,b:GroupDrawPoint)=>f(f(f(a[0]*b[0])+f(a[1]*b[1]))+f(a[2]*b[2]));
const cross=(a:GroupDrawPoint,b:GroupDrawPoint):GroupDrawPoint=>[f(f(a[1]*b[2])-f(a[2]*b[1])),f(f(a[2]*b[0])-f(a[0]*b[2])),f(f(a[0]*b[1])-f(a[1]*b[0]))];
function unit(v:GroupDrawPoint):GroupDrawPoint {const n=f(Math.sqrt(dot(v,v)));if(!(n>f(.00001)))throw Error('Degenerate actual planet tangent');return [f(v[0]/n),f(v[1]/n),f(v[2]/n)];}
export function groupPlanetTangent256(center:GroupDrawPoint,point:readonly [number,number]):GroupDrawPoint {
 const normal=unit(center),up:GroupDrawPoint=Math.abs(normal[1])>f(.999)?[1,0,0]:[0,1,0];
 const second=unit(cross(up,normal)),first=cross(normal,second);
 return [f(f(point[0]*first[0])+f(point[1]*second[0])),f(f(point[0]*first[1])+f(point[1]*second[1])),f(f(point[0]*first[2])+f(point[1]*second[2]))];
}
export function groupRegularPolygon256(count:number,index:number):readonly [number,number] {
 if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(index)||index<0||index>=count)throw Error('Invalid actual caravan cohort');
 if(count===1)return [0,0];
 const pi=f(Math.PI),angle=f(f(f(f(pi*2)/f(count))*f(index))+pi);return [f(Math.cos(angle)),f(Math.sin(angle))];
}
export function actualFinalPushDestination256(root:CampaignState,tile:number):boolean {
 // A real non-Caravan WorldObject is required. An empty home marker or another
 // caravan at the destination never grants the final-push exception.
 if(root.worldMaps?.sites.some(s=>s.tile===tile))return true;
 if(root.worldMaps?.retired.some(s=>s.tile===tile&&(s.markerUntilCore===undefined||s.markerUntilCore>root.tick*10)))return true;
 if(root.worldFactions?.settlements.some(s=>s.tile===tile))return true;
 return root.planet?.revision!==3&&root.planet?.civilianTile===tile&&!!root.worldGroups?.posts.length;
}
/** Construct once after load/new-game admission; do not scan geometry per tick. */
export function createGroupCampaignGeometry256(root:CampaignState):GroupCampaignGeometry256 {
 if(!root.worldMaps||!root.worldGroups||!root.planet)throw Error('Actual campaign globe is missing');
 const planet:PlanetState=root.planet,tiles=planetTiles(planet),average=planet.revision===3?geographicAverageTileSize256(planet):worldSurfaceAverageTileSize(tiles);
 const authority=(current:CampaignState)=>{if(current!==root||current.planet!==planet)throw Error('Caravan geometry belongs to another confirmed generation');};
 return Object.freeze({averageTileSize:average,
  center:(id:number):GroupDrawPoint=>{const tile=planetTile(planet,id);if(!tile)throw Error('Caravan tile outside admitted globe');return tile.center;},
  tangent:groupPlanetTangent256,regularPolygonVertex:groupRegularPolygon256,
  collisionAngle:(id:number)=>new WorldGenerationRandom(id).float(0,360),
  passable:(current:CampaignState,id:number)=>{authority(current);const tile=planetTile(planet,id);return !!tile&&tile.biome!=='ocean'&&(planet.revision!==3||tile.biome!=='lake'&&tile.hilliness!=='impassable');},
  finalPushDestination:(current:CampaignState,id:number)=>{authority(current);return actualFinalPushDestination256(current,id);},
  playerDef:(current:CampaignState):'PlayerColony'|'PlayerTribe'=>{authority(current);const registry=current.worldFactions;
   // All literal Elsewhere scenarios preceding the faction registry were
   // industrial colonies; neutral migration creates no new faction record.
   if(!registry)return 'PlayerColony';const def=registry.factions.find(v=>v.id===registry.playerFactionId)?.def;
   if(def!=='PlayerColony'&&def!=='PlayerTribe')throw Error('Missing actual player faction');return def;},
 });
}
