import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {penRegion} from '../src/sim/animal-pens.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';

test('prepared V119 enclosure is discoverable, exact and genuinely leads the owned deer',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/test-saves/manifest.json',import.meta.url),'utf8')) as {saves:{id:string;sha256:string;release:string}[]};
  const entry=manifest.saves.find(s=>s.id==='enclos-v119');expect(entry?.release).toBe('v119');
  const raw=readFileSync(new URL('../public/test-saves/v119/enclos.json',import.meta.url),'utf8');
  expect(createHash('sha256').update(raw).digest('hex')).toBe(entry?.sha256);
  const world=deserializeWorld(raw),copy=deserializeWorld(raw);
  expect(validateWorld(world)).toEqual([]);
  const marker=world.structures.find(s=>s.kind==='pen-marker')!,deer=world.wildlife!.animals.find(a=>!!a.domestic)!;
  expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:true});
  expect(penRegion(world,marker.id)?.cells.has(deer.z*world.width+deer.x)).toBe(false);
  for(let i=0;i<200&&!penRegion(world,marker.id)?.cells.has(deer.z*world.width+deer.x);i++){
    stepWorld(world);stepWorld(copy);
  }
  expect(penRegion(world,marker.id)?.cells.has(deer.z*world.width+deer.x)).toBe(true);
  expect(serializeWorld(copy)).toBe(serializeWorld(world));
  expect(validateWorld(world)).toEqual([]);
});
