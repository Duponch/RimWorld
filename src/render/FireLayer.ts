import { PAWN_MODEL_SCALE } from '../world/scale';
import * as THREE from 'three/webgpu';
import { Fn,attribute,float,positionLocal,positionGeometry,sin,cos,uniform,vec3,mix } from 'three/tsl';
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
      const data=attribute('firePosition','vec4'),height=positionLocal.y.add(.75);
      const phase=this.tick.mul(2*Math.PI/18).add(data.x.mul(7)).add(data.z.mul(11));
      const pulse=sin(phase).mul(.14).add(.96);
      const sway=sin(phase.add(height.mul(2.4))).mul(height).mul(.10);
      const curl=cos(phase.mul(1.27).add(height.mul(2.1))).mul(height).mul(.07);
      const p=vec3(positionLocal.x.add(sway),height.mul(pulse),positionLocal.z.add(curl)).mul(data.w);
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
    const campfires=world.structures.filter(s=>s.kind==='campfire'&&!!s.fuel?.ticks);
    const key=fires.map(f=>`${f.id}:${f.x}:${f.z}:${f.size}`).join('|')+';'+campfires.map(s=>`${s.id}:${s.x}:${s.z}`).join('|');if(!reset&&key===this.signature)return;this.signature=key;
    const count=fires.length+campfires.length*3;
    if(count>this.capacity){while(this.capacity<count)this.capacity*=2;this.allocate();}
    const a=this.mesh.geometry.getAttribute('firePosition') as THREE.InstancedBufferAttribute;
    // A new small fire used to disappear behind the ground/logs in the
    // isometric view. Keep one GPU instance per ground fire, but give its
    // visible flame a minimum silhouette while preserving size ordering.
    let i=0;for(const f of fires)a.setXYZW(i++,f.x,0,f.z,Math.max(.46,f.size*1.25));
    for(const s of campfires)for(let j=0;j<3;j++)a.setXYZW(i++,s.x+(j-1)*.13,.2+(j%2)*.045,s.z+(j%2)*.09,j===1?.54:.40);
    if(!count)a.setXYZW(0,0,-100,0,0);
    a.needsUpdate=true;(this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount=Math.max(1,count);
  }
  present(tick:number):void {this.tick.value=((tick%3600)+3600)%3600;}
  dispose():void {this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}

/** Burning actors share their body's exact motion attributes, including stun,
 * slowed edges, furniture heights and carried-patient pose adjustments. */
export function attachedFireMesh(source:THREE.BufferGeometry,clock:Pick<PawnLayer,'travelTime'|'blend'>,scale=1):THREE.Mesh {
  const geometry=fireGeometry(),count=source.getAttribute('aFrom').count;
  const size=new THREE.InstancedBufferAttribute(new Float32Array(count),1);source.setAttribute('aFire',size);
  const carried=source.hasAttribute('aMotion');
  const scaled=source.hasAttribute('aScale');
  for(const name of ['aFrom','aTo','aTravel','aFire',...(carried?['aMotion']:[]),...(scaled?['aScale']:[])])geometry.setAttribute(name,source.getAttribute(name));
  const material=fireMaterial();material.positionNode=Fn(()=>{
    const size=attribute('aFire','float'),pose=pawnPresentationPose(clock);
    const pulse=sin(clock.travelTime.mul(8).add(pose.x)).mul(.15).add(1);
    const local=vec3(positionLocal.x,positionLocal.y.add(.75).mul(pulse),positionLocal.z)
      .mul(size.mul(scale).mul(scaled?attribute('aScale','float'):float(1)));
    const offset=carried?attribute('aMotion','vec4').z.equal(6).select(vec3(sin(pose.w).mul(.3*PAWN_MODEL_SCALE),.95+.19*PAWN_MODEL_SCALE,cos(pose.w).mul(.3*PAWN_MODEL_SCALE)),vec3(0)):vec3(0);
    return size.greaterThan(0).select(local.add(pose.xyz).add(offset),vec3(0,-100,0));
  })();
  geometry.instanceCount=1;const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='Attached fire — body GPU poses';return mesh;
}
