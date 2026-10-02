import { attachedFireMesh } from './FireLayer';
import * as THREE from 'three/webgpu';
import { coreTimeSeconds,localTimeSeconds } from '../bridge/clock-rate';
import { Fn,If,attribute,cos,sin,float,normalLocal,positionLocal,vec3,uniform,mix } from 'three/tsl';
import { hareGeometry } from './hare-geometry';
import { animalParts } from './animal-shape';
import { material } from './primitives';
import { pawnPresentationPose } from './pawn-presentation';
import { headingAt,turnToward,TURN_TICKS,type TurnHeading } from './turn-presentation';
import { TICKS_PER_SECOND,type World } from '../sim/types';
import { MAX_WILDLIFE } from '../sim/wildlife-state';
import type { MotionTimeline } from './MotionTimeline';
import { furnitureSurfaces } from './furniture-motion';
import { travelHeight } from './furniture-motion';
import { pawnSelectionMesh } from './PawnSelectionLayer';
import { createStylizedSurfaceTexture } from './stylized-surfaces';
import { actorSurfaceShade } from './actor-surface';
import { animalBodySize } from '../sim/animal-life';
import { animalSpecies } from '../sim/animal-species';
import { GaitPhaseTracker,animalGaitRadiansPerUnit } from './gait-presentation';

/** Resident capacity and node graph. CPU supplies edges/phases at snapshots
 * and segment boundaries; continuous translation and the rig run on the GPU. */
