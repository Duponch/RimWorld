import {expect,test} from 'vitest';
import {huntingCamp} from './scenarios/hunting';
import {animalSpecies} from '../src/sim/animal-species';
import {adultAgeTicks,animalNutritionMax,advanceAnimalLife,gestationTicks} from '../src/sim/animal-life';
import {animalProductDefinition256} from '../src/sim/animal-products-v256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {productKind,productProposal,startProduct,processProduct,advanceAnimalProducts} from '../src/sim/animal-products';
import {drawAnimalLitter256} from '../src/sim/animal-reproduction-v256';
import {animalHandlingSkill256,animalHandlingFood256} from '../src/sim/animal-domestic-v256';
import {animalMechanicalReadiness256} from '../src/sim/animal-readiness-v256';
import {blockedCells,reachableCells} from '../src/sim/pathfinding';
import type {World} from '../src/sim/types';
import type {AnimalSpeciesId256} from '../src/sim/animal-core-data-v256';
function camp(species:AnimalSpeciesId256,ageTicks=adultAgeTicks(species)){
 const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.schemaVersion=256 as World['schemaVersion'];w.tick=100;
 w.pawns=[p];w.piles=[];w.resources=[];w.structures=[];w.jobs=[];w.wildlife!.animals=[a];for(const t of w.tiles)t.terrain='soil';
 p.x=9;p.z=10;p.path=[];p.priorities.handle=1;p.skills.animals={level:20,xp:0,dailyXp:0,passion:0};
 Object.assign(a,{species,sex:'female',ageTicks,x:10,z:10,food:0,rest:1,state:'idle',path:[],nextDecision:w.tick+80});delete a.motion;delete a.health;delete a.growthTracker;delete a.ageCoreRemainder;
 attachGeneratedAnimalGrowth256(a,w.tick*10,256);a.food=animalNutritionMax(a);
 a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000,productFullness:1};return {w,p,a};
}
test('all seven new body products use the physical handler work and paid output placement',()=>{
 for(const species of ['alpaca','bison','megasloth','boomalope','caribou','elk','yak'] as const){
  const {w,p,a}=camp(species),def=animalProductDefinition256(a)!;expect(def).toBeDefined();
  const proposal=productProposal(w,p,reachableCells(w,p,blockedCells(w),new Set()));expect(proposal).toBeDefined();startProduct(p,proposal!);
  const task=p.animalHandling!,context={search:()=>null,move:()=>{throw Error('expected contact');},release:()=>true,event:()=>{}};
  p.x=0;p.z=0;processProduct(w,p,task as Parameters<typeof processProduct>[2],{...context,move:()=>{}});expect(w.piles).toHaveLength(0);expect(a.domestic!.productFullness).toBe(1);
  p.x=9;p.z=10;task.progress=def.work-1;processProduct(w,p,task as Parameters<typeof processProduct>[2],context);
  expect(w.piles.filter(pile=>pile.item===def.item).reduce((n,pile)=>n+pile.quantity,0)).toBe(def.quantity);expect(a.domestic!.productFullness).toBe(0);
 }
});
test('new product sex and life-stage permissions remain biological; boomalope chemfuel is both-sex',()=>{
 const {w,a}=camp('yak');a.sex='male';expect(productKind(a)).toBeUndefined();a.sex='female';expect(productKind(camp('yak',0).a)).toBeUndefined();expect(productKind(a)).toBe('milk');
 a.domestic!.productFullness=0;a.food=0;advanceAnimalProducts(w);expect(a.domestic!.productFullness).toBe(0);
 const boom=camp('boomalope').a;boom.sex='male';expect(productKind(boom)).toBe('milk');expect(animalProductDefinition256(boom)?.item).toBe('chemfuel');
});
test('litter uses its real curve with two draws and default singleton uses none; blocked birth does not spend IDs/RNG',()=>{
 let draws=0;const singleton=drawAnimalLitter256('alpaca',()=>{draws++;return .4;});expect(singleton).toBe(1);expect(draws).toBe(0);
 const count=drawAnimalLitter256('boomrat',()=>{draws++;return .6;});expect(count).toBeGreaterThanOrEqual(1);expect(count).toBeLessThanOrEqual(3);expect(draws).toBe(2);
 const {w,a}=camp('boomrat');a.pregnancy={fatherId:w.pawns[0]!.id,progress:gestationTicks('boomrat')};
 for(const tile of w.tiles)tile.terrain='rock';const before=w.wildlife!.rng,id=w.nextId;advanceAnimalLife(w);expect(w.wildlife!.animals).toHaveLength(1);expect(w.wildlife!.rng).toBe(before);expect(w.nextId).toBe(id);expect(a.pregnancy).toBeDefined();
 for(const tile of w.tiles)tile.terrain='soil';advanceAnimalLife(w);expect(w.wildlife!.animals.length).toBeGreaterThan(1);expect(a.pregnancy).toBeUndefined();expect(w.wildlife!.animals.slice(1).every(child=>child.ageTicks===0&&child.parents?.motherId===a.id&&child.food===animalNutritionMax(child)*.45)).toBe(true);
});
test('handling uses true food flags and wildness, while unavailable Cobra has an explicit admission refusal',()=>{
 const warg=camp('warg').a;expect(animalHandlingFood256(warg,'berries')).toBe(false);expect(animalHandlingFood256(warg,'warg-meat')).toBe(true);expect(animalHandlingFood256(warg,'kibble')).toBe(false);
 expect(animalHandlingSkill256('alpaca')).toBeLessThan(animalHandlingSkill256('warg')!);expect(animalMechanicalReadiness256('cobra').ok).toBe(false);expect(animalMechanicalReadiness256('duck').ok).toBe(true);expect(animalMechanicalReadiness256('alpaca')).toEqual({ok:true});
});
