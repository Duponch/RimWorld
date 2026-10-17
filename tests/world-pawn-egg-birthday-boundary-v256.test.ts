import {describe,it,expect} from 'vitest';
import {worldPawnEggIntervalBoundary256} from '../src/sim/world-pawn-egg-comp-256';
import {advanceWorldPawnRow256,prepareWorldPawnLife256} from '../src/sim/world-pawn-life-256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {validateMedicalRecord} from '../src/sim/injury-validation';
import {validCaravanAnimalRecord256} from '../src/sim/group-animal-record-save-256';
import type {WildAnimal} from '../src/sim/wildlife-state';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256';
// Scalar fixture: actual marked adult, exact biological remainder before its
// first birthday. No disease or outcome is forced; the unresolved trial is NOT
// consumed. Independent literal Core predicate selects a real hash window.
const hits=(id:number,from:number)=>{const offset=(id^((169495093+2654435769+(id<<6)+(id>>2))|0))|0;for(let k=from+1;k<=from+10;k++)if(((((k|0)+offset)|0)%2500)===0)return true;return false;};
function fixture(){
 let from=1000;while(from<6000&&!hits(17,from))from+=10;if(from===6000)throw Error('Prepared hash missing');
 const a:WildAnimal={id:17,species:'turkey',sex:'female',ageTicks:359999,ageCoreRemainder:5,x:1,z:1,food:.1,rest:.8,state:'idle',path:[],nextDecision:from/10+1};
 attachGeneratedAnimalGrowth256(a,from,256);a.eggLayer={progress:0,fertilizations:1,fatherId:18};
 const row:WorldPawnOwner256={kind:'animal',actor:a,factionId:null,originMapId:0,context:{seed:7,width:32,height:32},clockCore:from,enteredAtAbsCore:1000000+from,mode:'active',free:true,items:[],packed:[]};
 const state:WorldPawnsState256={revision:1,atCore:from,lastSuccessfulCore:0,currentRate:1,owners:[row]};return {a,row,state,from};
}
describe('WorldPawn egg hash / biological birthday collision',()=>{
 it('returns blocked before egg, age, health, notice or draw mutations, including direct private-row preparation',()=>{
  const {a,row,state,from}=fixture();expect(a.growthTracker!.value).toBe(1);expect(hits(a.id,from)).toBe(true);
  const before=JSON.stringify(row),notices:string[]=[];let draws=0;
  expect(advanceWorldPawnRow256(row,from+10,()=>{draws++;return 0;},notices)).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});
  expect(JSON.stringify(row)).toBe(before);expect(draws).toBe(0);expect(notices).toEqual([]);expect(a.health).toBeUndefined();
  const rng={rng:123},whole=JSON.stringify({state,rng});expect(prepareWorldPawnLife256(state,from+10,rng)).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});
  expect(JSON.stringify({state,rng})).toBe(whole);expect(state.owners[0]).toBe(row);expect(row.actor).toBe(a);
 });
 it('does not forbid either event alone, an inactive male, or an already-processed exact birthday boundary',()=>{
  const {a,from}=fixture();a.ageTicks=359998;expect(worldPawnEggIntervalBoundary256(a,from,from+10)).toBeNull();
  a.ageTicks=359999;let noHit=from+10;while(hits(a.id,noHit))noHit+=10;expect(worldPawnEggIntervalBoundary256(a,noHit,noHit+10)).toBeNull();
  a.sex='male';expect(worldPawnEggIntervalBoundary256(a,from,from+10)).toBeNull();
  a.sex='female';a.ageTicks=360000;a.ageCoreRemainder=0;expect(worldPawnEggIntervalBoundary256(a,from,from+10)).toBeNull();
 });
 it('cannot smuggle an unrepresented sterilization dossier or genes into the admitted animal domain',()=>{
  const {a,from}=fixture(),h=createAnimalMedicalRecord256({schemaVersion:256,tick:from/10},a);
  const sterilized={...h,sterilized:true};
  expect(validateMedicalRecord(sterilized,true,true,false,false,true,true,true,true,true,true,true,256)).not.toBeNull();
  const context={context:{width:32,height:32},tick:from/10,nextId:100,version:256};
  expect(validCaravanAnimalRecord256({...a,health:sterilized},context)).toBe(false);
  expect(validCaravanAnimalRecord256({...a,genes:{sterilize:true}},context)).toBe(false);
 });
});
