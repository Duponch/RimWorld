import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {captureRandomClosewalk256,tryRandomClosewalkCellNear256} from './random-closewalk-256.ts';
import {isColonist} from './affiliation.ts';
import {footprintCells} from './definitions.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {isLocalRoadProp256} from './local-road-props-256.ts';
import {doorOpenness} from './door-rules.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {carrierOf} from './rescue-state.ts';
import type {World,Cell} from './types.ts';
export interface RenewalRandom262 {value():number;integer(min:number,maxExclusive:number):number;float(min:number,max:number):number}
/** One actual rare-decision capture; no retained World/index and no per-frame
 * flood. The existing district/region readers preserve real substrates,
 * frames, plants and chunk standability; live doors are explicitly supplied. */
export function captureGeographicRenewalSpace262(w:World){
 const width=w.width,height=w.height,doors=new Map<number,boolean>(),openPortals=new Set<number>();
 for(const s of w.structures)if(START_STRUCTURE_PHYSICS_256[s.kind].door){const cell=s.z*width+s.x,open=s.door?.open===true&&!s.door.forbidden&&doorOpenness(s,w.tick)>=1-1e-9;doors.set(cell,open);if(open)openPortals.add(cell);}
 const reach=captureGeographicGenerationReachability256(w,doors),physical=reach.physical,regions=reach.regions,closewalk=captureRandomClosewalk256(w,reach);
 // PassDoors colony reachability has its own graph. It does not open doors
 // or allow their cells to become spawn points. NoPassClosedDoors/fence-
 // blocked entry starts in the actual edge-touching normal district.
 const labels=new Int32Array(regions.length);labels.fill(-1);let label=0;
 const allowed=(id:number)=>['normal','portal','fence'].includes(regions[id]!.type);
 for(let start=0;start<regions.length;start++)if(labels[start]<0&&allowed(start)){
  const queue=[start];labels[start]=label;for(let head=0;head<queue.length;head++)for(const id of regions[queue[head]!]!.links)if(labels[id]<0&&allowed(id)){labels[id]=label;queue.push(id);}label++;
 }
 const component=(cell:number)=>{const r=reach.regionAt(cell);return r?labels[r.id]!:-1;},targets=new Set<number>();
 const add=(cell:number)=>{const id=component(cell);if(id>=0)targets.add(id);};
 // Read the actual MapParent owner: battlefields retain their incident
 // faction in 261, ordinary camps read the settlement on their real tile.
 // Core's null-parent reachability fallback is a read, never an ownership
 // assignment to the record or to a pawn present on this map.
 const root=registeredCampaign(w),id=registeredMapId(w),record=root.worldMaps?.sites.find(s=>s.id===id),player=root.worldFactions?.playerFactionId;
 const tile=record?.tile??(w.site?.revision===3?w.site.tileId:undefined);
 const parent=record?.kind==='battlefield'?record.battlefield261?.factionId??null:record?.kind==='settlement'?player??null:root.worldFactions?.settlements.find(s=>s.tile===tile)?.factionId??null;
 const faction=parent??player;
 for(const pawn of w.pawns){
  const owner=pawn.worldAffiliation259?pawn.worldAffiliation259.factionId:isColonist(pawn)?player:undefined;
  if(faction!==undefined&&owner===faction&&pawn.state!=='dead'&&!pawn.health?.death&&!carrierOf(w,pawn.id))add(pawn.z*width+pawn.x);
 }
 // Tamed originals are also real player-faction Pawns. Carried patients and
 // fly-in holders are not spawned anchors; neutral wildlife is never one.
 if(player!==undefined&&faction===player)for(const a of w.wildlife?.animals??[])if(a.domestic&&a.state!=='dead'&&!a.health?.death&&!animalCarrier(w,a.id))add(a.z*width+a.x);
 for(const s of w.structures){
  const explicit=Object.hasOwn(s,'factionId'),neutral=s.kind==='ship-chunk'||s.kind==='insect-hive'||s.kind==='glow-pod'||s.kind==='ancient-cryptosleep-casket'||isLocalRoadProp256(s.kind);
  if(faction===undefined||(explicit?s.factionId!==faction:neutral||faction!==player))continue;
  for(const c of footprintCells(s))for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=c.x+dx,z=c.z+dz;if(x>=0&&z>=0&&x<width&&z<height)add(z*width+x);}
 }
 // Core fallback: the edge district with most real regions, not map centre
 // or a fabricated colony anchor. Stable source order resolves equal sizes.
 const districts=new Map<number,{count:number;first:number}>();
 for(const r of regions){const at=r.cells[0]!,d=physical.district(at);if(d?.touchesMapEdge){const old=districts.get(d.id);if(old)old.count++;else districts.set(d.id,{count:1,first:at});}}
 let largest:{count:number;first:number}|undefined;for(const d of districts.values())if(!largest||d.count>largest.count)largest=d;if(largest)add(largest.first);
 const accepts=(cell:number)=>physical.standable(cell)&&!physical.roofed(cell)&&physical.district(cell)?.type==='normal'&&physical.district(cell)?.touchesMapEdge===true&&targets.has(component(cell));
 const edges:number[]=[];for(let x=0;x<width;x++)edges.push(x,(height-1)*width+x);for(let z=1;z<height-1;z++)edges.push(z*width,z*width+width-1);
 return {
  /** EdgeRoadChance_Animal=0 in the acquired Core: no road-chance draw. */
  entry(random:RenewalRandom262):Cell|undefined{
   for(let i=0;i<100;i++){let x:number,z:number;if(random.value()<.5){x=random.value()<.5?0:width-1;z=random.integer(0,height);}else{z=random.value()<.5?0:height-1;x=random.integer(0,width);}if(accepts(z*width+x))return {x,z};}
   const fallback=[...edges];for(let n=fallback.length;n>1;){n--;const at=random.integer(0,n+1),last=fallback[n]!;fallback[n]=fallback[at]!;fallback[at]=last;}
   for(const cell of fallback)if(accepts(cell))return {x:cell%width,z:Math.floor(cell/width)};return;
  },
  nearby(root:Cell,radius:number,occupied:ReadonlySet<number>,random:RenewalRandom262):Cell|undefined{
   const cell=tryRandomClosewalkCellNear256(closewalk,root.z*width+root.x,radius,random,cell=>!occupied.has(cell),r=>r.type==='normal'||r.type==='portal'&&openPortals.has(r.cells[0]!));
   return cell===null?undefined:{x:cell%width,z:Math.floor(cell/width)};
  },
 };
}
