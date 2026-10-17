import {sampleMonumentShape256} from './ancient-monument-shape-256.ts';
import {damageAncientMonument256,monumentRandomOrder256,type MonumentRandom256} from './ancient-monument-damage-256.ts';
import {addMonumentColumns256,addMonumentFurniture256} from './ancient-monument-ornaments-256.ts';
import {addMonumentThing256,addMonumentFloor256,monumentStuff256,monumentRooms256,thingAt256,floorAt256,passable256,monumentRect256,rectCenter256,rectCells256,cardinal256,cellKey256,mirrorMonument256,occupiedMonumentRect256,largestMonumentRect256,validateMonumentCatalogue256,type MonumentBuildable256,type MonumentCatalogue256,type MonumentRect256,type MonumentThing256} from './ancient-monument-plan-256.ts';
const chance=(r:MonumentRandom256,p:number)=>p>=1||p>0&&r.value()<Math.fround(p);
const wallAt=(rows:MonumentBuildable256[],x:number,z:number)=>thingAt256(rows,x,z).some(t=>t.kind==='wall');
const doorAt=(rows:MonumentBuildable256[],x:number,z:number)=>thingAt256(rows,x,z).some(t=>t.kind==='door');
function assignWallStuff(rows:MonumentBuildable256[],c:MonumentCatalogue256,r:MonumentRandom256):void {
 const seen=new Set<MonumentThing256>();for(const b of rows)if(b.type==='thing'&&b.kind==='wall'&&!seen.has(b)){const material=monumentStuff256('wall',c,r),pending=[b];seen.add(b);while(pending.length){const wall=pending.pop()!;const replacement:MonumentBuildable256[]=[];addMonumentThing256(replacement,'wall',wall.x,wall.z,material);wall.material=material;wall.maxHitPoints=(replacement[0] as MonumentThing256).maxHitPoints;wall.hitPoints=wall.maxHitPoints;for(const q of rows)if(q.type==='thing'&&q.kind==='wall'&&!seen.has(q)&&Math.abs(q.x-wall.x)<=1&&Math.abs(q.z-wall.z)<=1){seen.add(q);pending.push(q);}}}
}
function fillFloors(rows:MonumentBuildable256[],outer:MonumentRect256,closed:boolean,c:MonumentCatalogue256,r:MonumentRandom256):void {
 // Nested Resolve does not invoke CanResolve: exactly one floor selection.
 const floor=c.floors[r.integer(0,c.floors.length)]!;
 if(!closed){sampleMonumentShape256(outer.maxX-outer.minX+1,outer.maxZ-outer.minZ+1,true,true,false,true,false,r);for(const p of rectCells256(outer))if(!wallAt(rows,p.x,p.z)&&!doorAt(rows,p.x,p.z))addMonumentFloor256(rows,p.x,p.z,floor);return;}
 const seen=new Set<string>();for(const start of rectCells256(outer)){
  if(wallAt(rows,start.x,start.z)||seen.has(cellKey256(start.x,start.z)))continue;const pending=[start],room:typeof pending=[];seen.add(cellKey256(start.x,start.z));let edge=false;
  while(pending.length){const p=pending.pop()!;room.push(p);if(p.x===outer.minX||p.x===outer.maxX||p.z===outer.minZ||p.z===outer.maxZ)edge=true;for(const [dx,dz] of [[-1,0],[0,-1],[1,0],[0,1]]){const q={x:p.x+dx!,z:p.z+dz!},key=cellKey256(q.x,q.z);if(q.x>=outer.minX&&q.z>=outer.minZ&&q.x<=outer.maxX&&q.z<=outer.maxZ&&!seen.has(key)&&!wallAt(rows,q.x,q.z)){seen.add(key);pending.push(q);}}}
  if(edge)continue;const bounds={minX:Math.min(...room.map(p=>p.x)),minZ:Math.min(...room.map(p=>p.z)),maxX:Math.max(...room.map(p=>p.x)),maxZ:Math.max(...room.map(p=>p.z))};sampleMonumentShape256(bounds.maxX-bounds.minX+1,bounds.maxZ-bounds.minZ+1,true,true,false,true,false,r);for(const p of room)addMonumentFloor256(rows,p.x,p.z,floor);
 }
}
function bordersFloorEdge(rows:MonumentBuildable256[],t:MonumentThing256):boolean {
 if(t.kind!=='wall')return false;return [[-1,0,1,0],[0,-1,0,1]].some(([ax,az,bx,bz])=>passable256(rows,t.x+ax!,t.z+az!)&&passable256(rows,t.x+bx!,t.z+bz!)&&!!floorAt256(rows,t.x+ax!,t.z+az!)!==!!floorAt256(rows,t.x+bx!,t.z+bz!));
}
function connectClosedRooms(rows:MonumentBuildable256[]):void {
 const start=rows.find((b):b is MonumentThing256=>b.type==='thing'&&bordersFloorEdge(rows,b));if(!start)return;
 const seen=new Set<string>();const flood=(root:{x:number;z:number})=>{const pending=cardinal256.map(([x,z])=>({x:root.x+x,z:root.z+z}));pending.push(root);while(pending.length){const p=pending.pop()!,key=cellKey256(p.x,p.z);if(seen.has(key)||!floorAt256(rows,p.x,p.z)||!passable256(rows,p.x,p.z))continue;seen.add(key);for(const [x,z] of cardinal256)pending.push({x:p.x+x,z:p.z+z});}};
 flood(start);for(const p of rectCells256(occupiedMonumentRect256(rows))){if(seen.has(cellKey256(p.x,p.z)))continue;const wall=thingAt256(rows,p.x,p.z).find(t=>t.kind==='wall');if(!wall)continue;const linked=(x:number,z:number)=>seen.has(cellKey256(x,z))&&passable256(rows,x,z),closed=(x:number,z:number)=>!seen.has(cellKey256(x,z))&&!!floorAt256(rows,x,z)&&passable256(rows,x,z);if(linked(p.x,p.z+1)&&closed(p.x,p.z-1)||linked(p.x,p.z-1)&&closed(p.x,p.z+1)||linked(p.x+1,p.z)&&closed(p.x-1,p.z)||linked(p.x-1,p.z)&&closed(p.x+1,p.z)){addMonumentThing256(rows,'door',wall.x,wall.z,wall.material);flood(wall);}}
}
function monument(width:number,height:number,c:MonumentCatalogue256,r:MonumentRandom256,addFloors:boolean,temple=false):MonumentBuildable256[] {
 const extent=Math.max(width,height),openChance=extent<=3?1+(extent/3)*(.85-1):extent<=6?.85+(extent-3)/3*(.2-.85):extent<=8?.2+(extent-6)/2*(-.2):0,open=temple?false:chance(r,openChance),horizontal=open||r.boolean(),vertical=open||!horizontal||r.boolean(),rows:MonumentBuildable256[]=[],doors:{x:number;z:number}[]=[],outer={minX:0,minZ:0,maxX:width-1,maxZ:height-1};
 const s=sampleMonumentShape256(width-(open?0:2),height-(open?0:2),horizontal,vertical,!open,open?false:true,open,r),shape=(x:number,z:number)=>x>=0&&z>=0&&x<s.width&&z<s.height&&!!s.cells[x*s.height+z];
 // Initial wood is only an unspawned placeholder Stuff, replaced below before
 // any HP or material is exposed; the closed catalogue never samples wood.
 const initial=c.stuff[0]!.material;
 if(open){for(let x=0;x<width;x++)for(let z=0;z<height;z++)if(shape(x,z))addMonumentThing256(rows,'wall',x,z,initial);}
 else {
  for(let x=-1;x<=s.width;x++)for(let z=-1;z<=s.height;z++)if(!shape(x,z)&&[-1,0,1].some(dx=>[-1,0,1].some(dz=>shape(x+dx,z+dz))))addMonumentThing256(rows,'wall',x+1,z+1,initial);
  for(let x=-1;x<=s.width;x++)for(let z=-1;z<=s.height;z++)if(!shape(x,z)&&cardinal256.some(([dx,dz])=>shape(x+dx,z+dz))&&cardinal256.some(([dx,dz])=>!shape(x+dx,z+dz)&&passable256(rows,x+1+dx,z+1+dz)))doors.push({x:x+1,z:z+1});
 }
 assignWallStuff(rows,temple?{...c,stuff:c.stuff.filter(s=>s.material!=='steel')}:c,r);if(addFloors)fillFloors(rows,outer,!open,c,r);addMonumentColumns256(rows,outer,c,r);addMonumentFurniture256(rows,c,r);
 for(let pass=0;pass<2;pass++){
  const processed=new Set<string>();for(const start of monumentRandomOrder256(rectCells256(outer),r)){const floor=!!floorAt256(rows,start.x,start.z),rect=largestMonumentRect256(start,outer,processed,p=>!thingAt256(rows,p.x,p.z).length&&floor);if(!rect||rect.maxX-rect.minX+1<7||rect.maxZ-rect.minZ+1<7)continue;const w=r.integer(5,rect.maxX-rect.minX),h=r.integer(5,rect.maxZ-rect.minZ),child=monument(w,h,c,r,false,temple),bounds=occupiedMonumentRect256(child),center=rectCenter256(bounds),at=rectCenter256(rect);for(const b of child)if(b.type==='thing')addMonumentThing256(rows,b.kind,b.x+at.x-center.x,b.z+at.z-center.z,b.material,b.orientation,false);}
 }
 const candidates=doors.filter(p=>(!horizontal||p.x<Math.floor(width/2))&&(!vertical||p.z<Math.floor(height/2))&&wallAt(rows,p.x,p.z)&&(!thingAt256(rows,p.x-1,p.z).length&&!thingAt256(rows,p.x+1,p.z).length||!thingAt256(rows,p.x,p.z-1).length&&!thingAt256(rows,p.x,p.z+1).length));if(!temple&&candidates.length){const p=candidates[r.integer(0,candidates.length)]!,wall=thingAt256(rows,p.x,p.z).find(t=>t.kind==='wall')!;addMonumentThing256(rows,'door',p.x,p.z,wall.material);}
 addMonumentFurniture256(rows,c,r);if(horizontal)mirrorMonument256(rows,Math.floor(width/2),false,width%2===1);if(vertical)mirrorMonument256(rows,Math.floor(height/2),true,height%2===1);
 if(!temple&&!open&&!rows.some(b=>b.type==='thing'&&b.kind==='door')){const candidates=rows.filter((b):b is MonumentThing256=>b.type==='thing'&&bordersFloorEdge(rows,b));if(candidates.length){const wall=candidates[r.integer(0,candidates.length)]!;addMonumentThing256(rows,'door',wall.x,wall.z,wall.material);}}
 connectClosedRooms(rows);for(const b of [...rows])if(b.type==='floor'&&wallAt(rows,b.x,b.z))rows.splice(rows.indexOf(b),1);
 if(rows.length){const center=rectCenter256(occupiedMonumentRect256(rows));for(const b of rows){b.x-=center.x;b.z-=center.z;}}return rows;
}
/** AncientTemple uses the same Monument resolver with inherited explicit
 * closed/no-exterior-door/nonflammable-wall parameters. Internal room doors
 * are still resolved by TryAddDoorsToClosedRooms; no DamageBuildings pass. */
export function resolveAncientTempleMonument256(width:number,height:number,c:MonumentCatalogue256,r:MonumentRandom256):MonumentBuildable256[] {
 validateMonumentCatalogue256(c);if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||width>30||height>30)throw Error('Invalid actual AncientTemple dimensions');
 return monument(width,height,c,r,true,true);
}
export function resolveMonumentRuin256(width:number,height:number,c:MonumentCatalogue256,r:MonumentRandom256):MonumentBuildable256[] {
 validateMonumentCatalogue256(c);if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||width>30||height>30)throw Error('Invalid clipped MonumentRuin dimensions');
 const rows=monument(width,height,c,r,true);if(!rows.length)return [];
 return damageAncientMonument256(rows,occupiedMonumentRect256(rows),r).buildables as MonumentBuildable256[];
}
