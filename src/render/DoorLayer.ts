import * as THREE from 'three/webgpu';
import { Fn, attribute, mat4, normalLocal, positionLocal, transformNormal, uniform, clamp, select, texture, uv } from 'three/tsl';
import { BoxMesh } from './BoxMesh';
import { material } from './primitives';
import { doorOrientations, doorMotionTicks, isRoomDoor, type DoorState } from '../sim/door-rules';
import type { World } from '../sim/types';
import { doorLeafColor, doorLeafPartsForStructure } from './door-parts';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { penBoundaryAxes } from './pen-parts';
import { InstanceTargetTint } from './instance-target-tint';

const EMPTY_AXES:ReadonlyMap<number,0|1>=new Map();
const AUTODOOR_TINT=new THREE.Color(0xa6b7b4);

/** One retained leaf batch. TSL shares the pawn timeline; state uploads happen
 * on transitions, never as per-frame CPU transforms. Two segments preserve a
 * reversal while presentation is still behind the latest worker snapshot. */
export class DoorLayer {
  readonly group=new THREE.Group();
  readonly tick=uniform(0);
  private readonly base=new THREE.BoxGeometry(1,1,1);
  private readonly material=material(0xffffff);
  private readonly textured=material(0xffffff);
  private readonly paint=createStylizedSurfaceTexture();
  private texturesEnabled=true;
  readonly mesh:BoxMesh;
  private key='';
  private history=new Map<number,{current:DoorState;previous:DoorState}>();
  private readonly targetTint=new InstanceTargetTint();
  setTargetPreview(ids:ReadonlySet<number>):void {this.targetTint.setTargets(ids);}
  clearTargetPreview():void {this.targetTint.clear();}
  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    configure?.(this.material);configure?.(this.textured);
    this.material.positionNode=Fn(()=>{
      const transform=mat4(attribute('boxMatrix0','vec4'),attribute('boxMatrix1','vec4'),attribute('boxMatrix2','vec4'),attribute('boxMatrix3','vec4')).toVar();
      normalLocal.assign(transformNormal(normalLocal,transform));
      const current=attribute('doorCurrent','vec4'),previous=attribute('doorPrevious','vec4');
      const segment=select(this.tick.lessThan(current.x),previous,current);
      const amount=clamp(segment.y.add(this.tick.sub(segment.x).mul(segment.z)),0,1);
      return transform.mul(positionLocal).xyz.add(attribute('doorShift','vec3').mul(amount));
    })();
    // Two carried leaves still use one draw. A narrow shaded centre joint on
    // each leaf suggests four wooden panels without extra geometry or uploads.
    this.material.colorNode=attribute('boxColor','vec3').mul(select(positionLocal.x.abs().lessThan(.022),.77,1));
    this.textured.positionNode=this.material.positionNode;
    this.textured.colorNode=this.material.colorNode.mul(texture(this.paint,uv()).rgb);
    this.material.userData.rendererOwned=true;
    this.textured.userData.rendererOwned=true;
    this.mesh=new BoxMesh(this.base,this.textured,256);this.allocateAttributes(256);
    this.mesh.name='door-leaves';this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.group.add(this.mesh);
  }
  setTexturesEnabled(enabled:boolean):void {
    if(this.texturesEnabled===enabled)return;
    this.texturesEnabled=enabled;
    this.mesh.material=enabled?this.textured:this.material;
  }
  private allocateAttributes(capacity:number):void {
    for(const [name,size] of [['doorCurrent',4],['doorPrevious',4],['doorShift',3]] as const)this.mesh.geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.StaticDrawUsage));
  }
  // V299_NATIVE_DOOR_BEGIN
  // Central native admission owns these preparations; arguments do not grant it.
  updateNative(world:World,cutaway:boolean,reset:boolean,doors:ReadonlyArray<World['structures'][number]>,axes:ReadonlyMap<number,0|1>,gateAxes:ReadonlyMap<number,0|1>):void {
    if(reset){this.history.clear();this.key='';}
    const key=String(cutaway)+doors.map(s=>`${s.id}:${s.kind}:${s.material}:${s.x}:${s.z}:${(s.kind==='fence-gate'?gateAxes:axes).get(s.z*world.width+s.x)??0}:${s.door!.changedAt}:${s.door!.from}:${s.door!.open}:${doorMotionTicks(s)}`).join('|');
    if(key===this.key)return;this.key=key;this.targetTint.restore();
    const live=new Set(doors.map(s=>s.id));for(const id of this.history.keys())if(!live.has(id))this.history.delete(id);
    const count=doors.length*2;
    if(count>this.mesh.instanceMatrix.count){const capacity=2**Math.ceil(Math.log2(count));this.mesh.allocate(this.base,capacity);this.allocateAttributes(capacity);}
    const current=this.mesh.geometry.getAttribute('doorCurrent'),previous=this.mesh.geometry.getAttribute('doorPrevious'),shift=this.mesh.geometry.getAttribute('doorShift');
    const object=new THREE.Object3D(),color=new THREE.Color();
    let index=0;const targetIds:number[]=[];
    for(const s of doors) {
      const d=s.door!,old=this.history.get(s.id),changed=!old||old.current.changedAt!==d.changedAt||old.current.from!==d.from||old.current.open!==d.open||doorMotionTicks({...s,door:old.current})!==doorMotionTicks(s);
      const pair=changed?{current:{...d},previous:old?.current??{...d}}:old!;this.history.set(s.id,pair);
      const gate=s.kind==='fence-gate',axis=(gate?gateAxes:axes).get(s.z*world.width+s.x)??0;
      const angle=axis*Math.PI/2,cos=Math.cos(angle),sin=Math.sin(angle),leaves=doorLeafPartsForStructure(s,cutaway,axis);
      for(let sideIndex=0;sideIndex<2;sideIndex++) {
        const side=sideIndex===0?-1:1,leaf=leaves[sideIndex]!;
        object.position.set(leaf.x,leaf.y,leaf.z);object.rotation.set(0,angle,0);object.scale.set(leaf.sx!,leaf.sy!,leaf.sz!);object.updateMatrix();
        this.mesh.setMatrixAt(index,object.matrix);
        color.setHex(doorLeafColor(s.material));
        if(s.kind==='autodoor')color.lerp(AUTODOOR_TINT,.24);
        this.mesh.setColorAt(index,color);targetIds.push(s.id);
        for(const [attribute,state] of [[current,pair.current],[previous,pair.previous]] as const)attribute.setXYZW(index,state.changedAt,state.from,(state.open?1:-1)/doorMotionTicks({...s,door:state}),0);
        shift.setXYZ(index,side*.45*cos,0,-side*.45*sin);index++;
      }
    }
    this.mesh.activeCount=count;this.mesh.instanceMatrix.needsUpdate=this.mesh.colorBuffer.needsUpdate=true;
    for(const attribute of [current,previous,shift])attribute.needsUpdate=true;
    this.mesh.computeBoundingSphere();this.mesh.boundingSphere.radius+=.5;
    this.targetTint.setInstances(this.mesh.colorBuffer,targetIds);
  }
  // V299_NATIVE_DOOR_END

  update(world:World,cutaway:boolean,reset=false):void {
    if(reset){this.history.clear();this.key='';}
    const doors=world.structures.filter(s=>isRoomDoor(s.kind)||s.kind==='fence-gate');
    const axes=doors.some(s=>isRoomDoor(s.kind))?doorOrientations(world):EMPTY_AXES;
    const gateAxes=doors.some(s=>s.kind==='fence-gate')?penBoundaryAxes(world):EMPTY_AXES;
    const key=String(cutaway)+doors.map(s=>`${s.id}:${s.kind}:${s.material}:${s.x}:${s.z}:${(s.kind==='fence-gate'?gateAxes:axes).get(s.z*world.width+s.x)??0}:${s.door!.changedAt}:${s.door!.from}:${s.door!.open}:${doorMotionTicks(s)}`).join('|');
    if(key===this.key)return;this.key=key;this.targetTint.restore();
    const live=new Set(doors.map(s=>s.id));for(const id of this.history.keys())if(!live.has(id))this.history.delete(id);
    const count=doors.length*2;
    if(count>this.mesh.instanceMatrix.count){const capacity=2**Math.ceil(Math.log2(count));this.mesh.allocate(this.base,capacity);this.allocateAttributes(capacity);}
    const current=this.mesh.geometry.getAttribute('doorCurrent'),previous=this.mesh.geometry.getAttribute('doorPrevious'),shift=this.mesh.geometry.getAttribute('doorShift');
    const object=new THREE.Object3D(),color=new THREE.Color();
    let index=0;const targetIds:number[]=[];
    for(const s of doors) {
      const d=s.door!,old=this.history.get(s.id),changed=!old||old.current.changedAt!==d.changedAt||old.current.from!==d.from||old.current.open!==d.open||doorMotionTicks({...s,door:old.current})!==doorMotionTicks(s);
      const pair=changed?{current:{...d},previous:old?.current??{...d}}:old!;this.history.set(s.id,pair);
      const gate=s.kind==='fence-gate',axis=(gate?gateAxes:axes).get(s.z*world.width+s.x)??0;
      const angle=axis*Math.PI/2,cos=Math.cos(angle),sin=Math.sin(angle),leaves=doorLeafPartsForStructure(s,cutaway,axis);
      for(let sideIndex=0;sideIndex<2;sideIndex++) {
        const side=sideIndex===0?-1:1,leaf=leaves[sideIndex]!;
        object.position.set(leaf.x,leaf.y,leaf.z);object.rotation.set(0,angle,0);object.scale.set(leaf.sx!,leaf.sy!,leaf.sz!);object.updateMatrix();
        this.mesh.setMatrixAt(index,object.matrix);
        color.setHex(doorLeafColor(s.material));
        if(s.kind==='autodoor')color.lerp(AUTODOOR_TINT,.24);
        this.mesh.setColorAt(index,color);targetIds.push(s.id);
        for(const [attribute,state] of [[current,pair.current],[previous,pair.previous]] as const)attribute.setXYZW(index,state.changedAt,state.from,(state.open?1:-1)/doorMotionTicks({...s,door:state}),0);
        shift.setXYZ(index,side*.45*cos,0,-side*.45*sin);index++;
      }
    }
    this.mesh.activeCount=count;this.mesh.instanceMatrix.needsUpdate=this.mesh.colorBuffer.needsUpdate=true;
    for(const attribute of [current,previous,shift])attribute.needsUpdate=true;
    this.mesh.computeBoundingSphere();this.mesh.boundingSphere.radius+=.5;
    this.targetTint.setInstances(this.mesh.colorBuffer,targetIds);
  }
  prepareForCompile():()=>void {
    if(this.mesh.activeCount)return ()=>{};
    const version=this.mesh.instanceMatrix.version;this.mesh.activeCount=1;
    return ()=>{if(this.mesh.instanceMatrix.version===version)this.mesh.activeCount=0;};
  }
  dispose():void {this.targetTint.dispose();this.mesh.dispose();this.base.dispose();this.material.dispose();this.textured.dispose();this.paint.dispose();}
}
