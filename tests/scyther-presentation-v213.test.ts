import { expect,test } from 'vitest';
import { InstancedBufferGeometry,InterleavedBufferAttribute,Mesh } from 'three/webgpu';
import { scytherCamp,producedScytherCorpse } from './scenarios/scyther-v213.ts';
import { mechanoidView,mechanoidVisualMask,scytherPartIndex } from '../src/sim/mechanoid-presentation.ts';
import { SCYTHER_PART_IDS } from '../src/sim/mechanoid-anatomy.ts';
import { createMechaMedicalRecord } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury,partMissing } from '../src/sim/injury-state.ts';
import { SCYTHER_VISUAL_PARTS,scytherGeometry } from '../src/render/scyther-geometry.ts';
import { MechanoidLayer } from '../src/render/MechanoidLayer.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { MotionRecorder } from '../src/bridge/motion-tracks.ts';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { miniTurretTargets } from '../src/sim/mini-turret-presentation.ts';

test('anatomical subtree loss uses two exact 16-bit masks and original bounded geometry, without erasing an independent blade',()=>{
  const {world,actor}=scytherCamp();actor.health=createMechaMedicalRecord(world.tick);
  const noDraw=()=>{throw Error('No biological roll');};
  addResolvedInjury(actor.health,'scyther-left-shoulder','crack',33000,noDraw);
  addResolvedInjury(actor.health,'scyther-right-leg','crack',40000,noDraw);
  const before=JSON.stringify(world),[low,high]=mechanoidVisualMask(actor);
  expect(miniTurretTargets(world).get(`mech:${actor.id}`)).toEqual({key:`mech:${actor.id}`,label:`Scyther ${actor.id}`,cell:{x:actor.x,z:actor.z}});
  SCYTHER_PART_IDS.forEach((part,i)=>expect(Math.floor((i<16?low:high)/2**(i%16))%2===1).toBe(partMissing(actor.health!,part)));
  expect(low).toBeLessThan(65536);expect(high).toBeLessThan(65536);expect(high).toBeGreaterThan(0);
  expect(partMissing(actor.health,'scyther-right-blade')).toBe(false);
  const geometry=scytherGeometry(8,scytherPartIndex);
  expect(SCYTHER_VISUAL_PARTS).toHaveLength(18);expect(geometry.getAttribute('position').count).toBe(18*36);
  expect(geometry.getAttribute('aMask').itemSize).toBe(2);expect(JSON.stringify(world)).toBe(before);geometry.dispose();
});

test('mechanical geometry is absent from an empty scene, then shares confirmed edges and stationary uploads between body and selection',()=>{
  const {world,actor}=scytherCamp(),layer=new MechanoidLayer();
  layer.update({...world,mechanoids:undefined},undefined);expect(layer.group.children).toHaveLength(0);
  actor.state='moving';actor.x=19;actor.motion={from:{x:18,z:16},to:{x:19,z:16},start:world.tick-1,end:world.tick+2};actor.moveCooldown=2;
  layer.update(world,undefined);layer.setSelected(new Set([actor.id]));expect(layer.group.children).toHaveLength(2);
  const [body,selection]=layer.group.children as Mesh[],geometry=body!.geometry as InstancedBufferGeometry;
  expect(selection!.geometry.getAttribute('aFrom')).toBe(geometry.getAttribute('aFrom'));
  let location:{x:number;z:number}|undefined;layer.forEachPose((_id,x,_y,z)=>{location={x,z};});expect(location!.x).toBeCloseTo(18+1/3,5);expect(location!.z).toBe(16);
  const data=(geometry.getAttribute('aFrom') as InterleavedBufferAttribute).data,version=data.version;
  layer.update(world,undefined);expect(data.version).toBe(version);
  const recorder=new MotionRecorder();recorder.capture(world);expect(recorder.snapshot().find(t=>t.id===actor.id)!.segments[0]).toMatchObject(actor.motion);
  layer.reset();expect(layer.group.children).toHaveLength(0);layer.dispose();
});

test('confirmed mechanical contact and death are physical presentation phases with no human or animal voice and no replay on load',()=>{
  const {world,actor}=scytherCamp(),changes=new PresentationChanges(),audio=new AudioCueRecorder();changes.capture(world);audio.capture(world);
  actor.melee={order:null,strike:{targetId:world.pawns[0]!.id,atCore:world.tick*10,untilCore:world.tick*10+120,tool:'left-blade-cut',outcome:'miss'}};
  expect(changes.capture(world)).toBe(true);audio.capture(world);expect(audio.drain().map(c=>c.kind)).toEqual(['weapon.melee']);
  const loaded=new AudioCueRecorder();loaded.capture(structuredClone(world));expect(loaded.drain()).toEqual([]);
  delete actor.melee;producedScytherCorpse(world,actor);expect(changes.capture(world)).toBe(true);audio.capture(world);
  expect(audio.drain().some(c=>c.kind.startsWith('human.')||c.kind.startsWith('animal.')||c.kind==='ui.colonist-death')).toBe(false);
  expect(mechanoidView(world,actor).parts.find(p=>p.id==='scyther-right-blade')!.absent).toBe(true);
});
