import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { createMedicalRecord,injuryBleed,medicalPain } from '../src/sim/injury-state';
import { HP_UNIT } from '../src/sim/injury-rules';
import { healthCapacityTooltip,healthPartTooltip } from '../src/ui/health-inspection';

test('anatomical tooltip uses rounded remaining HP and non-root efficiency, including descendants of a lost part',()=>{
  const pawn=createWorld(199,16,16).pawns[0]!;
  pawn.health={...createMedicalRecord(),injuries:[{id:1,part:'left-eye',kind:'cut',severity:9*HP_UNIT,bornAt:0}]};
  expect(healthPartTooltip(pawn,'left-eye').rows).toContainEqual({label:'Points de vie',value:'1 / 10'});
  expect(healthPartTooltip(pawn,'left-eye').rows).toContainEqual({label:'Efficacité',value:'0 %'});
  pawn.health.missing=[{part:'left-arm',bornAt:0,tended:true}];
  expect(healthPartTooltip(pawn,'left-hand').rows).toContainEqual({label:'Points de vie',value:'0 / 20'});
  expect(healthPartTooltip(pawn,'left-hand').rows).toContainEqual({label:'Efficacité',value:'0 %'});
});

test('capacity breakdown exposes actual independent anesthetic and blood-loss modifiers without changing the record',()=>{
  const pawn=createWorld(199,16,16).pawns[0]!;
  pawn.health={...createMedicalRecord(),bloodLoss:150_000_000,
    injuries:[{id:1,part:'torso',kind:'cut',severity:4*HP_UNIT,bornAt:0}],
    anesthetic:{bornAt:0,expiresAtCore:45_000,severity:700_000_000,remainder:0}};
  const before=JSON.stringify(pawn),bleed=injuryBleed(pawn.health,pawn.health.injuries[0]!),pain=medicalPain(pawn.health);
  expect(healthCapacityTooltip(pawn,'consciousness').rows).toContainEqual({label:'Perte de sang',value:'-40 % points'});
  expect(healthCapacityTooltip(pawn,'consciousness').rows).toContainEqual({label:'Anesthésie · maximum',value:'70 %'});
  expect(healthCapacityTooltip(pawn,'moving').rows).toContainEqual({label:'Anesthésie',value:'-20 % points'});
  expect(healthCapacityTooltip(pawn,'manipulation').rows).toContainEqual({label:'Anesthésie',value:'-20 % points'});
  expect(JSON.stringify(pawn)).toBe(before);expect(injuryBleed(pawn.health,pawn.health.injuries[0]!)).toBe(bleed);expect(medicalPain(pawn.health)).toBe(pain);
});

test('sensory tooltips give the two real eyes and retain the separate consciousness rule',()=>{
  const pawn=createWorld(199,16,16).pawns[0]!;
  pawn.health={...createMedicalRecord(),missing:[{part:'left-eye',bornAt:0,tended:true}]};
  const rows=healthCapacityTooltip(pawn,'sight').rows;
  expect(rows).toContainEqual({label:'Capacité actuelle',value:'75 %'});
  expect(rows).toContainEqual({label:'Œil gauche',value:'0 %'});
  expect(rows).toContainEqual({label:'Œil droit',value:'100 %'});
  expect(rows.some(row=>row.label==='Conscience')).toBe(false);
});
