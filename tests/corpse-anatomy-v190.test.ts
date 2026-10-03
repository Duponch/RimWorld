import { expect,test } from 'vitest';
import { animalCombatCamp } from './scenarios/animal-combat';
import { ANIMAL_SPECIES_IDS,type AnimalSpeciesId } from '../src/sim/animal-species';
import { adultAgeTicks,bodySizeAtAge } from '../src/sim/animal-life';
import { animalBodyModel } from '../src/sim/body-model';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { advanceCorpses,corpseFresh,corpseYield,type CorpseState } from '../src/sim/corpses';
import { corpsePartAbsent,corpseCoverage,corpsePartNutrition,selectCorpsePart,projectCorpseConsumption,validCorpseConsumption } from '../src/sim/corpse-anatomy';
import { validateCorpses,validCorpseShape } from '../src/sim/corpse-save';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health';
import type { MaterialPile } from '../src/sim/types';

/** Start with the real death-to-pile transition. Anatomical tests below project
 * an internal transaction; they do not claim a remote ingestion or nutrition. */
function fixture(){
  const world=animalCombatCamp();world.piles=[];
  const animal=world.wildlife!.animals[0]!;
  animal.health={...createMedicalRecord(world.tick),body:animal.species,bloodLoss:BLOOD_UNIT,death:{tick:world.tick,cause:'blood-loss'}};
  reconcileAnimalHealth(world,animal);advanceCorpses(world);
  const pile=world.piles.find(p=>p.id===animal.id)!;
  expect(pile.corpse).toBeDefined();expect(validateCorpses(world,178)).toEqual([]);
  return {world,pile,body:pile.corpse!};
}
const curve=(raw:number)=>raw<=5?raw*14/5:raw<=40?14+(raw-5)*26/35:raw;
const shape=(pile:MaterialPile,version:number)=>validCorpseShape(pile as unknown as Record<string,unknown>,version);

test('natural subtree nutrition counts descendants once, preserves historical yields and uses frozen biological size',()=>{
  const {pile,body}=fixture(),history=structuredClone(body);
  expect(corpseCoverage(body)).toBeCloseTo(1,12);
  expect(corpseCoverage(body,'left-front-leg')).toBeCloseTo(.07,12);
  expect(corpseCoverage(body,'left-front-paw')).toBeCloseTo(.07*.15,12);
  expect(corpsePartNutrition(body,'left-front-leg')).toBeCloseTo(5.2*.2*.07,12);
  expect(corpseYield(pile).meat).toBeCloseTo(31.0857142857,9);
  expect(corpseYield(pile).leather).toBeCloseTo(16.2285714286,9);
  body.health.missing=[{part:'left-front-paw',bornAt:body.health.tick}];
  expect(corpseCoverage(body,'left-front-leg')).toBeCloseTo(.07*(1-.15),12);
  expect(corpsePartAbsent(body,'left-front-leg')).toBe(false);
  expect(corpsePartNutrition(body,'left-front-paw')).toBe(0);
  expect(corpseCoverage(body)).toBeCloseTo(1-.07*.15,12);
  for(const species of ANIMAL_SPECIES_IDS){
    const c:CorpseState={...history,species,ageTicks:adultAgeTicks(species),health:{...history.health,body:species}};
    for(const age of [0,adultAgeTicks(species)]){
      c.ageTicks=age;
      expect(corpsePartNutrition(c,'torso')).toBeCloseTo(5.2*bodySizeAtAge(species,age),12);
    }
  }
  const legacy={...history} as CorpseState;delete (legacy as {ageTicks?:number}).ageTicks;
  expect(corpsePartNutrition(legacy,'torso')).toBeCloseTo(1.04,12);
});

