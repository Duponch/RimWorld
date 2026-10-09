import { expect,test } from 'vitest';
import { animalInspectorScaffold,animalInspectorView } from '../src/ui/animal-inspector';
import { createWorld } from '../src/sim/index';
import { createMedicalRecord,addResolvedInjury } from '../src/sim/injury-state';
import { adultAgeTicks } from '../src/sim/animal-life';
import type { WildAnimal } from '../src/sim/wildlife-state';
import type { World } from '../src/sim/types';

function fixture(species:WildAnimal['species']='deer'){
  const world=createWorld(901,16,16);
  const animal:WildAnimal={id:world.nextId++,species,sex:'female',ageTicks:adultAgeTicks(species),x:4,z:7,food:.5,rest:.25,state:'sleeping',path:[],nextDecision:world.tick,
    domestic:{since:world.tick,care:'industrial',tameness:5,nextDecay:world.tick+45000},health:{...createMedicalRecord(world.tick),body:species}};
  addResolvedInjury(animal.health!,'left-front-leg','cut',1000,()=>.999999);
  world.wildlife={profile:'temperate-hares-v1',rng:1,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  return {world,animal};
}
const text=(world:World,animal:WildAnimal)=>animalInspectorView(world,animal.id)!.health.join(' ');

test('all five obtainable patients expose current care policy and honest physical availability',()=>{
  for(const species of ['hare','deer','gazelle','muffalo','dromedary'] as const){
    const {world,animal}=fixture(species),before=structuredClone(world),view=animalInspectorView(world,animal.id)!;
    expect(view.careAvailable,species).toBe(true);expect(view.care).toBe('industrial');expect(view.health.join(' ')).toContain('en attente d’un médecin disponible');
    expect(view.health.join(' ')).toContain('Alimentation assistée : indisponible');expect(view.health.join(' ')).toContain('aucun bonus de lit hospitalier');expect(world).toEqual(before);
  }
});

test('care phases name the real doctor, dose collection, approach and treatment progress',()=>{
  const {world,animal}=fixture(),doctor=world.pawns[0]!;doctor.name='<Soigneur réel>';
  doctor.animalCare={animalId:animal.id,spot:{x:3,z:7},phase:'pickup',progress:0,medicine:{item:'medicine',sourcePileId:world.nextId++,carryPileId:null,quantity:1}};
  expect(text(world,animal)).toContain('Soigneur : <Soigneur réel>');expect(text(world,animal)).toContain('collecte de Médicament');
  doctor.animalCare.phase='approach';expect(text(world,animal)).toContain('rejoint l’animal avec');
  doctor.animalCare.phase='treat';doctor.animalCare.duration=600;doctor.animalCare.progress=300;expect(text(world,animal)).toContain('pansement en cours · 50 %');
  delete doctor.animalCare.medicine;expect(text(world,animal)).toContain('sans médicament');
  delete doctor.animalCare;expect(text(world,animal)).toContain('en attente d’un médecin disponible');
});

test('standing, danger, refused policy and death do not promise immediate treatment',()=>{
  const {world,animal}=fixture();animal.state='idle';expect(text(world,animal)).toContain('doit dormir ou être à terre');
  animal.state='sleeping';animal.flee={danger:{x:5,z:7},until:world.tick+100};expect(text(world,animal)).toContain('en attente de sécurité');delete animal.flee;
  animal.domestic!.care='none';expect(text(world,animal)).toContain('interdits par la politique');
  animal.state='dead';expect(text(world,animal)).toContain('animal décédé');expect(text(world,animal)).not.toContain('pansement en cours');
});

test('tended wounds remain recovering rather than being described as cured',()=>{
  const {world,animal}=fixture();animal.health!.injuries[0]!.tended=500;
  expect(text(world,animal)).toContain('plaies déjà pansées ou immunité en cours');expect(text(world,animal)).not.toContain('aucun pansement nécessaire');
  animal.health!.injuries=[];expect(text(world,animal)).toContain('aucun pansement nécessaire actuellement');
});

test('new herd eligibility is prospective, historical hare remains available and wild animals acquire no care UI',()=>{
  const {world,animal}=fixture();world.schemaVersion=211 as World['schemaVersion'];expect(animalInspectorView(world,animal.id)!.careAvailable).toBe(false);expect(text(world,animal)).toContain('indisponibles pour cette espèce');
  const hare=fixture('hare');hare.world.schemaVersion=211 as World['schemaVersion'];expect(animalInspectorView(hare.world,hare.animal.id)!.careAvailable).toBe(true);
  delete animal.domestic;expect(animalInspectorView(world,animal.id)!.careAvailable).toBe(false);expect(text(world,animal)).not.toContain('Soins vétérinaires');
  const markup=animalInspectorScaffold();expect(markup).toContain('data-animal-care');expect(markup).not.toContain('Soigner maintenant');
});
