import {expect,test} from 'vitest';
import {surgerySuccessChance,surgeryRequestReason} from '../src/sim/surgery-rules.ts';
import {installWoodenPart} from '../src/sim/artificial-parts.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {surgeryCamp} from './helpers/surgery-v192.ts';
import {woodenSurgeryCamp} from './helpers/wooden-surgery-v275.ts';
import {planImplantIngredients} from '../src/sim/surgery-ingredients.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {addMaterial} from '../src/sim/materials.ts';

test('wooden installation keeps its base recipe factor while therapeutic amputation retains 1.2',()=>{
  const c=surgeryCamp(),doctor=c.world.pawns[0]!;
  const input={doctor,medicine:'medicine' as const,patientGlow:.5,roomCleanliness:0,outdoors:false};
  const install=surgerySuccessChance({...input,recipeFactor:1});
  expect(surgerySuccessChance(input)).toBeCloseTo(install*1.2,14);
  expect(surgerySuccessChance({...input,recipeFactor:1.2})).toBe(surgerySuccessChance(input));
});
test('amputation of a natural infected parent containing a wooden part waits for physical removal support',()=>{
  const c=surgeryCamp(),p=c.world.pawns[1]!;p.health=createMedicalRecord(c.world.tick);
  p.health.missing=[{part:'left-hand',bornAt:c.world.tick}];
  expect(installWoodenPart(p.health,'left-hand','wooden-hand')).toBe(true);
  p.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:c.world.tick,severity:100_000_000,luck:1_000_000}]};
  const before=structuredClone(p);
  expect(surgeryRequestReason(p,'left-arm')).toContain('contient une prothèse');expect(p).toEqual(before);
});

test('two neighboring operations reserve distinct staging cells even when both use the same medicine',()=>{
  const c=woodenSurgeryCamp(),w=c.world,[first,patient,second]=w.pawns;
  addMaterial(w,'wood',1,{type:'ground',x:13,z:5},'wood');
  addMaterial(w,'medicine',2,{type:'ground',x:13,z:3},'medicine');
  const spot={x:9,z:10};
  const a=planImplantIngredients(w,first!,patient!,spot,reachableCells(w,first!,blockedCells(w),new Set()))!;
  expect(a).toBeDefined();
  first!.surgery={patientId:patient!.id,part:c.part,implant:c.implant,bedId:c.bedId,spot,ingredients:a.ingredients,phase:'pickup',progress:0,workCore:0};
  const b=planImplantIngredients(w,second!,patient!,spot,reachableCells(w,second!,blockedCells(w),new Set()))!;
  expect(b).toBeDefined();
  for(const i of a.ingredients)expect(b.ingredients.some(j=>j.cell.x===i.cell.x&&j.cell.z===i.cell.z)).toBe(false);
});
