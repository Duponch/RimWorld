import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';

test('prepared V120 colony is discoverable, hashes exactly and resumes both physical harvests',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/test-saves/manifest.json',import.meta.url),'utf8')) as {
    saves:{id:string;release:string;filename:string;sha256:string;prepared:boolean}[];
  };
  const entry=manifest.saves.find(s=>s.id==='produits-animaux-v120');
  expect(entry).toMatchObject({release:'v120',filename:'produits-animaux.json',prepared:true});
  const raw=readFileSync(new URL('../public/test-saves/v120/produits-animaux.json',import.meta.url),'utf8');
  expect(createHash('sha256').update(raw).digest('hex')).toBe(entry!.sha256);
  const world=deserializeWorld(raw);
  expect(validateWorld(world)).toEqual([]);
  const camel=world.wildlife!.animals.find(a=>a.species==='dromedary')!;
  const muffalo=world.wildlife!.animals.find(a=>a.species==='muffalo')!;
  expect(camel).toMatchObject({sex:'female',domestic:{productFullness:.99999}});
  expect(muffalo.domestic?.productFullness).toBe(.99999);
  const fire=world.structures.find(s=>s.kind==='campfire')!;
  const tailoring=world.structures.find(s=>s.kind==='crafting-spot')!;
  expect(fire.fuel?.ticks).toBeGreaterThan(0);
  expect(fire.bills?.[0]).toMatchObject({recipe:'simple-meal',destination:'drop',filters:{milk:true,berries:false}});
  expect(tailoring.bills?.[0]).toMatchObject({recipe:'tribalwear',destination:'drop',filters:{'muffalo-wool':true,cloth:false}});
  expect(world.piles.some(p=>p.item==='milk'||p.item==='muffalo-wool')).toBe(false);
  let checkpoint:World|undefined;
  for(let i=0;i<500;i++){
    stepWorld(world);
    if(!checkpoint&&world.pawns.some(p=>p.animalHandling?.kind==='milk'||p.animalHandling?.kind==='shear')){
      checkpoint=deserializeWorld(serializeWorld(world));
      expect(validateWorld(checkpoint)).toEqual([]);
    }else if(checkpoint)stepWorld(checkpoint);
    if(world.piles.some(p=>p.item==='milk')&&world.piles.some(p=>p.item==='muffalo-wool'))break;
  }
  expect(checkpoint).toBeDefined();
  expect(world.piles.filter(p=>p.item==='milk').reduce((n,p)=>n+p.quantity,0)).toBe(18);
  expect(world.piles.filter(p=>p.item==='muffalo-wool').reduce((n,p)=>n+p.quantity,0)).toBe(120);
  expect(camel.domestic?.productFullness).toBeLessThan(.01);
  expect(muffalo.domestic?.productFullness).toBeLessThan(.01);
  for(let i=0;i<3000&&(!world.piles.some(p=>p.item==='simple-meal')||!world.piles.some(p=>p.item==='muffalo-wool-tribalwear'));i++){
    stepWorld(world);stepWorld(checkpoint!);
  }
  expect(world.piles.some(p=>p.item==='simple-meal')).toBe(true);
  const garment=world.piles.find(p=>p.item==='muffalo-wool-tribalwear');
  expect(garment?.apparel?.material).toBe('muffalo-wool');
  expect(world.piles.filter(p=>p.item==='milk').reduce((n,p)=>n+p.quantity,0)).toBe(8);
  expect(world.piles.filter(p=>p.item==='muffalo-wool').reduce((n,p)=>n+p.quantity,0)).toBe(60);
  expect(fire.bills?.[0]?.target).toBe(0);
  expect(tailoring.bills?.[0]?.target).toBe(0);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(checkpoint!)).toBe(serializeWorld(world));
});
