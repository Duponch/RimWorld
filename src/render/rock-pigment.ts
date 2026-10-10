import * as THREE from 'three/webgpu';
import { ORE_DEFINITIONS } from '../sim/ore';
import type { World } from '../sim/types';
import { noise } from './StaticGeometry';
import { isRock } from './RockSurface';
import { stoneColor } from './stone-palette';

const color=new THREE.Color();

/** Pigment belongs to a grid corner, just like the shared rock profile. Nearby
 * occupied cells lend their colour with a common irregular brush direction.
 * Both sides of a material boundary therefore write exactly the same RGB.
 * Empty/mined cells never lend a soil pigment to an exposed cliff. No topology,
 * UVs, texture, index, normal or draw is added by this presentation rule. */
export function rockCornerPigment(world:World,gx:number,gz:number):readonly [number,number,number] {
  const pushX=(noise(gx,gz,world.seed+829)-.5)*.7;
  const pushZ=(noise(gx,gz,world.seed+863)-.5)*.7;
  let r=0,g=0,b=0,total=0;
  for(const dx of [-1,0])for(const dz of [-1,0]) {
    const x=gx+dx,z=gz+dz;if(!isRock(world,x,z))continue;
    const tile=world.tiles[z*world.width+x]!;
    const weight=(1+(dx*2+1)*pushX)*(1+(dz*2+1)*pushZ);
    color.setHex(tile.ore?ORE_DEFINITIONS[tile.ore].color:stoneColor(tile.stone));
    r+=color.r*weight;g+=color.g*weight;b+=color.b*weight;total+=weight;
  }
  if(!total)return [0,0,0];
  // Broad facet wash and small glints share the corner's identity too. A
  // neighbouring cell cannot create a different brightness at this seam.
  const wash=.96+noise(Math.floor(gx/3),Math.floor(gz/3),world.seed+211)*.08;
  return [r/total*wash,g/total*wash,b/total*wash];
}

export function writeRockPigment(world:World,x:number,z:number,colors:Float32Array,vertex:number):void {
  const corners=[[-1,-1],[-1,1],[1,1],[1,-1]] as const;
  for(let i=0;i<4;i++) {
    const [dx,dz]=corners[i]!,gx=x+(dx+1)/2,gz=z+(dz+1)/2;
    const base=rockCornerPigment(world,gx,gz);
    for(let ring=0;ring<3;ring++)colors.set(base,(vertex+ring*4+i)*3);
  }
}
