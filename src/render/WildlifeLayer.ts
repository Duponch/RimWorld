import * as THREE from 'three/webgpu';
import { coreTimeSeconds,localTimeSeconds } from '../bridge/clock-rate';
import { Fn,If,attribute,cos,sin,float,positionLocal,vec3,uniform,mix,min } from 'three/tsl';
import { hareGeometry } from './hare-geometry';
import { material } from './primitives';
import { pawnPresentationPose } from './pawn-presentation';
import type { World } from '../sim/types';
import { MAX_WILDLIFE } from '../sim/wildlife-state';
import type { MotionTimeline } from './MotionTimeline';
import { furnitureSurfaces } from './furniture-motion';

/** Resident capacity and node graph. CPU supplies edges/phases at snapshots
 * and segment boundaries; continuous translation and the rig run on the GPU. */
export class WildlifeLayer {
  readonly mesh:THREE.Mesh;
  readonly travelTime=uniform(0);readonly blend=uniform(1);private time=uniform(0);
  private keys=new Map<number,string>();private source:World|undefined;
  private surfaces:ReadonlyMap<number,number>=new Map();
  constructor(configure?:(m:THREE.MeshStandardNodeMaterial)=>void) {
    const mat=material(0xffffff);configure?.(mat);mat.colorNode=mix(attribute('color','vec3'),vec3(.42,.4,.37),attribute('aAnimal','vec4').z.sub(1).max(0));
    mat.positionNode=Fn(()=>{
      const pose=pawnPresentationPose(this),state=attribute('aAnimal','vec4'),bone=attribute('boneId','float'),pivot=attribute('bindPivot','vec3');
      const angle=float(0).toVar(),phase=this.time.mul(12).add(state.w);
      If(bone.equal(1),()=>angle.assign(sin(phase).mul(.5).mul(state.x)));
      If(bone.equal(2),()=>angle.assign(sin(phase.add(Math.PI)).mul(.6).mul(state.x)));
      If(bone.equal(3),()=>{
        const attack=sin(this.travelTime.sub(state.w).mul(10).clamp(0,Math.PI)).mul(.9);
        angle.assign(state.y.greaterThan(1).select(attack,state.y.mul(sin(this.time.mul(5)).mul(.12).add(.48))));
      });
      const p=positionLocal.sub(pivot),c=cos(angle),s=sin(angle);
      const q=vec3(p.x,p.y.mul(c).sub(p.z.mul(s)),p.z.mul(c).add(p.y.mul(s))).add(pivot).toVar();
      q.y.mulAssign(float(1).sub(min(state.z,1).mul(.5)));q.y.addAssign(sin(phase).abs().mul(.08).mul(state.x));
      const cy=cos(pose.w),sy=sin(pose.w);
      return vec3(q.x.mul(cy).add(q.z.mul(sy)),q.y,q.z.mul(cy).sub(q.x.mul(sy))).add(pose.xyz);
    })();
    this.mesh=new THREE.Mesh(hareGeometry(MAX_WILDLIFE),mat);this.mesh.name='Wild hares — GPU rig';this.mesh.frustumCulled=false;this.mesh.castShadow=true;this.mesh.receiveShadow=true;
  }
  prepare():()=>void {const g=this.mesh.geometry as THREE.InstancedBufferGeometry,n=g.instanceCount;g.instanceCount=Math.max(1,n);return ()=>{g.instanceCount=n;};}
  update(world:World,timeline:MotionTimeline|undefined):void {
    if(this.source!==world){this.source=world;this.keys.clear();this.surfaces=furnitureSurfaces(world);}
    const tick=timeline?.tick??world.tick,origin=Math.floor(tick/1024)*1024;
    this.travelTime.value=localTimeSeconds(tick,origin);this.time.value=localTimeSeconds(tick)%(2*Math.PI);
    const g=this.mesh.geometry as THREE.InstancedBufferGeometry,from=g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=g.getAttribute('aTo') as THREE.InstancedBufferAttribute,times=g.getAttribute('aTravel') as THREE.InstancedBufferAttribute,state=g.getAttribute('aAnimal') as THREE.InstancedBufferAttribute;
    const animals=world.wildlife?.animals??[];g.instanceCount=animals.length;let dirty=false;
    animals.forEach((a,i)=>{
      const edge=timeline?.segment(a.id)??a.motion,active=!!edge&&tick>=edge.start&&tick<edge.end;
      const key=`${i}:${origin}:${edge?.start}:${edge?.end}:${active}:${a.state}:${a.meal?.id}:${a.strike?.atCore}:${a.stun?.untilCore}:${a.threat?.targetId}`;if(this.keys.get(a.id)===key)return;this.keys.set(a.id,key);dirty=true;
      const fallen=a.state==='dead'||a.state==='downed';
      const traveling=!!edge&&(active||a.state==='moving'&&world.tick<edge.end);
      const f=traveling?edge.from:a,t=traveling?edge.to:a;
      let yaw=edge?Math.atan2(edge.to.x-edge.from.x,edge.to.z-edge.from.z):0;
      if(!traveling&&a.meal){const m=a.meal,target=m.kind==='plant'?world.resources.find(r=>r.id===m.id):world.piles.find(p=>p.id===m.id)?.owner;if(target&&'x' in target&&(target.x!==a.x||target.z!==a.z))yaw=Math.atan2(target.x-a.x,target.z-a.z);}
      if(!traveling&&(a.strike||a.threat)){const target=world.pawns.find(p=>p.id===(a.strike?.targetId??a.threat?.targetId));if(target&&(target.x!==a.x||target.z!==a.z))yaw=Math.atan2(target.x-a.x,target.z-a.z);}
      const fa=traveling&&'fromFraction' in edge?Number(edge.fromFraction??0):0,fb=traveling&&'toFraction' in edge?Number(edge.toFraction??1):1,lerp=THREE.MathUtils.lerp;
      from.setXYZW(i,lerp(f.x,t.x,fa),this.surfaces.get(f.z*world.width+f.x)??0,lerp(f.z,t.z,fa),yaw);to.setXYZW(i,lerp(f.x,t.x,fb),this.surfaces.get(t.z*world.width+t.x)??0,lerp(f.z,t.z,fb),yaw);
      times.setXYZW(i,traveling?localTimeSeconds(edge.start,origin):0,traveling?localTimeSeconds(edge.end,origin):0,fa,fb);
      state.setXYZW(i,active&&!fallen&&!a.stun&&(!edge||!('fromFraction' in edge)||!('toFraction' in edge)||edge.fromFraction!==edge.toFraction)?1:0,!traveling&&a.strike&&!a.stun?2:!traveling&&a.state==='eating'?1:0,a.state==='dead'?2:fallen||!traveling&&a.state==='sleeping'?1:0,a.strike?coreTimeSeconds(a.strike.atCore,origin):a.id%30);
    });
    if(dirty)for(const a of [from,to,times,state])a.needsUpdate=true;
  }
}
