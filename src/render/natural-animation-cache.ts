import { DataTexture, LinearFilter, RepeatWrapping, RGBAFormat, UnsignedByteType, Vector2, Vector3, type Node } from 'three/webgpu';
import { texture, uniform, vec2, float, renderGroup } from 'three/tsl';
import type { AnimationDetail, AnimationSampleHandle } from './AnimationDetail';

/** A tiny immutable spatial-phase lookup, shared by grass and water. Only the
 * middle path uses it; the complete path keeps its original sine expressions.
 * RGBA8 linear filtering works on both native backends without float filtering. */
export const NATURAL_PHASE_SAMPLES=512;
export function naturalPhaseData():Uint8Array {
  const data=new Uint8Array(NATURAL_PHASE_SAMPLES*4);
  for(let i=0;i<NATURAL_PHASE_SAMPLES;i++){
    const phase=i*2*Math.PI/NATURAL_PHASE_SAMPLES;
    data[i*4]=Math.round((Math.sin(phase)*.5+.5)*255);
    data[i*4+1]=Math.round((Math.cos(phase)*.5+.5)*255);data[i*4+3]=255;
  }
  return data;
}
let shared:DataTexture|undefined,users=0;
export class NaturalPhasePalette {
  readonly map:DataTexture;
  private readonly lookup;
  private closed=false;
  constructor(){
    if(!shared){shared=new DataTexture(naturalPhaseData(),NATURAL_PHASE_SAMPLES,1,RGBAFormat,UnsignedByteType);
      shared.minFilter=shared.magFilter=LinearFilter;shared.wrapS=RepeatWrapping;
      shared.generateMipmaps=false;shared.needsUpdate=true;}
    this.map=shared;users++;this.lookup=texture(this.map);
  }
  phase(phase:Node<'float'>){
    // Texel centres represent exact i/N phases; repeat handles the seam.
    return this.lookup.sample(vec2(phase.div(2*Math.PI).add(.5/NATURAL_PHASE_SAMPLES),.5)).level(float(0)).rg.mul(2).sub(1);
  }
  dispose():void{if(this.closed)return;this.closed=true;if(--users===0){shared?.dispose();shared=undefined;}}
}

/** One capture check per family/frame, a handful of CPU trig operations per
 * real middle deadline. No World, resource census, per-blade buffer or upload.
 * Force/direction and both temporal phases are published atomically. */
export class NaturalAnimationCache {
  readonly wind=uniform(new Vector3(1,0,0)).setGroup(renderGroup);
  readonly phaseA=uniform(new Vector2(0,1)).setGroup(renderGroup);
  readonly phaseB=uniform(new Vector2(0,1)).setGroup(renderGroup);
  private capturedTick=NaN;
  private previousTick=NaN;
  private previousNow=NaN;
  private settings:Readonly<object>|undefined;
  private detail?:AnimationDetail;
  private sample?:AnimationSampleHandle;
  private capturedEpoch=-1;
  capture(detail:AnimationDetail,dirX:number,dirZ:number,strength:number,phaseA:number,phaseB=phaseA):boolean {
    if(this.detail!==detail){this.detail=detail;this.sample=detail.createHandle();this.capturedEpoch=-1;}
    // Observe the public handle's reset epoch, even a reload at the same tick.
    // Its projection level does not schedule this shared temporal cache.
    detail.shouldSample(this.sample!,0,0,0);
    const reset=this.capturedEpoch!==this.sample!.epoch||detail.frameTick<this.previousTick||detail.now<this.previousNow;
    this.previousTick=detail.frameTick;this.previousNow=detail.now;
    if(!reset&&this.capturedTick===detail.frameTick&&this.settings===detail.settings)return false;
    this.capturedTick=detail.frameTick;this.settings=detail.settings;this.capturedEpoch=this.sample!.epoch;
    this.wind.value.set(dirX,dirZ,strength);
    this.phaseA.value.set(Math.sin(phaseA),Math.cos(phaseA));
    if(phaseB===phaseA)this.phaseB.value.copy(this.phaseA.value);
    else this.phaseB.value.set(Math.sin(phaseB),Math.cos(phaseB));return true;
  }
  reset():void{this.capturedTick=NaN;this.settings=undefined;this.capturedEpoch=-1;this.previousTick=this.previousNow=NaN;}
}
