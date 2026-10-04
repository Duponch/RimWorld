import { expect,test } from 'vitest';
import { equipmentCamp } from './scenarios/equipment.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { addMaterial } from '../src/sim/materials.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

function camp(response?:'attack'|'ignore',ranged=false){
  const w=equipmentCamp(1),p=w.pawns[0]!;
  w.resources=[];w.jobs=[];w.structures=[];w.piles=[];
  w.tiles=w.tiles.map(t=>({...t,terrain:'grass'}));
  p.hunger=100;p.rest=100;p.recreation.level=100;
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'male',ageTicks:adultAgeTicks('hare'),x:9,z:5,food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:811,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  if(response)expect(applyCommand(w,{type:'hostility-response',pawnId:p.id,response}).ok).toBe(true);
  if(ranged)addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  expect(startAnimalManhunter(w,a)).toBe(true);expect(validateWorld(w)).toEqual([]);
  return {w,p,a};
}
test('sole animal threat activates civilian flee, ignore and real melee defense without any human enemy',()=>{
  const fleeing=camp();stepWorld(fleeing.w);expect(fleeing.p.flee).toBeDefined();
  const ignoring=camp('ignore');stepWorld(ignoring.w);expect(ignoring.p.flee).toBeUndefined();expect(ignoring.p.melee).toBeUndefined();
  const {w,p,a}=camp('attack'),resumed=deserializeWorld(serializeWorld(w));
  let attempted=false;
  for(let n=0;n<100;n++){
    stepWorld(w);stepWorld(resumed);expect(validateWorld(w),String(w.tick)).toEqual([]);
    if(p.lastAttack?.targetId===a.id)attempted=true;
  }
  expect(attempted).toBe(true);expect(resumed).toEqual(w);
});
test('ranged response owns an actual hostile animal and cancels when that hostility recovers',()=>{
  const {w,p,a}=camp('attack',true);
  for(let n=0;n<8&&!p.shooting;n++)stepWorld(w);
  expect(p.shooting?.order?.targetId).toBe(a.id);
  expect(validateWorld(w)).toEqual([]);
  delete a.manhunter;
  stepWorld(w);expect(p.shooting?.order).toBeFalsy();
  expect(validateWorld(w)).toEqual([]);
});
