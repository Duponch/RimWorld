import {createWorldPerlin} from './world-coherent-noise.ts';
import {surfaceVisibilityAxis,surfaceViewAngle,surfaceAngleDegrees,type SurfaceVector} from './world-surface-mesh.ts';
import {worldSphericalHeading} from './world-spherical-heading.ts';
import type {WorldCoverage} from './world-climate-settings.ts';
/** Per-world pure sampler, no PRNG draw and no special full-coverage bypass. */
export function createSeaIceGate(rootSeed:number,coverage:WorldCoverage):(center:SurfaceVector)=>boolean {
 const f=Math.fround,axis=surfaceVisibilityAxis(coverage),view=surfaceViewAngle(coverage),width=Math.min(7.5,f(view*f(.12))),inner=f(view-width);
 const noise=createWorldPerlin({frequency:f(.017),lacunarity:2,persistence:.5,octaves:6,seed:rootSeed,quality:'medium'});
 return center=>{
  const edge=Math.max(0,Math.min(1,f(f(surfaceAngleDegrees(axis,center)-inner)/f(view-inner))));
  if(edge<=0)return true;
  const sampled=f(noise(worldSphericalHeading(axis,center),0,0)),threshold=f(f(sampled*.5)+.5);
  return edge<=threshold;
 };
}
