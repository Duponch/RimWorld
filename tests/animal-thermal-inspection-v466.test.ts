import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {animalItemDiet256} from '../src/sim/animal-diet-v256.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {HEAT_UNIT} from '../src/sim/heat-severity.ts';
import {animalInspectorView} from '../src/ui/animal-inspector';
import {animalDietLabel} from '../src/ui/animal-diet-label';
import {researchProjects} from '../src/ui/research-projects';
import {smithingSkillRequired267,smithingUnits267} from '../src/sim/smithing-content-267.ts';
import {stationRecipes} from '../src/sim/production-recipes.ts';

/** Named lower generation endpoints prepare an original, without a played
 * clinical incident, food transfer or training claim. Inspection is read only. */
class LowerEndpoints extends WorldGenerationRandom {
  constructor(){super(0);}
  override value(){return .999999;}
  override float(min:number,_max:number){return Math.fround(min);}
  override integer(min:number,_max:number){return min;}
}
function fixture(def:'LabradorRetriever'|'Cat'|'Warg'|'Megascarab'='LabradorRetriever'){
  const w=createWorld(466,16,16),made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256[def],id:w.nextId,cell:{x:4,z:7},tick:w.tick,random:new LowerEndpoints()});
  if(made.status!=='ready')throw Error('Prepared inspection original refused: '+made.reason);
  const a=made.animal;w.nextId++;
  w.wildlife={profile:'temperate-hares-v1',rng:1,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  return {w,a};
}

test('the same non-predatory Labrador is described as omnivorous and inspection preserves its whole world',()=>{
  const {w,a}=fixture(),before=JSON.stringify(w);
  expect(animalSpecies(a.species).predator).toBeUndefined();
  expect(animalItemDiet256(a,'rice')).toBe(true);expect(animalItemDiet256(a,'hare-meat')).toBe(true);
  const diet=animalInspectorView(w,a.id)!.species.find(line=>line.startsWith('Régime :'))!;
  expect(diet).toContain('omnivore');expect(diet).toContain('végétaux crus');expect(diet).toContain('viande');expect(diet).toContain('œufs');
  expect(diet).not.toContain('herbivore');expect(JSON.stringify(w)).toBe(before);
});

test.each(['Cat','Warg'] as const)('%s keeps its food restrictions rather than inheriting a generic predator meal label',def=>{
  const {w,a}=fixture(def),diet=animalInspectorView(w,a.id)!.species.find(line=>line.startsWith('Régime :'))!;
  expect(animalItemDiet256(a,'rice')).toBe(false);expect(diet).not.toContain('omnivore');expect(diet).not.toContain('végétaux crus');
  if(def==='Warg'){
    expect(animalItemDiet256(a,'simple-meal')).toBe(false);expect(diet).toContain('carnivore strict');expect(diet).not.toContain('repas');expect(diet).not.toContain('croquettes');
  }else{
    expect(animalItemDiet256(a,'simple-meal')).toBe(true);expect(diet).toContain('repas');expect(diet).toContain('œufs');
  }
});

test('a non-predatory insect uses the same omnivorous food flags without receiving a herbivore label',()=>{
  const {w,a}=fixture('Megascarab'),diet=animalInspectorView(w,a.id)!.species.find(line=>line.startsWith('Régime :'))!;
  expect(animalSpecies(a.species).predator).toBeUndefined();expect(animalItemDiet256(a,'hare-meat')).toBe(true);
  expect(diet).toContain('omnivore');expect(diet).toContain('produits animaux');expect(diet).not.toContain('herbivore');
});

test('the original seven retain their existing versioned foods without adopting a new native profile',()=>{
  const {a}=fixture(),hare={...a,species:'hare' as const},fox={...a,species:'red-fox' as const};
  delete hare.growthTracker;delete fox.growthTracker;
  expect(animalDietLabel(hare,226)).toBe('végétaux et repas');expect(animalDietLabel(hare,227)).toContain('foin et croquettes');
  expect(animalDietLabel(fox,177)).toBe('viande et repas');expect(animalDietLabel(fox,178)).toContain('dépouilles fraîches');
  expect(hare.growthTracker).toBeUndefined();expect(fox.growthTracker).toBeUndefined();
});

test('latent heat and severe cold stay separately visible on the same dossier without a treatment or refuge claim',()=>{
  const {w,a}=fixture();a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=HEAT_UNIT*.001;a.health.hypothermia=HEAT_UNIT*.35;
  const before=JSON.stringify(w),health=animalInspectorView(w,a.id)!.health;
  expect(health).toContain('Coup de chaleur latent · 0.1 %');expect(health).toContain('Hypothermie grave · 35.0 %');
  expect(health.filter(line=>line.startsWith('Coup de chaleur')||line.startsWith('Hypothermie')).join(' ')).not.toMatch(/pansement|médicament|refuge|abri/i);
  expect(JSON.stringify(w)).toBe(before);
});

test('healthy inspection invents no thermal illness and retains an actual extreme condition when present',()=>{
  const {w,a}=fixture();
  expect(animalInspectorView(w,a.id)!.health.join(' ')).not.toMatch(/Coup de chaleur|Hypothermie/);
  a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=HEAT_UNIT*.62;
  expect(animalInspectorView(w,a.id)!.health).toContain('Coup de chaleur extrême · 62.0 %');
  delete a.health.heatstroke;
  expect(animalInspectorView(w,a.id)!.health.join(' ')).not.toMatch(/Coup de chaleur|Hypothermie/);
});

test('research guidance names the already delivered spear and plate recipes with their real costs and skills',()=>{
  const blades=researchProjects.find(p=>p.id==='long-blades')!.detail,plate=researchProjects.find(p=>p.id==='plate-armor')!.detail;
  for(const kind of ['fueled-smithy','electric-smithy'] as const){expect(stationRecipes({kind})).toContain('make-spear');expect(stationRecipes({kind})).toContain('make-plate-armor');}
  expect(blades).toContain(`Lance : ${smithingUnits267('make-spear','steel')} unités`);expect(blades).toContain(`${smithingUnits267('make-spear','gold')} pour argent et or`);expect(blades).toContain(`Artisanat ${smithingSkillRequired267('make-spear')}`);
  expect(plate).toContain(`${smithingUnits267('make-plate-armor','steel')} unités`);expect(plate).toContain('1 700 pour argent et or');expect(plate).toContain(`Artisanat ${smithingSkillRequired267('make-plate-armor')}`);
  expect(blades).not.toContain('restent à développer');expect(plate).not.toContain('hors périmètre');
});
