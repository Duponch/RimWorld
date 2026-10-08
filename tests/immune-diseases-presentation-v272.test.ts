import { expect,test } from 'vitest';
import { createMedicalRecord } from '../src/sim/injury-state';
import { tendImmuneDisease } from '../src/sim/immune-diseases-state';
import { immuneDiseaseInspection } from '../src/ui/immune-diseases-inspection';
import { healthCapacityTooltip,healthStatusText } from '../src/ui/health-inspection';
import { medicalWorkRefusal,pawnBody } from '../src/sim/health-rules';
import { moodThoughts } from '../src/sim/mood';
import { applyCommand } from '../src/sim/engine';
import { medicalCamp } from './scenarios/health';
import { scoutPreparationReason } from '../src/sim/caravan-trip';

function patient(){const world=medicalCamp(),pawn=world.pawns[0]!;pawn.health=createMedicalRecord(world.tick);pawn.health.immuneDiseases={malaria:{bornAt:world.tick,severity:800_000_000,immunity:100_000_000,luck:1_000_000}};return {world,pawn,record:pawn.health};}
test('dossier displays exact tending renewal, convalescence and residual immunity',()=>{
  const {record}=patient();
  expect(immuneDiseaseInspection(record,'malaria')).toMatchObject({stage:'major',care:'Aucun soin actif.',guidance:'Nouveau soin possible maintenant.'});
  expect(tendImmuneDisease(record,'malaria',800)).toBe(true);
  expect(immuneDiseaseInspection(record,'malaria')).toMatchObject({care:'Soin actif · qualité 80.0 % · effet restant 15.0 h.',guidance:'Renouvellement dans 12.0 h.'});
  record.tick=6000;expect(immuneDiseaseInspection(record,'malaria')?.guidance).toContain('< 0,1 h');
  record.tick=6001;expect(immuneDiseaseInspection(record,'malaria')?.guidance).toBe('Nouveau soin possible maintenant.');
  record.immuneDiseases!.malaria!.immunity=999_999_999;expect(immuneDiseaseInspection(record,'malaria')?.summary).toContain('immunité 99.9 %');
  record.immuneDiseases!.malaria!.immunity=1_000_000_000;expect(immuneDiseaseInspection(record,'malaria')?.guidance).toContain('convalescence');
  record.immuneDiseases!.malaria!.severity=0;expect(immuneDiseaseInspection(record,'malaria')?.summary).toContain('immunité résiduelle 100.0 %');
  expect(immuneDiseaseInspection(record,'plague')).toBeNull();
});
test('illness-only body and dossier expose filtration and a single Sick thought',()=>{
  const {world,pawn,record}=patient();record.immuneDiseases!.plague={bornAt:world.tick,severity:650_000_000,immunity:0,luck:1_000_000};
  expect(healthStatusText(pawn)).toContain('Malade');
  expect(pawnBody(pawn).capacities.bloodFiltration).toBe(.8);
  expect(healthCapacityTooltip(pawn,'bloodFiltration').rows).toContainEqual(expect.objectContaining({label:'Paludisme / peste',value:'-20 % points'}));
  expect(moodThoughts(world,pawn).filter(t=>t.id==='sick')).toHaveLength(1);
  record.immuneDiseases!.malaria!.severity=0;record.immuneDiseases!.plague!.severity=0;
  expect(moodThoughts(world,pawn).filter(t=>t.id==='sick')).toHaveLength(0);
});
test('physical malaria vomiting refuses orders before their mutation',()=>{
  const {world,pawn,record}=patient();record.immuneDiseases!.malaria!.vomit={cell:{x:pawn.x,z:pawn.z},remainingCore:100};
  expect(medicalWorkRefusal(pawn)).toContain('vomit');
  const before=structuredClone(pawn);
  expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(false);
  expect(pawn).toEqual(before);
});
test('residual immunity alone does not block a healthy scouting departure',()=>{
  const world=medicalCamp(2),pawn=world.pawns[0]!;
  const baseline=scoutPreparationReason(world,pawn);pawn.health=createMedicalRecord(world.tick);
  pawn.health.immuneDiseases={plague:{bornAt:world.tick,severity:0,immunity:900_000_000,luck:1_000_000}};
  expect(scoutPreparationReason(world,pawn)).toBe(baseline);
  pawn.health.immuneDiseases.plague!.severity=1_000_000;
  expect(scoutPreparationReason(world,pawn)).toBe('Le colon doit être sain avant de partir.');
});
