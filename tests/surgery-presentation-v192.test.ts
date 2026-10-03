import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { createMedicalRecord } from '../src/sim/injury-state';
import { appearanceOf } from '../src/sim/pawn-appearance';
import { startingPawn } from '../src/sim/starting-pawns';
import { PawnLayer,humanCorpseVisualStage } from '../src/render/PawnLayer';
import { pawnGeometry } from '../src/render/pawn-geometry';
import { appearanceShape } from '../src/render/pawn-appearance-shape';
import { humanBoneAbsent,humanLimbVisualMask,packHumanShape } from '../src/render/human-anatomy-presentation';
import { apparelAppearance } from '../src/render/character-apparel';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { portraitDataUrl,portraitExpressionOf } from '../src/ui/pawn-portrait';
import { pawnWorkPose,WORK_POSE } from '../src/render/work-presentation';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { AudioCueRecorder } from '../src/bridge/audio-cues';
import type { Pawn } from '../src/sim/types';

// Explicit visual boundaries, not a claim that an operation was executed here.
const parts=['left-arm','right-arm','left-leg','right-leg'] as const;
function maskRecord(pawn:Pawn,mask:number,tick=0):void {
  pawn.health=createMedicalRecord(tick);
  pawn.health.missing=parts.filter((_,i)=>mask&2**i).map(part=>({part,bornAt:tick}));
}
const decode=(url:string)=>decodeURIComponent(url.split(',')[1]!);

test('all sixteen anatomical masks roundtrip the existing float32 shape word with independent body/stage digits',()=>{
  const pawn=createWorld(192,16,16).pawns[0]!;
  for(let mask=0;mask<16;mask++){
    maskRecord(pawn,mask);expect(humanLimbVisualMask(pawn)).toBe(mask);
    for(let body=0;body<5;body++)for(let rot=0;rot<3;rot++){
      const word=Math.fround(packHumanShape(body,rot,mask));
      expect(word).toBe(body+rot*10+mask*100);
      expect(word%10).toBe(body);expect(Math.floor(word/10)%10).toBe(rot);expect(Math.floor(word/100)).toBe(mask);
    }
    const expected=new Set<number>();
    if(mask&1)expected.add(2);if(mask&2)expected.add(3);if(mask&4){expected.add(4);expected.add(6);}if(mask&8){expected.add(5);expected.add(7);}
    expect(new Set(Array.from({length:8},(_,bone)=>bone).filter(bone=>humanBoneAbsent(mask,bone)))).toEqual(expected);
  }
});

test('missing ancestors remove the anatomical subtree while wounds and child losses retain the present parent',()=>{
  const pawn=createWorld(192,16,16).pawns[0]!;maskRecord(pawn,0);
  pawn.health!.missing=[{part:'left-shoulder',bornAt:0}];expect(humanLimbVisualMask(pawn)).toBe(1);
  pawn.health!.missing=[{part:'right-shoulder',bornAt:0},{part:'left-leg',bornAt:0}];expect(humanLimbVisualMask(pawn)).toBe(6);
  pawn.health!.missing=[{part:'left-hand',bornAt:0},{part:'right-foot',bornAt:0}];expect(humanLimbVisualMask(pawn)).toBe(0);
  pawn.health!.missing=[];pawn.health!.injuries=[{id:1,part:'left-arm',kind:'cut',severity:1000,bornAt:0}];
  expect(humanLimbVisualMask(pawn)).toBe(0);
});

test('authored side convention includes sleeves/hands and thighs/calves/shoes without changing vertices, indices or normals',()=>{
  const geometry=pawnGeometry(),position=geometry.getAttribute('position'),bone=geometry.getAttribute('boneId'),dye=geometry.getAttribute('dye'),normal=geometry.getAttribute('normal');
  const expectedSides=new Map([[2,-1],[3,1],[4,-1],[5,1],[6,-1],[7,1]]);
  const tags=new Map<number,Set<number>>();
  for(let i=0;i<position.count;i++){
    const id=bone.getX(i),side=expectedSides.get(id);if(side!==undefined)expect(Math.sign(position.getX(i))).toBe(side);
    const set=tags.get(id)??new Set<number>();set.add(dye.getX(i));tags.set(id,set);
    expect(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))).toBeCloseTo(1,5);
  }
  expect(tags.get(2)).toEqual(new Set([1,2]));expect(tags.get(3)).toEqual(new Set([1,2]));
  for(const id of [4,5])expect(tags.get(id)).toEqual(new Set([-3,0]));
  expect(geometry.index).not.toBeNull();expect(normal.count).toBe(position.count);geometry.dispose();
});