class SpeciesRig {
  readonly mesh:THREE.Mesh;
  readonly flames:THREE.Mesh;
  readonly selection:THREE.Mesh;
  readonly plainMaterial:THREE.MeshStandardNodeMaterial;
  readonly texturedMaterial:THREE.MeshStandardNodeMaterial;
  private selected:ReadonlySet<number>=new Set();
  readonly blend=uniform(1);private time=uniform(0);
  private keys=new Map<number,string>();private source:World|undefined;
  private headings=new Map<number,TurnHeading>();
  private readonly gait=new GaitPhaseTracker();
  private readonly gaitRate:number;
  private readonly restingHeight:number;
  private readonly restingRadius:number;
  private animals:NonNullable<World['wildlife']>['animals']=[];
  private surfaces:ReadonlyMap<number,number>=new Map();
  constructor(readonly travelTime:WildlifeLayer['travelTime'],private readonly species:string,surfaceTexture:THREE.Texture,configure?:(m:THREE.MeshStandardNodeMaterial)=>void) {
    this.gaitRate=animalGaitRadiansPerUnit(species);
    const geometry=hareGeometry(MAX_WILDLIFE,species);
    geometry.computeBoundingBox();
    const bounds=geometry.boundingBox!;
    // A live sleeper or downed animal rolls onto its side around the trunk.
    // The full bind-space width sets its floor and height; no axis is crushed.
    const restFloor=.025-bounds.min.x,bodyCenter=animalParts(species)[0]!.center[1];
    this.restingHeight=bounds.max.x+restFloor;
    this.restingRadius=Math.max(Math.abs(bodyCenter-bounds.min.y),Math.abs(bodyCenter-bounds.max.y),Math.abs(bounds.min.z),Math.abs(bounds.max.z))+.1;
    const mat=material(0xffffff);configure?.(mat);mat.colorNode=mix(attribute('color','vec3'),vec3(.42,.4,.37),attribute('aAnimal','vec4').z.sub(1).max(0));
    mat.positionNode=Fn(()=>{
      const pose=pawnPresentationPose(this),state=attribute('aAnimal','vec4'),bone=attribute('boneId','float'),pivot=attribute('bindPivot','vec3');
      const angle=float(0).toVar();
      const phase=state.w.add(pose.xz.sub(attribute('aFrom','vec4').xz).length().mul(this.gaitRate));
      If(bone.equal(1),()=>angle.assign(sin(phase).mul(.5).mul(state.x)));
      If(bone.equal(2),()=>angle.assign(sin(phase.add(Math.PI)).mul(.6).mul(state.x)));
      If(bone.greaterThanEqual(3),()=>{
        const attack=sin(this.travelTime.sub(state.w).mul(10).clamp(0,Math.PI)).mul(.9);
        angle.assign(state.x.greaterThan(.5).select(sin(phase).mul(.06),
          state.y.greaterThan(1).select(attack,state.y.mul(sin(this.time.mul(5)).mul(.12).add(.48)))));
        If(state.x.lessThan(.5).and(state.y.lessThan(.5)).and(state.z.lessThan(.5)),()=>{
          angle.assign(sin(this.time.add(state.w)).mul(.03));
        });
        // The outer shell bends continuously into the head. Existing detail
        // pieces use bone 3 (full angle); shell vertices encode 4 + weight.
        If(bone.greaterThanEqual(4),()=>angle.mulAssign(bone.sub(4)));
      });
      const p=positionLocal.sub(pivot),c=cos(angle),s=sin(angle);
      const q=vec3(p.x,p.y.mul(c).sub(p.z.mul(s)),p.z.mul(c).add(p.y.mul(s))).add(pivot).toVar();
      const n=normalLocal.toVar();
      const normal=vec3(n.x,n.y.mul(c).sub(n.z.mul(s)),n.z.mul(c).add(n.y.mul(s))).toVar();
      If(state.z.equal(1),()=>{
        const x=q.x.toVar(),y=q.y.toVar(),nx=normal.x.toVar();
        q.x.assign(float(bodyCenter).sub(y));q.y.assign(x.add(restFloor));
        normal.x.assign(normal.y.negate());normal.y.assign(nx);
      });
      // Keep the established corpse silhouette and its ground-body proxy.
      If(state.z.greaterThan(1.5),()=>{q.y.mulAssign(.5);normal.y.mulAssign(2);});
      q.y.addAssign(sin(phase).abs().mul(.08).mul(state.x));
      If(state.x.lessThan(.5).and(state.y.lessThan(.5)).and(state.z.lessThan(.5)).and(bone.equal(0).or(bone.greaterThanEqual(3))),()=>{
        q.y.addAssign(sin(this.time.add(state.w)).mul(.006));
      });
      const cy=cos(pose.w),sy=sin(pose.w);
      normalLocal.assign(vec3(normal.x.mul(cy).add(normal.z.mul(sy)),normal.y,normal.z.mul(cy).sub(normal.x.mul(sy))).normalize());
      return vec3(q.x.mul(cy).add(q.z.mul(sy)),q.y,q.z.mul(cy).sub(q.x.mul(sy)))
        .mul(attribute('aScale','float')).add(pose.xyz);
    })();
    const textured=material(0xffffff);configure?.(textured);
    textured.positionNode=mat.positionNode;
    textured.colorNode=mat.colorNode.mul(actorSurfaceShade(surfaceTexture));
    this.plainMaterial=mat;this.texturedMaterial=textured;
    this.mesh=new THREE.Mesh(geometry,textured);this.mesh.name=`Wild ${this.species} — GPU rig`;this.mesh.frustumCulled=false;this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.flames=attachedFireMesh(this.mesh.geometry,this,.6);
    this.selection=pawnSelectionMesh(this.mesh.geometry as THREE.InstancedBufferGeometry,this);this.selection.visible=false;
  }
  setTexturesEnabled(enabled:boolean):void {this.mesh.material=enabled?this.texturedMaterial:this.plainMaterial;}
  setSelected(ids:ReadonlySet<number>):void {
    this.selected=ids;const geometry=this.selection.geometry as THREE.InstancedBufferGeometry,flags=geometry.getAttribute('aSelected') as THREE.InstancedBufferAttribute;
    geometry.instanceCount=this.animals.length;
    if(!ids.size&&!this.selection.visible)return;
    let any=false,changed=false;this.animals.forEach((a,i)=>{const enabled=ids.has(a.id),value=enabled?1:0;if(flags.getX(i)!==value){flags.setX(i,value);changed=true;}any||=enabled;});
    if(changed)flags.needsUpdate=true;this.selection.visible=any;
  }
  /** Read the same resident edges as the GPU, only on pointer gestures. */
  forEachPose(visit:(id:number,species:string,x:number,y:number,z:number,height:number,radius:number)=>void):void {
    const g=this.mesh.geometry,from=g.getAttribute('aFrom'),to=g.getAttribute('aTo'),times=g.getAttribute('aTravel'),state=g.getAttribute('aAnimal'),scale=g.getAttribute('aScale'),box=g.boundingBox!;
    const radius=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)/2+.1;
    this.animals.forEach((a,i)=>{
      const start=times.getX(i),end=times.getY(i),alpha=end>start?THREE.MathUtils.clamp((this.travelTime.value-start)/(end-start),0,1):1;
      const growth=scale.getX(i),posture=state.getZ(i);
      const height=(posture===1?this.restingHeight:box.max.y*(posture>=2?.5:1))*growth;
      visit(a.id,this.species,THREE.MathUtils.lerp(from.getX(i),to.getX(i),alpha),travelHeight(from.getY(i),to.getY(i),THREE.MathUtils.lerp(times.getZ(i),times.getW(i),alpha)),THREE.MathUtils.lerp(from.getZ(i),to.getZ(i),alpha),height,(posture===1?this.restingRadius:radius)*growth);
    });
  }
  prepare():()=>void {
    const g=this.mesh.geometry as THREE.InstancedBufferGeometry,fire=this.flames.geometry as THREE.InstancedBufferGeometry;
    const n=g.instanceCount,f=fire.instanceCount;
    g.instanceCount=Math.max(1,n);fire.instanceCount=Math.max(1,f);
    return ()=>{g.instanceCount=n;fire.instanceCount=f;};
  }
  update(world:World,timeline:MotionTimeline|undefined,surfaces:ReadonlyMap<number,number>,reset=false):void {
    const changed=this.source!==world;
    if(reset){this.headings.clear();this.keys.clear();this.gait.clear();}
    if(changed){this.source=world;this.keys.clear();this.animals=(world.wildlife?.animals??[]).filter(a=>a.species===this.species);this.surfaces=surfaces;this.setSelected(this.selected);
      const present=new Set(this.animals.map(a=>a.id));for(const id of this.headings.keys())if(!present.has(id)){this.headings.delete(id);this.gait.delete(id);}
    }
    const tick=timeline?.tick??world.tick,origin=Math.floor(tick/1024)*1024;
    this.travelTime.value=localTimeSeconds(tick,origin);this.time.value=localTimeSeconds(tick)%(2*Math.PI);
    const g=this.mesh.geometry as THREE.InstancedBufferGeometry,from=g.getAttribute('aFrom') as THREE.InstancedBufferAttribute,to=g.getAttribute('aTo') as THREE.InstancedBufferAttribute,times=g.getAttribute('aTravel') as THREE.InstancedBufferAttribute,state=g.getAttribute('aAnimal') as THREE.InstancedBufferAttribute,scale=g.getAttribute('aScale') as THREE.InstancedBufferAttribute;
    if(changed){
    const fireSize=this.mesh.geometry.getAttribute('aFire') as THREE.InstancedBufferAttribute;
    const burning=new Map((world.fires?.items??[]).filter(f=>f.attachedAnimalId!==undefined).map(f=>[f.attachedAnimalId!,f.size]));
    const animals=this.animals;
    let fireCount=0;
    animals.forEach((a,i)=>{
      const size=burning.get(a.id);fireSize.setX(i,size===undefined?0:Math.max(.5,size));
      if(size!==undefined)fireCount=i+1;
    });if(!animals.length)fireSize.setX(0,0);fireSize.needsUpdate=true;
    // Keep actor indices intact while omitting every trailing inactive slot.
    (this.flames.geometry as THREE.InstancedBufferGeometry).instanceCount=fireCount;
    }
    const animals=this.animals;g.instanceCount=animals.length;let dirty=false;
    animals.forEach((a,i)=>{
      const edge=timeline?.segment(a.id)??a.motion,active=!!edge&&tick>=edge.start&&tick<edge.end;
      const growth=animalBodySize(a)/animalSpecies(a.species).bodySize;
      const fromFraction=edge&&'fromFraction' in edge?edge.fromFraction:undefined,toFraction=edge&&'toFraction' in edge?edge.toFraction:undefined;
      const key=`${i}:${origin}:${edge?.start}:${edge?.end}:${fromFraction}:${toFraction}:${active}:${a.state}:${a.meal?.id}:${a.strike?.atCore}:${a.stun?.untilCore}:${a.threat?.targetId}:${growth}`;if(this.keys.get(a.id)===key)return;this.keys.set(a.id,key);dirty=true;
      const fallen=a.state==='dead'||a.state==='downed';
      const traveling=!!edge&&(active||a.state==='moving'&&world.tick<edge.end);
      const f=traveling?edge.from:a,t=traveling?edge.to:a;
      let yaw=edge?Math.atan2(edge.to.x-edge.from.x,edge.to.z-edge.from.z):0;
      if(!traveling&&a.meal){const m=a.meal,target=m.kind==='plant'?world.resources.find(r=>r.id===m.id):world.piles.find(p=>p.id===m.id)?.owner;if(target&&'x' in target&&(target.x!==a.x||target.z!==a.z))yaw=Math.atan2(target.x-a.x,target.z-a.z);}
      if(!traveling&&(a.strike||a.threat)){const target=world.pawns.find(p=>p.id===(a.strike?.targetId??a.threat?.targetId));if(target&&(target.x!==a.x||target.z!==a.z))yaw=Math.atan2(target.x-a.x,target.z-a.z);}
      const previous=this.headings.get(a.id);
      let heading=turnToward(previous,yaw,traveling?edge.start:tick);
      if(traveling&&previous&&heading===previous&&previous.startTick!==edge.start)heading={from:headingAt(previous,edge.start),to:previous.to,startTick:edge.start};
      this.headings.set(a.id,heading);
      const fa=traveling&&'fromFraction' in edge?Number(edge.fromFraction??0):0,fb=traveling&&'toFraction' in edge?Number(edge.toFraction??1):1,lerp=THREE.MathUtils.lerp;
      const turning=!traveling&&tick-heading.startTick<TURN_TICKS;
      from.setXYZW(i,lerp(f.x,t.x,fa),this.surfaces.get(f.z*world.width+f.x)??0,lerp(f.z,t.z,fa),traveling||turning?heading.from:heading.to);
      to.setXYZW(i,lerp(f.x,t.x,fb),this.surfaces.get(t.z*world.width+t.x)??0,lerp(f.z,t.z,fb),heading.to);
      const turnStart=localTimeSeconds(heading.startTick,origin);
      times.setXYZW(i,traveling?localTimeSeconds(edge.start,origin):turning?turnStart:0,traveling?localTimeSeconds(edge.end,origin):turning?turnStart+TURN_TICKS/TICKS_PER_SECOND:0,fa,fb);
      const stepping=active&&!fallen&&!a.stun&&(!edge||!('fromFraction' in edge)||!('toFraction' in edge)||edge.fromFraction!==edge.toFraction);
      const gaitPhase=stepping&&edge?this.gait.begin(a.id,{
        start:edge.start,end:edge.end,
        fromX:from.getX(i),fromZ:from.getZ(i),toX:to.getX(i),toZ:to.getZ(i),
      },tick,this.gaitRate):undefined;
      if(!stepping)this.gait.halt(a.id,tick,this.gaitRate);
      const resting=a.state==='downed'||!traveling&&a.state==='sleeping';
      state.setXYZW(i,stepping?1:0,!fallen&&!resting&&!traveling&&a.strike&&!a.stun?2:!traveling&&a.state==='eating'?1:0,
        a.state==='dead'?2:resting?1:0,
        gaitPhase??(a.strike?coreTimeSeconds(a.strike.atCore,origin):a.id%30));
      scale.setX(i,growth);
    });
    if(dirty)for(const a of [from,to,times,state,scale])a.needsUpdate=true;
  }
}

