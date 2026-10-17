/** Road-only generation effects; every operation is applied to the actual
 * generation-owned projection. Required services have no inert defaults. */
import {LOCAL_ROAD_DEFINITIONS_256,type LocalRoadStep256,type LocalRoadSurface256,
 type LocalRoadProp256} from './local-road-data-256.ts';
import {roadCurveChance256,type LocalRoadDistance256} from './local-road-curves-256.ts';
import type {WorldRoadId} from './world-roads.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
export interface ActualRoadTerrain256 {
 readonly id:string;readonly bridge:boolean;readonly water:boolean;
 readonly river:boolean;readonly road:boolean;readonly removable:boolean;
 readonly impassable:boolean;readonly driesTo:string|null;
}
export interface ActualRoadThing256 {
 readonly id:number;readonly impassable:boolean;readonly destroyable:boolean;
}
export interface LocalRoadPlacement256 {
 /** Current top terrain; re-read after every destructive/terrain operation. */
 terrain(cell:number):ActualRoadTerrain256;
 things(cell:number):readonly ActualRoadThing256[];
 canBuild(target:LocalRoadSurface256|LocalRoadProp256,cell:number):boolean;
 /** Real source .Destroy(Vanish), including owner removal and support effects. */
 vanish(id:number):void;
 setTerrain(cell:number,id:string):void;
 setFoundation(cell:number,id:'bridge'):void;
 /** Resolved chosen regional flagstone's actual terrain identifier. */
 readonly regionalFloor:string;
 /** True iff a SAME-def live prop is within the Core proximity boundary. */
 hasSamePropNear(target:LocalRoadProp256,cell:number,radius:number):boolean;
 /** Allocate identity, consume its true creation draws and append a real object.
  * This receives the same generation stream, never another seeded stream. */
 spawnProp(target:LocalRoadProp256,cell:number,random:WorldGenerationRandom):void;
 addRoadEdge(cell:number):void;
}
const CARDINAL=[[0,1],[1,0],[0,-1],[-1,0]] as const;
function originAllows(step:LocalRoadStep256,cell:number,field:LocalRoadDistance256,
 physical:LocalRoadPlacement256):boolean {
 const x=cell%field.width,z=Math.trunc(cell/field.width),target=step.target as LocalRoadSurface256;
 for(const [dx,dz] of CARDINAL) {
  const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=field.width||nz>=field.height)continue;
  const next=nz*field.width+nx;
  if(roadCurveChance256(step.curve,field.distance[next])<=0)continue;
  if(!physical.canBuild(target,next)&&physical.terrain(next).id!==target)continue;
  const origin=field.origin[next];
  if(origin<0)throw Error('Road bridge consulted an uninitialized distance origin');
  if(physical.canBuild(target,origin)||physical.terrain(origin).id===target)return true;
 }
 return false;
}
function bulldoze(cell:number,p:LocalRoadPlacement256):void {
 for(;;) {
  const obstacle=p.things(cell).find(t=>t.impassable);
  if(!obstacle)return;
  const id=obstacle.id;p.vanish(id);
  if(p.things(cell).some(t=>t.id===id))throw Error('Road Vanish did not retire actual owner');
 }
}
export function placeLocalRoadStep256(step:LocalRoadStep256,cell:number,
 field:LocalRoadDistance256,p:LocalRoadPlacement256,random:WorldGenerationRandom):void {
 if(step.onlyOrigin&&!originAllows(step,cell,field,p))return;
 if(step.suppressWater&&p.terrain(cell).water)return;
 bulldoze(cell,p);
 if(step.target==='bulldoze')return;
 const target=step.target;
 if(target==='ancient-road-barrier'||target==='ancient-road-lamp') {
  if(!p.canBuild(target,cell)||(step.proximity>0&&p.hasSamePropNear(target,cell,step.proximity)))return;
  // Source iteration is reverse and may already have retired later Things
  // before meeting a non-destroyable owner. Generation projection owns rollback.
  const ids=p.things(cell).map(t=>t.id);
  for(let i=ids.length-1;i>=0;i--){
   const t=p.things(cell).find(t=>t.id===ids[i]);if(!t)continue;
   if(!t.destroyable)return;p.vanish(t.id);
  }
  const visited=new Set<string>();
  while(p.terrain(cell).driesTo!==null) {
   const t=p.terrain(cell);if(visited.has(t.id))throw Error('Cyclic actual driesTo chain');
   visited.add(t.id);p.setTerrain(cell,t.driesTo!);
  }
  if(p.terrain(cell).impassable||p.terrain(cell).river)p.setTerrain(cell,'gravel');
  p.spawnProp(target,cell,random);return;
 }
 const old=p.terrain(cell);
 const terrainId=target==='regional-flagstone'?p.regionalFloor:target;
 if(target==='bridge') {
  if(old.id==='water-deep')p.setTerrain(cell,'water-shallow');
  if(old.id==='water-ocean-deep')p.setTerrain(cell,'water-ocean-shallow');
 }
 if(p.canBuild(target,cell)&&(!p.canBuild('bridge',cell)||target==='bridge')&&!old.bridge) {
  if(old.road&&!old.removable)p.setTerrain(cell,'gravel');
  if(target==='bridge')p.setFoundation(cell,'bridge');else p.setTerrain(cell,terrainId);
 }
 const x=cell%field.width,z=Math.trunc(cell/field.width);
 if(x===0||z===0||x===field.width-1||z===field.height-1)p.addRoadEdge(cell);
}
export function applyLocalRoadField256(road:WorldRoadId,field:LocalRoadDistance256,
 p:LocalRoadPlacement256,random:WorldGenerationRandom):void {
 const def=LOCAL_ROAD_DEFINITIONS_256[road];
 for(let x=0;x<field.width;x++)for(let z=0;z<field.height;z++){
  const cell=z*field.width+x;if(!field.touched[cell])continue;
  const distance=field.distance[cell],alias=Math.abs(f(f(distance+random.value())-.5));
  for(const step of def.steps) {
   const at=f(distance+f(f(alias-distance)*f(step.antialias)));
   const chance=roadCurveChance256(step.curve,at);
   if(chance<=0)continue;
   if(step.spacing!==0&&f(f(f(field.along[cell]/f(step.spacing))%1)*f(step.spacing))>=1)continue;
   if(random.value()<chance)placeLocalRoadStep256(step,cell,field,p,random);
  }
 }
}