test('same-tick adoption preserves resident objects, growth/reordering, World and pause while the human missing mask changes',()=>{
  const world=createWorld(192,16,16),pawn=world.pawns[0]!,layer=new PawnLayer();layer.update(world,1,true);
  const geometry=layer.feedbackSource!,shape=geometry.getAttribute('aShape') as THREE.InterleavedBufferAttribute;
  const material=(layer.group.children[0] as THREE.Mesh).material,children=layer.group.children.length;
  maskRecord(pawn,9,world.tick);const before=JSON.stringify(world);layer.update(world,1,false);
  expect(JSON.stringify(world)).toBe(before);expect(layer.feedbackSource).toBe(geometry);expect(geometry.getAttribute('aShape')).toBe(shape);
  expect(shape.getX(0)).toBe(appearanceShape(appearanceOf(pawn,world.seed))[0]+900);
  for(let i=0;i<32;i++)world.pawns.push(startingPawn(world.nextId++,`Prepared ${i}`,3,3,0,55,world.seed));
  world.pawns.reverse();layer.update(world,1,false);
  const grown=layer.feedbackSource!,maskIndex=world.pawns.findIndex(p=>p.id===pawn.id),grownShape=grown.getAttribute('aShape') as THREE.InterleavedBufferAttribute;
  expect(grownShape.getX(maskIndex)).toBe(appearanceShape(appearanceOf(pawn,world.seed))[0]+900);
  expect((layer.group.children[0] as THREE.Mesh).material).toBe(material);expect(layer.group.children.length).toBe(children);
  const names=['position','normal','color','boneId','bindPivot','dye','aFrom','aTo','aMotion','aTravel','aCargo','aTint','aEquipment','aSkin','aHair','aShape'];
  const buffers=new Set(names.map(name=>{const a=grown.getAttribute(name);return a instanceof THREE.InterleavedBufferAttribute?a.data:a;}));
  expect(buffers.size).toBeLessThanOrEqual(8);expect(names.length).toBe(16);
  const timeline=new MotionTimeline();timeline.adopt(world.tick,0,[],0,true);layer.updateTravel(world,timeline);
  const words=Array.from(grownShape.data.array),version=grownShape.data.version,clock=layer.time.value;
  for(const now of [100,500,1000]){timeline.advance(now);layer.updateTravel(world,timeline);}
  expect(grownShape.data.version).toBe(version);expect(Array.from(grownShape.data.array)).toEqual(words);expect(layer.time.value).toBe(clock);
  layer.dispose();
});

test('patient and human corpse keep their own absence word in the existing carried rig and corpse appearance digits',()=>{
  const world=createWorld(192,16,16),carrier=world.pawns[0]!,patient=world.pawns[1]!,layer=new PawnLayer();
  maskRecord(patient,5);patient.state='downed';carrier.rescue={patientId:patient.id,bedId:999,phase:'carry'};
  layer.update(world,1,true);const timeline=new MotionTimeline();timeline.adopt(world.tick,0,[],0,true);layer.updateTravel(world,timeline);
  const geometry=layer.feedbackSource!,shape=geometry.getAttribute('aShape'),motion=geometry.getAttribute('aMotion');
  expect(Math.floor(shape.getX(1)/100)).toBe(5);expect(Math.floor(shape.getX(0)/100)).toBe(0);expect(motion.getZ(1)).toBe(6);
  delete carrier.rescue;patient.state='dead';patient.health!.death={tick:world.tick,cause:'trauma'};
  const pileId=world.nextId++;patient.body={observedAt:world.tick,pileId};
  world.piles.push({id:pileId,item:'human-corpse',kind:'corpse',quantity:1,owner:{type:'pawn',pawnId:carrier.id},humanCorpse:{pawnId:patient.id},rot:{atTick:world.tick,progress:0}});
  const before=JSON.stringify(world);layer.update(world,1,false);layer.updateTravel(world,timeline);
  expect(layer.feedbackSource).toBe(geometry);expect(Math.floor(shape.getX(1)/100)).toBe(5);
  expect(Math.floor(shape.getX(1)/10)%10).toBe(humanCorpseVisualStage(world,patient));expect(motion.getZ(1)).toBe(6);expect(JSON.stringify(world)).toBe(before);
  layer.dispose();
});

test('portrait cache and visible art follow the same limb absence and real clinical sedation, preserving death priority',()=>{
  const world=createWorld(192,16,16),pawn=world.pawns[0]!,appearance=appearanceOf(pawn,world.seed),look=apparelAppearance();
  const whole=portraitDataUrl(appearance,look),amputated=portraitDataUrl(appearance,look,undefined,'awake',1);
  expect(decode(amputated)).toContain('data-limb-mask="1"');expect((decode(amputated).match(/<polygon /g)??[]).length).toBeLessThan((decode(whole).match(/<polygon /g)??[]).length);
  expect(portraitDataUrl(appearance,look,undefined,'awake',1)).toBe(amputated);expect(portraitDataUrl(appearance,look)).toBe(whole);
  maskRecord(pawn,1);pawn.health!.anesthetic={bornAt:0,expiresAtCore:45_000,severity:800_000_000,remainder:0};
  expect(portraitExpressionOf(pawn)).toBe('sleep');pawn.health!.anesthetic.severity=799_999_999;expect(portraitExpressionOf(pawn)).toBe('awake');
  pawn.state='dead';pawn.health!.anesthetic.severity=1_000_000_000;expect(portraitExpressionOf(pawn)).toBe('dead');
});

