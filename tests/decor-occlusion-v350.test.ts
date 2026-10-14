// Geometry/cache qualification; GPU compilation is covered by the opt-in native pilot.
import {expect,test} from 'vitest';
import {Matrix4,OrthographicCamera,PerspectiveCamera,Vector3} from 'three/webgpu';
import {DecorOcclusion,decorOccludesMap,DECOR_OCCLUSION_EPSILON,type DecorView} from '../src/render/decor-occlusion';

const map={width:16,height:16};
const iso:DecorView={perspective:false,eye:{x:8,y:20,z:25},forward:{x:0,y:-1,z:-1}};
const perspective:DecorView={...iso,perspective:true};
const cases=[
  {name:'iso foreground',p:{x:8,y:5,z:12},view:iso,expected:true},
  {name:'perspective foreground',p:{x:8,y:10,z:17},view:perspective,expected:true},
  {name:'iso behind floor',p:{x:8,y:-5,z:3},view:iso,expected:false},
  {name:'perspective behind floor',p:{x:8,y:-5,z:3},view:perspective,expected:false},
  {name:'iso projected outside map',p:{x:8,y:5,z:22},view:iso,expected:false},
  {name:'perspective projected outside map',p:{x:100,y:10,z:17},view:perspective,expected:false},
  {name:'above perspective eye',p:{x:8,y:25,z:17},view:perspective,expected:false},
  {name:'coplanar fragment',p:{x:8,y:0,z:12},view:iso,expected:false},
  {name:'almost coplanar fragment',p:{x:8,y:DECOR_OCCLUSION_EPSILON/2,z:12},view:iso,expected:false},
  {name:'horizontal iso ray',p:{x:8,y:5,z:12},view:{...iso,forward:{x:1,y:0,z:0}},expected:false},
  {name:'upward iso ray',p:{x:8,y:5,z:12},view:{...iso,forward:{x:0,y:1,z:0}},expected:false},
  {name:'point at perspective eye height',p:{x:8,y:20,z:12},view:perspective,expected:false},
];
test.each(cases)('V350 only $name has the declared foreground relationship',({p,view,expected})=>expect(decorOccludesMap(p,view,map)).toBe(expected));

test('V350 one decor piece can retain the back/outside fragments while cutting only its actual foreground part',()=>{
  expect([{x:8,y:5,z:17},{x:8,y:5,z:22},{x:8,y:-5,z:3}].map(p=>decorOccludesMap(p,iso,map))).toEqual([true,false,false]);
});
test('V350 map bounds are exact half-cell edges and support a non-square world',()=>{
  const vertical={...iso,forward:{x:0,y:-1,z:0}};
  for(const p of [{x:-.5,y:5,z:-.5},{x:31.5,y:5,z:11.5}])expect(decorOccludesMap(p,vertical,{width:32,height:12})).toBe(true);
  for(const p of [{x:-.501,y:5,z:0},{x:31.501,y:5,z:0},{x:2,y:5,z:11.501}])expect(decorOccludesMap(p,vertical,{width:32,height:12})).toBe(false);
});
test('V350 orthographic ray scaling and camera translation preserve the same geometric intersection',()=>{
  const p={x:8,y:5,z:12};expect(decorOccludesMap(p,iso,map)).toBe(decorOccludesMap(p,{...iso,eye:{x:80,y:200,z:250},forward:{x:0,y:-5,z:-5}},map));
});
test('V350 finite input guards keep unconfigured, invalid or horizontal candidates visible',()=>{
  for(const size of [{width:0,height:16},{width:16,height:NaN},{width:16.5,height:16}])expect(decorOccludesMap({x:8,y:5,z:12},iso,size)).toBe(false);
  expect(decorOccludesMap({x:Infinity,y:5,z:12},iso,map)).toBe(false);
});
test('V350 one cache updates only for camera pose/type or map bounds and keeps the same GPU node through toggles',()=>{
  const mask=new DecorOcclusion(),node=mask.visibleNode,camera=new OrthographicCamera(-16,16,16,-16,.1,1000);camera.position.set(8,20,25);camera.lookAt(new Vector3(8,0,8));
  expect(mask.configure(16,16)).toBe(true);expect(mask.configure(16,16)).toBe(false);expect(mask.present(camera)).toBe(true);expect(mask.present(camera)).toBe(false);
  camera.zoom=2;camera.updateProjectionMatrix();expect(mask.present(camera)).toBe(false);camera.position.x++;expect(mask.present(camera)).toBe(true);
  const next=new PerspectiveCamera(45,1,.1,1000);next.position.copy(camera.position);next.lookAt(new Vector3(8,0,8));expect(mask.present(next)).toBe(true);expect(mask.present(next)).toBe(false);
  expect(mask.setEnabled(false)).toBe(true);expect(mask.setEnabled(false)).toBe(false);expect(mask.visibleNode).toBe(node);expect(mask.configure(32,12)).toBe(true);expect(mask.present(next)).toBe(false);
  mask.invalidateView();expect(mask.present(next)).toBe(true);expect(mask.setEnabled(true)).toBe(true);expect(mask.visibleNode).toBe(node);
});
// The shader now shares the lighting view-position varying. Rigid camera
// conversion is affine, so even perspective-correct interpolation of a
// deformed/instanced triangle preserves the same point and floor decision.
test.each([false,true])('V350 shared view varying preserves final deformed fragments (perspective=%s)',perspectiveMode=>{
  const camera=perspectiveMode?new PerspectiveCamera(45,1,.1,1000):new OrthographicCamera(-16,16,16,-16,.1,1000);
  camera.position.set(8,20,25);camera.lookAt(new Vector3(8,0,8));camera.updateMatrixWorld();
  const view:DecorView={perspective:perspectiveMode,eye:camera.position,forward:camera.getWorldDirection(new Vector3())};
  const instance=new Matrix4().makeRotationY(.7).scale(new Vector3(2,1.4,.9)).setPosition(6,3,12);
  const vertices=[new Vector3(-1,.2,-2),new Vector3(.7,1,.5),new Vector3(1.3,-.4,2.2)].map(p=>p.applyMatrix4(instance));
  // Screen-space barycentrics divided by clip W yield the interpolation
  // weights used by both the old world varying and the shared view varying.
  const barycentric=[.2,.3,.5];
  const viewPoints=vertices.map(p=>p.clone().applyMatrix4(camera.matrixWorldInverse));
  const weights=viewPoints.map((p,i)=>barycentric[i]!/(perspectiveMode?-p.z:1));
  const sum=weights.reduce((a,b)=>a+b,0);
  const interpolate=(points:Vector3[])=>points.reduce((out,p,i)=>out.addScaledVector(p,weights[i]!/sum),new Vector3());
  const oldPoint=interpolate(vertices),sharedPoint=interpolate(viewPoints).applyMatrix4(camera.matrixWorld);
  expect(sharedPoint.distanceTo(oldPoint)).toBeLessThan(1e-10);
  expect(decorOccludesMap(sharedPoint,view,map)).toBe(decorOccludesMap(oldPoint,view,map));
  for(const point of [new Vector3(8,5,12),new Vector3(8,-5,3),new Vector3(80,4,20)]){
    const recovered=point.clone().applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.matrixWorld);
    expect(recovered.distanceTo(point)).toBeLessThan(1e-10);
    expect(decorOccludesMap(recovered,view,map)).toBe(decorOccludesMap(point,view,map));
  }
});