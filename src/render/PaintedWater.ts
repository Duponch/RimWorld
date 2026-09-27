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

  constructor(paint:THREE.DataTexture,configure:(material:THREE.MeshStandardNodeMaterial)=>void){
    const pigment=texture(paint,uv());
    this.material.colorNode=Fn(()=>{
      const sample=pigment.toVar(),p=positionWorld.xz;
      // Wide, slow-moving swells and short ripples share the confirmed game
      // clock. Their colour shifts preserve the palette painted at each cell.
      const swell=sin(p.x.mul(4.1).add(p.y.mul(2.7)).sub(this.time.mul(.83)));
      const ripple=sin(p.x.mul(8.3).sub(p.y.mul(5.1)).add(this.time.mul(1.29)));
      const light=swell.mul(.055).add(ripple.mul(.027)).add(.96);
      const foam=sample.a.mul(mix(.57,.96,smoothstep(-.8,.85,ripple)));
      return mix(sample.rgb.mul(light),vec3(.81,.92,.87),foam.mul(.83));
    })();
    configure(this.material);
    this.material.userData.rendererOwned=true;
  }

  present(seconds:number):void {this.time.value=seconds;}
  dispose():void {this.material.dispose();}
}
