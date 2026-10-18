import {markTerrainCellChanged} from './terrain-mutation-journal.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Original Center/nearby arrival sampling over one actual unpublished Camp.
 * No former World, favorable retry, terrain edit or global RNG is used. */
import {captureRandomClosewalk256,type RandomClosewalkCapture256} from './random-closewalk-256.ts';
import type {ActualGenerationRegion256} from './geographic-generation-reachability-256.ts';
import {captureActualFogPhysical256} from './exploration-physical-256.ts';
import {notifyExplorationSpawn256} from './exploration-flood-256.ts';
import {foggedCell256,explorationEnabled256} from './exploration-state-256.ts';
import {actualExplorationAffiliation256} from './exploration-actors-256.ts';
import {duckPhysicalOwnerCount256} from './duck-flyer-runtime-256.ts';
import {MAX_WILDLIFE,type WildAnimal} from './wildlife-state.ts';
import {registeredCampaign} from './world-map-context.ts';
import type {CampaignState} from './world-map-state.ts';
import type {AwayGroup} from './group-capture.ts';
import type {World,Pawn,Cell,Orientation} from './types.ts';
export interface CampArrivalRandom256 {value():number;integer(min:number,maxExclusive:number):number}
export type CampArrivalActor256=Pawn|WildAnimal;
export interface CampArrivalPlacement256 {readonly actor:CampArrivalActor256;readonly cell:Readonly<Cell>;readonly rotation:Orientation}
/** Adapt the campaign's EXISTING xorshift stream, not a new seed/counter.
 * Integer selection uses the published signed remainder operation. This is
 * not a claim that the historical campaign PRNG equals Core Murmur Rand. */
export function stagedCampArrivalRandom256(initial:number){
 if(!Number.isSafeInteger(initial)||initial<1||initial>0xffffffff)throw Error('Invalid actual campaign arrival RNG');
 let state=initial,draws=0;
 const next=()=>{let n=state;n^=n<<13;n^=n>>>17;n^=n<<5;state=n>>>0;draws++;return state;};
 return {get rng(){return state;},get draws(){return draws;},
  value:()=>Math.fround(next()/4294967296),
  integer:(min:number,max:number)=>{if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||min< -2147483648||max>2147483647||max-min>2147483647)throw Error('Invalid arrival integer range');return max<=min?min:min+Math.abs((next()|0)%(max-min));}};
}
const inclusive=(r:CampArrivalRandom256,min:number,max:number)=>max<=min?min:r.integer(min,max+1);
const cellInRect=(c:RandomClosewalkCapture256,b:Readonly<{minX:number;maxX:number;minZ:number;maxZ:number}>,r:CampArrivalRandom256)=>{const x=inclusive(r,b.minX,b.maxX),z=inclusive(r,b.minZ,b.maxZ);return z*c.width+x;};
const anyCell=(c:RandomClosewalkCapture256,r:CampArrivalRandom256)=>{const x=r.integer(0,c.width),z=r.integer(0,c.height);return z*c.width+x;};
/** Fresh closed doors only, as enforced by the existing capture. A normal
 * district can reach the edge without portals/fences iff it touches it. */
export function drawCampCenterCell256(c:RandomClosewalkCapture256,r:CampArrivalRandom256,accept:(cell:number)=>boolean=()=>true):number {
 const cx=Math.floor(c.width/2),cz=Math.floor(c.height/2);let radius=Math.max(3,Math.min(25,Math.trunc(Math.max(c.width,c.height)/20))),tries=0;
 for(;;){
  tries++;if(tries>30){if(radius>c.width*2&&radius>c.height*2)break;radius=Math.trunc(Math.fround(Math.fround(radius)*Math.fround(1.5)));tries=0;}
  const cell=cellInRect(c,{minX:Math.max(0,cx-radius),maxX:Math.min(c.width-1,cx+radius),minZ:Math.max(0,cz-radius),maxZ:Math.min(c.height-1,cz+radius)},r),d=c.physical.district(cell);
  if(c.physical.standable(cell)&&d?.type==='normal'&&d.touchesMapEdge&&accept(cell))return cell;
 }
 return anyCell(c,r);
}
function regionCell(c:RandomClosewalkCapture256,region:ActualGenerationRegion256,r:CampArrivalRandom256):number {
 for(let attempt=0;attempt<1000;attempt++){const cell=cellInRect(c,region.bounds,r);if(c.regionAt(cell)===region)return cell;}return region.cells[0]!;
}
function weightedRegion(regions:readonly ActualGenerationRegion256[],r:CampArrivalRandom256):ActualGenerationRegion256 {
 let total=0;for(const region of regions)total=Math.fround(total+region.cellCount);if(total<=0)throw Error('Invalid actual arrival region weight');
 if(regions.length===1)return regions[0]!;
 const roll=Math.fround(r.value()*total);let sum=0;for(const region of regions){sum=Math.fround(sum+region.cellCount);if(sum>=roll)return region;}throw Error('Unresolved arrival region roll');
}
/** NoPassClosedDoors: Fence is admitted for Spawn's first three searches,
 * blocked for the fallback Closewalk. Starting region is not entry-filtered. */
