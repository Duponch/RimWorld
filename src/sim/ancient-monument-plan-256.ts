/** Private, bounded nine-kind monument draft; never a persisted owner. */
import {ancientMonumentCells256,ancientNeutralMaxHp256,isAncientMonumentKind256} from './ancient-monument-props-256.ts';
import {monumentRandomOrder256,type MonumentRandom256,type MonumentDamageRect256} from './ancient-monument-damage-256.ts';
import type {ConstructionMaterial} from './building-materials.ts';
import type {FloorKind} from './flooring.ts';
import type {Cell} from './types.ts';
export type MonumentKind256='wall'|'door'|'table'|'table-square'|'column'|'urn'|'stele-large'|'stele-grand'|'sarcophagus';
export type MonumentStuff256=Extract<ConstructionMaterial,'steel'|`${string}-blocks`>;
export interface MonumentThing256 {type:'thing';kind:MonumentKind256;x:number;z:number;orientation:0|1|2|3;material:MonumentStuff256;maxHitPoints:number;hitPoints:number}
export interface MonumentFloor256 {type:'floor';kind:FloorKind;x:number;z:number}
export type MonumentBuildable256=MonumentThing256|MonumentFloor256;
export type MonumentRect256=MonumentDamageRect256;
export const cellKey256=(x:number,z:number)=>`${x},${z}`;
export const cardinal256=[[0,1],[1,0],[0,-1],[-1,0]] as const;
export const rectCells256=(r:MonumentRect256):Cell[]=>Array.from({length:Math.max(0,r.maxX-r.minX+1)*Math.max(0,r.maxZ-r.minZ+1)},(_,i)=>({x:r.minX+i%(r.maxX-r.minX+1),z:r.minZ+Math.floor(i/(r.maxX-r.minX+1))}));
export const rectCenter256=(r:MonumentRect256):Cell=>({x:Math.floor((r.minX+r.maxX+1)/2),z:Math.floor((r.minZ+r.maxZ+1)/2)});
export const overlap256=(a:MonumentRect256,b:MonumentRect256)=>a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ;
export function monumentCells256(t:Pick<MonumentThing256,'kind'|'x'|'z'|'orientation'>):Cell[] {
 if(isAncientMonumentKind256(t.kind))return ancientMonumentCells256(t.kind,t,t.orientation);
 if(t.kind==='wall'||t.kind==='door')return [{x:t.x,z:t.z}];
 const w=t.kind==='table-square'?2:t.orientation%2?2:1,h=t.kind==='table-square'?2:t.orientation%2?1:2;
 const x=t.x-(w===2&&(t.orientation===2||t.orientation===3)?1:0),z=t.z-(h===2&&(t.orientation===1||t.orientation===2)?1:0);
 return Array.from({length:w*h},(_,i)=>({x:x+i%w,z:z+Math.floor(i/w)}));
}
export function monumentRect256(b:MonumentBuildable256):MonumentRect256 {const c=b.type==='floor'?[b]:monumentCells256(b);return {minX:Math.min(...c.map(p=>p.x)),minZ:Math.min(...c.map(p=>p.z)),maxX:Math.max(...c.map(p=>p.x)),maxZ:Math.max(...c.map(p=>p.z))};}
export function occupiedMonumentRect256(rows:readonly MonumentBuildable256[]):MonumentRect256 {if(!rows.length)throw Error('Empty monument has no occupied center');const a=rows.map(monumentRect256);return {minX:Math.min(...a.map(r=>r.minX)),minZ:Math.min(...a.map(r=>r.minZ)),maxX:Math.max(...a.map(r=>r.maxX)),maxZ:Math.max(...a.map(r=>r.maxZ))};}
export const thingAt256=(rows:readonly MonumentBuildable256[],x:number,z:number)=>rows.filter((b):b is MonumentThing256=>b.type==='thing'&&monumentCells256(b).some(p=>p.x===x&&p.z===z));
export const floorAt256=(rows:readonly MonumentBuildable256[],x:number,z:number)=>rows.find((b):b is MonumentFloor256=>b.type==='floor'&&b.x===x&&b.z===z);
export const passable256=(rows:readonly MonumentBuildable256[],x:number,z:number)=>!thingAt256(rows,x,z).some(t=>t.kind==='wall');
export function addMonumentThing256(rows:MonumentBuildable256[],kind:MonumentKind256,x:number,z:number,material:MonumentStuff256,orientation:0|1|2|3=0,wipe=true):void {
 const maxHitPoints=ancientNeutralMaxHp256(kind,material);
 const t:MonumentThing256={type:'thing',kind,x,z,material,orientation,maxHitPoints,hitPoints:maxHitPoints},r=monumentRect256(t),collides=rows.filter(b=>b.type==='thing'&&overlap256(monumentRect256(b),r));
 if(collides.length&&!wipe)return;for(const b of collides)rows.splice(rows.indexOf(b),1);rows.push(t);
}
export function addMonumentFloor256(rows:MonumentBuildable256[],x:number,z:number,kind:FloorKind):void {const old=floorAt256(rows,x,z);if(old)rows.splice(rows.indexOf(old),1);rows.push({type:'floor',kind,x,z});}
/** Actual candidate order is a required generation fact, not object key order.
 * No expensive Stuff or unavailable floor may be silently substituted. */
export interface MonumentCatalogue256 {stuff:readonly {material:MonumentStuff256;commonality:number;price:number}[];floors:readonly FloorKind[]}
/** Resolved XML entries in source order. Cross-file Core Def.index ordering is
 * a separately declared comparison limit, never a claimed bit-for-bit oracle. */
