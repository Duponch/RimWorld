import { expect,test } from 'vitest';
import type { InterleavedBufferAttribute } from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { createMedicalRecord } from '../src/sim/injury-state';
import { ANIMAL_SPECIES_IDS,type AnimalSpeciesId } from '../src/sim/animal-species';
import { adultAgeTicks } from '../src/sim/animal-life';
import type { CorpseState } from '../src/sim/corpses';
import { corpseVisualMask,corpseVisualPartBit } from '../src/render/corpse-presentation';
import { hareGeometry } from '../src/render/hare-geometry';
import { PawnLayer } from '../src/render/PawnLayer';

function body(species:AnimalSpeciesId):CorpseState {
  return {animalId:900,sex:'female',species,ageTicks:adultAgeTicks(species),
    health:{...createMedicalRecord(10),body:species,death:{tick:10,cause:'blood-loss'}}};
}

function visibleParts(corpse:CorpseState):number[] {
  const geometry=hareGeometry(1,corpse.species),bits=geometry.getAttribute('corpsePartMask'),mask=corpseVisualMask(corpse);
  const visible=Array.from({length:bits.count},(_,i)=>bits.getX(i)).filter(bit=>Math.floor(mask/Math.max(1,bit))%2===0);geometry.dispose();return visible;
}
test('the animal rig removes consumed subtrees without changing the frozen ante-mortem record',()=>{
  for(const species of ANIMAL_SPECIES_IDS){
    const corpse=body(species),history=structuredClone(corpse.health),whole=visibleParts(corpse);
    const head=corpseVisualPartBit('head'),jaw=corpseVisualPartBit('jaw'),eye=corpseVisualPartBit('left-eye');
    expect(whole.includes(head)).toBe(true);
    corpse.consumedParts=[{part:'head',atTick:11}];
    const rest=visibleParts(corpse);
    expect(rest.length).toBeLessThan(whole.length);
    expect(rest.some(part=>[head,jaw,eye].includes(part))).toBe(false);
    expect(rest.includes(corpseVisualPartBit('torso'))).toBe(true);
    expect(corpse.health).toEqual(history);
  }
  const corpse=body('hare');corpse.consumedParts=[{part:'left-front-paw',atTick:11}];
  const rest=visibleParts(corpse);
  expect(rest.includes(corpseVisualPartBit('left-front-leg'))).toBe(true);
  expect(rest.includes(corpseVisualPartBit('left-front-paw'))).toBe(false);
});

test('the resident species rig uses exact anatomical bits for carried and ground bodies',()=>{
  for(const species of ANIMAL_SPECIES_IDS){
    const geometry=hareGeometry(1,species),bit=geometry.getAttribute('corpsePartMask');
    const normal=geometry.getAttribute('normal'),position=geometry.getAttribute('position');
    expect(bit.count).toBe(position.count);expect(normal.count).toBe(position.count);
    expect((bit as InterleavedBufferAttribute).data).toBe((position as InterleavedBufferAttribute).data);
    const corpse=body(species);corpse.consumedParts=[{part:'head',atTick:11},{part:'left-front-leg',atTick:12}];
    const mask=corpseVisualMask(corpse),word=Math.fround(-1-mask);
    expect(-word-1).toBe(mask);
    const carried=new Set<number>();
    for(let i=0;i<bit.count;i++){
      const part=bit.getX(i);
      if(Math.floor((-word-1)/Math.max(part,1))%2===0)carried.add(part);
      expect(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))).toBeCloseTo(1,6);
    }
    expect(carried.has(corpseVisualPartBit('head'))).toBe(false);
    expect(carried.has(corpseVisualPartBit('left-front-leg'))).toBe(false);
    expect(carried.has(corpseVisualPartBit('torso'))).toBe(true);
    geometry.dispose();
  }
  expect(Math.fround(-1-(2**23-1))).toBe(-(2**23));
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
