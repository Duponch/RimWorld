import {expect,test} from 'vitest';
import {createMedicalRecord,assessMedical,addResolvedInjury,medicalPain,medicalBleedUnits,partMissing} from '../src/sim/injury-state.ts';
import {installArtificialPart,installWoodenPart,artificialPartInstallReason,removeArtificialPart273} from '../src/sim/artificial-parts.ts';
import {ARTIFICIAL_PARTS,WOODEN_PARTS,isWoodenPartKind} from '../src/sim/artificial-parts-rules.ts';
import {validArtificialParts} from '../src/sim/artificial-parts-save.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {BODY_PARTS,HUMAN_BODY} from '../src/sim/body-definition.ts';
import {prepareSuspendedHumanResume271,medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {medicalCamp} from './scenarios/health.ts';
import {planArtificialRestitution273,commitArtificialRestitution273} from '../src/sim/prosthetic-surgery.ts';
import {nearbyGround} from '../src/sim/ground-placement.ts';
import {addMaterial} from '../src/sim/materials.ts';

test.each([
 ['prosthetic-arm','left-shoulder','manipulation',.75],['prosthetic-arm','right-shoulder','manipulation',.75],
 ['prosthetic-leg','left-leg','moving',.92],['prosthetic-leg','right-leg','moving',.92],
] as const)('%s on %s substitutes its root once, with intact or genuinely missing natural anatomy',(kind,part,capacity,expected)=>{
 for(const missing of [false,true]){
  const h=createMedicalRecord(100);if(missing)h.missing=[{part,bornAt:0}];
  expect(installArtificialPart(h,part,kind)).toBe(true);expect(assessMedical(h).capacities[capacity]).toBeCloseTo(expected,2);
  expect(h.artificialParts).toEqual([{part,kind,installedAt:100}]);expect(partMissing(h,part)).toBe(false);
  for(const child of HUMAN_BODY.filter(p=>p.parent===part))expect(h.missing).toContainEqual({part:child.id,bornAt:100,nonFresh:true});
  expect(validArtificialParts(h,273)).toBe(true);expect(validArtificialParts(h,272)).toBe(false);
  expect(validateMedicalRecord(h,true,true,true,true,false,false,true,true,true,true,true,273,true)).toBeNull();
  expect(artificialPartInstallReason(h,part,kind)).toBeTypeOf('string');
 }
});

test('industrial replacement removes only the displaced subtree and leaves the wooden catalogue literal',()=>{
 const h=createMedicalRecord(100);h.missing=[{part:'left-hand',bornAt:0},{part:'right-foot',bornAt:0}];
 expect(installWoodenPart(h,'left-hand','wooden-hand')).toBe(true);expect(installWoodenPart(h,'right-foot','wooden-foot')).toBe(true);
 expect(installArtificialPart(h,'left-shoulder','prosthetic-arm')).toBe(true);
 expect(h.artificialParts?.map(p=>p.kind)).toEqual(['prosthetic-arm','wooden-foot']);
 expect(assessMedical(h).capacities.manipulation).toBe(.75);expect(assessMedical(h).capacities.moving).toBe(.9);
 expect(isWoodenPartKind('prosthetic-arm')).toBe(false);expect(Object.keys(WOODEN_PARTS)).toHaveLength(3);expect(Object.keys(ARTIFICIAL_PARTS)).toHaveLength(5);
 expect(installWoodenPart(h,'left-hand','wooden-hand')).toBe(false);expect(validArtificialParts(h,273)).toBe(true);
});

test('only273 admits a synthetic clavicle linked to its matching installed shoulder; legacy shoulder removal leaves one valid nonfresh root',()=>{
 const medical=(h:unknown,version:number)=>validateMedicalRecord(h,true,true,true,true,false,false,true,true,true,true,true,version,true);
 for(const side of ['left','right'] as const){
  const part=`${side}-shoulder` as const,h=createMedicalRecord(100);expect(h.humanHealthScale).toBeUndefined();
  expect(installArtificialPart(h,part,'prosthetic-arm')).toBe(true);expect(medical(h,273)).toBeNull();
  for(const version of [210,272,276])expect(medical(h,version)).not.toBeNull();
  const orphan=structuredClone(h);delete orphan.artificialParts;expect(medical(orphan,273)).not.toBeNull();
  const wrongParent=structuredClone(h);wrongParent.artificialParts![0]!.part=side==='left'?'right-shoulder':'left-shoulder';expect(medical(wrongParent,273)).not.toBeNull();
  const falseDate=structuredClone(h);falseDate.missing.find(m=>m.part===`${side}-clavicle`)!.bornAt--;expect(medical(falseDate,273)).not.toBeNull();
  const unrelated=createMedicalRecord(100);unrelated.missing=[{part:'skull',bornAt:100,nonFresh:true}];expect(medical(unrelated,273)).not.toBeNull();
  expect(removeArtificialPart273(h,part,'prosthetic-arm')).toBe(true);expect(h.missing).toEqual([{part,bornAt:100,nonFresh:true}]);
  expect(medical(h,273)).toBeNull();expect(medical(h,272)).not.toBeNull();
 }
});

test('damage to an industrial root is solid; a damaged same-kind root can be replaced at its real clinical date',()=>{
 const h=createMedicalRecord(100);expect(installArtificialPart(h,'left-leg','prosthetic-leg')).toBe(true);
 const injury=addResolvedInjury(h,'left-leg','cut',3000,()=>{throw Error('Solid injury must not draw');});
 expect(injury).not.toBeNull();expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
 expect(artificialPartInstallReason(h,'left-leg','prosthetic-leg')).toBeUndefined();h.tick=101;
 expect(installArtificialPart(h,'left-leg','prosthetic-leg')).toBe(true);expect(h.injuries).toEqual([]);expect(h.artificialParts?.[0]?.installedAt).toBe(101);
 const p=medicalCamp().pawns[0]!;p.health=h;p.cryptosleepHeldAt271=101;
 expect(prepareSuspendedHumanResume271(p,101,501).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 expect(medicalCivilTick271(h)).toBe(501);expect(h.tick).toBe(101);expect(h.artificialParts?.[0]?.installedAt).toBe(101);
 expect(removeArtificialPart273(h,'left-leg','prosthetic-leg')).toBe(true);expect(h.missing).toEqual([{part:'left-leg',bornAt:101,nonFresh:true}]);
 expect(validArtificialParts(h,273)).toBe(true);expect(medicalBleedUnits(h)).toBe(0);
});

test('restitution preflight preserves the whole source and reserves distinct new physical identities, never natural limb products',()=>{
 const w=medicalCamp(1,16),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
 expect(planArtificialRestitution273(w,p,'left-shoulder')).toEqual([]);
 expect(installArtificialPart(p.health,'left-shoulder','prosthetic-arm')).toBe(true);
 const before=JSON.stringify(w),returns=planArtificialRestitution273(w,p,'left-shoulder')!;
 expect(returns).toHaveLength(1);expect(returns[0]).toMatchObject({id:w.nextId,item:'prosthetic-arm',kind:'prosthesis',quantity:1,owner:{type:'ground'}});
 expect(returns[0]!.damage).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
 p.health.injuries.push({id:p.health.nextInjuryId++,part:'left-shoulder',kind:'crack',severity:BODY_PARTS['left-shoulder'].hp*1000-1000,bornAt:p.health.tick});
 expect(planArtificialRestitution273(w,p,'left-shoulder')![0]!.damage).toBeUndefined();
});

test('Near restitution admits a real partial wood stack, burns a fresh root identity on absorption, and refuses a completely full connected area atomically',()=>{
 const w=medicalCamp(1,16),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);p.health.missing=[{part:'left-leg',bornAt:0}];
 expect(installWoodenPart(p.health,'left-leg','peg-leg')).toBe(true);w.piles=[];
 for(const cell of nearbyGround(w,p))addMaterial(w,'wood',75,{type:'ground',...cell},'wood');
 const full=JSON.stringify(w);expect(planArtificialRestitution273(w,p,'left-leg')).toBeNull();expect(JSON.stringify(w)).toBe(full);
 const first=w.piles[0]!;first.quantity=74;const next=w.nextId,count=w.piles.length,plan=planArtificialRestitution273(w,p,'left-leg')!;
 expect(plan).toHaveLength(1);expect(removeArtificialPart273(p.health,'left-leg','peg-leg')).toBe(true);commitArtificialRestitution273(w,plan);
 expect(w.nextId).toBe(next+1);expect(first.quantity).toBe(75);expect(w.piles).toHaveLength(count);expect(w.piles.some(q=>q.id===next)).toBe(false);
});
