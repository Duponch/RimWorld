import { expect,test } from 'vitest';
import type { InterleavedBufferAttribute } from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { createMedicalRecord } from '../src/sim/injury-state';
import { ANIMAL_SPECIES_IDS,type AnimalSpeciesId } from '../src/sim/animal-species';
import { adultAgeTicks } from '../src/sim/animal-life';
import type { CorpseState } from '../src/sim/corpses';
import { corpseParts,corpseVisualMask,corpseVisualPartBit } from '../src/render/corpse-presentation';
import { cargoGeometry } from '../src/render/pawn-geometry';
import { BIOME_CARGO } from '../src/render/biome-cargo';
import { PawnLayer } from '../src/render/PawnLayer';

function body(species:AnimalSpeciesId):CorpseState {
  return {animalId:900,sex:'female',species,ageTicks:adultAgeTicks(species),
    health:{...createMedicalRecord(10),body:species,death:{tick:10,cause:'blood-loss'}}};
}

test('ground proxy removes consumed subtrees without changing the frozen ante-mortem record',()=>{
  for(const species of ANIMAL_SPECIES_IDS){
    const corpse=body(species),history=structuredClone(corpse.health),whole=corpseParts(3,4,'fresh',0,species,corpse);
    const head=corpseVisualPartBit('head'),jaw=corpseVisualPartBit('jaw'),eye=corpseVisualPartBit('left-eye');
    expect(whole.some(p=>p.corpsePartMask===head)).toBe(true);
    corpse.consumedParts=[{part:'head',atTick:11}];
    const rest=corpseParts(3,4,'fresh',0,species,corpse);
    expect(rest.length).toBeLessThan(whole.length);
    expect(rest.some(p=>[head,jaw,eye].includes(p.corpsePartMask))).toBe(false);
    expect(rest.some(p=>p.corpsePartMask===corpseVisualPartBit('torso'))).toBe(true);
    expect(corpse.health).toEqual(history);
  }
  const corpse=body('hare');corpse.consumedParts=[{part:'left-front-paw',atTick:11}];
  const rest=corpseParts(0,0,'fresh',0,'hare',corpse);
  expect(rest.some(p=>p.corpsePartMask===corpseVisualPartBit('left-front-leg'))).toBe(true);
  expect(rest.some(p=>p.corpsePartMask===corpseVisualPartBit('left-front-paw'))).toBe(false);
});

test('carried body uses the same absence bits in one static vertex stream and exact float32 cargo word',()=>{
  const geometry=cargoGeometry(),kind=geometry.getAttribute('cargoKind'),bit=geometry.getAttribute('corpsePartMask');
  const normal=geometry.getAttribute('normal'),position=geometry.getAttribute('position');
  expect(bit.count).toBe(position.count);expect(normal.count).toBe(position.count);
  expect((bit as InterleavedBufferAttribute).data).toBe((position as InterleavedBufferAttribute).data);
  for(const species of ANIMAL_SPECIES_IDS){
    const corpse=body(species);corpse.consumedParts=[{part:'head',atTick:11},{part:'left-front-leg',atTick:12}];
    const mask=corpseVisualMask(corpse),word=Math.fround(-1-mask);
    expect(-word-1).toBe(mask);
    const expected=new Set(corpseParts(0,0,'fresh',0,species,corpse).map(p=>p.corpsePartMask));
    const carried=new Set<number>(),cargo=species==='hare'?27:BIOME_CARGO[`${species}-corpse`];
    for(let i=0;i<kind.count;i++){
      if(kind.getX(i)!==cargo)continue;
      const part=bit.getX(i);
      if(Math.floor((-word-1)/Math.max(part,1))%2===0)carried.add(part);
      expect(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))).toBeCloseTo(1,6);
    }
    expect(carried).toEqual(expected);
  }
  expect(Math.fround(-1-(2**23-1))).toBe(-(2**23));
  geometry.dispose();
});

test('same-tick adoption updates the real carried mask while presentation and pawn capacity stay resident',()=>{
  const world=createWorld(),pawn=world.pawns[0]!,corpse=body('red-fox');world.piles=[];
  world.piles.push({id:corpse.animalId,kind:'corpse',item:'red-fox-corpse',quantity:1,owner:{type:'pawn',pawnId:pawn.id},corpse});
  const layer=new PawnLayer();layer.update(world,1,false);
  const geometry=layer.feedbackSource!,cargo=geometry.getAttribute('aCargo'),before=structuredClone(world);
  corpse.consumedParts=[{part:'head',atTick:11}];
  layer.update(world,1,false);
  expect(layer.feedbackSource).toBe(geometry);expect(geometry.getAttribute('aCargo')).toBe(cargo);
  expect(cargo.getY(0)).toBe(-1-corpseVisualMask(corpse));
  expect(world.tick).toBe(before.tick);expect(world.piles[0]!.quantity).toBe(1);
  expect(corpse.health).toEqual(before.piles[0]!.corpse!.health);
  layer.dispose();
});
