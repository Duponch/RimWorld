import {addMonumentThing256,monumentStuff256,monumentRooms256,thingAt256,floorAt256,monumentCells256,monumentRect256,rectCenter256,cardinal256,mirrorMonument256,occupiedMonumentRect256,type MonumentBuildable256,type MonumentCatalogue256,type MonumentKind256,type MonumentRect256,type MonumentThing256} from './ancient-monument-plan-256.ts';
import type {MonumentRandom256} from './ancient-monument-damage-256.ts';
const chance=(r:MonumentRandom256,p:number)=>p>=1||p>0&&r.value()<Math.fround(p);
const free=(rows:MonumentBuildable256[],c:{x:number;z:number})=>!thingAt256(rows,c.x,c.z).length&&!!floorAt256(rows,c.x,c.z);
const size=(kind:MonumentKind256)=>kind==='stele-large'||kind==='table-square'?[2,2] as const:kind==='stele-grand'?[3,3] as const:kind==='sarcophagus'||kind==='table'?[1,2] as const:[1,1] as const;
const doorNear=(rows:MonumentBuildable256[],t:MonumentThing256)=>{const cells=monumentCells256(t),own=new Set(cells.map(c=>`${c.x},${c.z}`));return cells.some(c=>cardinal256.some(([x,z])=>!own.has(`${c.x+x},${c.z+z}`)&&thingAt256(rows,c.x+x,c.z+z).some(b=>b.kind==='door')));};
export function addMonumentColumns256(rows:MonumentBuildable256[],outer:MonumentRect256,c:MonumentCatalogue256,r:MonumentRandom256):void {
 const rooms=[...monumentRooms256(rows,outer,r,p=>!thingAt256(rows,p.x,p.z).some(b=>b.kind==='wall'))],material=monumentStuff256('column',c,r);
 for(const room of rooms){const width=room.maxX-room.minX+1,depth=room.maxZ-room.minZ+1;if(width<3||depth<3||!chance(r,.8))continue;
  const inner={minX:room.minX+1,maxX:room.maxX-1,minZ:room.minZ+1,maxZ:room.maxZ-1},child:MonumentBuildable256[]=[];
  if(r.boolean()){const z=r.integer(inner.minZ,rectCenter256(inner).z+1),step=inner.maxX-inner.minX+1>=4?r.integer(0,2)+2:2;for(let x=inner.minX;x<=inner.maxX;x+=step)if(floorAt256(rows,x,z))addMonumentThing256(child,'column',x,z,material);mirrorMonument256(child,room.minZ+Math.floor(depth/2),false,depth%2===1,true);}
  else {const x=r.integer(inner.minX,rectCenter256(inner).x+1),step=inner.maxZ-inner.minZ+1>=4?r.integer(0,2)+2:2;for(let z=inner.minZ;z<=inner.maxZ;z+=step)if(floorAt256(rows,x,z))addMonumentThing256(child,'column',x,z,material);mirrorMonument256(child,room.minX+Math.floor(width/2),false,width%2===1,true);}
  for(const b of child)if(b.type==='thing')addMonumentThing256(rows,b.kind,b.x,b.z,b.material,b.orientation,false);
 }
}
function corners(rows:MonumentBuildable256[],c:MonumentCatalogue256,r:MonumentRandom256):void {
 const walls=rows.filter((b):b is MonumentThing256=>b.type==='thing'&&b.kind==='wall'),set=new Set(walls.map(p=>`${p.x},${p.z}`)),material=monumentStuff256('urn',c,r),wall=(x:number,z:number)=>set.has(`${x},${z}`);
 for(const p of walls)if(chance(r,.09))for(const [dx,dz,tx,tz] of [[1,-1,1,0],[1,-1,0,-1],[1,1,0,1],[1,1,1,0]]){const x=p.x+tx!,z=p.z+tz!;if(wall(p.x+dx!,p.z+dz!)&&!wall(x,z)&&floorAt256(rows,x,z))addMonumentThing256(rows,'urn',x,z,material,0,false);}
}
function central(rows:MonumentBuildable256[],kind:MonumentKind256,c:MonumentCatalogue256,r:MonumentRandom256):void {
 const outer=occupiedMonumentRect256(rows),material=monumentStuff256(kind,c,r),[w,h]=size(kind);
 for(const room of monumentRooms256(rows,outer,r,p=>free(rows,p))){if(room.maxX-room.minX+1<w+2||room.maxZ-room.minZ+1<h+2)continue;const center=rectCenter256(room),x=center.x-Math.floor(w/2),z=center.z-Math.floor(h/2),t:MonumentThing256={type:'thing',kind,x,z,material,orientation:0,hitPoints:1,maxHitPoints:1};if(chance(r,.4)&&!doorNear(rows,t))addMonumentThing256(rows,kind,x,z,material,0,false);}
}
function edgeFurniture(rows:MonumentBuildable256[],kind:'table'|'sarcophagus',c:MonumentCatalogue256,r:MonumentRandom256):void {
 const outer=occupiedMonumentRect256(rows),material=monumentStuff256(kind,c,r);
 const vertical:MonumentThing256={type:'thing',kind,x:0,z:0,material,orientation:0,hitPoints:1,maxHitPoints:1},horizontal={...vertical,orientation:1 as const},v=monumentRect256(vertical),h=monumentRect256(horizontal),vw=v.maxX-v.minX+1,vh=v.maxZ-v.minZ+1,hw=h.maxX-h.minX+1,hh=h.maxZ-h.minZ+1;
 const against=(rect:MonumentRect256,dir:number)=>{const [dx,dz]=dir===2?[0,1]:cardinal256[dir]!;const edge=[];for(let x=rect.minX;x<=rect.maxX;x++)for(let z=rect.minZ;z<=rect.maxZ;z++)if(dir===0?z===rect.maxZ:dir===1?x===rect.maxX:dir===2?z===rect.minZ:x===rect.minX)edge.push({x:x+dx!,z:z+dz!});return edge.every(p=>thingAt256(rows,p.x,p.z).some(t=>t.kind==='wall'));};
 for(const room of monumentRooms256(rows,outer,r,p=>free(rows,p))){const w=room.maxX-room.minX+1,d=room.maxZ-room.minZ+1;if(w<vw||d<vh||w<hw||d<hh||!chance(r,.2))continue;const mid=rectCenter256(room),left={minX:room.minX,maxX:room.minX+vw-1,minZ:mid.z-Math.floor(vh/2),maxZ:mid.z-Math.floor(vh/2)+vh-1},right={...left,minX:room.maxX-vw+1,maxX:room.maxX},top={minX:mid.x-Math.floor(hw/2),maxX:mid.x-Math.floor(hw/2)+hw-1,minZ:room.maxZ-hh+1,maxZ:room.maxZ},bottom={...top,minZ:room.minZ,maxZ:room.minZ+hh-1};
  if(r.boolean()&&against(left,3)||against(right,1)){if(r.boolean()&&against(left,3))addMonumentThing256(rows,kind,left.minX-v.minX,left.minZ-v.minZ,material,0,false);else if(against(right,1))addMonumentThing256(rows,kind,right.minX-v.minX,right.minZ-v.minZ,material,2,false);}
  else if(r.boolean()&&against(top,0))addMonumentThing256(rows,kind,top.minX-h.minX,top.minZ-h.minZ,material,3,false);
  else if(against(bottom,2))addMonumentThing256(rows,kind,bottom.minX-h.minX,bottom.minZ-h.minZ,material,1,false);
 }
}
/** Calls remain in Def resolver order, including both sarcophagus placements. */
export function addMonumentFurniture256(rows:MonumentBuildable256[],c:MonumentCatalogue256,r:MonumentRandom256):void {corners(rows,c,r);central(rows,'stele-large',c,r);central(rows,'stele-grand',c,r);edgeFurniture(rows,'table',c,r);central(rows,'table-square',c,r);edgeFurniture(rows,'sarcophagus',c,r);central(rows,'sarcophagus',c,r);}
