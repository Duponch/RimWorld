import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297,effectiveLocal297} from '../src/sim/core-phase-297.ts';
import {newDoorState,doorMotionTicks,doorOpenness} from '../src/sim/door-rules.ts';
import {animalNavigation} from '../src/sim/wildlife-navigation.ts';
import {setAnimalTrainingWanted282} from '../src/sim/animal-training-282.ts';
import {animalNutritionMax} from '../src/sim/animal-life.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {Structure} from '../src/sim/types.ts';

test('a real haul edge entering a completed door at Core5 retains its own Whole Snapshot and resident',()=>{
 const {world:w,animal:a,handler,kibbleId}=animalHaulingCamp459();
 for(const key of Object.keys(handler.priorities)as(keyof typeof handler.priorities)[])handler.priorities[key]=0;
 expect(setAnimalTrainingWanted282(w,a.id,'haul',true).ok).toBe(true);
 // Declared learned tracker and pre-existing pickup intent before Core0.
 // The source60 remains ground property; no lesson, pickup, random hauling
 // opportunity or door-opening command is claimed to have been played.
 a.training!.obedience={steps:3,learned:true,wanted:true};a.training!.haul={steps:7,learned:true,wanted:true};
 a.training!.lastHaulCheckCore=0;a.food=animalNutritionMax(a)*.8;a.rest=1;
 const target={x:11,z:12},door:Structure={id:w.nextId++,kind:'door',material:'wood',...target,orientation:0,footprint:'standard',door:newDoorState(0)};
 Object.assign(door.door!,{open:true,from:1-.5/doorMotionTicks(door),changedAt:0,closeAt:11.5});w.structures.push(door);
 const source=w.piles.find(p=>p.id===kibbleId)!;expect(source.owner).toEqual({type:'ground',x:8,z:12});expect(source.quantity).toBe(60);
 if(source.owner.type!=='ground')throw Error('Initial finite source is not on the ground');
 a.haul={sourcePileId:source.id,quantity:10,phase:'pickup',destination:{type:'stockpile',stockpileId:w.stockpiles[0]!.id},carryPileId:null,startedAtCore:0};
 const planned=animalNavigation(w).haulSearch(a).pathTo(source.owner);expect(planned?.[0]).toEqual(target);
 a.path=planned!;a.state='moving';a.nextDecision=0;expect(validateWorld(w)).toEqual([]);
 const initialRng=w.rng,initialAnimalRng=w.wildlife!.rng,initialNextId=w.nextId;
 for(let i=1;i<=4;i++){expect(advanceWorldCore297(w).core).toBe(i);expect(a.motion).toBeUndefined();}
 expect(doorOpenness(door,effectiveLocal297(w))).toBeLessThan(1);
 expect(advanceWorldCore297(w).core).toBe(5);expect(effectiveCore297(w)).toBe(5);expect(w.tick).toBe(0);
 expect(doorOpenness(door,effectiveLocal297(w))).toBe(1);expect(doorOpenness(door,w.tick)).toBeLessThan(1);
 expect(a.motion?.from).toEqual({x:12,z:12});expect(a.motion?.to).toEqual(target);expect(a.motion?.start).toBe(.5);
 expect(a.haul?.phase).toBe('pickup');expect(source.owner).toEqual({type:'ground',x:8,z:12});expect(source.quantity).toBe(60);
 expect([w.rng,w.wildlife!.rng,w.nextId]).toEqual([initialRng,initialAnimalRng,initialNextId]);expect(validateWorld(w)).toEqual([]);
 const edge=structuredClone(a.motion),raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);
 const packet=structuredClone(new SnapshotEncoder().encode(w,0,0));
 const decoded=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(decoded.status,decoded.status==='resync'?decoded.reason:'snapshot').toBe('applied');
 expect(resident.status,resident.status==='resync'?resident.reason:'resident').toBe('applied');
 if(decoded.status!=='applied'||resident.status!=='applied')throw Error('Completed physical animal door rejected by transport');
 expect(decoded.world.wildlife!.animals.find(row=>row.id===a.id)!.motion).toEqual(edge);expect(resident.world).toEqual(decoded.world);
 for(let i=0;i<2;i++){advanceWorldCore297(w);advanceWorldCore297(loaded);expect(serializeWorld(loaded)).toBe(serializeWorld(w));}
});
