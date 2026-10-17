import {unpublishedAncientGeneration256,ancientGenerationCellConflict256} from './ancient-generation-frontier-256.ts';
import {isAncientMonumentKind256} from './ancient-monument-props-256.ts';
import {validAncientMonumentBuilding256} from './ancient-monument-save-256.ts';
/** One synchronous fresh-map commit for already resolved, ACTUAL supported
 * originals. This never stands in for Monument/AncientTemple generation. */
import type {World,Structure,Tile} from './types.ts';
import type {FloorKind} from './flooring.ts';
import {floorAvailable} from './flooring.ts';
import {footprintCells} from './definitions.ts';
import {validConstructionMaterial} from './construction-materials.ts';
import {isFurnitureQuality} from './furniture-stats.ts';
import {structureMaxHp} from './thing-damage-rules.ts';
import {buildingSupportNeed256} from './bridge-rules.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256} from './natural-terrain-runtime-256.ts';
import {removedMineableTile256} from './local-mineable-owner-256.ts';
export interface ActualAncientLayout256 {fromNextId:number;nextId:number;structures:Structure[];floors:{cell:number;floor:FloorKind}[];roofs:number[];vanishMineables:{cell:number;expectedId:number}[]}
export type AncientLayoutCommit256={ok:true;structureIds:number[];removedMineableIds:number[]}|{ok:false;reason:string};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
function data(v:unknown,remaining:{n:number},depth=0):boolean {if(--remaining.n<0||depth>16)return false;if(v===null)return true;if(typeof v!=='object')return typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);if(Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype))return false;const keys=Reflect.ownKeys(v);if(Array.isArray(v)&&(v.length>remaining.n||keys.length!==v.length+1||Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)).some(x=>!x)))return false;return keys.every(k=>typeof k==='string'&&(()=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return Object.hasOwn(d,'value')&&(Array.isArray(v)&&k==='length'||d.enumerable&&data(d.value,remaining,depth+1));})());}
/** No material stock is debited/refunded by ancient map generation. Identity
 * holes already consumed by true creation/destruction remain in nextId. */
