import {newShelfStorage} from './shelf-storage.ts';
import {footprintCells} from './definitions.ts';
import {newDoorState} from './door-rules.ts';
import {isRoofed} from './roof-rules.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256} from './natural-terrain-runtime-256.ts';
import {buildingSupportNeed256} from './bridge-rules.ts';
import {removedMineableTile256} from './local-mineable-owner-256.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {findLocalNotEdgeCell256} from './local-cell-selection-256.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Structure,StructureKind,Cell,Tile} from './types.ts';

export const FOREIGN_BASE_SEED_PART_263=1806208471;
export interface ForeignBaseLayout263 {rect:AncientRect256;storage:AncientRect256;defendSpot:Cell;spawnCells:number[];structureIds:number[]}
/** Original low-poly interpretation of Base_Faction, not copied BaseGen
 * symbols/layouts. The real34–38 extent, margin12, edge reachability and
 * at least one building+barracks are retained. Current physical buildings,
 * floors, roofs and faction ownership remain normal playable objects. Call
 * ONLY at Settlement400 on the unpublished common terrain map, before900. */
export function generateForeignBase400263(w:World,settlementId:number,factionId:number,requiredBeds:number,usedRects:AncientRect256[],random:WorldGenerationRandom):ForeignBaseLayout263 {
 const actual=w.worldFactions?.settlements.find(s=>s.id===settlementId&&s.factionId===factionId);
 if(Number(w.schemaVersion)!==263||!actual||actual.factionId===w.worldFactions!.playerFactionId||w.site?.revision!==3||w.pawns.length||w.jobs.length||w.packed.length||w.worldMaps?.sites.some(s=>s.map?.tiles===w.tiles))throw Error('Foreign base requires its actual unpublished263 Settlement400 frontier');
 if(!Number.isInteger(requiredBeds)||requiredBeds<0||requiredBeds>63)throw Error('Actual current base roster exceeds the adapted layout capacity');
 const reach=captureGeographicGenerationReachability256(w),occupied=new Set(w.structures.flatMap(s=>footprintCells(s).map(p=>p.z*w.width+p.x)));
 const center=findLocalNotEdgeCell256(w.width,w.height,12,c=>{
  if(!reach.physical.standable(c)||isRoofed(w,c)||!reach.canReachMapEdgeNoPassClosedDoorsOrWater(c))return false;
  const x=c%w.width-17,z=Math.floor(c/w.width)-17;return x>=12&&z>=12&&x+33<w.width-12&&z+33<w.height-12;
 },random);
 if(center===null)throw Error('No real edge-reachable foreign-base location');
 const sx=random.integer(34,39),sz=random.integer(34,39),minX=center%w.width-Math.floor(sx/2),minZ=Math.floor(center/w.width)-Math.floor(sz/2),rect={minX,minZ,maxX:minX+sx-1,maxZ:minZ+sz-1},fromNextId=w.nextId,structures:Structure[]=[],tiles=new Map<number,Tile>(),roofs=new Set<number>();let nextId=fromNextId;
 const tileAt=(c:number)=>tiles.get(c)??w.tiles[c]!;
 const clear=(c:number)=>{const t=tileAt(c);if(t.mineable){const next=removedMineableTile256(t,t.mineable.id);if(!next)throw Error('Foreign base cannot retire its actual Mineable');tiles.set(c,next);}else if(t.terrain==='rock'||t.collapsedRock)throw Error('Unresolved foreign-base rock owner');return tileAt(c);};
 const add=(kind:StructureKind,x:number,z:number,material:Structure['material']='wood')=>{
  const original:Structure={id:nextId++,kind,x,z,orientation:0,footprint:'standard',material,factionId,...kind==='door'?{door:newDoorState(w.tick)}:{},...['bed','table','stool'].includes(kind)?{quality:'normal' as const}:{}};
  if(kind==='shelf')original.shelf=newShelfStorage(footprintCells(original).map(()=>nextId++));
  const support=buildingSupportNeed256(original);if(!support)throw Error('Unresolved foreign-base building support');
  for(const p of footprintCells(original)){const c=p.z*w.width+p.x;if(p.x<rect.minX||p.z<rect.minZ||p.x>rect.maxX||p.z>rect.maxZ||occupied.has(c)||w.resources.some(r=>r.x===p.x&&r.z===p.z)||w.piles.some(i=>i.owner.type==='ground'&&i.owner.x===p.x&&i.owner.z===p.z)||!terrainSupportsAffordance256(clear(c),support,w))throw Error('Actual foreign-base building cannot be placed');occupied.add(c);}
  structures.push(original);return original;
 };
 const room=(x:number,z:number,width:number,height:number):AncientRect256=>{
  const r={minX:x,minZ:z,maxX:x+width-1,maxZ:z+height-1},doorX=x+Math.floor(width/2);
  for(let dz=0;dz<height;dz++)for(let dx=0;dx<width;dx++){
   const cx=x+dx,cz=z+dz,c=cz*w.width+cx;
   if(dx===0||dz===0||dx===width-1||dz===height-1)add(dz===height-1&&cx===doorX?'door':'wall',cx,cz);
   else{const t=clear(c);if(occupied.has(c)||!terrainSupportsFloor256(t,w))throw Error('Actual foreign-base room has no supported interior');tiles.set(c,{...t,floor:'wood-planks'});roofs.add(c);}
  }
  return r;
 };
 const x=rect.minX+2,z=rect.minZ+2,bedrooms=Array.from({length:9},(_,i)=>({col:i%3,row:Math.floor(i/3)})).filter(p=>!(p.col===2&&p.row===0)&&!(p.col===2&&p.row===2));
 let beds=Math.max(1,requiredBeds);for(const p of bedrooms){if(!beds)break;const r=room(x+p.col*10,z+p.row*10,9,9);for(let row=0;row<3&&beds;row++)for(let col=0;col<3&&beds;col++){add('bed',r.minX+1+col*2,r.minZ+1+row*2);beds--;}}
 const storage=room(x+20,z,9,9);add('shelf',storage.minX+2,storage.minZ+2);add('shelf',storage.minX+2,storage.minZ+5);
 const mess=room(x+20,z+20,9,9);add('table',mess.minX+3,mess.minZ+3);add('stool',mess.minX+2,mess.minZ+3);add('stool',mess.minX+5,mess.minZ+3);
 // The courtyard remains ordinary real terrain and is the bounded guard
 // mandate. No home area, colonist bed assignment or starting scenario.
 const defendSpot={x:rect.minX+Math.floor(sx/2),z:rect.minZ+Math.floor(sz/2)},spawnCells:number[]=[];
 for(let dz=1;dz<sz-1;dz++)for(let dx=1;dx<sx-1;dx++){const c=(rect.minZ+dz)*w.width+rect.minX+dx;if(!occupied.has(c)&&!roofs.has(c)&&reach.physical.standable(c)&&!isRoofed(w,c))spawnCells.push(c);}
 if(!spawnCells.length||!Number.isSafeInteger(nextId))throw Error('Foreign-base original identity or actor placement frontier is unavailable');
 // The map is private, but publication still follows a complete plan: no
 // layout mutation occurs until every touched owner/support has succeeded.
 for(const [cell,t] of tiles)w.tiles[cell]=t;w.structures.push(...structures);w.nextId=nextId;
 w.roofing??={constructed:[],build:[],remove:[],cursor:0};
 const natural=new Set([...(w.roofing.natural?.thin??[]),...(w.roofing.natural?.thick??[])]);
 w.roofing.constructed=[...new Set([...w.roofing.constructed,...[...roofs].filter(c=>!natural.has(c))])].sort((a,b)=>a-b);
 usedRects.push(rect);
 return {rect,storage,defendSpot,spawnCells,structureIds:structures.map(s=>s.id)};
}
