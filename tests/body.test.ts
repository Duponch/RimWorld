import { expect,test } from 'vitest';
import { BODY_COVERAGE,BODY_INDEX,BODY_PARENTS,BODY_PARTS,HUMAN_BODY,type BodyPartId } from '../src/sim/body-definition';
import { assessBody,bodyEfficiencies,capacityRounded,HEALTHY_BODY,type BodyAssessmentInput } from '../src/sim/body-capacities';

const input=(missing:BodyPartId[]=[],damage:{part:BodyPartId;loss:number}[]=[],pain=0):BodyAssessmentInput=>({missing,damage,pain});
const injured=(...damage:[BodyPartId,number][])=>assessBody(input([],damage.map(([part,loss])=>({part,loss}))));
const missing=(...parts:BodyPartId[])=>assessBody(input(parts));

test('human anatomy: complete bilateral tree, coverage conservation, internal organs, conceptual slot and immutable shared definitions',()=>{
  // 63 records in the historical body + the tongue added since, including the utility slot.
  expect(HUMAN_BODY).toHaveLength(64);
  expect(new Set(HUMAN_BODY.map(p=>p.id)).size).toBe(64);
  expect(HUMAN_BODY.filter(p=>p.parent===null).map(p=>p.id)).toEqual(['torso']);
  for(const [index,part] of HUMAN_BODY.entries()) {
    expect(BODY_PARENTS[index]).toBeLessThan(index);
    expect(BODY_INDEX[part.id]).toBe(index);
    expect(BODY_COVERAGE[index]).toBeGreaterThanOrEqual(0);
    if(part.id.startsWith('left-')) {
      const other=BODY_PARTS[part.id.replace('left-','right-') as BodyPartId];
      expect([other.hp,other.coverage,other.depth,other.height,other.destroyable]).toEqual([part.hp,part.coverage,part.depth,part.height,part.destroyable]);
    }
    expect(Object.isFrozen(part)).toBe(true);expect(Object.isFrozen(part.groups)).toBe(true);
  }
  expect(BODY_COVERAGE.reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);
  expect(BODY_PARTS.brain).toMatchObject({hp:10,parent:'skull',depth:'inside',height:'top'});
  expect(BODY_PARTS['left-hand']).toMatchObject({parent:'left-arm',height:'bottom'});
  expect(BODY_PARTS.tongue).toMatchObject({parent:'jaw',coverage:.001});
  expect(BODY_PARTS.waist.conceptual).toBe(true);expect(BODY_COVERAGE[BODY_INDEX.waist]).toBe(0);
  expect(BODY_PARTS['left-clavicle'].groups).toEqual(['torso']); // apparel coverage != anatomical parent
  expect(BODY_PARTS.skull.groups).toContain('eyes');
  expect(Object.isFrozen(HUMAN_BODY)).toBe(true);expect(Object.isFrozen(BODY_PARTS)).toBe(true);
});

test('local injury projection: rounding, stacked losses, outside efficiency, internal bone floor, and missing ancestry',()=>{
  const cases:[BodyPartId,number,number][]=[['left-arm',3,8/9],['left-hand',18,0],['left-humerus',5,.8],['pelvis',100,.04],['heart',3,.8],['torso',20,.5]];
  for(const [part,loss,expected] of cases)expect(bodyEfficiencies(input([],[{part,loss}]))[BODY_INDEX[part]]).toBeCloseTo(expected,12);
  expect(bodyEfficiencies(input([],[{part:'left-thumb',loss:.5}]))[BODY_INDEX['left-thumb']]).toBe(1);
  expect(bodyEfficiencies(input([],[{part:'left-thumb',loss:1.5}]))[BODY_INDEX['left-thumb']]).toBeCloseTo(13/18,12);
  expect(bodyEfficiencies(input([],[{part:'heart',loss:1},{part:'heart',loss:2}]))).toEqual(bodyEfficiencies(input([],[{part:'heart',loss:3}])));
  const amputated=bodyEfficiencies(input(['left-shoulder']));
  for(const p of HUMAN_BODY.filter(p=>p.id.startsWith('left-')&&['shoulder','clavicle','arm','humerus','radius','hand','pinky','ring-finger','middle-finger','index-finger','thumb'].some(name=>p.id==='left-'+name)))expect(amputated[BODY_INDEX[p.id]]).toBe(0);
  expect(amputated[BODY_INDEX['left-lung']]).toBe(1);expect(amputated[BODY_INDEX['right-hand']]).toBe(1);
  expect(bodyEfficiencies(input(['torso'])).every(v=>v===0)).toBe(true);
  expect(capacityRounded(.625)).toBe(.62);expect(capacityRounded(.635)).toBe(.64);
});

test('limbs: same-side injuries multiply before bilateral averaging; digits and complete limb loss are distinct',()=>{
  expect(injured(['left-humerus',5],['left-radius',10]).capacities.manipulation).toBe(.7);
  expect(injured(['left-humerus',5],['right-radius',10]).capacities.manipulation).toBe(.65);
  expect(injured(['left-femur',10],['left-tibia',15]).capacities.moving).toBe(.62);
  expect(injured(['left-femur',10],['right-tibia',15]).capacities.moving).toBe(.5);
  expect(missing('left-thumb').capacities.manipulation).toBe(.92);
  expect(missing('left-hand').capacities.manipulation).toBe(.5);
  expect(missing('left-hand','right-hand').capacities.manipulation).toBe(0);
  expect(missing('left-big-toe').capacities.moving).toBe(.96);
  expect(missing('left-foot').capacities.moving).toBe(.5);
  expect(missing('left-leg','right-foot')).toMatchObject({canBeAwake:true,movingCapable:false,vitalFailure:false});
  expect(missing('spine')).toMatchObject({canBeAwake:true,movingCapable:false,vitalFailure:false});
  // Shoulder and clavicle connect upstream of the arm core; torso damage alone does not reduce hand efficiency.
  expect(injured(['left-clavicle',20]).capacities.manipulation).toBe(.6);
  expect(injured(['torso',20]).capacities).toEqual(HEALTHY_BODY.capacities);
});

