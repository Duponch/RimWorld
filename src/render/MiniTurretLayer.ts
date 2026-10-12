import { Sphere, Vector3, type Group } from 'three/webgpu';
import type { Structure, World } from '../sim/types';
import { miniTurretTargets, miniTurretView } from '../sim/mini-turret-presentation';
import { BoxMesh } from './BoxMesh';
import type { BoxBatches } from './BoxBatches';
import { miniTurretFacing, miniTurretTopColor, miniTurretTopPartsForStructure, type TurretTopView } from './mini-turret-parts';
import type { Placement } from './primitives';
import type { AnimationDetail,AnimationSampleHandle } from './AnimationDetail';

type LocalPart = { x:number;y:number;z:number;sx:number;sy:number;sz:number;ry:number;cos:number;sin:number };
type Pose = {
  id:number;x:number;z:number;color:number;angle:number;target:number;seen:number;moving:boolean;
  parts:LocalPart[];placed:Placement[];start:number;queued:number;range:{start:number;count:number};radius:number;
  sample?:AnimationSampleHandle;sampledAt:number;
};
const EPSILON=1e-5;
const RESPONSE_SECONDS=.055;
export function miniTurretShortAngle(from:number,to:number):number {return Math.atan2(Math.sin(to-from),Math.cos(to-from));}

/** One resident top batch. Adoption captures primitive goals and model changes;
 * RAF only touches matrices for heads that are still turning. No World, actor,
 * material, colour, rebuilt model or per-frame target census is retained. */
export class MiniTurretLayer {
  private readonly byId=new Map<number,Pose>();
  private poses:Pose[]=[];
  private readonly moving:Pose[]=[];
  private generation=0;
  private uploadGeneration=0;
  private resident=false;
  private mesh:BoxMesh|undefined;
  private readonly fullRange={start:0,count:0};
  private readonly bound=new Sphere(new Vector3(),0);
  constructor(private readonly detail?:AnimationDetail){}

  update(world:World,group:Group,batches:BoxBatches,reset=false):boolean {
    if(reset){this.byId.clear();this.poses=[];this.moving.length=0;this.resident=false;this.mesh=undefined;}
    const generation=++this.generation,order:Pose[]=[];
    let targets:ReturnType<typeof miniTurretTargets>|undefined,rebuild=reset,changed=false;
    for(const structure of world.structures){
      if(structure.kind!=='mini-turret')continue;
      targets??=miniTurretTargets(world);
      const view=miniTurretView(world,structure,targets)!;
      const target=miniTurretFacing(structure,view),color=miniTurretTopColor(view);
      let pose=this.byId.get(structure.id);
      if(!pose){
        pose=this.createPose(structure,view,target,generation);this.byId.set(pose.id,pose);rebuild=true;
      }else{
        pose.seen=generation;
        if(pose.x!==structure.x||pose.z!==structure.z){pose.x=structure.x;pose.z=structure.z;pose.angle=target;if(pose.sample)this.detail?.invalidate(pose.sample);rebuild=true;}
        if(pose.color!==color){this.captureParts(pose,structure,view);rebuild=true;}
        if(pose.target!==target){pose.target=target;changed=true;}
        if(Math.abs(miniTurretShortAngle(pose.angle,target))>EPSILON&&!pose.moving){pose.moving=true;this.moving.push(pose);}
      }
      if(this.poses[order.length]!==pose)rebuild=true;
      order.push(pose);
    }
    if(order.length!==this.poses.length)rebuild=true;
    for(const [id,pose] of this.byId)if(pose.seen!==generation){this.byId.delete(id);rebuild=true;}
    // Remove retired poses at adoption, so the frame loop has only live heads.
    for(let i=0;i<this.moving.length;){
      const pose=this.moving[i]!;
      if(pose.seen===generation){i++;continue;}
      pose.moving=false;this.moving[i]=this.moving.at(-1)!;this.moving.pop();
    }
    this.poses=order;
    if(!order.length&&!this.resident)return false;
    if(!rebuild)return changed;
    const parts:Placement[]=[];
    for(const pose of order){
      pose.start=parts.length;pose.range.start=pose.start*16;pose.range.count=pose.parts.length*16;
      this.placeParts(pose);parts.push(...pose.placed);
    }
    batches.set(group,'turret-top',parts);this.resident=true;
    const mesh=group.getObjectByName('turret-top');
    this.mesh=mesh instanceof BoxMesh?mesh:undefined;
    if(this.mesh){
      // An all-angle sphere is established once; aiming cannot move the batch
      // outside its culling bound or require an O(all instances) sphere fold.
      this.mesh.boundingSphere.makeEmpty();
      for(const pose of order){this.bound.center.set(pose.x,1.04,pose.z);this.bound.radius=pose.radius;this.mesh.boundingSphere.union(this.bound);}
      const matrix=this.mesh.instanceMatrix;
      matrix.clearUpdateRanges();this.fullRange.count=parts.length*16;
      if(this.fullRange.count)matrix.updateRanges.push(this.fullRange);
      this.uploadGeneration++;
    }
    return true;
  }

