import {expect,test} from 'vitest';
import {initialDenseGlobeRotation256} from '../src/ui/planet-dense-view.ts';
const rotate=(p:readonly number[],yaw:number,pitch:number)=>{
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),x=p[0]!*cy-p[2]!*sy,z=p[0]!*sy+p[2]!*cy;
 return [x,p[1]!*cp-z*sp,p[1]!*sp+z*cp];
};
test('first30% coverage view faces the actual retained cap rather than the empty opposite hemisphere',()=>{
 // Independent analytic axis/boundary, not a162-tile fixture or GPU proof.
 // The real119904-tile source is ROOT's later native pixel qualification.
 const a=36*Math.PI/180,axis=[0,Math.sin(a),-Math.cos(a)],camera=initialDenseGlobeRotation256(.3),center=rotate(axis,camera.yaw,camera.pitch);
 expect(rotate(axis,0,0)[2]).toBeLessThan(0);expect(Math.abs(center[0]!)).toBeLessThan(.000001);expect(Math.abs(center[1]!)).toBeLessThan(.000001);expect(center[2]).toBeGreaterThan(.999999);
 const tangent=[0,Math.cos(a),Math.sin(a)],radius=54*Math.PI/180;
 for(let i=0;i<32;i++){
  const t=i*Math.PI/16,p=axis.map((v,k)=>v*Math.cos(radius)+([1,0,0][k]!*Math.cos(t)+tangent[k]!*Math.sin(t))*Math.sin(radius));
  expect(rotate(p,camera.yaw,camera.pitch)[2]).toBeGreaterThan(.58);
 }
});
test('the same initial camera rule also faces half/full coverage without changing geometry, seeds or gameplay state',()=>{
 for(const coverage of [.5,1] as const){const c=initialDenseGlobeRotation256(coverage),point=rotate([0,0,-1],c.yaw,c.pitch);expect(point[2]).toBeGreaterThan(.999999);}
});
