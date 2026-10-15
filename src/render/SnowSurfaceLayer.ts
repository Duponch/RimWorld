import * as THREE from 'three/webgpu';
import type {World} from '../sim/types';
import {BoxMesh,configureBoxMaterial} from './BoxMesh';
import {material} from './primitives';
import {surfaceHeightAtCell} from './surface-height';
const CHUNK=16;
const pose=new THREE.Object3D(),white=new THREE.Color(0xe7edf1),saved=new THREE.Matrix4();
/** Physical, confirmed snow only. Quantized chalk volumes keep changes local;
 * every chunk owns a fixed resident allocation, including before first snow.
 * No texture, world mutation, business lookup or upload in the frame loop. */
export class SnowSurfaceLayer {
 readonly group=new THREE.Group();
 private readonly base=new THREE.BoxGeometry(1,1,1);
 private readonly surface=material(0xffffff);
 private chunks:BoxMesh[]=[];
 private readonly shovels=new BoxMesh(this.base,this.surface,64);private shovelCapacity=64;private shovelKey='';
 private width=0;private height=0;private columns=0;
 private levels=new Uint8Array();private floors=new Uint8Array();
 private revision=0;
 constructor(configure?:(m:THREE.MeshStandardNodeMaterial)=>void){configure?.(this.surface);configureBoxMaterial(this.surface);this.surface.userData.rendererOwned=true;this.group.name='physical-snow';this.shovels.name='snow-clearing-shovels';this.shovels.castShadow=false;this.shovels.receiveShadow=true;this.group.add(this.shovels);}
 update(w:World,reset=false,changed?:readonly number[]):void {
  // Historical maps have no snow authority: no terrain scan or buffer allocation.
  if(!w.snow){this.group.visible=false;this.shovels.activeCount=0;this.shovelKey='';return;}
  this.group.visible=true;
  const resized=this.width!==w.width||this.height!==w.height;
  if(resized){for(const m of this.chunks)m.dispose();this.group.clear();this.group.add(this.shovels);this.chunks=[];this.width=w.width;this.height=w.height;this.columns=Math.ceil(w.width/CHUNK);this.levels=new Uint8Array(w.tiles.length);this.floors=new Uint8Array(w.tiles.length);
   for(let z=0;z<Math.ceil(w.height/CHUNK);z++)for(let x=0;x<this.columns;x++){const m=new BoxMesh(this.base,this.surface,CHUNK*CHUNK);m.name=`snow:${x}:${z}`;m.castShadow=false;m.receiveShadow=true;this.chunks.push(m);this.group.add(m);}
  }
  this.updateShovels(w);
  const dirty=new Set<number>();
  const capture=(i:number)=>{const t=w.tiles[i]!,d=w.snow?t.snowDepth??0:0,level=d<.03?0:Math.min(16,Math.ceil(d*16)),floor=t.floor?1:0;if(reset||resized||level!==this.levels[i]||floor!==this.floors[i]){this.levels[i]=level;this.floors[i]=floor;dirty.add(Math.floor(Math.floor(i/w.width)/CHUNK)*this.columns+Math.floor(i%w.width/CHUNK));}};
  if(resized||reset||changed===undefined)for(let i=0;i<w.tiles.length;i++)capture(i);else for(const i of changed)capture(i);
  if(!dirty.size)return;this.revision++;
  for(const key of dirty){const m=this.chunks[key]!,originX=key%this.columns*CHUNK,originZ=Math.floor(key/this.columns)*CHUNK;let count=0;
   for(let z=originZ;z<Math.min(w.height,originZ+CHUNK);z++)for(let x=originX;x<Math.min(w.width,originX+CHUNK);x++){const level=this.levels[z*w.width+x]!;if(!level)continue;const thickness=.012+level/16*.08;pose.position.set(x,(surfaceHeightAtCell(w,x,z)??0)+.002+thickness/2,z);pose.scale.set(1,thickness,1);pose.updateMatrix();m.setMatrixAt(count,pose.matrix);m.setColorAt(count,white);count++;}
   m.activeCount=count;m.instanceMatrix.needsUpdate=true;m.colorBuffer.needsUpdate=true;m.computeBoundingSphere();
  }
 }
 private updateShovels(w:World):void {
  const workers=w.pawns.filter(p=>p.state==='working'&&p.cleaning?.phase==='clean'&&p.cleaning.snowCell!==undefined&&!p.stun);
  const key=workers.map(p=>`${p.id}:${p.x}:${p.z}:${p.cleaning!.snowCell}`).join('|');if(key===this.shovelKey)return;this.shovelKey=key;
  const count=workers.length*3;if(count>this.shovelCapacity){while(this.shovelCapacity<count)this.shovelCapacity*=2;this.shovels.allocate(this.base,this.shovelCapacity);}
  let slot=0;
  const part=(x:number,y:number,z:number,sx:number,sy:number,sz:number,angle:number,tint:number)=>{pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(0,angle,0);pose.updateMatrix();this.shovels.setMatrixAt(slot,pose.matrix);white.setHex(tint);this.shovels.setColorAt(slot++,white);};
  for(const p of workers){const i=p.cleaning!.snowCell!,tx=i%w.width,tz=Math.floor(i/w.width),angle=Math.atan2(tx-p.x,tz-p.z),dx=Math.sin(angle),dz=Math.cos(angle),x=p.x+dx*.43,z=p.z+dz*.43;
   part(x,.51,z,.047,.75,.047,angle,0xa78d69);part(x,.15,z,.28,.22,.065,angle,0xa7b9c4);part(x,.91,z,.19,.055,.055,angle,0xa78d69);
  }
  pose.rotation.set(0,0,0);white.setHex(0xe7edf1);this.shovels.activeCount=count;this.shovels.instanceMatrix.needsUpdate=true;this.shovels.colorBuffer.needsUpdate=true;this.shovels.computeBoundingSphere();
 }
 /** Degenerate sentinel uses the same resident plain pipeline before snowfall.
  * Restoration yields to a newer snapshot, as with the other scene layers. */
 prepareForCompile():()=>void {const m=this.chunks[0];if(!m||m.activeCount)return ()=>{};const revision=this.revision,count=m.activeCount,visible=m.visible;m.getMatrixAt(0,saved);const before=saved.clone(),color=Array.from(m.colorBuffer.array.slice(0,3));pose.position.set(0,0,0);pose.scale.set(0,0,0);pose.updateMatrix();m.setMatrixAt(0,pose.matrix);m.setColorAt(0,white);m.activeCount=1;m.frustumCulled=false;m.instanceMatrix.needsUpdate=true;m.colorBuffer.needsUpdate=true;return ()=>{if(revision!==this.revision)return;m.setMatrixAt(0,before);m.colorBuffer.array.set(color,0);m.activeCount=count;m.visible=visible;m.frustumCulled=true;m.instanceMatrix.needsUpdate=true;m.colorBuffer.needsUpdate=true;};}
 dispose():void {for(const m of this.chunks)m.dispose();this.chunks=[];this.shovels.dispose();this.group.clear();this.base.dispose();this.surface.dispose();}
}
