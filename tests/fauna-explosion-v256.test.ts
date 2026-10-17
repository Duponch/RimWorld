import {expect,test} from 'vitest';
import {huntingCamp} from './scenarios/hunting';
import {adultAgeTicks,juvenileAgeTicks} from '../src/sim/animal-life';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {damageAnimalWithBullet,commitAnimalImpact,advanceAnimalHealth} from '../src/sim/wildlife-health';
import {animalDeathExplosionRadius256,validAnimalDeathExplosionOwner256} from '../src/sim/animal-death-provenance-v256';
import {validBombWaveShape,validateBombWaves} from '../src/sim/bomb-state';
import {advanceCorpses} from '../src/sim/corpses';
import type {World} from '../src/sim/types';
function scene(species:'boomalope'|'boomrat'='boomalope',age=adultAgeTicks(species)){
 const w=huntingCamp(),a=w.wildlife!.animals[0]!;w.schemaVersion=256 as World['schemaVersion'];w.tick=100;
 w.piles=[];w.structures=[];w.jobs=[];w.resources=[];for(const t of w.tiles)t.terrain='soil';
 w.wildlife!.animals=[a];a.species=species;a.ageTicks=age;a.state='idle';a.path=[];a.x=10;a.z=10;a.food=1;a.rest=1;delete a.health;delete a.motion;
 return {w,a};
}
test('actual fatal projectile emits exactly one Flame wave from the clinical corpse; conversion retains provenance',()=>{
 const {w,a}=scene();damageAnimalWithBullet(w,a,{part:'heart',damage:1000});expect(a.state).toBe('dead');expect(w.bombWaves).toHaveLength(1);
 const wave=w.bombWaves![0]!;expect(wave.sourceId).toBe(a.id);expect(wave.animalDeath).toEqual({species:'boomalope',lifeStage:'adult',deathTick:w.tick});expect(animalDeathExplosionRadius256(wave.animalDeath!)).toBe(4.9);
 expect(validBombWaveShape(wave,256)).toBe(true);const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toEqual([]);
 advanceCorpses(w);expect(w.piles.some(p=>p.id===a.id&&p.corpse?.health.death)).toBe(true);expect(validAnimalDeathExplosionOwner256(w,wave)).toBe(true);
 advanceAnimalHealth(w,a);expect(w.bombWaves).toHaveLength(1);
});
test('baby, juvenile and small death profiles derive radii; ExecutionCut is no exemption',()=>{
 for(const [species,age,radius] of [['boomalope',0,1.9],['boomalope',juvenileAgeTicks('boomalope'),2.9],['boomrat',adultAgeTicks('boomrat'),1.9]] as const){
  const {w,a}=scene(species,age),record=createAnimalMedicalRecord256(w,a);record.death={tick:w.tick,cause:'execution'};
  commitAnimalImpact(w,a,record,{rng:w.rng});expect(animalDeathExplosionRadius256(w.bombWaves![0]!.animalDeath!)).toBe(radius);
 }
});
test('ID exhaustion refuses the fatal transaction before medical death or combat RNG changes',()=>{
 const {w,a}=scene();w.nextId=Number.MAX_SAFE_INTEGER;const before=structuredClone(w);
 expect(()=>damageAnimalWithBullet(w,a,{part:'heart',damage:1000})).toThrow('Cannot reserve animal death explosion');expect(w).toEqual(before);
});
test('carried death never emits now or at later corpse deposit; bootstrap of a dead source never replays',()=>{
 const {w,a}=scene();w.pawns[0]!.animalRescue={animalId:a.id,spotId:1,phase:'carry'};
 damageAnimalWithBullet(w,a,{part:'heart',damage:1000});expect(a.state).toBe('dead');expect(w.bombWaves).toBeUndefined();
 delete w.pawns[0]!.animalRescue;advanceAnimalHealth(w,a);advanceCorpses(w);expect(w.bombWaves).toBeUndefined();
 const resumed=structuredClone(w);for(const dead of resumed.wildlife?.animals??[])advanceAnimalHealth(resumed,dead);expect(resumed.bombWaves).toBeUndefined();
});
test('strict wave proof rejects future fields, aliases and false current owners while permitting retired source',()=>{
 const {w,a}=scene();damageAnimalWithBullet(w,a,{part:'heart',damage:1000});const wave=w.bombWaves![0]!;
 expect(validBombWaveShape(wave,255)).toBe(false);expect(validBombWaveShape({...wave,shortCircuit:undefined},256)).toBe(false);expect(validBombWaveShape({...wave,animalDeath:undefined},256)).toBe(false);
 expect(validAnimalDeathExplosionOwner256(w,{...wave,animalDeath:{...wave.animalDeath!,lifeStage:'baby'}})).toBe(false);
 w.wildlife!.animals=[];expect(validAnimalDeathExplosionOwner256(w,wave)).toBe(true);
 const other=w.pawns[0]!;other.id=wave.sourceId;expect(validAnimalDeathExplosionOwner256(w,wave)).toBe(false);
});
