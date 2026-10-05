import { expect,test } from 'vitest';
import { resolveBombImpact } from '../src/sim/bomb-impact.ts';
import { fragmentedApparelProtection } from '../src/sim/apparel-protection.ts';
import { createMedicalRecord,addResolvedInjury } from '../src/sim/injury-state.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { INJURY_RULES } from '../src/sim/injury-rules.ts';
import { injuryInfectionChance } from '../src/sim/infection-rules.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { medicalCamp } from './scenarios/health.ts';
import { damagePawnWithBomb } from '../src/sim/bomb-medical.ts';
import { validateWorld } from '../src/sim/serialization.ts';

test('Bomb has a strict future injury, 2–4 fragments and explicit thirds without changing its source record',()=>{
  expect(INJURY_RULES.shredded).toMatchObject({painUnits:10,bleedUnits:18,scar:true,merge:true});
  const original=createMedicalRecord(3000),before=JSON.stringify(original);
  const impact=resolveBombImpact(original,{damage:50,part:'torso'},()=>.4,(_part,amount)=>({amount,converted:false}));
  expect(impact.fragments).toBe(3);expect(impact.layers.map(l=>l.severity)).toEqual([16667,16667,16666]);
  expect(impact.layers.every(l=>l.kind==='shredded')).toBe(true);expect(JSON.stringify(original)).toBe(before);
  const small=createMedicalRecord(3000);addResolvedInjury(small,'left-arm','shredded',1000,()=>.999999);
  expect(injuryInfectionChance(small,{part:'left-arm',kind:'shredded'})).toBe(.2);
  expect(validateMedicalRecord(small,true,true,true,true,false,false,true,true,true,true,true,193,true)).toBeNull();
  expect(validateMedicalRecord(small,true,true,true,true,false,false,true,true,true,true,true,192,true)).not.toBeNull();
  expect(resolveBombImpact(original,{damage:0},()=>{throw new Error('No random for zero');}).fragments).toBe(0);
});

test('fragment protection converts Sharp while inner propagation retains the generic repeated layers',()=>{
  const r=createMedicalRecord(3000),impact=resolveBombImpact(r,{damage:16,part:'heart'},()=>.999999,(_part,amount)=>({amount:amount/2,converted:true}));
  expect(impact.fragments).toBe(4);expect(impact.layers.filter(l=>l.part==='heart').every(l=>l.kind==='crush')).toBe(true);
  expect(impact.layers.filter(l=>l.part==='torso').every(l=>l.kind==='bruise')).toBe(true);
  expect(impact.layers.slice(0,2).map(l=>l.severity)).toEqual([2000,2000]);
  const solid=resolveBombImpact(r,{damage:16,part:'sternum'},()=>.999999);
  expect(solid.layers.some(l=>l.kind==='crack')).toBe(true);
});

test('cumulative armor wear retires a destroyed garment before the following fragment, with neutral loss only',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');
  const vest=w.piles.find(i=>i.item==='flak-vest')!;vest.apparel!.hitPoints=5;
  let draws=0;const protection=fragmentedApparelProtection(w,p,.1,()=>{draws++;return .999999;});
  expect(protection.protect('torso',12).amount).toBe(12);
  expect(protection.protect('torso',12).amount).toBe(12);
  const before=draws;expect(protection.protect('torso',12).amount).toBe(12);expect(draws-before).toBe(1);
  expect(vest.apparel!.hitPoints).toBe(5);protection.commit();expect(w.piles).not.toContain(vest);
  expect(w.destroyed?.items?.['flak-vest']).toBe(1);expect(w.fires).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('a real Bomb medical producer preserves XP and rejects an invalid clock before ownership or RNG changes',()=>{
  const w=medicalCamp(),p=w.pawns[0]!,before=JSON.stringify(w);
  expect(()=>damagePawnWithBomb(w,p,w.tick*10+1)).toThrow();expect(JSON.stringify(w)).toBe(before);
  const xp=structuredClone(p.skills);const hit=damagePawnWithBomb(w,p,w.tick*10);
  expect(hit?.layers.some(l=>l.severity>0)).toBe(true);expect(p.skills).toEqual(xp);
  if(!p.health?.death)expect(p.stagger?.untilCore).toBe(w.tick*10+95);
  expect(validateWorld(w)).toEqual([]);
});

test('medical saturation on an owned copy cannot wear armor or commit caller RNG',()=>{
  const r=createMedicalRecord(3000);r.nextInjuryId=Number.MAX_SAFE_INTEGER;const before=JSON.stringify(r);
  expect(()=>resolveBombImpact(r,{damage:50,part:'torso'},()=>.999999)).toThrow();expect(JSON.stringify(r)).toBe(before);
});
