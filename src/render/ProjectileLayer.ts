import * as THREE from 'three/webgpu';
import { Fn,attribute,mix,positionLocal,uniform,vec3 } from 'three/tsl';
import type { World } from '../sim/types';

interface Trace {start:number;end:number;delay:number;duration:number;from:{x:number;z:number};to:{x:number;z:number}}
/** Confirmed flight history arrives before scene adoption, like motion tracks.
 * Only the shared presentation clock reveals it. No simulation or CPU per-ball
 * animation; uploads occur on emission/arrival/retention changes only. */
export class ProjectileLayer {
  readonly tick=uniform(0);
  readonly mesh:THREE.Mesh;
  private capacity=32;
  private readonly traces=new Map<number,Trace>();
  private signature='';
  private origin=0;
  constructor() {
    const base=new THREE.BoxGeometry(.055,.055,.28),geometry=new THREE.InstancedBufferGeometry();
    geometry.index=base.index;for(const [name,a] of Object.entries(base.attributes))geometry.setAttribute(name,a);
    const material=new THREE.MeshBasicNodeMaterial({color:0xffd49a});
    material.positionNode=Fn(()=>{
      const from=attribute('bulletFrom','vec3'),to=attribute('bulletTo','vec3'),times=attribute('bulletTime','vec4');
      const visible=this.tick.greaterThanEqual(times.x).and(this.tick.lessThan(times.y));
      const alpha=this.tick.sub(times.x).sub(times.z).div(times.w.max(.0001)).clamp(0,1);
      const delta=to.sub(from),direction=delta.div(delta.length().max(.0001)),right=vec3(direction.z,0,direction.x.negate());
      const position=mix(from,to,alpha).add(right.mul(positionLocal.x)).add(vec3(0,positionLocal.y,0)).add(direction.mul(positionLocal.z));
      return visible.select(position,vec3(0,-100,0));
    })();
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.frustumCulled=false;this.allocate();
  }
  private allocate():void {
    const g=this.mesh.geometry;
    // Release the old GPU buffers on growth; this geometry owns its base data.
    g.dispose();
    for(const [name,size] of [['bulletFrom',3],['bulletTo',3],['bulletTime',4]] as const)g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*size),size).setUsage(THREE.StaticDrawUsage));
    // One invisible instance keeps the pipeline prepared even before any shot.
    (g as THREE.InstancedBufferGeometry).instanceCount=1;
  }
  adopt(world:World,reset=false):void {
    if(reset){this.traces.clear();this.signature='';}
    let changed=reset;
    const origin=Math.floor(world.tick/1024)*1024;if(origin!==this.origin){this.origin=origin;changed=true;}
    for(const [id,t] of this.traces)if(t.end<world.tick-64){this.traces.delete(id);changed=true;}
    const signature=JSON.stringify(world.projectiles?.map(p=>[p.id,p.emittedAtCore,p.arrival]));
    if(signature!==this.signature) {
      this.signature=signature;changed=true;
      for(const p of world.projectiles??[]) {
        const f=p.flight,duration=Math.max(.001,Math.hypot(f.destination.x-f.origin.x,f.destination.z-f.origin.z)/f.speedPerCoreTick),total=Math.ceil(duration);
        const end=p.arrival?p.advancedAtCore:p.emittedAtCore+total;
        this.traces.set(p.id,{start:p.emittedAtCore/10,end:end/10,delay:(total-duration)/10,duration:duration/10,from:f.origin,to:f.destination});
      }
    }
    if(!changed)return;
    if(this.traces.size>this.capacity){while(this.capacity<this.traces.size)this.capacity*=2;this.allocate();}
    const g=this.mesh.geometry,a=g.getAttribute('bulletFrom') as THREE.InstancedBufferAttribute,b=g.getAttribute('bulletTo') as THREE.InstancedBufferAttribute,t=g.getAttribute('bulletTime') as THREE.InstancedBufferAttribute;
    let index=0;
    for(const trace of this.traces.values()) {
      a.setXYZ(index,trace.from.x-.5,1.12,trace.from.z-.5);b.setXYZ(index,trace.to.x-.5,1.12,trace.to.z-.5);t.setXYZW(index,trace.start-this.origin,trace.end-this.origin,trace.delay,trace.duration);index++;
    }
    if(!index)t.setXY(0,0,0);
    (g as THREE.InstancedBufferGeometry).instanceCount=Math.max(1,index);a.needsUpdate=b.needsUpdate=t.needsUpdate=true;
  }
  present(tick:number):void {this.tick.value=tick-this.origin;}
  dispose():void {this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.traces.clear();}
}
