import {afterEach,expect,test,vi} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459';
import * as beds from '../src/sim/actor-bed-local-256';
import * as rest from '../src/sim/animal-rest';
import {animalNutritionMax} from '../src/sim/animal-life';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation';
import {advanceWorldCore297} from '../src/sim/engine';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {delayAnimalImpact} from '../src/sim/wildlife-health';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import type {AnimalRestContext} from '../src/sim/animal-rest';

afterEach(()=>vi.restoreAllMocks());
// Existing declared32² fixture and one original Labrador. Setup is explicit,
// before the first played Core; no campaign, natural training or taming claim.
function camp(withSpot:boolean){
 const f=animalHaulingCamp459(),{world:w,animal:a,handler}=f;
 for(const key of Object.keys(handler.priorities)as(keyof typeof handler.priorities)[])handler.priorities[key]=0;
 a.rest=.2;a.food=animalNutritionMax(a)*.95;a.nextDecision=w.tick;
 if(!withSpot){beds.forgetLocalActorBed256(w,a);w.structures=w.structures.filter(s=>s.kind!=='animal-sleeping-spot');}
 expect(effectiveCore297(w)).toBe(0);expect(a.motion).toBeUndefined();expect(a.path).toEqual([]);expect(validateWorld(w)).toEqual([]);
 return f;
}
function context(f:ReturnType<typeof camp>){
 const {world:w,animal:a}=f;let nav:ReturnType<typeof animalNavigation>|undefined,searches=0;
 const read=()=>nav??=animalNavigation(w);
 const ctx:AnimalRestContext={medicalRest:false,night:false,nutrition:animalNutritionMax(a),
  free:c=>read().free(c),step:(from,to)=>read().step(from,to),
  route:(goals,rank)=>{searches++;return read().route(a,goals,rank);},move:()=>{moveAnimal(w,a,read().step);}};
 return{ctx,searches:()=>searches};
}

test('no animal place means no global bed census, search, RNG, clock or property mutation',()=>{
 const f=camp(false),{world:w,animal:a}=f,h=context(f),before=serializeWorld(w),rng=[w.rng,w.wildlife!.rng],core=effectiveCore297(w),id=w.nextId;
 const capture=vi.spyOn(beds,'captureActorBeds256');
 expect(rest.processAnimalRest(w,a,h.ctx)).toBe(false);expect(capture).not.toHaveBeenCalled();expect(h.searches()).toBe(0);capture.mockRestore();
 expect(serializeWorld(w)).toBe(before);expect([w.rng,w.wildlife!.rng]).toEqual(rng);expect(effectiveCore297(w)).toBe(core);expect(w.nextId).toBe(id);
});

test('any actual animal place retains the original owner census, rank/search and actual bed claim',()=>{
 const f=camp(true),{world:w,animal:a,handler}=f,h=context(f),piles=JSON.stringify(w.piles),packed=JSON.stringify(w.packed),humanBed=handler.bedId,rng=[w.rng,w.wildlife!.rng],id=w.nextId;
 const capture=vi.spyOn(beds,'captureActorBeds256');
 expect(rest.processAnimalRest(w,a,h.ctx)).toBe(true);expect(capture).toHaveBeenCalled();capture.mockRestore();
 expect(h.searches()).toBe(1);expect(a.animalRest).toEqual({spotId:f.spotId,phase:'travel'});expect(a.domestic!.bedId).toBe(f.spotId);expect(a.motion).toBeDefined();expect(a.path.at(-1)).toEqual({x:12,z:19});
 expect(JSON.stringify(w.piles)).toBe(piles);expect(JSON.stringify(w.packed)).toBe(packed);expect(handler.bedId).toBe(humanBed);expect([w.rng,w.wildlife!.rng]).toEqual(rng);expect(w.nextId).toBe(id);expect(effectiveCore297(w)).toBe(0);expect(validateWorld(w)).toEqual([]);
});

test('a present place preserves the explicit contradictory-identity failure and does not mutate malformed input',()=>{
 const f=camp(true),{world:w,animal:a,handler}=f,h=context(f),spot=w.structures.find(s=>s.id===f.spotId)!;
 // Declared invalid input, never passed to Engine or serialized as a save.
 spot.id=handler.id;const before=JSON.stringify(w);expect(validateWorld(w).length).toBeGreaterThan(0);
 expect(()=>rest.processAnimalRest(w,a,h.ctx)).toThrow('Distinct actor/bed originals share an identity');expect(JSON.stringify(w)).toBe(before);expect(h.searches()).toBe(0);
});

test('actual Core45 stun expires before the first macro50 rest decision without any cadence change',()=>{
 const f=camp(false),{world:w,animal:a}=f;
 delayAnimalImpact(a,effectiveCore297(w),true,45);expect(a.stun?.untilCore).toBe(45);expect(a.stun!.untilCore-a.stun!.sinceCore).toBe(45);expect(validateWorld(w)).toEqual([]);
 const decisions=vi.spyOn(rest,'processAnimalRest');
 const calls=()=>decisions.mock.calls.filter(([,animal])=>animal.id===a.id).length;
 for(let next=1;next<=40;next++)expect(advanceWorldCore297(w).core).toBe(next);
 expect(a.stun?.untilCore).toBe(45);expect(calls()).toBe(0);expect(a.animalRest).toBeUndefined();
 for(let next=41;next<=44;next++)expect(advanceWorldCore297(w).core).toBe(next);
 expect(a.stun?.untilCore).toBe(45);expect(calls()).toBe(0);
 expect(advanceWorldCore297(w).core).toBe(45);expect(a.stun).toBeUndefined();expect(calls()).toBe(0);expect(w.phaseCore297).toBe(5);
 for(let next=46;next<=49;next++)expect(advanceWorldCore297(w).core).toBe(next);
 expect(a.stun).toBeUndefined();expect(calls()).toBe(0);expect(a.animalRest).toBeUndefined();
 expect(advanceWorldCore297(w).core).toBe(50);expect(calls()).toBe(1);decisions.mockRestore();
 expect([w.tick,w.phaseCore297]).toEqual([5,0]);expect(a.state).toBe('sleeping');expect(a.animalRest).toBeUndefined();expect(a.motion).toBeUndefined();expect(validateWorld(w)).toEqual([]);
 const final=serializeWorld(w);expect(serializeWorld(deserializeWorld(final))).toBe(final);
});
