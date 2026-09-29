import { expect, test } from 'vitest';
import { applyCommand, canDesignate, createWorld, refreshStock, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { buildConstructionCellIndex } from '../src/sim/engine.ts';
import { constructionLineCells } from '../src/sim/construction-line.ts';
import type { BuildLineCommand, Command } from '../src/sim/types.ts';

const line = (kind: BuildLineCommand['kind'], x:number, z:number, endX:number, endZ:number): BuildLineCommand =>
  ({ type:'build-line', kind, from:{x,z}, to:{x:endX,z:endZ}, ...(kind==='power-conduit'?{material:'steel'}:{material:'wood'}) });

test('tracé rectiligne : sens inversé, obstacles, annulation et validation de toute la commande', () => {
  expect(constructionLineCells({x:8,z:5},{x:3,z:7})).toEqual([8,7,6,5,4,3].map(x=>({x,z:5})));
  expect(constructionLineCells({x:8,z:5},{x:7,z:2})).toEqual([5,4,3,2].map(z=>({x:8,z})));
  const world=createWorld(42,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.structures=[];world.piles=[];
  world.tiles[6*16+7]!.terrain='water';
  world.structures.push({id:world.nextId++,kind:'wall',x:5,z:6,orientation:0,footprint:'standard',material:'wood'});
  refreshStock(world);
  for(const bad of [
    {...line('wall',3,6,9,6),kind:'bed'}, line('wall',-1,6,9,6),
    {...line('wall',3,6,9,6),to:{x:16,z:6}}, {...line('wall',3,6,9,6),material:'steel-invalid'},
  ]) {
    const before=serializeWorld(world);
    expect(applyCommand(world,bad as unknown as Command).ok).toBe(false);
    expect(serializeWorld(world)).toBe(before);
  }
  expect(applyCommand(world,line('wall',9,6,3,6))).toEqual({ok:true,affected:5,skipped:2});
  expect(world.jobs.map(job=>[job.x,job.z])).toEqual([[9,6],[8,6],[6,6],[4,6],[3,6]]);
  expect(validateWorld(world)).toEqual([]);
  const before=serializeWorld(world);
  expect(applyCommand(world,line('wall',3,6,9,6)).ok).toBe(false);
  expect(serializeWorld(world)).toBe(before);
  expect(applyCommand(world,{type:'area',action:'cancel',from:{x:3,z:6},to:{x:9,z:6}})).toMatchObject({ok:true,affected:5});
  expect(world.jobs).toEqual([]);
  expect(validateWorld(world)).toEqual([]);
});

test('clôtures et câbles : même désignation groupée, matériau conservé et ordre des cases', () => {
  const world=createWorld(42,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.structures=[];
  expect(applyCommand(world,line('fence',2,3,2,6))).toEqual({ok:true,affected:4,skipped:0});
  expect(world.jobs.map(job=>[job.kind,job.x,job.z,job.material])).toEqual([3,4,5,6].map(z=>['fence',2,z,'wood']));
  expect(applyCommand(world,line('power-conduit',2,3,5,3))).toMatchObject({ok:true,affected:4});
  expect(world.jobs.filter(job=>job.kind==='power-conduit').map(job=>[job.x,job.z,job.material])).toEqual([2,3,4,5].map(x=>[x,3,'steel']));
  expect(validateWorld(world)).toEqual([]);
});

test('carte 250² : un tracé de 250 cases reste une seule commande', () => {
  const world=createWorld(7,250,250);
  const previewStart=performance.now();
  const index=buildConstructionCellIndex(world,'wall');
  const preview=constructionLineCells({x:249,z:125},{x:0,z:125})
    .filter(cell=>canDesignate(world,{type:'designate',kind:'wall',material:'wood',orientation:0,...cell},false,index).ok);
  const previewDuration=performance.now()-previewStart;
  const oracle=constructionLineCells({x:249,z:125},{x:0,z:125})
    .filter(cell=>canDesignate(world,{type:'designate',kind:'wall',material:'wood',orientation:0,...cell}).ok);
  expect(preview).toEqual(oracle);
  const start=performance.now();
  const result=applyCommand(world,line('wall',249,125,0,125));
  const duration=performance.now()-start;
  expect(result.ok).toBe(true);
  expect((result.affected??0)+(result.skipped??0)).toBe(250);
  expect(world.jobs.filter(job=>job.kind==='wall')).toHaveLength(result.affected!);
  expect(preview).toHaveLength(result.affected!);
  expect(validateWorld(world)).toEqual([]);
  console.info(`Tracé 250² : aperçu ${previewDuration.toFixed(1)} ms, commande ${duration.toFixed(1)} ms pour 250 cases, ${result.affected} plans, ${result.skipped} ignorées.`);
});
