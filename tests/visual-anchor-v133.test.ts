import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { pileParts,type PileBundle } from '../src/render/pile-parts';
import { electricalParts } from '../src/render/electrical-parts';
import { fixturePower } from './scenarios/power';

function paintedBounds(bundle:PileBundle):{x:number;z:number} {
  const parts=pileParts([bundle]);
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const part of parts){
    const angle=part.ry??0,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
    const halfX=(c*(part.sx??1)+s*(part.sz??1))/2;
    const halfZ=(s*(part.sx??1)+c*(part.sz??1))/2;
    minX=Math.min(minX,part.x-halfX);maxX=Math.max(maxX,part.x+halfX);
    minZ=Math.min(minZ,part.z-halfZ);maxZ=Math.max(maxZ,part.z+halfZ);
  }
  return {x:(minX+maxX)/2,z:(minZ+maxZ)/2};
}

test('loose piles of different shapes stay visually centred in their owning cell',()=>{
  const examples:Pick<PileBundle,'kind'|'item'|'quantity'>[]=[
    {kind:'food',item:'simple-meal',quantity:5},
    {kind:'food',item:'berries',quantity:20},
    {kind:'wood',item:'wood',quantity:75},
    {kind:'steel',item:'steel',quantity:50},
    {kind:'blocks',item:'granite-blocks',quantity:75},
    {kind:'chunk',item:'granite-chunk',quantity:1},
    {kind:'apparel',item:'cloth-shirt',quantity:1},
    {kind:'weapon',item:'bolt-action-rifle',quantity:1},
    {kind:'medicine',item:'medicine',quantity:10},
  ];
  for(const example of examples){
    const center=paintedBounds({...example,x:12,z:9,supplied:false});
    expect(center.x,example.item).toBeCloseTo(12,5);
    expect(center.z,example.item).toBeCloseTo(9,5);
  }
});

test('wood generator slats sit fully on its smaller front housing',()=>{
  const world=createWorld();fixturePower(world,'wood-generator',12,12);
  const parts=electricalParts(world);
  const housing=parts.find(part=>part.color===0x596c68)!;
  const slats=parts.filter(part=>part.color===0x9eab97);
  expect(slats).toHaveLength(3);
  for(const slat of slats){
    expect(slat.x-(slat.sx??1)/2).toBeGreaterThan(housing.x-(housing.sx??1)/2);
    expect(slat.x+(slat.sx??1)/2).toBeLessThan(housing.x+(housing.sx??1)/2);
    expect(slat.z-(slat.sz??1)/2).toBeGreaterThan(housing.z-(housing.sz??1)/2);
    expect(slat.z+(slat.sz??1)/2).toBeLessThan(housing.z+(housing.sz??1)/2);
  }
});
