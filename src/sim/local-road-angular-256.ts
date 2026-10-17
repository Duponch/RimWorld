/** Original planar yaw mathematics for generation. This supplies the declared
 * portable numerical boundary, not a claim of native Unity bit equivalence.
 * Axes and yaw follow the documented AngleAxis/LookRotation convention. */
import type {LocalRoadAngularMath256} from './local-road-generation-256.ts';
const f=Math.fround,DEG=f(Math.PI/180),RAD=f(180/Math.PI);
function finite(v:number):number {if(!Number.isFinite(v))throw Error('Invalid road angle');return f(v);}
export const portableLocalRoadAngular256:LocalRoadAngularMath256=Object.freeze({
 horizontal(angle:number):readonly [number,number,number] {
  const half=f(f(finite(angle)*DEG)*.5),y=f(Math.sin(half)),w=f(Math.cos(half));
  return [f(f(2*y)*w),0,f(1-f(2*f(y*y)))];
 },
 flatAngle(x:number,z:number):number {
  x=finite(x);z=finite(z);if(x===0&&z===0)return 0;
  const value=f(f(Math.atan2(x,z))*RAD);return value<0?f(360+value):value;
 },
 angleDifference(a:number,b:number):number {
  const delta=f(f(finite(b)-finite(a))%360),positive=delta<0?f(delta+360):delta;
  return positive>180?f(360-positive):positive;
 },
});
