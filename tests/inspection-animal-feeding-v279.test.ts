import { expect,test } from 'vitest';
import { animalInspectorScaffold,animalInspectorView } from '../src/ui/animal-inspector';
import { createWorld } from '../src/sim/index';
import { addResolvedInjury,createMedicalRecord } from '../src/sim/injury-state';
import { adultAgeTicks,animalNutritionMax } from '../src/sim/animal-life';
import type { WildAnimal } from '../src/sim/wildlife-state';
import type { World } from '../src/sim/types';

function fixture(species:WildAnimal['species']='deer'){
  const world=createWorld(279,16,16);
  const animal:WildAnimal={id:world.nextId++,species,sex:'female',ageTicks:adultAgeTicks(species),x:4,z:7,food:0,rest:.25,state:'sleeping',path:[],nextDecision:world.tick,
    domestic:{since:world.tick,care:'none',tameness:5,nextDecay:world.tick+45000},health:{...createMedicalRecord(world.tick),body:species}};
  animal.food=animalNutritionMax(animal)*.1;
  addResolvedInjury(animal.health!,'left-front-leg','cut',1000,()=>.999999);
  world.wildlife={profile:'temperate-hares-v1',rng:1,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  return {world,animal};
}
const text=(world:World,animal:WildAnimal)=>animalInspectorView(world,animal.id)!.health.join(' ');

test('five possessed species show waiting for real food independently of the medical policy, without mutating the world',()=>{
  for(const species of ['hare','deer','gazelle','muffalo','dromedary'] as const){
    const {world,animal}=fixture(species),before=structuredClone(world),lines=text(world,animal);
    expect(lines,species).toContain('en attente d’un médecin disponible, d’une portion compatible');
    expect(lines).toContain('Soins vétérinaires : interdits');expect(lines).toContain('La politique médicale ne bloque pas');
    expect(lines).not.toContain('Alimentation assistée : indisponible');expect(world).toEqual(before);
  }
});

test('inspection follows the actual doctor and physical portion through pickup, delivery and feeding',()=>{
  const {world,animal}=fixture(),doctor=world.pawns[0]!;doctor.name='<Médecin réel>';
  const sourcePileId=world.nextId++;
  world.piles.push({id:sourcePileId,kind:'food',item:'rice',quantity:2,owner:{type:'ground',x:3,z:7}});
  doctor.animalFeed={animalId:animal.id,spot:{x:3,z:7},sourcePileId,carryPileId:null,quantity:2,phase:'pickup',progress:0};
  expect(text(world,animal)).toContain('soigneur : <Médecin réel>');expect(text(world,animal)).toContain('Collecte de nourriture : 2 ×');
  doctor.animalFeed.carryPileId=sourcePileId;doctor.animalFeed.phase='deliver';world.piles[world.piles.length-1]!.owner={type:'pawn',pawnId:doctor.id};
  expect(text(world,animal)).toContain('rejoint l’animal avec 2 ×');
  doctor.animalFeed.phase='feed';doctor.animalFeed.progress=30;
  expect(text(world,animal)).toContain('Alimentation au contact : 40 %');
  delete doctor.animalFeed;expect(text(world,animal)).not.toContain('soigneur :');expect(text(world,animal)).toContain('en attente d’un médecin');
});

test('danger, hunger and posture do not promise an immediate meal or medical recovery',()=>{
  const {world,animal}=fixture();animal.flee={danger:{x:5,z:7},until:world.tick+100};
  expect(text(world,animal)).toContain('Alimentation assistée : en attente de sécurité');delete animal.flee;
  animal.food=animalNutritionMax(animal);expect(text(world,animal)).toContain('réservée aux animaux affamés');
  animal.food=0;animal.state='idle';expect(text(world,animal)).not.toContain('en attente d’un médecin disponible, d’une portion compatible');
  animal.state='sleeping';animal.domestic!.care='industrial';animal.health!.injuries[0]!.tended=500;
  expect(text(world,animal)).toContain('plaies déjà pansées ou immunité en cours');expect(text(world,animal)).toContain('en attente d’un médecin disponible, d’une portion compatible');
});

test('historical, wild and deceased animals expose no new feeding task or manual order',()=>{
  const {world,animal}=fixture();world.schemaVersion=213 as World['schemaVersion'];expect(text(world,animal)).toContain('Alimentation assistée : indisponible');
  world.schemaVersion=214 as World['schemaVersion'];delete animal.domestic;expect(text(world,animal)).not.toContain('Alimentation assistée');
  animal.domestic={since:world.tick,care:'industrial',tameness:5,nextDecay:world.tick+45000};animal.state='dead';
  expect(text(world,animal)).not.toContain('Alimentation assistée');expect(text(world,animal)).not.toContain('Alimentation au contact');
  const markup=animalInspectorScaffold();expect(markup).not.toContain('data-animal-feed');expect(markup).not.toContain('Nourrir maintenant');
});
