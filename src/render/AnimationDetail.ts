import { Vector4,type Camera,type Node } from 'three/webgpu';
import { attribute,float,Fn,If,mix,sin,uniform,vec3,vec4,renderGroup } from 'three/tsl';
import { DEFAULT_ANIMATION_SETTINGS,parseAnimationSettings,type AnimationSettings } from './animation-settings';
import { TICKS_PER_SECOND } from '../sim/types';

export type AnimationDetailLevel=0|1|2;
/** One small record per active owner/emitter, never per vertex or grass blade. */
export interface AnimationSampleHandle {
  level:number;epoch:number;revision:number;frame:number;tick:number;
}

/** One wall-time deadline and main-camera publication for all visual owners.
 * CPU records exist only for active actors/emitters, never map cells or blades.
 * Colour and shadow passes consume the same retained samples. */
export class AnimationDetail {
  readonly enabled=uniform(1).setGroup(renderGroup);
  readonly nearPixels=uniform(DEFAULT_ANIMATION_SETTINGS.nearPixels).setGroup(renderGroup);
  readonly farPixels=uniform(DEFAULT_ANIMATION_SETTINGS.farPixels).setGroup(renderGroup);
  readonly middleHz=uniform(DEFAULT_ANIMATION_SETTINGS.middleHz).setGroup(renderGroup);
  // Before the first camera publication preserve the complete rig.
  readonly projectionScale=uniform(1e6).setGroup(renderGroup);
  readonly perspective=uniform(0).setGroup(renderGroup);
  readonly viewDepth=uniform(new Vector4(0,0,-1,0)).setGroup(renderGroup);
  readonly middleLagSeconds=uniform(0).setGroup(renderGroup);
  frameTick=0;
  middleTick=0;
  now=0;
  private frame=0;
  private epoch=0;
  private revision=0;
  private deadline=NaN;
  private started=false;
  private previousNow=NaN;
  private parsed:AnimationSettings={...DEFAULT_ANIMATION_SETTINGS};
  get settings():Readonly<AnimationSettings>{return this.parsed;}

  createHandle():AnimationSampleHandle{return {level:-1,epoch:-1,revision:-1,frame:-1,tick:0};}
  /** Reset/load/options revoke samples in O(1), without visiting all owners. */
  reset():void{this.epoch++;this.started=false;this.deadline=NaN;}
  invalidate(handle:AnimationSampleHandle):void{handle.epoch=-1;}

  /** Real elapsed presentation time decides when to capture a confirmed tick.
   * x6 changes that tick's progress, never the configured wall-time frequency.
   * Missed deadlines capture only the current state; there is no catch-up. */
  beginFrame(now:number,camera:Camera,viewportHeight:number,confirmedTick:number):void {
    this.updateCamera(camera,viewportHeight);
    this.frame++;this.now=now;
    if(!Number.isFinite(now)||!Number.isFinite(confirmedTick))return;
    if(now<this.previousNow||this.started&&confirmedTick<this.frameTick)this.reset();
    this.previousNow=now;this.frameTick=confirmedTick;
    const interval=1000/this.parsed.middleHz;
    if(!this.started||now+1e-6>=this.deadline){
      if(!this.started||this.middleTick!==confirmedTick)this.revision++;
      this.middleTick=confirmedTick;
      this.deadline=!this.started?now+interval:this.deadline+(Math.floor(Math.max(0,now+1e-6-this.deadline)/interval)+1)*interval;
      this.started=true;
    }
    this.middleLagSeconds.value=Math.max(0,confirmedTick-this.middleTick)/TICKS_PER_SECOND;
  }

  /** Iso is one constant comparison for all owners. Perspective uses one
   * dot product at their live anchor, no square root, matrices or allocation. */
  classify(x:number,y:number,z:number,scale=1):AnimationDetailLevel {
    if(!this.parsed.enabled)return 0;
    let pixels=this.projectionScale.value*scale;
    if(this.perspective.value>.5){const v=this.viewDepth.value,depth=v.x*x+v.y*y+v.z*z+v.w;if(depth<=0)return 2;pixels/=depth;}
    return this.parsed.farPixels>0&&pixels<this.parsed.farPixels?2:pixels<this.parsed.nearPixels?1:0;
  }

  /** Near: current pose; middle: one publication per actual deadline; far:
   * keep the last sample. Membership/ownership callers invalidate separately. */
  shouldSample(handle:AnimationSampleHandle,x:number,y:number,z:number,scale=1):boolean {
    const level=this.classify(x,y,z,scale),urgent=handle.epoch!==this.epoch||handle.level!==level;
    const due=urgent||level===0&&handle.frame!==this.frame||level===1&&handle.revision!==this.revision;
    handle.level=level;handle.epoch=this.epoch;
    if(due){handle.frame=this.frame;handle.revision=this.revision;handle.tick=this.frameTick;}
    return due;
  }

