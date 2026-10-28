import * as THREE from 'three/webgpu';
import { Fn,attribute,mix,positionLocal,uniform,vec3 } from 'three/tsl';
import type {CorePhaseTypedProjection297} from '../bridge/core-phase-projection-297';
import type { World } from '../sim/types';
import type { AnimationDetail } from './AnimationDetail';
import { FxAnimationCache,fxClamp } from './FxAnimationCache';

interface Trace {start:number;end:number;delay:number;duration:number;from:{x:number;z:number};to:{x:number;z:number};emp:boolean}
/** Confirmed flight history arrives before scene adoption, like motion tracks.
 * Only the shared presentation clock reveals it. No simulation or CPU per-ball
 * animation; uploads occur on emission/arrival/retention changes only. */
export class ProjectileLayer {
  readonly tick=uniform(0);
  readonly mesh:THREE.Mesh;
  private capacity=32;
  private readonly traces=new Map<number,Trace>();
  private signature='';
  private nextExpiry297=Infinity;
  private origin=0;
  private readonly cache:FxAnimationCache;
  private drawn:number[]=[];
  private readonly gold=new THREE.Color(0xffd49a);
  private readonly blue=new THREE.Color(0x8cefff);
  constructor(private readonly detail?:AnimationDetail) {
    this.cache=new FxAnimationCache(5,detail);
    const base=new THREE.BoxGeometry(.055,.055,.28),geometry=new THREE.InstancedBufferGeometry();
    geometry.index=base.index;for(const [name,a] of Object.entries(base.attributes))geometry.setAttribute(name,a);
    const material=new THREE.MeshBasicNodeMaterial();material.colorNode=attribute('bulletColor','vec3');
    material.positionNode=this.cache.choose(()=>Fn(()=>{
      const from=attribute('bulletFrom','vec3'),to=attribute('bulletTo','vec3'),times=attribute('bulletTime','vec4');
      const visible=this.tick.greaterThanEqual(times.x).and(this.tick.lessThan(times.y));
      const alpha=this.tick.sub(times.x).sub(times.z).div(times.w.max(.0001)).clamp(0,1);
      const delta=to.sub(from),direction=delta.div(delta.length().max(.0001)),right=vec3(direction.z,0,direction.x.negate());
      const position=mix(from,to,alpha).add(right.mul(positionLocal.x)).add(vec3(0,positionLocal.y,0)).add(direction.mul(positionLocal.z));
      return visible.select(position,vec3(0,-100,0));
    })(),()=>this.cache.affine(positionLocal));
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.frustumCulled=false;this.allocate();
  }
  private allocate():void {
    const g=this.mesh.geometry;
    // Release the old GPU buffers on growth; this geometry owns its base data.
    g.dispose();
    for(const [name,size] of [['bulletFrom',3],['bulletTo',3],['bulletTime',4],['bulletColor',3]] as const)g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*size),size).setUsage(THREE.StaticDrawUsage));
    g.setAttribute('fxSlot',new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1));this.drawn=[];
    // One invisible instance keeps the pipeline prepared even before any shot.
    (g as THREE.InstancedBufferGeometry).instanceCount=0;
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
        this.traces.set(p.id,{start:p.emittedAtCore/10,end:end/10,delay:(total-duration)/10,duration:duration/10,from:{x:f.origin.x,z:f.origin.z},to:{x:f.destination.x,z:f.destination.z},emp:p.weaponItem==='emp-launcher'});
      }
    }
    if(!changed)return;
    this.rebuild297();
  }
  /** Input is derived by Scene only after a private Native receipt. Physical
   * removal never retracts confirmed visual history before its TTL. */
  adoptPhase297(input:CorePhaseTypedProjection297,reset=false):void {
    if(reset){this.traces.clear();this.signature='';this.nextExpiry297=Infinity;}
    let changed=reset;const at=input.core/10,origin=Math.floor(at/1024)*1024;
    if(origin!==this.origin){this.origin=origin;changed=true;}
    if(at>this.nextExpiry297){this.nextExpiry297=Infinity;for(const[id,t]of this.traces){if(t.end<at-64){this.traces.delete(id);changed=true;}else this.nextExpiry297=Math.min(this.nextExpiry297,t.end+64);}}
    for(const p of input.projectiles.upserted){const old=this.traces.get(p.id),start=p.emittedAtCore/10,end=p.endCore/10,delay=p.delayCore/10,duration=p.durationCore/10;
      if(old&&old.start===start&&old.end===end&&old.delay===delay&&old.duration===duration&&old.from.x===p.from.x&&old.from.z===p.from.z&&old.to.x===p.to.x&&old.to.z===p.to.z&&old.emp===p.emp)continue;
      this.traces.set(p.id,{start,end,delay,duration,from:p.from,to:p.to,emp:p.emp});this.nextExpiry297=Math.min(this.nextExpiry297,end+64);changed=true;
    }
    if(changed)this.rebuild297();
  }
  private rebuild297():void {
    this.cache.reset();this.drawn=[];
    if(this.traces.size>this.capacity){while(this.capacity<this.traces.size)this.capacity*=2;this.allocate();}
    const g=this.mesh.geometry,a=g.getAttribute('bulletFrom') as THREE.InstancedBufferAttribute,b=g.getAttribute('bulletTo') as THREE.InstancedBufferAttribute,t=g.getAttribute('bulletTime') as THREE.InstancedBufferAttribute;
    const c=g.getAttribute('bulletColor') as THREE.InstancedBufferAttribute,gold=new THREE.Color(0xffd49a),blue=new THREE.Color(0x8cefff);let index=0;
    for(const trace of this.traces.values()) {
      a.setXYZ(index,trace.from.x-.5,1.12,trace.from.z-.5);b.setXYZ(index,trace.to.x-.5,1.12,trace.to.z-.5);t.setXYZW(index,trace.start-this.origin,trace.end-this.origin,trace.delay,trace.duration);const color=trace.emp?blue:gold;c.setXYZ(index,color.r,color.g,color.b);index++;
    }
    if(!index)t.setXY(0,0,0);
    (g as THREE.InstancedBufferGeometry).instanceCount=Math.max(1,index);a.needsUpdate=b.needsUpdate=t.needsUpdate=c.needsUpdate=true;
  }
  present(tick:number):void {
    this.tick.value=tick-this.origin;
    if(!this.detail)return;
    const g=this.mesh.geometry as THREE.InstancedBufferGeometry,a=g.getAttribute('bulletFrom') as THREE.InstancedBufferAttribute,b=g.getAttribute('bulletTo') as THREE.InstancedBufferAttribute,t=g.getAttribute('bulletTime') as THREE.InstancedBufferAttribute,c=g.getAttribute('bulletColor') as THREE.InstancedBufferAttribute,slots=g.getAttribute('fxSlot') as THREE.InstancedBufferAttribute;
    let row=0,count=0,dirty=false;
    for(const trace of this.traces.values()){
      // Birth/arrival visibility follows the confirmed clock even between
      // medium samples; a retained history never leaves a stale bullet alive.
      if(tick<trace.start||tick>=trace.end){row++;continue;}
      const alpha=fxClamp((tick-trace.start-trace.delay)/Math.max(.0001,trace.duration)),x=trace.from.x+(trace.to.x-trace.from.x)*alpha-.5,z=trace.from.z+(trace.to.z-trace.from.z)*alpha-.5;
      const level=this.cache.sample(row,x,1.12,z,()=>{
        const dx=trace.to.x-trace.from.x,dz=trace.to.z-trace.from.z,length=Math.max(.0001,Math.hypot(dx,dz)),nx=dx/length,nz=dz/length;
        this.cache.set(row,1,nz,0,-nx);this.cache.set(row,2,0,1,0);this.cache.set(row,3,nx,0,nz);this.cache.set(row,4,x,1.12,z);
      });
      if(level!==2){if(this.drawn[count]!==row){a.setXYZ(count,trace.from.x-.5,1.12,trace.from.z-.5);b.setXYZ(count,trace.to.x-.5,1.12,trace.to.z-.5);t.setXYZW(count,trace.start-this.origin,trace.end-this.origin,trace.delay,trace.duration);const color=trace.emp?this.blue:this.gold;c.setXYZ(count,color.r,color.g,color.b);slots.setX(count,row);this.drawn[count]=row;dirty=true;}count++;}row++;
    }
    this.drawn.length=count;if(dirty)a.needsUpdate=b.needsUpdate=t.needsUpdate=c.needsUpdate=slots.needsUpdate=true;
    g.instanceCount=count;this.mesh.visible=count>0;this.cache.flush();
  }
  dispose():void {this.cache.dispose();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.traces.clear();}
}
