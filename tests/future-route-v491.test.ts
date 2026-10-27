import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWorld} from '../src/sim/engine';
import {createClosedMainMapIntentReader} from '../src/render/closed-main-map-intents';
import {ActionFeedbackLayer} from '../src/render/ActionFeedbackLayer';

type Layer=ActionFeedbackLayer;
const clock=()=>({blend:uniform(.25),travelTime:uniform(12)});
function source(capacity:number){const g=new THREE.InstancedBufferGeometry();for(const name of ['aFrom','aTo','aTravel'])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));for(let i=0;i<capacity;i++){(g.getAttribute('aFrom') as THREE.InstancedBufferAttribute).setXYZW(i,1+i,0,1,0);(g.getAttribute('aTo') as THREE.InstancedBufferAttribute).setXYZW(i,2+i,0,1,0);(g.getAttribute('aTravel') as THREE.InstancedBufferAttribute).setXYZW(i,10,15,0,1);}return g;}
function values(layer:Layer,name:string){const a=layer.path.geometry.getAttribute(name);return Array.from({length:layer.path.geometry.instanceCount},(_,i)=>Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j]));}
function ends(layer:Layer){return values(layer,'aPathEnd').map(v=>({x:v[0],z:v[2]}));}
function fixture(){const executed=createWorld(491,16,16),p=executed.pawns[0]!;executed.tick=12;p.x=2;p.z=1;p.state='moving';p.motion={from:{x:1,z:1},to:{x:2,z:1},start:10,end:15};p.path=[{x:2,z:2},{x:3,z:2}];const latest=structuredClone(executed),q=latest.pawns[0]!;latest.tick=16;q.x=3;q.z=1;q.motion={from:{x:2,z:1},to:{x:3,z:1},start:15,end:18};q.path=[{x:3,z:2},{x:4,z:2}];return {executed,latest,p,q,selected:new Set([p.id]),g:source(executed.pawns.length)};}
const routes=(world:ReturnType<typeof createWorld>)=>createClosedMainMapIntentReader().admit!(world).routes;

test('future logical origin shows the NEW confirmed suffix immediately, with no GPU chord or old branch',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock()),before=structuredClone(f.executed),pose=Array.from(f.g.getAttribute('aFrom').array);
 try{layer.updateConfirmedPath(routes(f.latest),f.executed,f.selected,f.g);
  expect(ends(layer)).toEqual([{x:3,z:2},{x:4,z:2}]);expect(values(layer,'aPathOwner')).toEqual([[-1],[-1]]);
  expect(values(layer,'aFrom')).toEqual([[3,0,1,0],[3,0,2,0]]);expect(values(layer,'aTo')).toEqual(values(layer,'aFrom'));
  expect(values(layer,'aTravel')).toEqual([[0,0,0,1],[0,0,0,1]]);expect(f.executed).toEqual(before);expect(Array.from(f.g.getAttribute('aFrom').array)).toEqual(pose);
 }finally{layer.dispose();f.g.dispose();}
});

test('edge mismatch at the same logical origin also has a static first segment',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock());f.q.x=f.p.x;f.q.z=f.p.z;f.q.motion={from:{x:2,z:0},to:{x:2,z:1},start:11,end:17};f.q.path=[{x:2,z:2},{x:3,z:2}];
 try{layer.updateConfirmedPath(routes(f.latest),f.executed,f.selected,f.g);expect(ends(layer)).toEqual(f.q.path);expect(values(layer,'aPathOwner')[0]).toEqual([-1]);expect(values(layer,'aFrom')[0]).toEqual([2,0,1,0]);}finally{layer.dispose();f.g.dispose();}
});

