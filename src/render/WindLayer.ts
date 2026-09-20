import * as THREE from 'three/webgpu';
import { Fn,attribute,mat4,normalLocal,positionLocal,transformNormal,uniform,select,vec3,cos,sin } from 'three/tsl';
import { BoxMesh } from './BoxMesh';
import { material } from './primitives';
import type { World } from '../sim/types';

interface Spin {tick:number;phase:number;speed:number}
/** Three retained blades per turbine. Only changes of power/placement upload
 * attributes; presentation advances one shared tick, never CPU blade matrices. */
export class WindLayer {
  readonly group=new THREE.Group();
  readonly tick=uniform(0);
  readonly mesh:BoxMesh;
  private readonly base=new THREE.BoxGeometry(1,1,1);
  private readonly material=material(0xffffff);
  private key:string|null=null;
  private readonly history=new Map<number,{current:Spin;previous:Spin}>();
  constructor(configure?:(material:THREE.MeshStandardNodeMaterial)=>void){
    configure?.(this.material);
    this.material.positionNode=Fn(()=>{
      const transform=mat4(attribute('boxMatrix0','vec4'),attribute('boxMatrix1','vec4'),attribute('boxMatrix2','vec4'),attribute('boxMatrix3','vec4'));
      const current=attribute('windCurrent','vec4'),previous=attribute('windPrevious','vec4');
      const segment=select(this.tick.lessThan(current.x),previous,current);
      const angle=segment.y.add(this.tick.sub(segment.x).mul(segment.z)).add(current.w),c=cos(angle),s=sin(angle);
      const shape=attribute('windShape','vec4'),p=positionLocal.mul(shape.xyz).add(vec3(0,shape.w,0));
      const rotated=vec3(p.x.mul(c).sub(p.y.mul(s)),p.x.mul(s).add(p.y.mul(c)),p.z);
      const n=normalLocal.toVar();normalLocal.assign(transformNormal(vec3(n.x.mul(c).sub(n.y.mul(s)),n.x.mul(s).add(n.y.mul(c)),n.z),transform));
      return transform.mul(rotated).xyz;
    })();
    this.material.colorNode=attribute('boxColor','vec3');this.material.userData.rendererOwned=true;
    this.mesh=new BoxMesh(this.base,this.material,256);this.allocateAttributes(256);
    this.mesh.name='wind-turbine-blades';this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.group.add(this.mesh);
  }
  private allocateAttributes(capacity:number):void {
    for(const name of ['windCurrent','windPrevious','windShape'])this.mesh.geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage));
  }
  adopt(world:World,reset=false):void {
    if(reset){this.key=null;this.history.clear();}
    const turbines=world.structures.filter(s=>s.kind==='wind-turbine');
    const key=turbines.map(s=>`${s.id}:${s.x}:${s.z}:${s.orientation}:${s.power?.on}:${s.wind?.cachedWatts}`).join('|');
    if(key===this.key)return;this.key=key;
    const live=new Set(turbines.map(s=>s.id));for(const id of this.history.keys())if(!live.has(id))this.history.delete(id);
    const count=turbines.length*3;if(count>this.mesh.instanceMatrix.count){const capacity=2**Math.ceil(Math.log2(count));this.mesh.allocate(this.base,capacity);this.allocateAttributes(capacity);}
    const current=this.mesh.geometry.getAttribute('windCurrent'),previous=this.mesh.geometry.getAttribute('windPrevious'),shape=this.mesh.geometry.getAttribute('windShape'),object=new THREE.Object3D(),color=new THREE.Color(0xc4cbb6);
    let index=0;
    for(const s of turbines){
      const old=this.history.get(s.id),speed=s.power?.on?(s.wind?.cachedWatts??0)/3450*.35:0;
      const initial=(s.id*.61803398875%1)*Math.PI*2;
      const phase=old?(old.current.phase+(world.tick-old.current.tick)*old.current.speed)%(Math.PI*2):initial;
      const changed=!old||old.current.speed!==speed;
      const pair=changed?{current:{tick:world.tick,phase,speed},previous:old?.current??{tick:world.tick,phase,speed}}:old!;this.history.set(s.id,pair);
      const ry=s.orientation*Math.PI/2;object.position.set(s.x+Math.sin(ry)*1.15,3.73,s.z+Math.cos(ry)*1.15);object.rotation.set(0,ry,0);object.scale.set(1,1,1);object.updateMatrix();
      for(let blade=0;blade<3;blade++){
        this.mesh.setMatrixAt(index,object.matrix);this.mesh.setColorAt(index,color);
        for(const [attribute,segment] of [[current,pair.current],[previous,pair.previous]] as const)attribute.setXYZW(index,segment.tick,segment.phase,segment.speed,blade*Math.PI*2/3);
        shape.setXYZW(index,.24,2.55,.1,1.56);index++;
      }
    }
    this.mesh.activeCount=count;this.mesh.instanceMatrix.needsUpdate=this.mesh.colorBuffer.needsUpdate=true;
    for(const a of [current,previous,shape])a.needsUpdate=true;
    this.mesh.computeBoundingSphere();if(count)this.mesh.boundingSphere.radius+=3.2;
  }
  present(tick:number):void {this.tick.value=tick;}
  prepareForCompile():()=>void {
    if(this.mesh.activeCount)return ()=>{};
    const version=this.mesh.instanceMatrix.version;this.mesh.activeCount=1;
    return ()=>{if(this.mesh.instanceMatrix.version===version)this.mesh.activeCount=0;};
  }
  dispose():void {this.mesh.dispose();this.base.dispose();this.material.dispose();}
}
