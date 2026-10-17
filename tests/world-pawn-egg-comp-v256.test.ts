import {describe,it,expect} from 'vitest';
import {worldPawnEggTickCount256,worldPawnEggBoundary256} from '../src/sim/world-pawn-egg-comp-256';
import {prepareWorldPawnLife256,worldPawnActiveBoundary256} from '../src/sim/world-pawn-life-256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256';
const f=Math.fround;
// Independent literal per-Core predicate, rather than the new interval count
// or native delta predicate (the latter differs for negative remainders).
const oracle=(id:number,from:number)=>{const offset=(id^((169495093+2654435769+(id<<6)+(id>>2))|0))|0;let hits=0;for(let core=from+1;core<=from+10;core++)if(((((core|0)+offset)|0)%2500)===0)hits++;return hits;};
function hitWindow(id=17){for(let from=1000;from<6000;from+=10)if(oracle(id,from))return from;throw Error('Prepared hash hit missing');}
/** Declared marked scalar original, not a generated/played Camp. Adult stage
 * is deliberately stable. Real MapRemoved/whole campaign are not asserted. */
function fixture(from=hitWindow()){
 const actor:WildAnimal={id:17,species:'turkey',sex:'female',ageTicks:1000000,x:1,z:1,food:.1,rest:.8,state:'idle',path:[],nextDecision:from/10+1};
 attachGeneratedAnimalGrowth256(actor,from,256);actor.eggLayer={progress:0,fertilizations:1,fatherId:18};
 const row:WorldPawnOwner256={kind:'animal',actor,factionId:null,originMapId:0,context:{seed:7,width:32,height:32},clockCore:from,enteredAtAbsCore:1000000+from,mode:'active',free:true,everSeenByPlayer:true,items:[],packed:[]};
 const state:WorldPawnsState256={revision:1,atCore:from,lastSuccessfulCore:0,currentRate:1,owners:[row]},rng={rng:123};
 return {actor,row,state,rng,from};
}
describe('actual WorldPawn egg comp, source-only prepared cases',()=>{
 it('counts exact signed hash hits without the negative-remainder delta approximation',()=>{
  for(const id of [1,17,62500,2147483647])for(const from of [0,1000,2490,2147483640,2147483650,4294967290,4294967300,Number.MAX_SAFE_INTEGER-20])expect(worldPawnEggTickCount256(id,from,from+10)).toBe(oracle(id,from));
  const from=hitWindow();expect(worldPawnEggTickCount256(17,from,from+10)).toBe(1);
  expect(()=>worldPawnEggTickCount256(17,from,from+20)).toThrow();
 });
 it('stages real progress before age, retains fertilization/original/IDs and never creates an egg or consumes RNG',()=>{
  const {actor,row,state,rng,from}=fixture(),before=JSON.stringify({state,rng}),layer=actor.eggLayer!;
  expect(worldPawnActiveBoundary256(row)).toBeNull();const plan=prepareWorldPawnLife256(state,from+10,rng);if(!plan.ok)throw Error(plan.reason);
  expect(JSON.stringify({state,rng})).toBe(before);plan.commit();
  expect(row.actor).toBe(actor);expect(state.owners[0]).toBe(row);expect(actor.eggLayer!.progress).toBeGreaterThan(layer.progress);
  expect(f(actor.eggLayer!.progress)).toBe(actor.eggLayer!.progress);expect(actor.eggLayer).toMatchObject({fertilizations:1,fatherId:18});
  expect(row.items).toEqual([]);expect(row.packed).toEqual([]);expect(state.owners).toHaveLength(1);expect(rng.rng).toBe(123);
  const restarted=JSON.parse(JSON.stringify(state)) as WorldPawnsState256;expect(validWorldPawnsEnvelope256({worldPawns:restarted},256,from+10,100)).toBe(true);
  expect(validWorldPawnsEnvelope256({worldPawns:restarted},255,from+10,100)).toBe(false);
 });
 it('keeps a ready egg internal and clamps an unfertilized comp without producing or resetting it',()=>{
  for(const fertilizations of [0,1]){const {actor,state,rng,from}=fixture();actor.eggLayer={progress:fertilizations?1:.5,fertilizations,...fertilizations?{fatherId:18}:{}};
   const before=JSON.stringify(actor.eggLayer),plan=prepareWorldPawnLife256(state,from+10,rng);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(JSON.stringify(actor.eggLayer)).toBe(before);expect(state.owners[0]!.items).toEqual([]);expect(rng.rng).toBe(123);
  }
 });
 it('does not progress an inactive male or a mothballed owner',()=>{
  for(const mode of ['male','mothballed'] as const){const {actor,row,state,rng,from}=fixture();if(mode==='male')actor.sex='male';else row.mode='mothballed';
   const before=JSON.stringify(actor.eggLayer),plan=prepareWorldPawnLife256(state,from+10,rng);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(JSON.stringify(actor.eggLayer)).toBe(before);expect(rng.rng).toBe(123);
  }
 });
 it('refuses immature/clinical/pregnant cases atomically, without selecting a favorable alternative or losing contents',()=>{
  for(const kind of ['immature','clinical','pregnant'] as const){const {actor,row,state,rng,from}=fixture();
   if(kind==='immature'){actor.growthTracker!.value=0;actor.growthTracker!.nextCheckCore=from+1;}
   if(kind==='clinical'){const h=actor.health=createAnimalMedicalRecord256({schemaVersion:256,tick:from/10},actor);h.injuries.push({id:1,part:'torso',kind:'cut',severity:1000,bornAt:from/10});h.nextInjuryId=2;}
   if(kind==='pregnant')actor.pregnancy={fatherId:18,progress:0};
   const before=JSON.stringify({state,rng});expect(worldPawnActiveBoundary256(row)).not.toBeNull();expect(prepareWorldPawnLife256(state,from+10,rng)).toMatchObject({ok:false});expect(JSON.stringify({state,rng})).toBe(before);
  }
  const {actor}=fixture();actor.eggLayer!.progress=.1;expect(worldPawnEggBoundary256(actor,true)).toContain('float32');
 });
});
