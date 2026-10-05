import { expect,test } from 'vitest';
import { SCYTHER_BODY,SCYTHER_MODEL,SCYTHER_PART_IDS } from '../src/sim/mechanoid-anatomy.ts';
import { SCYTHER_DEFINITION } from '../src/sim/mechanoid-definition.ts';
import { assessBody,bodyEfficiencies,HEALTHY_BODY_INPUT } from '../src/sim/body-capacities.ts';
import { injuryPartRules } from '../src/sim/injury-rules.ts';
import { addResolvedInjury,partMissing } from '../src/sim/injury-state.ts';
import { createMechaMedicalRecord,mechaAssessment,mechaHealthScore,mechaMass,mechaRemainingCoverage } from '../src/sim/mechanoid-health.ts';
import type { ScytherPartId } from '../src/sim/body-definition.ts';

const missing=(...parts:ScytherPartId[])=>assessBody({damage:[],missing:parts,pain:0},SCYTHER_MODEL);

test('Scyther has the primary 32-part solid tree, exact scaled HP and conserved coverage',()=>{
  expect(SCYTHER_PART_IDS).toHaveLength(32);expect(new Set(SCYTHER_PART_IDS).size).toBe(32);
  expect(SCYTHER_BODY.filter(p=>p.parent===null).map(p=>p.id)).toEqual(['scyther-thorax']);
  expect(SCYTHER_MODEL.coverage.reduce((n,v)=>n+v,0)).toBeCloseTo(1,12);
  const cases:[ScytherPartId,number,ScytherPartId|null][]=[
    ['scyther-thorax',53,null],['scyther-neck',40,'scyther-thorax'],['scyther-head',40,'scyther-neck'],
    ['scyther-brain',14,'scyther-head'],['scyther-left-sight-sensor',14,'scyther-head'],
    ['scyther-left-shoulder',33,'scyther-thorax'],['scyther-left-arm',40,'scyther-left-shoulder'],
    ['scyther-left-blade',27,'scyther-left-arm'],['scyther-left-hand',27,'scyther-left-arm'],
    ['scyther-left-thumb',10,'scyther-left-hand'],['scyther-left-leg',40,'scyther-thorax'],
    ['scyther-left-foot',27,'scyther-left-leg'],['scyther-reactor',27,'scyther-thorax'],['scyther-left-fluid-reprocessor',20,'scyther-thorax'],
  ];
  for(const [id,hp,parent] of cases)expect(SCYTHER_MODEL.byId[id]).toMatchObject({hp,parent});
  expect(SCYTHER_MODEL.byId['scyther-brain']).toMatchObject({depth:'inside',height:'top'});
  expect(SCYTHER_MODEL.byId['scyther-left-hand'].height).toBe('bottom');
  expect(SCYTHER_MODEL.byId['scyther-reactor'].depth).toBe('inside');
  for(const [i,p] of SCYTHER_BODY.entries()){
    expect(p.id.startsWith('scyther-')).toBe(true);expect(SCYTHER_MODEL.parents[i]).toBeLessThan(i);
    expect(injuryPartRules(SCYTHER_MODEL)[p.id]).toEqual({solid:true,skin:false,bleed:0,delicate:false,scarFactor:0});
    expect(Object.isFrozen(p)).toBe(true);
  }
  expect(SCYTHER_PART_IDS.some(id=>String(id).includes('ring-finger')||String(id).includes('skull'))).toBe(false);
  expect(SCYTHER_DEFINITION).toMatchObject({healthScale:1.32,moveSpeed:4.7,mass:60,armor:{sharp:.4,blunt:.2,heat:2}});
});

test('mechanical capacities use actual chains, masked neck breathing and independent senses',()=>{
  const healthy=assessBody(HEALTHY_BODY_INPUT,SCYTHER_MODEL);
  expect(healthy).toMatchObject({canBeAwake:true,movingCapable:true,painShock:false,vitalFailure:false,
    capacities:{consciousness:1,moving:1,manipulation:1,sight:1,hearing:1,bloodPumping:1,bloodFiltration:1,breathing:1}});
  expect(missing('scyther-left-blade').capacities.manipulation).toBe(1);
  expect(missing('scyther-left-thumb').capacities.manipulation).toBe(.9);
  expect(missing('scyther-left-shoulder').capacities.manipulation).toBe(.5);
  expect(missing('scyther-left-leg').capacities.moving).toBe(.5);
  expect(missing('scyther-left-leg','scyther-right-foot')).toMatchObject({movingCapable:false,vitalFailure:false});
  expect(missing('scyther-left-sight-sensor').capacities.sight).toBe(.75);
  const neck=assessBody({damage:[{part:'scyther-neck',loss:30}],missing:[],pain:1},SCYTHER_MODEL);
  expect(neck).toMatchObject({painShock:false,vitalFailure:false,capacities:{breathing:.17,consciousness:.83,moving:.69}});
  const brain=assessBody({damage:[{part:'scyther-brain',loss:7}],missing:[],pain:0},SCYTHER_MODEL);
  expect(brain.capacities).toMatchObject({consciousness:.5,moving:.5,manipulation:.5,sight:1});
  expect(missing('scyther-left-fluid-reprocessor')).toMatchObject({vitalFailure:false,capacities:{bloodFiltration:.5,consciousness:.95}});
  expect(missing('scyther-reactor').vitalFailure).toBe(true);
  expect(missing('scyther-left-fluid-reprocessor','scyther-right-fluid-reprocessor').vitalFailure).toBe(true);
  const ramp=bodyEfficiencies({damage:[{part:'scyther-left-arm',loss:20}],missing:[],pain:0},SCYTHER_MODEL);
  expect(ramp[SCYTHER_MODEL.index['scyther-left-arm']]).toBeCloseTo(4/9,12);
});

test('mass follows missing subtrees while injury summary follows surviving injuries',()=>{
  const r=createMechaMedicalRecord(20),draw=()=>{throw new Error('Solid damage has no scar or infection draw');};
  expect(mechaMass({mechKind:'scyther'})).toBe(60);addResolvedInjury(r,'scyther-thorax','gunshot',5000,draw);
  expect(mechaMass({mechKind:'scyther',health:r})).toBe(60);expect(mechaHealthScore({mechKind:'scyther',health:r})).toBeCloseTo(1-5/99,12);
  const blade=createMechaMedicalRecord(20);addResolvedInjury(blade,'scyther-left-blade','cut',27000,draw);
  expect(mechaMass({mechKind:'scyther',health:blade})).toBeCloseTo(57.399,12);expect(mechaAssessment({mechKind:'scyther',health:blade}).capacities.manipulation).toBe(1);
  const shoulder=createMechaMedicalRecord(20);addResolvedInjury(shoulder,'scyther-left-shoulder','crack',33000,draw);
  expect(partMissing(shoulder,'scyther-left-thumb')).toBe(true);expect(partMissing(shoulder,'scyther-right-thumb')).toBe(false);
  expect(mechaRemainingCoverage({mechKind:'scyther',health:shoulder})).toBeCloseTo(.83,12);expect(mechaMass({mechKind:'scyther',health:shoulder})).toBeCloseTo(49.8,12);
  const corpse=structuredClone(shoulder);addResolvedInjury(corpse,'scyther-reactor','crack',27000,draw);
  expect(corpse.death?.cause).toBe('vital-failure');expect(mechaHealthScore({mechKind:'scyther',health:corpse})).toBe(0);
});