test('static suffix stays fixed as the executed actor moves, retaining mesh and existing buffers',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock());try{const r=routes(f.latest);layer.updateConfirmedPath(r,f.executed,f.selected,f.g);const mesh=layer.path,buffers=['aPathOwner','aPathEnd','aFrom','aTo','aTravel'].map(n=>layer.path.geometry.getAttribute(n)),expected=values(layer,'aFrom'),rebuilds=layer.stats.pathRebuilds,copies=layer.stats.travelCopies;
  (f.g.getAttribute('aFrom') as THREE.InstancedBufferAttribute).setX(0,99);f.g.getAttribute('aFrom').needsUpdate=true;layer.syncTravel(f.g);layer.updateConfirmedPath(r,f.executed,f.selected,f.g);
  expect(values(layer,'aFrom')).toEqual(expected);expect(layer.stats.travelCopies).toBe(copies);expect(layer.stats.pathRebuilds).toBe(rebuilds);expect(layer.path).toBe(mesh);buffers.forEach((a,i)=>expect(layer.path.geometry.getAttribute(['aPathOwner','aPathEnd','aFrom','aTo','aTravel'][i]!)).toBe(a));
 }finally{layer.dispose();f.g.dispose();}
});

test('the anchor participates in the cache key and becoming compatible restores the GPU origin',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock());try{const r=routes(f.latest);layer.updateConfirmedPath(r,f.executed,f.selected,f.g);const initial=layer.stats.pathRebuilds;
  const shifted=structuredClone(f.latest);shifted.pawns[0]!.motion=null;shifted.pawns[0]!.x=4;shifted.pawns[0]!.z=1;shifted.pawns[0]!.path=f.q.path.map(c=>({...c}));layer.updateConfirmedPath(routes(shifted),f.executed,f.selected,f.g);expect(values(layer,'aFrom')[0]).toEqual([4,0,1,0]);expect(layer.stats.pathRebuilds).toBe(initial+1);
  (f.g.getAttribute('aFrom') as THREE.InstancedBufferAttribute).setXYZW(0,2,0,1,0);(f.g.getAttribute('aTo') as THREE.InstancedBufferAttribute).setXYZW(0,3,0,1,0);(f.g.getAttribute('aTravel') as THREE.InstancedBufferAttribute).setXYZW(0,15,18,0,1);f.g.getAttribute('aFrom').needsUpdate=f.g.getAttribute('aTo').needsUpdate=f.g.getAttribute('aTravel').needsUpdate=true;
  layer.updateConfirmedPath(r,f.latest,f.selected,f.g);expect(values(layer,'aPathOwner')[0]).toEqual([0]);expect(ends(layer)).toEqual([{x:3,z:1},...f.q.path]);expect(layer.stats.pathRebuilds).toBe(initial+2);
 }finally{layer.dispose();f.g.dispose();}
});

test('an origin-only prefix draws no zero segment and cannot restore the old route',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock());f.q.path=[];try{layer.updateConfirmedPath(routes(f.latest),f.executed,f.selected,f.g);expect(layer.path.geometry.instanceCount).toBe(0);expect(layer.path.visible).toBe(false);layer.update(f.executed,f.selected,f.g,true);expect(layer.path.visible).toBe(false);}finally{layer.dispose();f.g.dispose();}
});

test('confirmed cancellation and deselection remain empty through an older physical update',()=>{
 const f=fixture(),layer=new ActionFeedbackLayer(clock());try{const r=routes(f.latest);layer.updateConfirmedPath(r,f.executed,f.selected,f.g);expect(layer.path.visible).toBe(true);
  const cancelled=structuredClone(f.latest);cancelled.pawns[0]!.state='idle';cancelled.pawns[0]!.path=[];layer.updateConfirmedPath(routes(cancelled),f.executed,f.selected,f.g);layer.update(f.executed,f.selected,f.g,true);expect(layer.path.visible).toBe(false);expect(layer.path.geometry.instanceCount).toBe(0);
  layer.updateConfirmedPath(r,f.executed,f.selected,f.g);expect(layer.path.visible).toBe(true);layer.updateConfirmedPath(r,f.executed,new Set(),f.g);layer.update(f.executed,new Set(),f.g,true);expect(layer.path.visible).toBe(false);expect(layer.path.geometry.instanceCount).toBe(0);
 }finally{layer.dispose();f.g.dispose();}
});
