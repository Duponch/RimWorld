import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { nextColdSeverity,coldModifiers } from '../src/sim/cold-rules';
import { HEAT_UNIT,comfortableTemperature } from '../src/sim/heat-rules';
import { createMedicalRecord,assessMedical,reconcileMedicalDeath } from '../src/sim/injury-state';
import { reconcilePawnHealth } from '../src/sim/health';
import { passiveCoolingFixture } from './scenarios/passive-cooling';
import { builtDoorState } from '../src/sim/door-rules';
import { TemperatureView,reconcileTemperature } from '../src/sim/temperature';
import { newApparelState } from '../src/sim/apparel-rules';

test('human cold exposure: strict boundaries, independent conditions, clothing, capacities and lethal threshold',()=>{
  expect(nextColdSeverity(0,6,16)).toBe(0);expect(nextColdSeverity(0,5.99,16)).toBe(750000);expect(nextColdSeverity(0,-14,16)).toBe(1290000);
  expect(nextColdSeverity(.4*HEAT_UNIT,16,16)).toBe(.4*HEAT_UNIT);expect(nextColdSeverity(.4*HEAT_UNIT,16.01,16)).toBe(389200000);
  const h=createMedicalRecord();h.hypothermia=.04*HEAT_UNIT;expect(assessMedical(h).capacities.manipulation).toBe(.87);
  h.hypothermia=.2*HEAT_UNIT;expect(assessMedical(h).capacities.manipulation).toBe(.7);expect(assessMedical(h).capacities.moving).toBe(.8);
  h.hypothermia=.35*HEAT_UNIT;expect(assessMedical(h).capacities.manipulation).toBe(.28);expect(coldModifiers(h.hypothermia).pain).toBe(.15);
  h.heatstroke=.2*HEAT_UNIT;expect(assessMedical(h).capacities.consciousness).toBe(.68);
  h.hypothermia=.62*HEAT_UNIT;expect(assessMedical(h).canBeAwake).toBe(false);h.hypothermia=HEAT_UNIT;reconcileMedicalDeath(h);expect(h.death?.cause).toBe('hypothermia');
  const w=passiveCoolingFixture(),p=w.pawns[0]!;w.piles=w.piles.filter(i=>i.owner.type!=='apparel');
  const naked=comfortableTemperature(w,p);w.piles.push({id:w.nextId++,kind:'apparel',item:'cloth-tribalwear',quantity:1,owner:{type:'apparel',pawnId:p.id},apparel:newApparelState('cloth-tribalwear')});
  expect(comfortableTemperature(w,p).min).toBeLessThan(naked.min);
});

test('seriously chilled civilian leaves a cold room physically; draft holds position, save continues and warmth heals',()=>{
  const w=passiveCoolingFixture(),p=w.pawns[0]!;p.x=15;p.z=16;p.schedule.fill('work');p.hunger=p.rest=100;
  for(const k in p.priorities)p.priorities[k as keyof typeof p.priorities]=0;
  const door=w.structures.find(s=>s.x===14&&s.z===16)!;door.kind='door';door.material='wood';door.door=builtDoorState(w,door);
  reconcileTemperature(w);w.thermal!.regions.forEach(r=>r.temperature=-50);
  p.health=createMedicalRecord(w.tick);p.health.hypothermia=.4*HEAT_UNIT;reconcilePawnHealth(w,p);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);stepWorld(w,20);expect(p.heatRefuge).toBeUndefined();expect(p.x).toBe(15);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);
  for(let i=0;i<30&&!p.heatRefuge;i++)stepWorld(w);expect(p.heatRefuge).toBeDefined();expect(p.health!.hypothermia).toBeGreaterThan(.4*HEAT_UNIT);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,1000);stepWorld(copy,1000);expect(copy).toEqual(w);expect(p.x).toBeLessThanOrEqual(14);expect(new TemperatureView(w).at(w,p)).toBeGreaterThan(comfortableTemperature(w,p).min);expect(p.health!.hypothermia).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const invalid=structuredClone(w);invalid.pawns[0]!.health!.hypothermia=0;expect(validateWorld(invalid).length).toBeGreaterThan(0);
});