  sampleTick(handle:AnimationSampleHandle,x:number,y:number,z:number,scale=1):number {
    this.shouldSample(handle,x,y,z,scale);return handle.tick;
  }

  setSettings(settings:AnimationSettings):void {
    const parsed=parseAnimationSettings(settings);
    if(parsed.enabled!==this.parsed.enabled||parsed.nearPixels!==this.parsed.nearPixels||parsed.farPixels!==this.parsed.farPixels||parsed.middleHz!==this.parsed.middleHz)this.reset();
    this.parsed=parsed;
    this.enabled.value=parsed.enabled?1:0;this.nearPixels.value=parsed.nearPixels;
    this.farPixels.value=parsed.farPixels;this.middleHz.value=parsed.middleHz;
  }

  /** Once per RAF, after camera controls. projectionMatrix already includes
   * the camera zoom; view depth is evaluated at the live anchor on the GPU. */
  updateCamera(camera:Camera,viewportHeight:number):void {
    camera.updateMatrixWorld();
    const view=camera.matrixWorldInverse.elements;
    this.viewDepth.value.set(-view[2]!,-view[6]!,-view[10]!,-view[14]!);
    this.projectionScale.value=Math.max(1,viewportHeight)*Math.abs(camera.projectionMatrix.elements[5]!)/2;
    this.perspective.value=camera.projectionMatrix.elements[15]===0?1:0;
  }

  /** 0: complete, 1: retained intermediate sample, 2: distant rest.
   * worldAnchor must be an undeformed point in World coordinates, not a
   * camera distance or an individual swinging vertex. */
  level(worldAnchor:Node<'vec3'>) {
    return Fn(()=>{
      const level=float(0).toVar();
      If(this.enabled.greaterThan(.5),()=>{
        If(this.perspective.greaterThan(.5),()=>{
          const depth=this.viewDepth.dot(vec4(vec3(worldAnchor),1));
          const pixels=this.projectionScale.div(depth.max(.0001));
          If(depth.lessThanEqual(0).or(this.farPixels.greaterThan(0).and(pixels.lessThan(this.farPixels))),()=>{level.assign(2);})
            .ElseIf(pixels.lessThan(this.nearPixels),()=>{level.assign(1);});
        }).Else(()=>{
          // Iso classification is uniform: do not evaluate world anchors,
          // view-depth dots or a divide-by-one for every vertex/fragment.
          If(this.farPixels.greaterThan(0).and(this.projectionScale.lessThan(this.farPixels)),()=>{level.assign(2);})
            .ElseIf(this.projectionScale.lessThan(this.nearPixels),()=>{level.assign(1);});
        });
      });
      return level;
    })();
  }

  /** Seconds in, seconds out. Only callers' decorative clocks may use this.
   * Rest clocks are zero; callers must also branch out of oscillatory work. */
  clock(time:Node<'float'>,worldAnchor:Node<'vec3'>,level:Node<'float'>=this.level(worldAnchor)) {
    return Fn(()=>{
      const result=float(time).toVar();
      If(level.equal(2),()=>{result.assign(0);})
        .ElseIf(level.equal(1),()=>{result.assign(float(time).sub(this.middleLagSeconds));});
      return result;
    })();
  }

  /** An actual GPU conditional, so far actors do not evaluate decorative
   * sine functions. Static posture offsets stay outside this helper. */
  sine(phase:Node<'float'>,level:Node<'float'>) {
    return Fn(()=>{
      const result=float(0).toVar();
      If(level.lessThan(2),()=>{result.assign(sin(phase));});
      return result;
    })();
  }

  /** Sample only the limb phase on the same confirmed edge. The caller's
   * original body pose and facing remain continuous. Full detail preserves
   * the original distance expression and its operation order. */
  gaitPhase(base:Node<'float'>,rate:number,pose:Node<'vec4'>,travelTime:Node<'float'>,blend:Node<'float'>,level:Node<'float'>) {
    return Fn(()=>{
      const from=attribute('aFrom','vec4'),to=attribute('aTo','vec4'),travel=attribute('aTravel','vec4');
      const phase=float(0).toVar();
      If(level.equal(0),()=>{
        phase.assign(float(base).add(vec4(pose).xz.sub(from.xz).length().mul(rate)));
      }).ElseIf(level.equal(1),()=>{
        const time=float(travelTime).sub(this.middleLagSeconds);
        const alpha=travel.y.sub(travel.x).greaterThan(0).select(time.sub(travel.x).div(travel.y.sub(travel.x).max(.0001)).clamp(0,1),blend);
        phase.assign(float(base).add(mix(from.xz,to.xz,alpha).sub(from.xz).length().mul(rate)));
      });
      return phase;
    })();
  }
}