function nearby(c:RandomClosewalkCapture256,rootCell:number,radius:number,fenceBlocked:boolean,validator:(cell:number)=>boolean,r:CampArrivalRandom256):number|null {
 const root=c.physical.standable(rootCell)?rootCell:c.adjustNonStandableRoot(rootCell),first=c.regionAt(root);
 if(!first||!['normal','portal','fence'].includes(first.type))return null;
 const x=root%c.width,z=Math.floor(root/c.width),square=Math.fround(Math.fround(radius)*Math.fround(radius)),seen=new Set<number>([first.id]),queue=[first],working:ActualGenerationRegion256[]=[];
 for(let head=0;head<queue.length&&head<999999;head++){
  const region=queue[head]!;working.push(region);
  for(const id of region.links){if(seen.has(id))continue;const next=c.regions[id];if(!next)throw Error('Missing actual arrival region link');
   if(next.type!=='normal'&&(next.type!=='fence'||fenceBlocked))continue;
   const b=next.bounds,dx=x<b.minX?b.minX-x:x>b.maxX?x-b.maxX:0,dz=z<b.minZ?b.minZ-z:z>b.maxZ?z-b.maxZ:0;
   if(radius<=1000&&Math.fround(dx*dx+dz*dz)>square)continue;seen.add(id);queue.push(next);
  }
 }
 const permitted=(cell:number)=>{const dx=cell%c.width-x,dz=Math.floor(cell/c.width)-z;return Math.fround(dx*dx+dz*dz)<=square&&validator(cell);};
 while(working.length){const region=weightedRegion(working,r);
  for(let attempt=0;attempt<10;attempt++){const cell=regionCell(c,region,r);if(permitted(cell))return cell;}
  const cells=[...region.cells];for(let count=cells.length;count>1;){count--;const at=r.integer(0,count+1),last=cells[count]!;cells[count]=cells[at]!;cells[at]=last;}
  for(const cell of cells)if(permitted(cell))return cell;
  regionCell(c,region,r); // unsuccessful TryFindRandomCellInRegion still draws
  working.splice(working.indexOf(region),1);
 }
 return null;
}
/** Same selected root for every owner; earlier actual spawns change occupancy
 * and fog before the next owner's choice. Fallback Closewalk intentionally
 * has no occupancy/fog filter, just as the primary path. */
export function drawCampSpawnCell256(c:RandomClosewalkCapture256,root:number,occupied:ReadonlySet<number>,fogged:(cell:number)=>boolean,r:CampArrivalRandom256):number {
 if(!Number.isInteger(root)||root<0||root>=c.width*c.height)throw Error('Arrival root outside actual map');
 if(c.physical.standable(root)&&!occupied.has(root))return root;
 const rootFogged=fogged(root);let radius=4;
 for(let attempt=0;attempt<3;attempt++,radius*=2){const cell=nearby(c,root,radius,false,at=>c.physical.standable(at)&&(rootFogged||!fogged(at))&&!occupied.has(at),r);if(cell!==null)return cell;}
 radius=5;for(;;){const cell=nearby(c,root,radius,true,at=>c.physical.standable(at),r);if(cell!==null)return cell;if(radius>Math.trunc(c.width/2)&&radius>Math.trunc(c.height/2))break;radius*=2;}
 return root;
}
export interface PreparedCampCenterEntry256 {
 readonly placements:readonly CampArrivalPlacement256[];readonly humanPositions:readonly Readonly<Cell>[];
 readonly animalPositions:readonly {readonly animal:WildAnimal;readonly cell:Readonly<Cell>}[];
 readonly center:number;readonly rngBefore:number;readonly rngAfter:number;readonly draws:number;readonly revealedCells:readonly number[];
}
const prepared=new WeakMap<PreparedCampCenterEntry256,{map:World;tiles:World['tiles'];fogged:readonly boolean[]}>();
/** Does not transfer or mutate any actor, item, root, or campaign RNG. Fog is
 * computed from original affiliations onto a projection of this NEW map's
 * tiles only. There are no new-map mine intents to retire in this boundary. */
