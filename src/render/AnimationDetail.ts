import { Vector4,type Camera,type Node } from 'three/webgpu';
import { attribute,float,Fn,If,mix,sin,uniform,vec3,vec4,renderGroup } from 'three/tsl';
import { DEFAULT_ANIMATION_SETTINGS,parseAnimationSettings,type AnimationSettings } from './animation-settings';

/** Main-camera uniforms are shared by colour and shadow passes. No per-actor
 * CPU distance loop, World read, wall-clock timer or extra instance attribute. */
export class AnimationDetail {
  readonly enabled=uniform(1).setGroup(renderGroup);
  readonly nearPixels=uniform(DEFAULT_ANIMATION_SETTINGS.nearPixels).setGroup(renderGroup);
  readonly farPixels=uniform(DEFAULT_ANIMATION_SETTINGS.farPixels).setGroup(renderGroup);
  readonly middleHz=uniform(DEFAULT_ANIMATION_SETTINGS.middleHz).setGroup(renderGroup);
  // Before the first camera publication preserve the complete rig.
  readonly projectionScale=uniform(1e6).setGroup(renderGroup);
  readonly perspective=uniform(0).setGroup(renderGroup);
  readonly viewDepth=uniform(new Vector4(0,0,-1,0)).setGroup(renderGroup);

  setSettings(settings:AnimationSettings):void {
    const parsed=parseAnimationSettings(settings);
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

  /** 0: complete, 1: quantised decorative clock, 2: decorative rest.
   * worldAnchor must be an undeformed point in World coordinates, not a
   * camera distance or an individual swinging vertex. */
  level(worldAnchor:Node<'vec3'>) {
    return Fn(()=>{
      const level=float(0).toVar();
      If(this.enabled.greaterThan(.5),()=>{
        const depth=this.viewDepth.dot(vec4(vec3(worldAnchor),1)).max(.0001);
        const pixels=this.projectionScale.div(this.perspective.greaterThan(.5).select(depth,float(1)));
        If(this.farPixels.greaterThan(0).and(pixels.lessThan(this.farPixels)),()=>{level.assign(2);})
          .ElseIf(pixels.lessThan(this.nearPixels),()=>{level.assign(1);});
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
        .ElseIf(level.equal(1),()=>{result.assign(float(time).mul(this.middleHz).floor().div(this.middleHz));});
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
        const time=float(travelTime).mul(this.middleHz).floor().div(this.middleHz);
        const alpha=travel.y.sub(travel.x).greaterThan(0).select(time.sub(travel.x).div(travel.y.sub(travel.x).max(.0001)).clamp(0,1),blend);
        phase.assign(float(base).add(mix(from.xz,to.xz,alpha).sub(from.xz).length().mul(rate)));
      });
      return phase;
    })();
  }
}