test('senses and organs: best eye/ear weight, lungs, kidneys, liver, jaw and tongue dependencies',()=>{
  expect(missing('left-eye').capacities.sight).toBe(.75);
  expect(missing('left-ear').capacities.hearing).toBe(.75);
  expect(missing('left-eye','right-eye').capacities.sight).toBe(0);
  expect(missing('left-ear','right-ear').capacities.hearing).toBe(0);
  expect(missing('left-lung')).toMatchObject({capacities:{breathing:.5,consciousness:.9,moving:.81},vitalFailure:false});
  expect(missing('left-kidney')).toMatchObject({capacities:{bloodFiltration:.5,consciousness:.95},vitalFailure:false});
  expect(missing('stomach')).toMatchObject({capacities:{digestion:.5},vitalFailure:false});
  expect(missing('tongue')).toMatchObject({capacities:{talking:0,eating:.5},vitalFailure:false});
  expect(missing('jaw')).toMatchObject({capacities:{talking:0,eating:.1},vitalFailure:false});
  expect(injured(['ribcage',15],['sternum',10]).capacities.breathing).toBe(.5);
  for(const parts of [['brain'],['heart'],['liver'],['head'],['neck'],['torso'],['left-lung','right-lung'],['left-kidney','right-kidney']] as BodyPartId[][])expect(missing(...parts).vitalFailure,parts.join(',')).toBe(true);
});

test('consciousness: pain is subtracted from brain efficiency; independent awake, moving, pain shock and vital failure thresholds',()=>{
  expect(assessBody(input([],[{part:'brain',loss:2}],.55))).toMatchObject({capacities:{consciousness:.6,moving:.6,manipulation:.6},canBeAwake:true});
  expect(assessBody(input([],[{part:'brain',loss:2},{part:'left-lung',loss:15}],.55)).capacities.consciousness).toBe(.54);
  expect(injured(['brain',7])).toMatchObject({canBeAwake:true,vitalFailure:false,capacities:{consciousness:.3}});
  expect(injured(['brain',8])).toMatchObject({canBeAwake:false,movingCapable:false,vitalFailure:false,capacities:{consciousness:.2,moving:0,manipulation:0,eating:0,talking:0,sight:1}});
  expect(assessBody(input([],[],.8))).toMatchObject({painShock:true,canBeAwake:true,vitalFailure:false});
  expect(assessBody(input([],[],.79999)).painShock).toBe(false);
  expect(assessBody(input([],[],.12)).capacities.consciousness).toBe(1);
  expect(assessBody(input([],[],.13)).capacities.consciousness).toBe(.99);
  expect(injured(['spine',21])).toMatchObject({movingCapable:true,capacities:{moving:.16}});
  expect(injured(['spine',22])).toMatchObject({movingCapable:false,capacities:{moving:.12}});
});

test('assessment ownership: shared healthy fast path, immutable results, same-tick edits and deep JSON continuation',()=>{
  expect(assessBody()).toBe(HEALTHY_BODY);expect(assessBody(input())).toBe(HEALTHY_BODY);
  expect(Object.values(HEALTHY_BODY.capacities)).toEqual(Array(11).fill(1));
  const body={missing:[] as BodyPartId[],damage:[{part:'left-radius' as const,loss:5}],pain:0};
  const before=assessBody(body);body.damage[0]!.loss=10;const after=assessBody(body);
  expect(before.capacities.manipulation).toBe(.88);expect(after.capacities.manipulation).toBe(.75);
  expect(before.capacities.manipulation).toBe(.88);expect(Object.isFrozen(before.capacities)).toBe(true);
  const copy=JSON.parse(JSON.stringify(body));expect(assessBody(copy)).toEqual(after);
  copy.missing.push('right-hand');expect(assessBody(copy).capacities.manipulation).toBe(.25);
  expect(assessBody(body)).toEqual(after);
});

test('anatomical combinations: every paired removal, all part HP boundaries and monotonic capacities without new pain',()=>{
  const keys=Object.keys(HEALTHY_BODY.capacities) as (keyof typeof HEALTHY_BODY.capacities)[];
  for(const [index,part] of HUMAN_BODY.entries()) {
    let previous=HEALTHY_BODY.capacities;
    for(let loss=0;loss<=part.hp;loss++) {
      const next=injured([part.id,loss]).capacities;
      for(const key of keys) {
        expect(Number.isFinite(next[key]),`${part.id}:${loss}:${key}`).toBe(true);
        expect(next[key],`${part.id}:${loss}:${key}`).toBeGreaterThanOrEqual(0);
        expect(next[key],`${part.id}:${loss}:${key}`).toBeLessThanOrEqual(previous[key]);
      }
      previous=next;
    }
    const single=missing(part.id).capacities;
    for(const other of HUMAN_BODY.slice(index+1)) {
      const double=missing(part.id,other.id).capacities;
      expect(missing(other.id,part.id)).toEqual(missing(part.id,other.id));
      for(const key of keys)expect(double[key],`${part.id}+${other.id}:${key}`).toBeLessThanOrEqual(single[key]);
    }
  }
});
