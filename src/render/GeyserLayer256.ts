/** Original low-poly rim, shared BoxBatches/materials/shadow preparation.
 * No Thing object/scene per geyser and no per-frame World read. */
import * as THREE from 'three/webgpu';
import type {BoxBatches} from './BoxBatches';
import type {Placement} from './primitives';
import type {GeyserWorld256,NaturalGeyser256} from '../sim/local-geyser-state-256';
export function geyserParts256(items:readonly Pick<NaturalGeyser256,'id'|'x'|'z'>[]):Placement[] {
 const parts:Placement[]=[];
 for(const g of items){const cx=g.x+.5,cz=g.z+.5;
  // Low broad rim plus dark mineral vent. All forms/pigments authored here.
  parts.push({x:cx,y:.025,z:cz,sx:.68,sy:.05,sz:.68,color:0x686f6b,targetId:g.id});
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=.65+(i%2)*.035;
   parts.push({x:cx+Math.cos(a)*r,y:.09+(i%3)*.02,z:cz+Math.sin(a)*r,sx:.57,sy:.21+(i%3)*.035,sz:.39,ry:-a,color:i%2?0x9bada9:0xb8c3b6,shape:'rounded-rock',pigment:'stone',key:g.id+i,targetId:g.id});
  }
 }return parts;
}
export class GeyserLayer256 {
 readonly group=new THREE.Group();private key:string|null=null;
 constructor(private readonly boxes:BoxBatches){this.group.name='Natural geysers — resident rim';}
 adopt(world:GeyserWorld256,reset=false):boolean {
  const items=world.geysers?.items??[],key=items.map(g=>`${g.id}:${g.x}:${g.z}`).join('|');
  if(!reset&&key===this.key)return false;this.key=key;
  this.boxes.set(this.group,'natural-geysers',geyserParts256(items));return true;
 }
 dispose():void{this.group.removeFromParent();} // buffers/materials belong to shared BoxBatches
}