export const CORE_MONUMENT_CATALOGUE_256:MonumentCatalogue256=Object.freeze({
 stuff:Object.freeze((['steel','sandstone-blocks','granite-blocks','limestone-blocks','slate-blocks','marble-blocks'] as const).map(material=>Object.freeze({material,commonality:material==='steel'?1:Math.fround(.2),price:Math.fround(material==='steel'?1.9:.9)}))),
 floors:Object.freeze(['sandstone-tile','granite-tile','limestone-tile','slate-tile','marble-tile','sandstone-flagstone','granite-flagstone','limestone-flagstone','slate-flagstone','marble-flagstone'] as const),
});
export function validateMonumentCatalogue256(c:MonumentCatalogue256):void {
 const expected=['steel','sandstone-blocks','granite-blocks','limestone-blocks','slate-blocks','marble-blocks'];
 if(c.stuff.length!==6||new Set(c.stuff.map(s=>s.material)).size!==6||c.stuff.some(s=>!expected.includes(s.material)||s.commonality!==(s.material==='steel'?1:Math.fround(.2))||s.price!==Math.fround(s.material==='steel'?1.9:.9)))throw Error('Unclosed inexpensive Monument Stuff facts/order');
 const floors=['sandstone-tile','granite-tile','limestone-tile','slate-tile','marble-tile','sandstone-flagstone','granite-flagstone','limestone-flagstone','slate-flagstone','marble-flagstone'];
 if(c.floors.length!==10||new Set(c.floors).size!==10||c.floors.some(s=>!floors.includes(s)))throw Error('Unclosed inexpensive Monument stone floor facts/order');
}
export function monumentStuff256(kind:MonumentKind256,c:MonumentCatalogue256,r:MonumentRandom256):MonumentStuff256 {
 const candidates=c.stuff.filter(s=>!kind.startsWith('stele-')||s.material!=='steel');let selected=candidates[0]!,total=selected.commonality;
 // GenStuff's filtered IEnumerable uses weighted reservoir sampling.
 for(const s of candidates.slice(1)){const sum=Math.fround(total+s.commonality);if(r.float(0,sum)>=total)selected=s;total=sum;}
 return selected.material;
}
export function largestMonumentRect256(start:Cell,outer:MonumentRect256,seen:Set<string>,allowed:(c:Cell)=>boolean):MonumentRect256|null {
 if(seen.has(cellKey256(start.x,start.z))||!allowed(start))return null;
 let rect:MonumentRect256={minX:start.x,maxX:start.x,minZ:start.z,maxZ:start.z},grew=true;
 while(grew){grew=false;for(const dir of [1,3,0,2]){const [dx,dz]=cardinal256[dir]!,edge=rectCells256(rect).filter(c=>dir===1?c.x===rect.maxX:dir===3?c.x===rect.minX:dir===0?c.z===rect.maxZ:c.z===rect.minZ).map(c=>({x:c.x+dx,z:c.z+dz}));if(edge.every(c=>c.x>=outer.minX&&c.z>=outer.minZ&&c.x<=outer.maxX&&c.z<=outer.maxZ&&!seen.has(cellKey256(c.x,c.z))&&allowed(c))){if(dir===1)rect.maxX++;else if(dir===3)rect.minX--;else if(dir===0)rect.maxZ++;else rect.minZ--;grew=true;}}}
 for(const c of rectCells256(rect))seen.add(cellKey256(c.x,c.z));return rect;
}
export function* monumentRooms256(rows:MonumentBuildable256[],outer:MonumentRect256,random:MonumentRandom256,allowed:(c:Cell)=>boolean):Generator<MonumentRect256>{const seen=new Set<string>();for(const c of monumentRandomOrder256(rectCells256(outer),random)){const rect=largestMonumentRect256(c,outer,seen,allowed);if(rect)yield rect;}}
/** Mirror only the kept half; centered objects survive without duplication. */
export function mirrorMonument256(rows:MonumentBuildable256[],origin:number,vertical:boolean,included:boolean,requireFloor=false):void {
 const min=(b:MonumentBuildable256)=>vertical?monumentRect256(b).minZ:monumentRect256(b).minX,max=(b:MonumentBuildable256)=>vertical?monumentRect256(b).maxZ:monumentRect256(b).maxX;
 const middle=(b:MonumentBuildable256)=>max(b)-origin+(included?0:1)===origin-min(b);
 for(const b of [...rows])if(max(b)>=origin&&!middle(b))rows.splice(rows.indexOf(b),1);
 for(const b of [...rows]){if(middle(b))continue;const old=monumentRect256(b),copy={...b};if(copy.type==='thing'&&['door','table','table-square','sarcophagus'].includes(copy.kind)&&(vertical?copy.orientation%2===0:copy.orientation%2===1))copy.orientation=((copy.orientation+2)%4) as 0|1|2|3;const next=monumentRect256(copy);copy.x+=old.minX-next.minX;copy.z+=old.minZ-next.minZ;const mirrored=origin-max(b)+origin-(included?0:1);if(vertical)copy.z+=mirrored-old.minZ;else copy.x+=mirrored-old.minX;
  if(requireFloor&&copy.type==='thing'&&copy.kind!=='wall'&&copy.kind!=='door'&&monumentCells256(copy).some(c=>!floorAt256(rows,c.x,c.z)))continue;
  if(copy.type==='thing')addMonumentThing256(rows,copy.kind,copy.x,copy.z,copy.material,copy.orientation);else addMonumentFloor256(rows,copy.x,copy.z,copy.kind);
 }
}