test('surgical work reuses the medical gesture only at contact, without animation during approach or incapacity',()=>{
  const world=createWorld(192,16,16),doctor=world.pawns[0]!,patient=world.pawns[1]!;
  doctor.state='working';doctor.surgery={patientId:patient.id,part:'left-arm',bedId:999,spot:{x:3,z:3},phase:'pickup',progress:0,workCore:0};
  expect(pawnWorkPose(doctor,undefined)).toBe(0);
  doctor.surgery.phase='approach';expect(pawnWorkPose(doctor,undefined)).toBe(0);
  doctor.surgery.phase='work';expect(pawnWorkPose(doctor,undefined)).toBe(WORK_POSE.craft);
  doctor.state='downed';expect(pawnWorkPose(doctor,undefined)).toBe(0);
});

test('same-tick medical boundaries publish by value while continuous surgical work and anesthesia use the periodic cadence',()=>{
  const world=createWorld(192,16,16),doctor=world.pawns[0]!,patient=world.pawns[1]!,changes=new PresentationChanges();
  patient.health=createMedicalRecord(world.tick);
  expect(changes.capture(world)).toBe(true);expect(changes.capture(structuredClone(world))).toBe(false);
  patient.surgeryRequest={part:'right-leg',requestedAt:world.tick};expect(changes.capture(world)).toBe(true);expect(changes.capture(world)).toBe(false);
  doctor.surgery={patientId:patient.id,part:'right-leg',bedId:999,spot:{x:3,z:3},phase:'pickup',progress:0,workCore:0};expect(changes.capture(world)).toBe(true);
  doctor.surgery.phase='approach';expect(changes.capture(world)).toBe(true);
  doctor.surgery.phase='work';doctor.surgery.consumedMedicine='herbal-medicine';expect(changes.capture(world)).toBe(true);
  doctor.surgery.progress=200;doctor.surgery.workCore=20;expect(changes.capture(world)).toBe(false);
  patient.health.anesthetic={bornAt:world.tick,expiresAtCore:45_000,severity:1_000_000_000,remainder:0};expect(changes.capture(world)).toBe(true);
  patient.health.anesthetic.severity=900_000_000;patient.health.anesthetic.remainder=1;expect(changes.capture(world)).toBe(false);
  patient.health.anesthetic.severity=799_999_999;expect(changes.capture(world)).toBe(true);
  patient.health.anesthetic.severity=599_999_999;expect(changes.capture(world)).toBe(true);
  patient.health.missing.push({part:'right-leg',bornAt:world.tick});expect(changes.capture(world)).toBe(true);
  patient.health.nextInjuryId++;expect(changes.capture(world)).toBe(true);
  delete patient.surgeryRequest;delete doctor.surgery;expect(changes.capture(world)).toBe(true);
  delete patient.health.anesthetic;expect(changes.capture(world)).toBe(true);
  const before=JSON.stringify(world);expect(changes.capture(structuredClone(world))).toBe(false);expect(JSON.stringify(world)).toBe(before);
});

test('medical sound follows surgical contacted time and identity, never dynamic progress, loaded work or a paused replay',()=>{
  const world=createWorld(192,16,16),doctor=world.pawns[0]!,recorder=new AudioCueRecorder();
  world.jobs=[];world.pawns=[doctor];doctor.jobId=null;doctor.state='working';
  doctor.surgery={patientId:999,part:'left-arm',bedId:998,spot:{x:3,z:3},phase:'approach',progress:0,workCore:0};
  recorder.capture(world);expect(recorder.drain()).toEqual([]);
  world.tick++;doctor.surgery.workCore=20;recorder.capture(world);expect(recorder.drain()).toEqual([]);
  doctor.surgery.phase='work';world.tick++;doctor.surgery.progress=100;recorder.capture(world);expect(recorder.drain()).toEqual([]);
  const cues=[];
  for(let i=0;i<40;i++){
    world.tick++;doctor.surgery.workCore+=20;
    const before=JSON.stringify(world);recorder.capture(world);expect(JSON.stringify(world)).toBe(before);
    cues.push(...recorder.drain());recorder.capture(world);expect(recorder.drain()).toEqual([]);
  }
  expect(cues.length).toBeGreaterThan(1);expect(cues.length).toBeLessThan(12);
  expect(cues.every(cue=>cue.kind==='medical.tend'&&cue.id.endsWith(':surgery:999:left-arm'))).toBe(true);
  for(let i=1;i<cues.length;i++)expect(cues[i]!.tick-cues[i-1]!.tick).toBeGreaterThanOrEqual(5);
  world.tick+=20;doctor.surgery.progress+=1000;recorder.capture(world);expect(recorder.drain()).toEqual([]);
  world.tick++;doctor.surgery.part='right-arm';doctor.surgery.workCore+=20;recorder.capture(world);expect(recorder.drain()).toEqual([]);
  recorder.reset();recorder.capture(world);expect(recorder.drain()).toEqual([]);
  doctor.state='downed';world.tick+=20;doctor.surgery.workCore+=20;recorder.capture(world);expect(recorder.drain()).toEqual([]);
});