/** Six small resident actor batches; geometry never depends on population or frame. */
export class WildlifeLayer {
  readonly mesh=new THREE.Group();readonly flames=new THREE.Group();readonly travelTime=uniform(0);
  private readonly surfaceTexture=createStylizedSurfaceTexture();
  private texturesEnabled=true;
  private rigs:SpeciesRig[];private source?:World;private surfaces:ReadonlyMap<number,number>=new Map();
  constructor(configure?:(m:THREE.MeshStandardNodeMaterial)=>void){
    this.rigs=['hare','snow-hare','deer','muffalo','gazelle','dromedary'].map(species=>new SpeciesRig(this.travelTime,species,this.surfaceTexture,configure));
    for(const rig of this.rigs){this.mesh.add(rig.mesh,rig.selection);this.flames.add(rig.flames);}
  }
  setTexturesEnabled(enabled:boolean):void {if(this.texturesEnabled===enabled)return;this.texturesEnabled=enabled;for(const rig of this.rigs)rig.setTexturesEnabled(enabled);}
  setSelected(ids:ReadonlySet<number>):void {for(const rig of this.rigs)rig.setSelected(ids);}
  forEachPose(visit:(id:number,species:string,x:number,y:number,z:number,height:number,radius:number)=>void):void {for(const rig of this.rigs)rig.forEachPose(visit);}
  update(world:World,timeline:MotionTimeline|undefined,reset=false):void{if(this.source!==world){this.source=world;this.surfaces=furnitureSurfaces(world);}for(const rig of this.rigs)rig.update(world,timeline,this.surfaces,reset);}
  prepare():()=>void{const restores=this.rigs.map(r=>r.prepare());return()=>{for(const restore of restores)restore();};}
  dispose():void{
    for(const r of this.rigs){
      for(const m of [r.mesh,r.flames,r.selection])m.geometry.dispose();
      r.plainMaterial.dispose();r.texturedMaterial.dispose();
      (r.flames.material as THREE.Material).dispose();
      (r.selection.material as THREE.Material).dispose();
    }
    this.surfaceTexture.dispose();
  }
}