export function prepareCampCenterEntry256(input:CampaignState,map:World,group:AwayGroup,settlement=false):PreparedCampCenterEntry256 {
 const root=registeredCampaign(input);
 if(!isSchema256Or257(root.schemaVersion)||root.planet?.revision!==3||!isSchema256Or257(map.schemaVersion)||map.site?.revision!==3||map.site.tileId!==group.tile||map.planet!==root.planet||map.worldFactions!==root.worldFactions||map.width!==(settlement?250:200)||map.height!==(settlement?250:200)||!explorationEnabled256(map)||map.jobs.length||map.pawns.length||map.startingArrival||!root.worldGroups?.groups.some(row=>row.localMapId===null&&row.state===group))throw Error('Actual unpublished new Camp and away group required');
 const animals=group.animalOwners?.members??[];
 if(duckPhysicalOwnerCount256(map)+animals.length>MAX_WILDLIFE)throw Error('Actual arriving animal capacity exceeded');
 const originals:CampArrivalActor256[]=[...group.members,...animals],byId=new Map(originals.map(a=>[a.id,a]));
 if(!originals.length||byId.size!==originals.length||new Set(originals).size!==originals.length)throw Error('Arrival roster has duplicate originals');
 const order=group.animalOwners?.order??group.members.map(p=>p.id);
 if(order.length!==originals.length||new Set(order).size!==order.length||order.some(id=>!byId.has(id)))throw Error('Actual mixed arrival order is incomplete');
 const geometry=captureRandomClosewalk256(map); // keeps its real open/hold-open refusal
 const fog={schemaVersion:map.schemaVersion,site:map.site,exploration:map.exploration,width:map.width,height:map.height,tiles:map.tiles.map(t=>({...t}))};
 const physical=captureActualFogPhysical256(map),random=stagedCampArrivalRandom256(root.rng),center=drawCampCenterCell256(geometry,random,cell=>!settlement||(geometry.physical.district(cell)?.cellCount??0)>=600);
 if(settlement){const district=geometry.physical.district(center);if(!district||district.type!=='normal'||district.cellCount<600)throw Error('La zone d’arrivée de colonie ne possède pas600cellules accessibles.');}
 const occupied=new Set([...map.pawns,...map.wildlife?.animals??[],...map.mechanoids??[]].filter(a=>a.state!=='dead').map(a=>a.z*map.width+a.x));
 const placements:CampArrivalPlacement256[]=[],revealed=new Set<number>();
 for(const id of order){const actor=byId.get(id)!,at=drawCampSpawnCell256(geometry,center,occupied,c=>foggedCell256(fog,c),random),rotation=random.integer(0,4) as Orientation;
  // A non-standable final root requires a separate real SpawnSetup recovery;
  // never replace that exceptional branch with a favorable cell or wipe rock.
  if(!geometry.physical.standable(at))throw Error('Actual arrival selected an unsupported non-standable SpawnSetup fallback');
  const cell=Object.freeze({x:at%map.width,z:Math.floor(at/map.width)});placements.push(Object.freeze({actor,cell,rotation}));occupied.add(at);
  const affiliation=actualExplorationAffiliation256(actor);
  const change=notifyExplorationSpawn256(fog,at,{playerOwned:affiliation.playerOwned,playerControlled:affiliation.playerOwned,respawningAfterLoad:false},physical);
  for(const cell of change.changedCells)revealed.add(cell);
 }
 const actorPlans=new Map(placements.map(row=>[row.actor,row]));
 const plan:PreparedCampCenterEntry256=Object.freeze({placements:Object.freeze(placements),humanPositions:Object.freeze(group.members.map(a=>actorPlans.get(a)!.cell)),animalPositions:Object.freeze(animals.map(animal=>Object.freeze({animal,cell:actorPlans.get(animal)!.cell}))),center,rngBefore:root.rng,rngAfter:random.rng,draws:random.draws,revealedCells:Object.freeze([...revealed])});
 prepared.set(plan,{map,tiles:map.tiles,fogged:map.tiles.map(t=>t.fogged===true)});return plan;
}
/** The map remains private at this point; all other entry preflights must have
 * succeeded first. No root/actor is written, no RNG or callback can now fail. */
export function applyPreparedCampCenterFog256(map:World,plan:PreparedCampCenterEntry256):void {
 const original=prepared.get(plan);
 if(!original||original.map!==map||original.tiles!==map.tiles||map.tiles.length!==original.fogged.length||original.fogged.some((v,i)=>v!==(map.tiles[i]?.fogged===true)))throw Error('Camp arrival fog plan changed before adoption');
 for(const cell of plan.revealedCells){delete map.tiles[cell]!.fogged;markTerrainCellChanged(map.tiles,cell);}
}
