import { expect,test } from 'vitest';
import { generateWorld } from '../src/sim/generation';
import { geologicalField } from '../src/sim/geology';
import { generateSiteWorld } from '../src/sim/site-generation';
import { generateSiteOres,siteOreBudget } from '../src/sim/site-ores';
import { HILLINESS,resolveSite } from '../src/sim/site';
import { soilFertility } from '../src/sim/soil';
import type { World } from '../src/sim/types';

const terrainCounts=(world:World)=>world.tiles.reduce<Record<string,number>>((out,t)=>{out[t.terrain]=(out[t.terrain]??0)+1;return out;},{});

test('relief choices change the same landscape without a universal river, rock quota or regenerated legacy profile',()=>{
  const seed=42,site=resolveSite(seed),before=generateWorld(seed,64,64,'temperate-survivors-v1');
  const worlds=HILLINESS.map(hilliness=>generateSiteWorld(seed,128,128,resolveSite(seed,{hilliness})));
  expect(worlds[1]).toEqual(generateSiteWorld(seed,128,128,site));
  const counts=worlds.map(terrainCounts);
  expect(counts[0]!['rock']).toBeLessThan(counts[1]!['rock']!);expect(counts[1]!['rock']).toBeLessThan(counts[2]!['rock']!);
  for(const world of worlds) {
    const counts=terrainCounts(world);
    expect(counts['water']??0).toBe(0);expect(counts['soil']??0).toBe(0);
    for(const type of ['grass','rich-soil','gravel','rough-stone'])expect(counts[type]).toBeGreaterThan(0);
    expect(world.rng).toBe(seed);expect(world.pawns).toEqual([]);expect(world.structures).toEqual([]);
    expect(world.piles.every(p=>p.kind==='chunk')).toBe(true);
    for(const tile of world.tiles)if(tile.stone)expect(site.stones).toContain(tile.stone);
  }
  expect(soilFertility('grass')).toBe(1);expect(soilFertility('rich-soil')).toBe(1.4);expect(soilFertility('gravel')).toBe(.7);
  expect(terrainCounts(before)['water']).toBeGreaterThan(0);
  expect(generateWorld(seed,64,64,'temperate-survivors-v1')).toEqual(before);
});

test('ore occasions share one budget, include hidden centres, consume absent minerals and can cross the original rock edge',()=>{
  expect(HILLINESS.map(h=>siteOreBudget(250,250,h))).toEqual([25,50,69]);
  const site=resolveSite(7,{hilliness:'large-hills'}),world=generateSiteWorld(7,64,64,site);
  world.tiles=Array.from({length:world.width*world.height},()=>({terrain:'rock',stone:site.stones[0]!}));
  const rng=world.rng,report=generateSiteOres(world,site,geologicalField(world.seed,site.stones));
  expect(report.occasions).toHaveLength(report.requested);
  expect(report.occasions.some(o=>o.mineral!=='steel'&&o.mineral!=='machinery')).toBe(true);
  const seen=new Set<number>();
  for(const [index,occasion] of report.occasions.entries()) {
    for(const prior of report.occasions.slice(0,index))expect((prior.center%64-occasion.center%64)**2+(Math.floor(prior.center/64)-Math.floor(occasion.center/64))**2).toBeGreaterThanOrEqual(25);
    if(occasion.mineral!=='steel'&&occasion.mineral!=='machinery'){expect(occasion.cells).toEqual([]);continue;}
    expect(occasion.cells.length).toBe(occasion.requested);
    for(const cell of occasion.cells){expect(seen.has(cell)).toBe(false);seen.add(cell);expect(world.tiles[cell]!.ore).toBe(occasion.mineral);}
  }
  expect(world.tiles.filter(t=>t.ore).length).toBe(seen.size);expect(world.rng).toBe(rng);
  // A sole natural-rock centre has no exposed-centre shortcut: its deposit may
  // grow into the surrounding supported soil, like the reference validator.
  world.tiles=Array.from({length:64*64},()=>({terrain:'grass'}));world.tiles[32*64+32]={terrain:'rock',stone:site.stones[0]!};
  const edge=generateSiteOres(world,site,geologicalField(world.seed,site.stones));
  expect(edge.occasions).toHaveLength(1);expect(edge.occasions[0]!.cells.length).toBeGreaterThan(1);
  expect(world.tiles.filter(t=>t.ore).length).toBe(edge.occasions[0]!.cells.length);
});

test('loose fragments are unique physical piles; incomplete vegetation neither occupies them nor grows on stone',()=>{
  const world=generateSiteWorld(7,128,128,resolveSite(7)),ids=new Set<number>(),occupied=new Set<number>();
  let neighboringChunks=0;
  for(const pile of world.piles) {
    expect(pile.kind).toBe('chunk');expect(pile.quantity).toBe(1);expect(pile.haulRequested).toBeUndefined();
    expect(pile.owner.type).toBe('ground');if(pile.owner.type!=='ground')throw new Error('Expected physical fragment');
    const cell=pile.owner.z*world.width+pile.owner.x;
    expect(occupied.has(cell)).toBe(false);occupied.add(cell);expect(ids.has(pile.id)).toBe(false);ids.add(pile.id);
    expect(world.tiles[cell]!.terrain).not.toBe('rock');
  }
  for(const cell of occupied)if([-world.width,-1,1,world.width].some(d=>occupied.has(cell+d)&&Math.abs(cell%world.width-(cell+d)%world.width)<=1))neighboringChunks++;
  expect(occupied.size).toBeGreaterThan(20);expect(neighboringChunks/occupied.size).toBeGreaterThan(.5);
  const berryGrowth:number[]=[];
  for(const r of world.resources) {
    const cell=r.z*world.width+r.x;expect(occupied.has(cell)).toBe(false);occupied.add(cell);
    expect(ids.has(r.id)).toBe(false);ids.add(r.id);expect(soilFertility(world.tiles[cell]!.terrain)).toBeGreaterThanOrEqual(.5);
    expect(['tree','berries']).toContain(r.kind);
    if(r.kind==='berries'){berryGrowth.push(r.growth!);expect(r.growthTick).toBe(0);expect(r.growth).toBeGreaterThanOrEqual(.15);expect(r.growth).toBeLessThanOrEqual(1);}
  }
  expect(berryGrowth.some(g=>g===1)).toBe(true);expect(berryGrowth.some(g=>g<.65)).toBe(true);
  expect(world.nextId).toBe(ids.size+1);
});
