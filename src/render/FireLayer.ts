import { PAWN_MODEL_SCALE } from '../world/scale';
import * as THREE from 'three/webgpu';
import { Fn,attribute,positionLocal,positionGeometry,sin,cos,uniform,vec3,mix } from 'three/tsl';
import { pawnPresentationPose } from './pawn-presentation';
import type { PawnLayer } from './PawnLayer';
import type { World } from '../sim/types';

function fireGeometry():THREE.InstancedBufferGeometry {
  const source=new THREE.ConeGeometry(.38,1.5,5,1),g=new THREE.InstancedBufferGeometry();
  g.index=source.index;for(const [name,a] of Object.entries(source.attributes))g.setAttribute(name,a);
  return g;
}
function fireMaterial():THREE.MeshBasicNodeMaterial {
  const m=new THREE.MeshBasicNodeMaterial();
  m.colorNode=mix(vec3(1,.71,.08),vec3(1,.14,.015),positionGeometry.y.add(.75).div(1.5).clamp(0,1));
  return m;
}
/** Ground fires share one prepared instanced graph. No lights/shadows per fire. */
export class FireLayer {
  readonly mesh:THREE.Mesh;
  private readonly tick=uniform(0);
  private capacity=32;
  private signature='';
  constructor(){
    const material=fireMaterial();
    material.positionNode=Fn(()=>{
      const data=attribute('firePosition','vec4'),pulse=sin(this.tick.mul(.9).add(data.x.mul(7)).add(data.z)).mul(.15).add(1);
      const p=vec3(positionLocal.x,positionLocal.y.add(.75).mul(pulse),positionLocal.z).mul(data.w);
      return data.w.greaterThan(0).select(p.add(data.xyz),vec3(0,-100,0));
    })();
    this.mesh=new THREE.Mesh(fireGeometry(),material);this.mesh.name='Ground fire — shared GPU flames';this.mesh.frustumCulled=false;this.allocate();
  }
  private allocate():void {
    this.mesh.geometry.dispose();this.mesh.geometry.setAttribute('firePosition',new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4));
    (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount=1;
  }
  adopt(world:World,reset=false):void {
    const fires=(world.fires?.items??[]).filter(f=>f.attachedPawnId===undefined&&f.attachedAnimalId===undefined);
    const key=fires.map(f=>`${f.id}:${f.x}:${f.z}:${f.size}`).join('|');if(!reset&&key===this.signature)return;this.signature=key;
    if(fires.length>this.capacity){while(this.capacity<fires.length)this.capacity*=2;this.allocate();}
    const a=this.mesh.geometry.getAttribute('firePosition') as THREE.InstancedBufferAttribute;
    fires.forEach((f,i)=>a.setXYZW(i,f.x,0,f.z,f.size));if(!fires.length)a.setXYZW(0,0,-100,0,0);
    a.needsUpdate=true;(this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount=Math.max(1,fires.length);
  }
  present(tick:number):void {this.tick.value=tick%4096;}
  dispose():void {this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}

/** Burning actors share their body's exact motion attributes, including stun,
 * slowed edges, furniture heights and carried-patient pose adjustments. */
export function attachedFireMesh(source:THREE.BufferGeometry,clock:Pick<PawnLayer,'travelTime'|'blend'>,scale=1):THREE.Mesh {
  const geometry=fireGeometry(),count=source.getAttribute('aFrom').count;
  const size=new THREE.InstancedBufferAttribute(new Float32Array(count),1);source.setAttribute('aFire',size);
  const carried=source.hasAttribute('aMotion');
  for(const name of ['aFrom','aTo','aTravel','aFire',...(carried?['aMotion']:[])])geometry.setAttribute(name,source.getAttribute(name));
  const material=fireMaterial();material.positionNode=Fn(()=>{
    const size=attribute('aFire','float'),pose=pawnPresentationPose(clock);
    const pulse=sin(clock.travelTime.mul(8).add(pose.x)).mul(.15).add(1);
    const local=vec3(positionLocal.x,positionLocal.y.add(.75).mul(pulse),positionLocal.z).mul(size.mul(scale));
    const offset=carried?attribute('aMotion','vec4').z.equal(6).select(vec3(sin(pose.w).mul(.3*PAWN_MODEL_SCALE),.95+.19*PAWN_MODEL_SCALE,cos(pose.w).mul(.3*PAWN_MODEL_SCALE)),vec3(0)):vec3(0);
    return size.greaterThan(0).select(local.add(pose.xyz).add(offset),vec3(0,-100,0));
  })();
  geometry.instanceCount=1;const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='Attached fire — body GPU poses';return mesh;
}