export function commitActualAncientLayout256(w:World,layout:ActualAncientLayout256,mapInitializing:true):AncientLayoutCommit256 {
 const no=(reason:string):AncientLayoutCommit256=>({ok:false,reason});
 if(!unpublishedAncientGeneration256(w,mapInitializing))return no('Actual unpublished Site3 generation frontier required');
 if(!record(layout)||!data(layout,{n:200000})||Object.keys(layout).some(k=>!['fromNextId','nextId','structures','floors','roofs','vanishMineables'].includes(k))||!int(layout.fromNextId,1)||layout.fromNextId!==w.nextId||!int(layout.nextId,w.nextId)||![layout.structures,layout.floors,layout.roofs,layout.vanishMineables].every(Array.isArray))return no('Invalid actual ancient plan or identity frontier');
 if(layout.structures.some(b=>!record(b))||layout.floors.some(r=>!record(r))||layout.vanishMineables.some(r=>!record(r)))return no('Invalid actual ancient output row');
 const n=w.width*w.height,valid=(c:unknown):c is number=>int(c,0,n-1),tiles=new Map<number,Tile>(),ids=new Set<number>(),removed:number[]=[],occupied=new Set<number>(),floorCells=new Set<number>();
 const tile=(c:number)=>tiles.get(c)??w.tiles[c]!;
 // Only changed cells are considered. Shrine actors/loot elsewhere remain
 // their same originals; an unsupported touched owner refuses BEFORE commit.
 const changed=new Set([...layout.floors.map(r=>r.cell),...layout.roofs,...layout.vanishMineables.map(r=>r.cell),...layout.structures.flatMap(s=>footprintCells(s).map(c=>c.z*w.width+c.x))]);
 for(const cell of changed){if(!valid(cell))return no('Actual ancient output leaves its map');const reason=ancientGenerationCellConflict256(w,cell);if(reason)return no('Unresolved actual ancient touched cell: '+reason);}
 for(const row of layout.vanishMineables){if(!record(row)||Object.keys(row).length!==2||!valid(row.cell)||!int(row.expectedId,1,w.nextId-1)||tiles.has(row.cell))return no('Invalid or duplicate actual Mineable removal');const t=w.tiles[row.cell]!,next=removedMineableTile256(t,row.expectedId);if(!next)return no('Actual Mineable identity/substrate no longer matches');tiles.set(row.cell,next);removed.push(row.expectedId);}
 for(const row of layout.floors){if(Object.keys(row).length!==2||!valid(row.cell)||floorCells.has(row.cell)||!floorAvailable(row.floor,256))return no('Unresolved actual ancient floor');floorCells.add(row.cell);const t=tile(row.cell);if(t.terrain==='rock'||t.collapsedRock||!terrainSupportsFloor256(t,w))return no('Actual ancient floor has no Heavy substrate');tiles.set(row.cell,{...t,floor:row.floor});}
 const existing=new Set<number>();for(const b of w.structures)for(const c of footprintCells(b))existing.add(c.z*w.width+c.x);
 for(const b of layout.structures){
  if(!record(b)||!['wall','door','table','table-square'].includes(b.kind)&&!isAncientMonumentKind256(b.kind))return no('Actual ancient ThingDef is not implemented');
  if(Object.keys(b).some(k=>!['id','kind','x','z','orientation','footprint','material','quality','damage','door','factionId','grave'].includes(k))||!int(b.id,w.nextId,layout.nextId-1)||ids.has(b.id)||!int(b.orientation,0,3)||b.footprint!=='standard'||b.factionId!==null||!validConstructionMaterial(b.kind,b.material,256))return no('Invalid original ancient structure/stuff/faction');ids.add(b.id);
  if(!validAncientMonumentBuilding256(b,256)||b.kind!=='sarcophagus'&&b.grave!==undefined)return no('Invalid actual ancient original');
  const table=b.kind==='table'||b.kind==='table-square'||b.kind==='sarcophagus';if(table?!isFurnitureQuality(b.quality):b.quality!==undefined)return no('Actual ancient furniture quality is missing or misplaced');if(b.damage!==undefined&&!int(b.damage,1,structureMaxHp(b)-1))return no('Actual ancient damage is outside its true HP');
  if(b.kind==='door'){const d=b.door;if(b.orientation!==0||!d||Object.keys(d).length!==7||d.open!==false||d.holdOpen!==false||d.forbidden!==false||d.from!==0||d.closeAt!==null||!int(d.changedAt,0,w.tick)||!int(d.lastTouch,-12,w.tick))return no('Unresolved actual freshly spawned door state');}else if(b.door!==undefined)return no('Door state on non-door original');
  const support=buildingSupportNeed256(b);if(!support)return no('Unresolved actual Stuff affordance');
  for(const c of footprintCells(b)){const cell=c.z*w.width+c.x;if(!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1)||occupied.has(cell)||existing.has(cell))return no('Actual ancient footprint collides or leaves its map');const t=tile(cell);if(t.terrain==='rock'||t.collapsedRock||!terrainSupportsAffordance256(t,support,w))return no('Actual ancient structure has no real support');if(w.resources.some(p=>p.x===c.x&&p.z===c.z)||w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z)||w.packed.some(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z))return no('Unresolved actual Thing wipe; no owner may disappear');occupied.add(cell);}
 }
 if(new Set(layout.roofs).size!==layout.roofs.length||layout.roofs.some(c=>!valid(c)))return no('Invalid actual ancient roof cells');
 if(w.roofing&&[...w.roofing.build,...w.roofing.remove].some(cell=>changed.has(cell)))return no('Generation encountered active roof orders');
 if(!layout.structures.length&&!layout.floors.length&&!layout.roofs.length&&!layout.vanishMineables.length&&layout.nextId===w.nextId)return no('No actual ancient layout output; report the real ScatterAt no-op instead');
 // Everything above is preflight, including every identity. No callback can
 // fail after the first owner is removed. Commit uses the same originals.
 for(const [cell,t] of tiles)w.tiles[cell]=t;
 w.structures.push(...layout.structures);w.nextId=layout.nextId;
 if(layout.roofs.length){w.roofing??={constructed:[],build:[],remove:[],cursor:0};const natural=new Set([...(w.roofing.natural?.thin??[]),...(w.roofing.natural?.thick??[])]);w.roofing.constructed=[...new Set([...w.roofing.constructed,...layout.roofs.filter(c=>!natural.has(c))])].sort((a,b)=>a-b);}
 return {ok:true,structureIds:layout.structures.map(b=>b.id),removedMineableIds:removed};
}
