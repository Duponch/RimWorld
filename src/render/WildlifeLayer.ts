import { attachedFireMesh } from './FireLayer';
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
import { travelHeight } from './furniture-motion';
import { pawnSelectionMesh } from './PawnSelectionLayer';

/** Resident capacity and node graph. CPU supplies edges/phases at snapshots
 * and segment boundaries; continuous translation and the rig run on the GPU. */
class SpeciesRig {
  readonly mesh:THREE.Mesh;
  readonly flames:THREE.Mesh;
  readonly selection:THREE.Mesh;
  private selected:ReadonlySet<number>=new Set();
  readonly blend=uniform(1);private time=uniform(0);
  private keys=new Map<number,string>();private source:World|undefined;
  private animals:NonNullable<World['wildlife']>['animals']=[];
  private surfaces:ReadonlyMap<number,number>=new Map();
  constructor(readonly travelTime:WildlifeLayer['travelTime'],private readonly species:string,configure?:(m:THREE.MeshStandardNodeMaterial)=>void) {
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
    this.mesh=new THREE.Mesh(hareGeometry(MAX_WILDLIFE,this.species),mat);this.mesh.name=`Wild ${this.species} — GPU rig`;this.mesh.frustumCulled=false;this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.flames=attachedFireMesh(this.mesh.geometry,this,.6);
    this.mesh.geometry.computeBoundingBox();
    this.selection=pawnSelectionMesh(this.mesh.geometry as THREE.InstancedBufferGeometry,this);this.selection.visible=false;
  }
  setSelected(ids:ReadonlySet<number>):void {
    this.selected=ids;const geometry=this.selection.geometry as THREE.InstancedBufferGeometry,flags=geometry.getAttribute('aSelected') as THREE.InstancedBufferAttribute;
    geometry.instanceCount=this.animals.length;
    if(!ids.size&&!this.selection.visible)return;
    let any=false,changed=false;this.animals.forEach((a,i)=>{const enabled=ids.has(a.id),value=enabled?1:0;if(flags.getX(i)!==value){flags.setX(i,value);changed=true;}any||=enabled;});
    if(changed)flags.needsUpdate=true;this.selection.visible=any;
  }
  /** Read the same resident edges as the GPU, only on pointer gestures. */
  forEachPose(visit:(id:number,species:string,x:number,y:number,z:number,height:number,radius:number)=>void):void {
    const g=this.mesh.geometry,from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),times=g.getAttribute('aTravel'),state=g.getAttribute('aAnimal'),box=g.boundingBox!;
    const radius=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)/2+.1;
    this.animals.forEach((a,i)=>{
      const start=times.getX(i),end=times.getY(i),alpha=end>start?THREE.MathUtils.clamp((this.travelTime.value-start)/(end-start),0,1):1;
      const height=box.max.y*(1-Math.min(1,state.getZ(i))*.5);
      visit(a.id,this.species,THREE.MathUtils.lerp(from.getX(i),to.getX(i),alpha),travelHeight(from.getY(i),to.getY(i),THREE.MathUtils.lerp(times.getZ(i),times.getW(i),alpha)),THREE.MathUtils.lerp(from.getZ(i),to.getZ(i),alpha),height,radius);
    });
  }
  prepare():()=>void {const g=this.mesh.geometry as THREE.InstancedBufferGeometry,n=g.instanceCount;g.instanceCount=Math.max(1,n);return ()=>{g.instanceCount=n;};}
  update(world:World,timeline:MotionTimeline|undefined,surfaces:ReadonlyMap<number,number>):void {
    const changed=this.source!==world;
    if(changed){this.source=world;this.keys.clear();this.animals=(world.wildlife?.animals??[]).filter(a=>a.species===this.species);this.surfaces=surfaces;this.setSelected(this.selected);}
    const tick=timeline?.tick??world.tick,origin=Math.floor(tick/1024)*1024;
    this.travelTime.value=localTimeSeconds(tick,origin);this.time.value=localTimeSeconds(tick)%(2*Math.PI);
    const g=this.mesh.geometry as THREE.InstancedBufferGeometry,from=g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=g.getAttribute('aTo') as THREE.InstancedBufferAttribute,times=g.getAttribute('aTravel') as THREE.InstancedBufferAttribute,state=g.getAttribute('aAnimal') as THREE.InstancedBufferAttribute;
    if(changed){
    const fireSize=this.mesh.geometry.getAttribute('aFire') as THREE.InstancedBufferAttribute;
    const burning=new Map((world.fires?.items??[]).filter(f=>f.attachedAnimalId!==undefined).map(f=>[f.attachedAnimalId!,f.size]));
    const animals=this.animals;
    animals.forEach((a,i)=>fireSize.setX(i,burning.has(a.id)?Math.max(.5,burning.get(a.id)!):0));if(!animals.length)fireSize.setX(0,0);fireSize.needsUpdate=true;
    (this.flames.geometry as THREE.InstancedBufferGeometry).instanceCount=Math.max(1,animals.length);
    }
    const animals=this.animals;g.instanceCount=animals.length;let dirty=false;
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

/** Six small resident actor batches; geometry never depends on population or frame. */
export class WildlifeLayer {
  readonly mesh=new THREE.Group();readonly flames=new THREE.Group();readonly travelTime=uniform(0);
  private rigs:SpeciesRig[];private source?:World;private surfaces:ReadonlyMap<number,number>=new Map();
  constructor(configure?:(m:THREE.MeshStandardNodeMaterial)=>void){
    this.rigs=['hare','snow-hare','deer','muffalo','gazelle','dromedary'].map(species=>new SpeciesRig(this.travelTime,species,configure));
    for(const rig of this.rigs){this.mesh.add(rig.mesh,rig.selection);this.flames.add(rig.flames);}
  }
  setSelected(ids:ReadonlySet<number>):void {for(const rig of this.rigs)rig.setSelected(ids);}
  forEachPose(visit:(id:number,species:string,x:number,y:number,z:number,height:number,radius:number)=>void):void {for(const rig of this.rigs)rig.forEachPose(visit);}
  update(world:World,timeline:MotionTimeline|undefined):void{if(this.source!==world){this.source=world;this.surfaces=furnitureSurfaces(world);}for(const rig of this.rigs)rig.update(world,timeline,this.surfaces);}
  prepare():()=>void{const restores=this.rigs.map(r=>r.prepare());return()=>{for(const restore of restores)restore();};}
  dispose():void{for(const r of this.rigs)for(const m of [r.mesh,r.flames,r.selection]){m.geometry.dispose();(m.material as THREE.Material).dispose();}}
}
