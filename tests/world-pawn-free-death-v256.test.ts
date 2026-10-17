import {describe,it,expect} from 'vitest';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {medicalBleedUnits} from '../src/sim/injury-state';
import {prepareWorldPawnLife256} from '../src/sim/world-pawn-life-256';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {worldPawnSituation256} from '../src/sim/world-pawn-capture-256';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256';

/** Declared scalar/animal fixture at the next actual bleeding phase, not a
 * played Camp, MapRemoved proof or whole-World checkpoint. No forced death. */
function preparedBleedingOwner(){
 const actor:WildAnimal={id:17,species:'hare',sex:'female',ageTicks:1000000,x:1,z:1,food:.1,rest:.8,state:'downed',path:[],nextDecision:101};
 attachGeneratedAnimalGrowth256(actor,1000,256);
 const h=actor.health=createAnimalMedicalRecord256({schemaVersion:256,tick:100},actor);
 h.injuries.push({id:1,part:'torso',kind:'cut',severity:1000,bornAt:100});h.nextInjuryId=2;h.bloodLoss=BLOOD_UNIT-1;
 const row:WorldPawnOwner256={kind:'animal',actor,factionId:null,originMapId:0,context:{seed:7,width:32,height:32},clockCore:1000,enteredAtAbsCore:101000,mode:'active',items:[],packed:[],free:true,everSeenByPlayer:true};
 const state:WorldPawnsState256={revision:1,atCore:1000,lastSuccessfulCore:0,currentRate:1,owners:[row]},rng={rng:123};
 expect(h.death).toBeUndefined();expect(medicalBleedUnits(h)).toBeGreaterThanOrEqual(BLOOD_UNIT/10000);
 expect(101%6).toBe(actor.id%6);expect(validWorldPawnsEnvelope256({worldPawns:state},256,1000,100)).toBe(true);
 return {actor,row,state,rng};
}

describe('actual Free authority adopted with clinical death',()=>{
 it('prepares without effects, commits the same original, and resumes its strict terminal envelope outside Free',()=>{
  const {actor,row,state,rng}=preparedBleedingOwner(),before=JSON.stringify({state,rng});
  const plan=prepareWorldPawnLife256(state,1010,rng);if(!plan.ok)throw Error(plan.reason);
  expect(JSON.stringify({state,rng})).toBe(before);plan.commit();
  expect(state.owners[0]).toBe(row);expect(row.actor).toBe(actor);
  expect(actor.health!.death).toEqual({tick:101,cause:'blood-loss'});expect(actor.state).toBe('dead');expect(row.mode).toBe('dead');
  expect(row.clockCore).toBe(1010);expect(Object.hasOwn(row,'free')).toBe(false);expect(row.everSeenByPlayer).toBe(true);
  expect(worldPawnSituation256(row)).toBe('Dead');expect(validWorldPawnsEnvelope256({worldPawns:state},256,1010,100)).toBe(true);
  // The same envelope reader is used by RAW/MAIN. This is a serialized owner
  // restart, not an assertion that an entire campaign Decoder was executed.
  const restarted=JSON.parse(JSON.stringify(state)) as WorldPawnsState256,deadBefore=JSON.stringify(restarted.owners[0]);
  expect(validWorldPawnsEnvelope256({worldPawns:restarted},256,1010,100)).toBe(true);
  const resumed=prepareWorldPawnLife256(restarted,1020,{rng:rng.rng});if(!resumed.ok)throw Error(resumed.reason);resumed.commit();
  expect(JSON.stringify(restarted.owners[0])).toBe(deadBefore);expect(worldPawnSituation256(restarted.owners[0]!)).toBe('Dead');
  expect(validWorldPawnsEnvelope256({worldPawns:restarted},256,1020,100)).toBe(true);
  const forged=structuredClone(restarted);forged.owners[0]!.free=true;
  expect(validWorldPawnsEnvelope256({worldPawns:forged},256,1020,100)).toBe(false);
  expect(validWorldPawnsEnvelope256({worldPawns:restarted},255,1020,100)).toBe(false);
 });
 it('refuses a nonconfigurable actual Free recipient without changing actor, registry or RNG',()=>{
  const {actor,row,state,rng}=preparedBleedingOwner();Object.defineProperty(row,'free',{value:true,enumerable:true,writable:true,configurable:false});
  const before=JSON.stringify({state,rng});expect(prepareWorldPawnLife256(state,1010,rng)).toMatchObject({ok:false});
  expect(JSON.stringify({state,rng})).toBe(before);expect(row.actor).toBe(actor);expect(actor.health!.death).toBeUndefined();
 });
 it('rechecks the same recipient after preparation before the first actual actor or RNG effect',()=>{
  const {actor,row,state,rng}=preparedBleedingOwner(),plan=prepareWorldPawnLife256(state,1010,rng);if(!plan.ok)throw Error(plan.reason);
  Object.defineProperty(row,'free',{value:true,enumerable:true,writable:true,configurable:false});const before=JSON.stringify({state,rng});
  expect(()=>plan.commit()).toThrow('Stale WorldPawn life transaction');expect(JSON.stringify({state,rng})).toBe(before);
  expect(row.actor).toBe(actor);expect(actor.health!.death).toBeUndefined();expect(state.atCore).toBe(1000);
 });
});
