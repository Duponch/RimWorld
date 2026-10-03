import { expect,test } from 'vitest';
import { createMedicalRecord } from '../src/sim/injury-state';
import { bodyBloodRegion,bodyBloodWord } from '../src/render/body-blood';
import { PawnLayer } from '../src/render/PawnLayer';
import { createWorld } from '../src/sim/engine';

test('blood pigment follows external open wounds, not bruises, burns, scars or internal blood loss',()=>{
  const health=createMedicalRecord(20);
  health.injuries=[{id:1,part:'left-arm',kind:'cut',severity:6000,bornAt:10}];
  const before=structuredClone(health),word=bodyBloodWord(health);
  expect(word).toBe(2*4**2);expect(bodyBloodRegion('left-hand')).toBe(2);
  health.death={tick:20,cause:'blood-loss'};
  expect(bodyBloodWord(health)).toBe(word);
  health.injuries[0]!.tended=500;expect(bodyBloodWord(health)).toBe(word);
  health.injuries[0]!.scar={threshold:6000,pain:0};expect(bodyBloodWord(health)).toBe(0);
  for(const kind of ['burn','bruise','crack'] as const){health.injuries=[{id:2,part:'torso',kind,severity:9000,bornAt:10}];expect(bodyBloodWord(health)).toBe(0);}
  health.injuries=[{id:3,part:'heart',kind:'stab',severity:10000,bornAt:10}];health.bloodLoss=300000000;
  expect(bodyBloodWord(health)).toBe(0);expect(before.death).toBeUndefined();
});

test('absent anatomy cannot be stained and words remain exact in float32',()=>{
  const health=createMedicalRecord(20);health.body='hare';
  health.injuries=[{id:1,part:'left-front-paw',kind:'bite',severity:3000,bornAt:10},{id:2,part:'head',kind:'cut',severity:9000,bornAt:10}];
  const snapshot=structuredClone(health),whole=bodyBloodWord(health),remaining=bodyBloodWord(health,part=>part==='head');
  expect(whole).toBeGreaterThan(remaining);expect(remaining).toBeGreaterThan(0);
  expect(Math.fround(whole)).toBe(whole);expect(health).toEqual(snapshot);
});

test('a same-tick human snapshot updates paint through the resident appearance buffer without changing World',()=>{
  const world=createWorld(),pawn=world.pawns[0]!,layer=new PawnLayer();
  pawn.health=createMedicalRecord(world.tick);layer.update(world,1,true);
  const geometry=layer.feedbackSource!,blood=geometry.getAttribute('aBodyBlood');expect(blood.getX(0)).toBe(0);
  pawn.health.injuries.push({id:1,part:'right-leg',kind:'gunshot',severity:7000,bornAt:world.tick});
  const before=structuredClone(world);layer.update(world,1,false);
  expect(layer.feedbackSource).toBe(geometry);expect(geometry.getAttribute('aBodyBlood')).toBe(blood);
  expect(blood.getX(0)).toBe(2*4**5);expect(world).toEqual(before);
  layer.setTexturesEnabled(false);layer.dispose();
});
