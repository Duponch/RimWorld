import * as THREE from 'three/webgpu';
import { Fn, mix, positionWorld, sin, smoothstep, texture, uniform, uv, vec3 } from 'three/tsl';

/** One shaded material for every water quad. Its single resident paint sample
 * carries both pigment (RGB) and baked shore proximity (A). Motion is wholly
 * in the fragment shader, so camera motion/ticks never rewrite the texture or
 * rebuild quads. The flat-water material is selected when textures are off. */
export class PaintedWater {
  readonly material = new THREE.MeshStandardNodeMaterial({
    color: 0xffffff, roughness: .6, metalness: 0,
  });
  private readonly time = uniform(0);
  private readonly ripplePhase = uniform(0);
  private readonly wind = uniform(new THREE.Vector2(.8,.6));
  private readonly windStrength = uniform(0);
  private lastSeconds: number | undefined;

  constructor(paint:THREE.DataTexture,configure:(material:THREE.MeshStandardNodeMaterial)=>void){
    const pigment=texture(paint,uv());
    this.material.colorNode=Fn(()=>{
      const sample=pigment.toVar(),p=positionWorld.xz;
      // The two scales move at visibly different speeds, but both use the
      // confirmed game clock so a pause freezes the surface exactly in place.
      const swell=sin(p.x.mul(4.1).add(p.y.mul(2.7)).sub(this.time));
      const downwind=p.x.mul(this.wind.x).add(p.y.mul(this.wind.y));
      const ripple=sin(downwind.mul(8.3).add(p.x.mul(1.1))
        .sub(this.ripplePhase));
      const light=swell.mul(.055).add(ripple.mul(.027)).add(.96);
      const foam=sample.a.mul(mix(.57,.96,smoothstep(-.8,.85,ripple)));
      return mix(sample.rgb.mul(light),vec3(.81,.92,.87),foam.mul(.83));
    })();
    configure(this.material);
    this.material.userData.rendererOwned=true;
  }

  present(seconds:number):void {
    if(!Number.isFinite(seconds))return;
    const tau=2*Math.PI,previous=this.lastSeconds;
    if(previous===undefined||seconds<previous||seconds-previous>60){
      this.time.value=((seconds*2.7)%tau+tau)%tau;
      this.ripplePhase.value=((seconds*4.1)%tau+tau)%tau;
    }else if(seconds>previous){
      const delta=seconds-previous;
      this.time.value=(this.time.value+delta*2.7)%tau;
      this.ripplePhase.value=(this.ripplePhase.value+delta*(4.1+.6*this.windStrength.value))%tau;
    }
    this.lastSeconds=seconds;
  }
  reset():void {this.lastSeconds=undefined;this.time.value=0;this.ripplePhase.value=0;}
  setWind(strength:number,directionX:number,directionZ:number):void {
    this.wind.value.set(directionX,directionZ);
    this.windStrength.value=Math.max(0,strength);
  }
  dispose():void {this.material.dispose();}
}
