import { expect,test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prepareWildlifeExitDemo } from '../scripts/generate-wildlife-exit-demo-v186';
import { deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { animalFoods } from '../src/sim/wildlife-food';
import { animalNavigation } from '../src/sim/wildlife-navigation';
import { parseTestColonies } from '../src/ui/test-colonies';

test('public prepared scene has exact bytes and plays a real exit while the owned animal remains',()=>{
  const raw=readFileSync('public/test-saves/v186/faune-affamee.json','utf8'),w=deserializeWorld(raw);
  expect(w).toEqual(prepareWildlifeExitDemo());expect(validateWorld(w)).toEqual([]);
  const entries=parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')));
  const entry=entries.find(e=>e.id==='faune-affamee-v186')!;
  expect(entry.sha256).toBe(createHash('sha256').update(raw).digest('hex'));expect(entry.prepared).toBe(true);
  const [wild,healthy,pet]=w.wildlife!.animals;
  const food=animalFoods(w,wild!);expect(food.length).toBeGreaterThan(0);
  const goals=food.flatMap(f=>[{x:f.x,z:f.z},{x:f.x-1,z:f.z},{x:f.x+1,z:f.z},{x:f.x,z:f.z-1},{x:f.x,z:f.z+1}]);
  expect(animalNavigation(w,false,true).route(wild!,goals)).toBeUndefined();
  const foodBefore=w.piles.filter(p=>p.kind==='food').map(p=>[p.id,p.quantity,p.owner]);
  stepWorld(w,1);expect(wild!.exiting).toBeDefined();expect(pet!.exiting).toBeUndefined();
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<160;i++){stepWorld(w);stepWorld(resumed);expect(resumed).toEqual(w);}
  expect(validateWorld(w)).toEqual([]);expect(w.wildlife!.exitedAnimals).toBe(1);
  expect(w.wildlife!.animals.map(a=>a.id)).toEqual([healthy!.id,pet!.id]);
  expect(w.piles.filter(p=>p.kind==='food').map(p=>[p.id,p.quantity,p.owner])).toEqual(foodBefore);
  expect(w.piles.some(p=>p.kind==='corpse')).toBe(false);
});
