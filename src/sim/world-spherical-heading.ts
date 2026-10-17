/** Independent tangent-frame geometry. The mathematical collinear fallback
 * follows documented Unity LookRotation semantics. Native epsilon/Quaternion
 * rounding is an explicit comparison boundary, not claimed bit parity. */
import {surfaceAngleDegrees,type SurfaceVector} from './world-surface-mesh.ts';
const f=Math.fround;
const dot=(a:SurfaceVector,b:SurfaceVector)=>f(f(f(a[0]*b[0])+f(a[1]*b[1]))+f(a[2]*b[2]));
const cross=(a:SurfaceVector,b:SurfaceVector):SurfaceVector=>[f(f(a[1]*b[2])-f(a[2]*b[1])),f(f(a[2]*b[0])-f(a[0]*b[2])),f(f(a[0]*b[1])-f(a[1]*b[0]))];
const scale=(a:SurfaceVector,s:number):SurfaceVector=>[f(a[0]*s),f(a[1]*s),f(a[2]*s)];
function unit(a:SurfaceVector):SurfaceVector {
 const length=f(Math.sqrt(dot(a,a)));return length>0?[f(a[0]/length),f(a[1]/length),f(a[2]/length)]:[0,0,0];
}
function fallbackFrame(radial:SurfaceVector):{forward:SurfaceVector;right:SurfaceVector} {
 // Minimal rotation from +Z. For the antipodal case choose +Y, keeping north
 // fixed; the exact native anti-parallel choice still requires observation.
 if(radial[2]<=-1)return {forward:[0,1,0],right:[1,0,0]};
 if(radial[2]>=1)return {forward:[0,1,0],right:[-1,0,0]};
 const qx=f(-radial[1]),qy=radial[0],qz=0,qw=f(1+radial[2]),norm=f(Math.sqrt(f(f(f(qx*qx)+f(qy*qy))+f(qw*qw))));
 const x=f(qx/norm),y=f(qy/norm),w=f(qw/norm);
 const rotate=(v:SurfaceVector):SurfaceVector=>{
  const q:SurfaceVector=[x,y,qz],twice=scale(cross(q,v),2),outer=cross(q,twice);
  return [f(f(v[0]+f(w*twice[0]))+outer[0]),f(f(v[1]+f(w*twice[1]))+outer[1]),f(f(v[2]+f(w*twice[2]))+outer[2])];
 };
 return {forward:rotate([0,1,0]),right:rotate([-1,0,0])};
}
function tangentFrame(root:SurfaceVector,point:SurfaceVector):{forward:SurfaceVector;right:SurfaceVector} {
 const radial=unit(root),right=unit(cross(point,radial));
 if(dot(right,right)===0)return fallbackFrame(radial);
 return {forward:cross(radial,right),right:scale(right,-1)};
}
export function worldSphericalHeading(from:SurfaceVector,to:SurfaceVector):number {
 if(from[0]===to[0]&&from[1]===to[1]&&from[2]===to[2])return 0;
 const north=tangentFrame(from,[0,1,0]),target=tangentFrame(from,to);
 const angle=surfaceAngleDegrees(north.forward,target.forward);
 return dot(target.forward,north.right)<0?f(360-angle):angle;
}