test('nearest external part selection is deterministic, retains anatomical ties and ingests the whole selected amount',()=>{
  const {body}=fixture();body.health.missing=[{part:'tail',bornAt:body.health.tick}];
  const before=structuredClone(body),wanted=5.2*.2*.07;
  const selected=selectCorpsePart(body,wanted)!;
  expect(selected.part).toBe('left-front-leg');expect(selected.nutrition).toBeCloseTo(wanted,12);expect(selected.consumesWhole).toBe(false);
  expect(selectCorpsePart(body,wanted)).toEqual(selected);expect(body).toEqual(before);
  const tiny=selectCorpsePart(body,0)!;
  expect(tiny.nutrition).toBeGreaterThan(.001);
  expect(animalBodyModel(body.species).byId[tiny.part].depth).toBe('outside');
  expect(selectCorpsePart(body,100)).toMatchObject({part:'torso',consumesWhole:true});
  for(const invalid of [-1,NaN,Infinity])expect(selectCorpsePart(body,invalid)).toBeNull();
  // No wound/HP multiplier affects the same request or body's nutrition.
  body.health.injuries.push({id:1,part:'torso',kind:'gunshot',severity:1000,bornAt:body.health.tick});body.health.nextInjuryId=2;
  expect(selectCorpsePart(body,wanted)).toEqual(selected);
});

test('parent consumption replaces previous child roots without modifying death, medical history or previous projections',()=>{
  const {pile,body}=fixture(),before=structuredClone(pile),tick=body.health.tick;
  const child=projectCorpseConsumption(body,'left-front-paw',tick+2)!;
  expect(child).toEqual({consumesWhole:false,consumedParts:[{part:'left-front-paw',atTick:tick+2}]});
  const partial={...body,consumedParts:child.consumedParts},childBefore=structuredClone(child);
  const parent=projectCorpseConsumption(partial,'left-front-leg',tick+5)!;
  expect(parent).toEqual({consumesWhole:false,consumedParts:[{part:'left-front-leg',atTick:tick+5}]});
  expect(child).toEqual(childBefore);expect(pile).toEqual(before);
  const remaining={...body,consumedParts:parent.consumedParts};
  expect(corpsePartAbsent(remaining,'left-front-paw')).toBe(true);
  expect(corpsePartAbsent(remaining,'right-front-leg')).toBe(false);
  expect(corpseCoverage(remaining)).toBeCloseTo(.93,12);
  expect(projectCorpseConsumption(remaining,'left-front-paw',tick+6)).toBeNull();
  expect(projectCorpseConsumption(remaining,'torso',tick+6)).toEqual({consumesWhole:true});
  expect(body.health.death).toEqual(before.corpse!.health.death);expect(pile.quantity).toBe(1);
  expect(projectCorpseConsumption(partial,'left-front-leg',tick+1)).toBeNull();
});

test('overlapping ante mortem absence and consumed descendants reduce only remaining tissue, including the neck after its head',()=>{
  const {body}=fixture(),tick=body.health.tick;
  body.health.missing=[{part:'left-eye',bornAt:tick}];
  body.consumedParts=[{part:'head',atTick:tick+1}];
  expect(validCorpseConsumption(body,tick+2)).toBe(true);
  expect(corpseCoverage(body)).toBeCloseTo(.85,12);
  expect(corpseCoverage(body,'neck')).toBeCloseTo(.05,12);
  expect(corpsePartNutrition(body,'neck')).toBeCloseTo(5.2*.2*.05,12);
  expect(projectCorpseConsumption(body,'neck',tick+2)).toEqual({consumesWhole:false,consumedParts:[{part:'neck',atTick:tick+2}]});
  expect(projectCorpseConsumption(body,'left-eye',tick+2)).toBeNull();
  expect(projectCorpseConsumption(body,'heart',tick+2)).toBeNull();
});

test('future butchery ignores wounds in consumed subtrees while preserving other wounds and the frozen death record',()=>{
  const {pile,body}=fixture(),tick=body.health.tick;
  body.health.injuries=[{id:1,part:'left-front-paw',kind:'gunshot',severity:1000,bornAt:tick}];body.health.nextInjuryId=2;
  const medical=structuredClone(body.health);
  body.consumedParts=projectCorpseConsumption(body,'left-front-leg',tick+1)!.consumedParts;
  expect(corpseYield(pile)).toEqual({meat:curve(140*.2*corpseCoverage(body)),leather:curve(40*.2*corpseCoverage(body))});
  expect(corpseYield(pile).meat).toBeCloseTo(curve(140*.2*.93),10);
  expect(body.health).toEqual(medical);
  body.health.injuries.push({id:2,part:'right-front-leg',kind:'gunshot',severity:1000,bornAt:tick});body.health.nextInjuryId=3;
  expect(corpseYield(pile).meat).toBeCloseTo(curve(140*.2*.93*.66),10);
  body.health.injuries[1]!.scar={threshold:1000};
  expect(corpseYield(pile).meat).toBeCloseTo(curve(140*.2*.93),10);
});

