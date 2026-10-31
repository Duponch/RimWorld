import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {delayAnimalImpact} from '../src/sim/wildlife-health.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {travelEnd} from '../src/sim/travel-timing.ts';
import {validWildlifeMotionTiming} from '../src/sim/wildlife-save.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

for(const encoding of ['historical-terrain','current-codec']as const)test('actual420Core impact retains '+encoding+' edge through real phase7 Whole and transport',()=>{
 const w=deconstructionCamp(1,32);enableWildlife(w,0);
 for(const p of w.pawns){p.schedule.fill('anything');p.recreation.level=100;for(const key of Object.keys(p.priorities)as(keyof typeof p.priorities)[])p.priorities[key]=0;}
 const a:WildAnimal={id:w.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),x:4,z:5,food:.1,rest:1,state:'moving',path:[{x:5,z:5},{x:6,z:5}],nextDecision:100};
 a.food=animalNutritionMax(a)*.8;w.wildlife!.animals.push(a);
 if(encoding==='current-codec'){const n=animalNavigation(w);expect(moveAnimal(w,a,n.step)).toBe(true);expect(a.motion?.terrainDelay).toBe(0);}
 else{
  // A historical edge is declared before play, using the retained equation.
  a.x=5;a.path=[{x:6,z:5}];a.motion={from:{x:4,z:5},to:{x:5,z:5},start:0,end:3.2,speedFactor:1,terrainDelay:.2};
 }
 expect(validateWorld(w)).toEqual([]);const captured={speedFactor:a.motion!.speedFactor,terrainDelay:a.motion!.terrainDelay,from:structuredClone(a.motion!.from),to:structuredClone(a.motion!.to),start:a.motion!.start};
 delayAnimalImpact(a,effectiveCore297(w),true,420);expect(a.stun).toEqual({sinceCore:0,untilCore:420});
 for(let i=1;i<=7;i++)expect(advanceWorldCore297(w).core).toBe(i);
 expect([w.tick,w.phaseCore297]).toEqual([0,7]);expect(a.motion!.stuns).toEqual([{start:0,end:42}]);
 expect({speedFactor:a.motion!.speedFactor,terrainDelay:a.motion!.terrainDelay,from:a.motion!.from,to:a.motion!.to,start:a.motion!.start}).toEqual(captured);
 const edge=structuredClone(a.motion),before=JSON.stringify(a.motion);expect(validateWorld(w)).toEqual([]);
 expect(validWildlifeMotionTiming(w.tick,298,a,a.motion!,7)).toBe(true);expect(JSON.stringify(a.motion)).toBe(before);
 expect(validWildlifeMotionTiming(w.tick,296,a,a.motion!)).toBe(false);
 const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);
 const packet=structuredClone(new SnapshotEncoder().encode(w,0,0)),decoded=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(decoded.status,decoded.status==='resync'?decoded.reason:'snapshot').toBe('applied');expect(resident.status,resident.status==='resync'?resident.reason:'resident').toBe('applied');
 if(decoded.status!=='applied'||resident.status!=='applied')throw Error('Actual long animal stun refused by transport');
 expect(decoded.world.wildlife!.animals.find(row=>row.id===a.id)!.motion).toEqual(edge);expect(resident.world).toEqual(decoded.world);
 //421 futureCore exceeds the SAME actual producer/animal stun horizon420.
 const bad=structuredClone(w),other=bad.wildlife!.animals.find(row=>row.id===a.id)!;
 other.stun={sinceCore:0,untilCore:428};other.motion!.stuns=[{start:0,end:42.8}];other.motion!.end=travelEnd(other.motion!);
 expect(validWildlifeMotionTiming(bad.tick,298,other,other.motion!,7)).toBe(false);
 expect(validateWorld(bad)).toContain('Invalid animal stun.');expect(validateWorld(bad)).toContain('Invalid wildlife motion.');
 for(let i=0;i<2;i++){advanceWorldCore297(w);advanceWorldCore297(loaded);expect(serializeWorld(loaded)).toBe(serializeWorld(w));}
 expect(a.motion).toEqual(edge);
});
