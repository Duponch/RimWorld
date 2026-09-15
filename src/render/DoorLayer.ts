import * as THREE from 'three/webgpu';
import { Fn, attribute, mat4, normalLocal, positionLocal, transformNormal, uniform, clamp, select } from 'three/tsl';
import { BoxMesh } from './BoxMesh';
import { material } from './primitives';
import { buildingMaterialColor } from './building-material-color';
import { doorOrientations, doorOpenTicks, type DoorState } from '../sim/door-rules';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

/** One retained leaf batch. TSL shares the pawn timeline; state uploads happen
 * on transitions, never as per-frame CPU transforms. Two segments preserve a
 * reversal while presentation is still behind the latest worker snapshot. */
export class DoorLayer {
  readonly group=new THREE.Group();
  readonly tick=uniform(0);
  private readonly base=new THREE.BoxGeometry(1,1,1);
  private readonly material=material(0xffffff);
  readonly mesh:BoxMesh;
  private key='';
  private history=new Map<number,{current:DoorState;previous:DoorState}>();
  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    configure?.(this.material);
    this.material.positionNode=Fn(()=>{
      const transform=mat4(attribute('boxMatrix0','vec4'),attribute('boxMatrix1','vec4'),attribute('boxMatrix2','vec4'),attribute('boxMatrix3','vec4')).toVar();
      normalLocal.assign(transformNormal(normalLocal,transform));
      const current=attribute('doorCurrent','vec4'),previous=attribute('doorPrevious','vec4');
      const segment=select(this.tick.lessThan(current.x),previous,current);
      const amount=clamp(segment.y.add(this.tick.sub(segment.x).mul(segment.z)),0,1);
      return transform.mul(positionLocal).xyz.add(attribute('doorShift','vec3').mul(amount));
    })();
    this.material.colorNode=attribute('boxColor','vec3');
    this.material.userData.rendererOwned=true;
    this.mesh=new BoxMesh(this.base,this.material,256);this.allocateAttributes(256);
    this.mesh.name='door-leaves';this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.group.add(this.mesh);
  }
  private allocateAttributes(capacity:number):void {
    for(const [name,size] of [['doorCurrent',4],['doorPrevious',4],['doorShift',3]] as const)this.mesh.geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));
  }
  update(world:World,cutaway:boolean,reset=false):void {
    if(reset){this.history.clear();this.key='';}
    const axes=doorOrientations(world);
    const doors=world.structures.filter(s=>s.kind==='door'),key=String(cutaway)+doors.map(s=>`${s.id}:${s.material}:${s.x}:${s.z}:${(axes.get(s.z*world.width+s.x)??0)}:${s.door!.changedAt}:${s.door!.open}`).join('|');
    if(key===this.key)return;this.key=key;
    const live=new Set(doors.map(s=>s.id));for(const id of this.history.keys())if(!live.has(id))this.history.delete(id);
    const count=doors.length*2;
    if(count>this.mesh.instanceMatrix.count){const capacity=2**Math.ceil(Math.log2(count));this.mesh.allocate(this.base,capacity);this.allocateAttributes(capacity);}
    const current=this.mesh.geometry.getAttribute('doorCurrent'),previous=this.mesh.geometry.getAttribute('doorPrevious'),shift=this.mesh.geometry.getAttribute('doorShift');
    const object=new THREE.Object3D(),color=new THREE.Color(),height=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight;
    let index=0;
    for(const s of doors) {
      const d=s.door!,old=this.history.get(s.id),changed=!old||old.current.changedAt!==d.changedAt||old.current.open!==d.open;
      const pair=changed?{current:{...d},previous:old?.current??{...d}}:old!;this.history.set(s.id,pair);
      const duration=doorOpenTicks(s),angle=(axes.get(s.z*world.width+s.x)??0)*Math.PI/2,cos=Math.cos(angle),sin=Math.sin(angle);
      for(const side of [-1,1]) {
        object.position.set(s.x+side*.215*cos,(height-.19)/2+.035,s.z-side*.215*sin);object.rotation.set(0,angle,0);object.scale.set(.42,height-.19,.15);object.updateMatrix();
        this.mesh.setMatrixAt(index,object.matrix);this.mesh.setColorAt(index,color.setHex(buildingMaterialColor(s.material)??0xa6916e));
        for(const [attribute,state] of [[current,pair.current],[previous,pair.previous]] as const)attribute.setXYZW(index,state.changedAt,state.from,(state.open?1:-1)/duration,0);
        shift.setXYZ(index,side*.45*cos,0,-side*.45*sin);index++;
      }
    }
    this.mesh.activeCount=count;this.mesh.instanceMatrix.needsUpdate=this.mesh.colorBuffer.needsUpdate=true;
    for(const attribute of [current,previous,shift])attribute.needsUpdate=true;
    this.mesh.computeBoundingSphere();this.mesh.boundingSphere.radius+=.5;
  }
  prepareForCompile():()=>void {
    if(this.mesh.activeCount)return ()=>{};
    const version=this.mesh.instanceMatrix.version;this.mesh.activeCount=1;
    return ()=>{if(this.mesh.instanceMatrix.version===version)this.mesh.activeCount=0;};
  }
  dispose():void {this.mesh.dispose();this.base.dispose();this.material.dispose();}
}