  /** Returns whether a caster matrix changed, for the existing shadow cache.
   * Pause settles once to the authoritative goal; reset/load is immediate in
   * update. Range objects and matrices are reused, even while culled. */
  present(dt:number,paused=false):boolean {
    const mesh=this.mesh;if(!mesh||!this.moving.length||(!paused&&(!Number.isFinite(dt)||dt<=0)))return false;
    const matrix=mesh.instanceMatrix;
    if(matrix.updateRanges.length===0)this.uploadGeneration++;
    const full=matrix.updateRanges[0]===this.fullRange;
    const blend=paused?1:-Math.expm1(-Math.min(dt,.05)/RESPONSE_SECONDS);
    let changed=false;
    for(let i=0;i<this.moving.length;){
      const pose=this.moving[i]!;
      if(pose.sample&&!this.detail!.shouldSample(pose.sample,pose.x,1.04,pose.z)){i++;continue;}
      const elapsed=this.detail&&pose.sample?.level===1?Math.max(0,(this.detail.now-pose.sampledAt)/1000):dt;
      if(this.detail)pose.sampledAt=this.detail.now;
      const poseBlend=pose.sample?.level===1&&!paused?-Math.expm1(-elapsed/RESPONSE_SECONDS):blend;
      const delta=miniTurretShortAngle(pose.angle,pose.target);
      if(paused||Math.abs(delta)<EPSILON){pose.angle=pose.target;pose.moving=false;}
      else pose.angle+=delta*poseBlend;
      this.writePose(pose,mesh);changed=true;
      if(!full&&pose.queued!==this.uploadGeneration){
        // WebGL merges adjacent ranges in place. Restore this head's own span
        // only after that upload has cleared the queue, never while culled.
        pose.range.start=pose.start*16;pose.range.count=pose.parts.length*16;
        matrix.updateRanges.push(pose.range);pose.queued=this.uploadGeneration;
      }
      if(pose.moving){i++;continue;}
      this.moving[i]=this.moving.at(-1)!;this.moving.pop();
    }
    if(changed)matrix.needsUpdate=true;
    return changed;
  }

  private createPose(structure:Structure,view:TurretTopView,angle:number,seen:number):Pose {
    const pose:Pose={id:structure.id,x:structure.x,z:structure.z,color:miniTurretTopColor(view),angle,target:angle,seen,moving:false,
      parts:[],placed:[],start:0,queued:-1,range:{start:0,count:0},radius:0,sample:this.detail?.createHandle(),sampledAt:this.detail?.now??0};
    this.captureParts(pose,structure,view);return pose;
  }
  private captureParts(pose:Pose,structure:Structure,view:TurretTopView):void {
    pose.color=miniTurretTopColor(view);pose.radius=0;
    const parts=miniTurretTopPartsForStructure(structure,view,0);
    pose.parts=parts.map(part=>{
      const x=part.x-structure.x,z=part.z-structure.z,sx=part.sx??1,sy=part.sy??1,sz=part.sz??1;
      pose.radius=Math.max(pose.radius,Math.hypot(x,part.y-1.04,z)+Math.hypot(sx,sy,sz)/2);
      const ry=part.ry??0;
      return {x,y:part.y,z,sx,sy,sz,ry,cos:Math.cos(ry),sin:Math.sin(ry)};
    });
    pose.placed=parts;
  }
  private placeParts(pose:Pose):void {
    const sin=Math.sin(pose.angle),cos=Math.cos(pose.angle);
    for(let i=0;i<pose.parts.length;i++){
      const local=pose.parts[i]!,part=pose.placed[i]!;
      part.x=pose.x+cos*local.x+sin*local.z;part.z=pose.z-sin*local.x+cos*local.z;part.ry=pose.angle+local.ry;
    }
  }
  private writePose(pose:Pose,mesh:BoxMesh):void {
    const sin=Math.sin(pose.angle),cos=Math.cos(pose.angle),array=mesh.instanceMatrix.array;
    for(let i=0;i<pose.parts.length;i++){
      const part=pose.parts[i]!,offset=(pose.start+i)*16,c=cos*part.cos-sin*part.sin,s=sin*part.cos+cos*part.sin;
      array[offset]=c*part.sx;array[offset+1]=0;array[offset+2]=-s*part.sx;array[offset+3]=0;
      array[offset+4]=0;array[offset+5]=part.sy;array[offset+6]=0;array[offset+7]=0;
      array[offset+8]=s*part.sz;array[offset+9]=0;array[offset+10]=c*part.sz;array[offset+11]=0;
      array[offset+12]=pose.x+cos*part.x+sin*part.z;array[offset+13]=part.y;array[offset+14]=pose.z-sin*part.x+cos*part.z;array[offset+15]=1;
    }
  }
}
