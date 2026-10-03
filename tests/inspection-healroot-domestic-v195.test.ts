import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import type { Resource } from '../src/sim/types';
import { plantInspection } from '../src/ui/plant-inspection';
import { growingCultureHelp } from '../src/ui/growing-controls';

test('culture help names the medical product, sowing-only Plantes8 and conditional work/growth rather than a promised dose',()=>{
  const help=growingCultureHelp('healroot');
  expect(help).toContain('Plantes 8');expect(help).toContain('semis seulement');expect(help).toContain('sans ce minimum');
  expect(help).toContain('médicament à base de plantes');expect(help).toContain('80 ticks');expect(help).toContain('40 ticks');
  expect(help).toContain('selon le récolteur');expect(help).toContain('coupe de dégagement ne donne aucune dose');
  expect(growingCultureHelp('cotton')).toContain('tissus');expect(growingCultureHelp('rice')).toContain('6 unités');
});

test('inspection distinguishes immature/partial harvest and damage60HP without mutating the plant or random streams',()=>{
  const w=createWorld(195,32,32),plant:Resource={id:w.nextId++,kind:'healroot',x:4,z:4,amount:1,growth:.65,growthTick:w.tick};
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[plant];
  let before=JSON.stringify(w),description=plantInspection(w,plant);
  expect(description).toContain('Pas encore récoltable');expect(description).toContain('Produit : médicament');
  expect(description).toContain('Plantes 8 pour commencer le semis seulement');expect(description).toContain('sans minimum à la récolte');
  expect(JSON.stringify(w)).toBe(before);
  plant.growth=1;plant.damage=30;before=JSON.stringify(w);description=plantInspection(w,plant);
  expect(description).toContain('État 30/60');expect(description).toMatch(/Récolte : environ .*médicament/);
  expect(description).not.toMatch(/Récolte :.*baies/);expect(JSON.stringify(w)).toBe(before);
});

test('leafless cultivated medicine remains visibly alive and does not falsely forbid an otherwise ready harvest',()=>{
  const w=createWorld(195,32,32),plant:Resource={id:w.nextId++,kind:'healroot',x:4,z:4,amount:1,growth:1,growthTick:w.tick,plantLife:{since:w.tick,age:0,darkTicks:0,leaflessAt:w.tick,nextCheck:w.tick+200}};
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[plant];const before=JSON.stringify(w);
  const description=plantInspection(w,plant);
  expect(description).toContain('Sans feuilles');expect(description).toContain('broutage suspendu');
  expect(description).toContain('récolte possible si croissance suffisante');expect(description).toMatch(/Récolte : environ .*médicament/);
  expect(description).toContain('Coupe sans dose');expect(JSON.stringify(w)).toBe(before);
});
