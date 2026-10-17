import {describe,it,expect} from 'vitest';
import {stepWorldPawnGC256,type WorldPawnGCReader256} from '../src/sim/world-pawn-gc-256';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256';
/** Prepared GC scheduling API records only. These are not acquired actors or
 * a MapRemoved/clinical chronology; the optin uses true producer checkpoints. */
const prepared=(count:number):WorldPawnsState256=>({revision:1,atCore:15000,lastSuccessfulCore:0,currentRate:1,owners:Array.from({length:count},(_,i)=>({kind:'mechanical',actor:{id:i+1,mechKind:'scyther',x:0,z:0,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0,worldFaction259:{revision:1,factionId:1}},mechanicalTimersAtCore259:15000,factionId:1,originMapId:0,context:{seed:7,width:32,height:32},clockCore:15000,enteredAtAbsCore:100000,mode:'active',items:[],packed:[]} satisfies WorldPawnOwner256))});
function reader(){let facts=0,commits=0;const api:WorldPawnGCReader256={facts(){facts++;return {keep:[],unknown:['actual-authority-unresolved'],relatedIds:[],memoryIds:[]};},planDiscard(rows){expect(rows).toHaveLength(0);return {commit(){commits++;}};}};return {api,get facts(){return facts;},get commits(){return commits;}};}
describe('prepared259 incremental GC Core budget',()=>{
 it('refuses invalid bounds and treats explicit zero as no work without opening a pass',()=>{
  const s=prepared(11),r=reader(),before=JSON.stringify(s);for(const budget of [-1,.5,11,Infinity,NaN])expect(()=>stepWorldPawnGC256(s,15000,r.api,budget)).toThrow('Invalid WorldPawn GC Core budget');
  stepWorldPawnGC256(s,15000,r.api,0);expect(JSON.stringify(s)).toBe(before);expect(r.facts).toBe(0);expect(r.commits).toBe(0);
 });
 it('preserves default single-Core work and pays exactly ten existing generator units per confirmed interval',()=>{
  const one=prepared(11),ten=prepared(11),r1=reader(),r10=reader();
  for(let n=0;n<22;n++){stepWorldPawnGC256(one,15000+n,r1.api);expect(r1.commits).toBe(0);}
  stepWorldPawnGC256(one,15022,r1.api);expect(r1.commits).toBe(1);
  stepWorldPawnGC256(ten,15000,r10.api,10);expect(r10.commits).toBe(0);
  stepWorldPawnGC256(ten,15010,r10.api,10);expect(r10.commits).toBe(0);
  stepWorldPawnGC256(ten,15020,r10.api,10);expect(r10.commits).toBe(1);expect(r10.facts).toBe(11);expect(r1.facts).toBe(11);expect(ten.owners).toHaveLength(11);expect(ten.lastSuccessfulCore).toBe(15020);
 });
 it('does no reader work before cadence or again inside an already successful 15000-Core bucket',()=>{
  const s=prepared(0),r=reader();s.atCore=14990;stepWorldPawnGC256(s,14999,r.api,10);expect(r.commits).toBe(0);
  s.atCore=15000;stepWorldPawnGC256(s,15000,r.api,10);expect(r.commits).toBe(1);expect(s.lastSuccessfulCore).toBe(15000);stepWorldPawnGC256(s,29999,r.api,10);expect(r.commits).toBe(1);expect(r.facts).toBe(0);
 });
});
