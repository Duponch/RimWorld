import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';
import type {TravelSegment} from '../src/sim/travel-timing.ts';

const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const path='public/test-saves/v419/les-eclaircies.json',pin='49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f';
function scene(){
 const bytes=readFileSync(path);expect(sha(bytes)).toBe(pin);const world=deserializeWorld(bytes.toString('utf8'));
 expect(Number(world.schemaVersion)).toBe(297);expect(validateWorld(world)).toEqual([]);
 const moving=()=>world.wildlife?.animals.find(a=>a.species!=='duck'&&a.state==='moving'&&a.motion&&a.motion.start<=effectiveCore297(world)/10&&a.motion.end>effectiveCore297(world)/10+.3);
 for(let n=0;n<180&&!moving();n++)advanceWorldCore297(world);
 const animal=moving();if(!animal)throw Error('Bounded actual public continuation has no suitable moving land animal');
 const detail=new AnimationDetail(),layer=new WildlifeLayer(undefined,undefined,detail),timeline=new MotionTimeline();
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,1000);camera.position.set(0,30,30);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
 const tracks=new Map<number,TravelSegment[]>();
 const updateTracks=()=>{for(const a of world.wildlife?.animals??[]){if(!a.motion)continue;const rows=tracks.get(a.id)??[];if(rows.at(-1)!==a.motion)rows.push(a.motion);tracks.set(a.id,rows);timeline.tracks.set(a.id,rows);}};
 let index=0;const frame=(speed:number,reset=false,w:World=world)=>{
  timeline.tick=effectiveCore297(w)/10;updateTracks();detail.beginFrame(index++*1000/60,camera,720,timeline.tick);
  layer.update(w,timeline,reset,undefined,undefined,1/60,speed);layer.presentAnimations();
  const pose=layer.cpuPoseForId(animal.id);if(!pose)throw Error('Actual animal rig has no presented root');return {...pose};
 };
 const phase=()=>{const mesh=layer.mesh.children.find(c=>c.name.startsWith(`Wild ${animal.species} `)) as THREE.Mesh|undefined;
  if(!mesh)throw Error('Actual species mesh absent');const slot=world.wildlife!.animals.filter(a=>a.species===animal.species).findIndex(a=>a.id===animal.id);
  return mesh.geometry.getAttribute('aAnimal').getW(slot);
 };
 frame(1,true);return {world,animal,detail,layer,timeline,frame,phase};
}

test('a real moving animal keeps approaching its confirmed root between deliveries without playing Core or changing Whole',()=>{
 const s=scene();try{
  advanceWorldCore297(s.world);advanceWorldCore297(s.world);s.frame(1);
  const core=effectiveCore297(s.world),rng=s.world.rng,nextId=s.world.nextId,before=serializeWorld(s.world),poses:ReturnType<typeof s.frame>[]=[],phases:number[]=[];
  // Reproduce a held confirmed frontier. No prediction or additional Engine call.
  for(let n=0;n<20;n++){poses.push(s.frame(1));phases.push(s.phase());expect(effectiveCore297(s.world)).toBe(core);}
  const changes=poses.slice(1).filter((p,i)=>Math.hypot(p.x-poses[i]!.x,p.z-poses[i]!.z)>1e-7);
  expect(changes.length,'Displayed root must continue the same recurrence as humans while a confirmed target is held').toBeGreaterThan(4);
  expect(new Set(phases).size,'Leg phase must follow actual displayed displacement').toBeGreaterThan(4);
  expect(poses.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))).toBe(true);
  const paused=s.frame(0),phase=s.phase();for(let n=0;n<12;n++){expect(s.frame(0)).toEqual(paused);expect(s.phase()).toBe(phase);}
  expect(s.world.rng).toBe(rng);expect(s.world.nextId).toBe(nextId);expect(serializeWorld(s.world)===before,'Every byte of Whole remains unchanged by presentation').toBe(true);
  const own=deserializeWorld(before);expect(serializeWorld(own)===before).toBe(true);expect(sha(readFileSync(path))).toBe(pin);
 }finally{s.layer.dispose();}
},120000);

test('an explicit own-reload reset renews animal presentation history even with the same actor identity',()=>{
 const s=scene();try{
  advanceWorldCore297(s.world);advanceWorldCore297(s.world);s.frame(1);
  const held=s.frame(0),raw=serializeWorld(s.world),loaded=deserializeWorld(raw),animal=loaded.wildlife!.animals.find(a=>a.id===s.animal.id)!;
  expect(animal.id).toBe(s.animal.id);expect(animal.motion).toBeDefined();
  const now=effectiveCore297(loaded)/10,m=animal.motion!,fraction=Math.max(0,Math.min(1,(now-m.start)/(m.end-m.start)));
  const expected={x:m.from.x+(m.to.x-m.from.x)*fraction,z:m.from.z+(m.to.z-m.from.z)*fraction};
  const reset=s.frame(0,true,loaded);expect(reset.x).toBeCloseTo(expected.x,4);expect(reset.z).toBeCloseTo(expected.z,4);
  expect(Math.hypot(held.x-reset.x,held.z-reset.z),'A reset must revoke the old smoothed position').toBeGreaterThan(1e-5);
  expect(serializeWorld(loaded)===raw).toBe(true);expect(validateWorld(loaded)).toEqual([]);expect(sha(readFileSync(path))).toBe(pin);
 }finally{s.layer.dispose();}
},120000);
