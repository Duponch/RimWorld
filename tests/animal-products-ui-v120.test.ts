import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {animalInspectorView} from '../src/ui/animal-inspector.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

test('animal dossier reports only eligible owned products and current physical work',()=>{
  const world=createWorld(120,16,16);
  const animal:WildAnimal={id:world.nextId++,species:'dromedary',sex:'female',x:5,z:6,food:.1,rest:1,state:'idle',path:[],nextDecision:world.tick,
    domestic:{since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,productFullness:.5}};
  world.wildlife={profile:'temperate-hares-v1',rng:1,animals:[animal],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(animalInspectorView(world,animal.id)?.species).toContain('Lait : 50 % de maturité');
  const pawn=world.pawns[0]!;
  pawn.animalHandling={animalId:animal.id,kind:'milk',sourcePileId:0,carryPileId:null,quantity:0,phase:'approach',step:0,progress:0};
  expect(animalInspectorView(world,animal.id)?.species).toContain('Traite : en approche');
  pawn.animalHandling.phase='interact';pawn.animalHandling.progress=10;
  expect(animalInspectorView(world,animal.id)?.species).toContain('Traite : 25 % du travail');
  animal.domestic!.productFullness=1;
  expect(animalInspectorView(world,animal.id)?.species).toContain('Lait : 100 % de maturité · prêt à récolter');
  animal.sex='male';
  expect(animalInspectorView(world,animal.id)?.species.join(' ')).not.toMatch(/Lait|Traite/);
  animal.species='muffalo';
  pawn.animalHandling.kind='shear';pawn.animalHandling.progress=85;
  expect(animalInspectorView(world,animal.id)?.species).toContain('Laine de mufalo : 100 % de maturité · prêt à récolter');
  expect(animalInspectorView(world,animal.id)?.species).toContain('Tonte : 50 % du travail');
  animal.domestic=undefined;
  expect(animalInspectorView(world,animal.id)?.species.join(' ')).not.toMatch(/Laine|Tonte/);
});