test('consumption saves validate canonical external roots and dates strictly, with historical absence retained',()=>{
  const {world,pile,body}=fixture(),tick=world.tick;
  expect(shape(pile,177)).toBe(true);
  const legacy=structuredClone(pile);delete (legacy.corpse as {ageTicks?:number}).ageTicks;
  expect(shape(legacy,79)).toBe(true);
  body.consumedParts=[{part:'left-front-leg',atTick:tick}];
  expect(shape(pile,178)).toBe(true);expect(shape(pile,177)).toBe(false);
  expect(validateCorpses(world,178)).toEqual([]);
  const saved=JSON.stringify(pile),restored=JSON.parse(saved) as MaterialPile;
  expect(shape(restored,178)).toBe(true);expect(corpseYield(restored)).toEqual(corpseYield(pile));
  for(const entries of [[],null,[{part:'torso',atTick:tick}],[{part:'heart',atTick:tick}],
    [{part:'left-front-leg',atTick:tick},{part:'left-front-paw',atTick:tick}],
    [{part:'head',atTick:tick},{part:'head',atTick:tick}],
    [{part:'left-front-leg',atTick:-1}],[{part:'left-front-leg',atTick:tick+.5}],
    [{part:'left-front-leg',atTick:tick,extra:true}],[{part:'unknown',atTick:tick}]]){
    const broken=JSON.parse(saved);broken.corpse.consumedParts=entries;expect(shape(broken,178)).toBe(false);
  }
  body.consumedParts=[{part:'left-front-leg',atTick:tick+1}];
  expect(validateCorpses(world,178)).toContain('Invalid consumed corpse anatomy or clock.');
  body.consumedParts=[{part:'left-front-leg',atTick:tick}];body.health.missing=[{part:'left-front-leg',bornAt:tick}];
  expect(shape(pile,178)).toBe(false);
  const terminal=JSON.parse(saved);terminal.quantity=0;expect(shape(terminal,178)).toBe(false);
  const beforeDeath=JSON.parse(saved);beforeDeath.corpse.health.tick=tick+10;beforeDeath.corpse.health.death.tick=tick+10;
  beforeDeath.corpse.consumedParts[0].atTick=tick+9;expect(shape(beforeDeath,178)).toBe(false);
});

test('new fox bodies are rejected before 178 and cold/rotting age remains outside pure anatomical projection',()=>{
  const {world,pile,body}=fixture();
  const fox=structuredClone(pile);fox.item='red-fox-corpse' as MaterialPile['item'];
  fox.corpse!.species='red-fox' as AnimalSpeciesId;fox.corpse!.health.body='red-fox' as AnimalSpeciesId;
  fox.corpse!.ageTicks=adultAgeTicks('red-fox' as AnimalSpeciesId);
  expect(shape(fox,177)).toBe(false);expect(shape(fox,178)).toBe(true);
  const before=structuredClone(pile);projectCorpseConsumption(body,'tail',world.tick);
  expect(pile).toEqual(before);expect(corpseFresh(pile,world.tick)).toBe(true);
  expect(corpseFresh(pile,world.tick+15000)).toBe(false);
  expect(corpseFresh(pile,world.tick+30000)).toBe(false);
  // Freshness is checked by the caller, never inferred from frozen health.tick.
  pile.rot={progress:0,atTick:world.tick,rate:0};
  expect(corpseFresh(pile,world.tick+30000)).toBe(true);
  expect(projectCorpseConsumption(body,'tail',world.tick+30000)).not.toBeNull();
});
