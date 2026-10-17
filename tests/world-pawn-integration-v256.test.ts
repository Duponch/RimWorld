import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {describe,it,expect} from 'vitest';
import {constructDeliveredStartingOriginalRoster256} from '../src/sim/starting-original-roster-256';
import {startingOriginalRequestFromRoster256} from '../src/sim/starting-original-request-256';
import {validWorldPawnsEnvelope256,validateWorldPawnOwners256} from '../src/sim/world-pawn-save-256';
import {prepareWorldPawnLife256} from '../src/sim/world-pawn-life-256';
import {registryCamp} from './helpers/world-maps-v255';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state';
function prepared(){
 const factions:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:11,nextFactionId:12,nextSettlementId:1,factions:[{id:11,def:'PlayerColony',hidden:false,name:'Prepared actual player',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null}],relations:[],settlements:[],leaders:[]};
 const request=startingOriginalRequestFromRoster256(359,Array.from({length:8},(_,i)=>({serial:i+1,generation:0})));
 const roster=constructDeliveredStartingOriginalRoster256(request,{nextId:1007,factions,knownPeople:new Map(),knownThingIds:new Set(),context:{seed:123,width:250,height:250},absoluteCore:3600000});
 return {roster,factions,header:preparedSchema256({schemaVersion:SCHEMA_VERSION,tick:0,nextId:roster.nextId,worldFactions:factions})};
}
describe('WorldPawns actual original starters and admission boundaries (prepared)',()=>{
 it('keeps five real original reserves and advances one private10Core outcome exactly once',()=>{
  const {roster,header}=prepared(),state=roster.worldPawns,originals=state.owners.map(r=>r.actor),before=JSON.stringify(state),rng={rng:123};
  expect(validateWorldPawnOwners256(state,header,new Set(roster.selected.map(e=>e.pawn.id)))).toEqual([]);
  const plan=prepareWorldPawnLife256(state,10,rng);if(!plan.ok)throw Error(plan.reason);expect(JSON.stringify(state)).toBe(before);expect(rng.rng).toBe(123);plan.commit();
  expect(state.atCore).toBe(10);expect(state.owners).toHaveLength(5);for(let i=0;i<5;i++){expect(state.owners[i]!.actor).toBe(originals[i]);expect(state.owners[i]).toMatchObject({clockCore:10,keepForever:true,startingPawnLeftBehind:true});}
  expect(validWorldPawnsEnvelope256({worldPawns:state},256,10,roster.nextId)).toBe(true);expect(()=>plan.commit()).toThrow();expect(prepareWorldPawnLife256(state,10,rng)).toMatchObject({ok:false});
 });
 it('refuses a retained comp not yet bound without changing earlier actor/record/skills/RNG',()=>{
  const {roster}=prepared(),state=roster.worldPawns,third=state.owners[2]!;third.items.push({id:2000,kind:'wood',item:'wood',quantity:1,owner:{type:'inventory',pawnId:third.actor.id}});
  const before=JSON.stringify(state),refs=state.owners.map(r=>r.actor),rng={rng:123};expect(prepareWorldPawnLife256(state,10,rng)).toMatchObject({ok:false});expect(JSON.stringify(state)).toBe(before);expect(rng.rng).toBe(123);state.owners.forEach((r,i)=>expect(r.actor).toBe(refs[i]));
 });
 it('joins the actual faction FK and one caller namespace, rejecting collisions rather than knowledge owners',()=>{
  const {roster,header}=prepared(),state=roster.worldPawns,id=state.owners[0]!.actor.id;
  expect(validateWorldPawnOwners256(state,header,new Set([id]))).toContain('Duplicate or invalid WorldPawn Thing');
  const forged=structuredClone(state);forged.owners[0]!.factionId=999;expect(validateWorldPawnOwners256(forged,header,new Set())).toContain('WorldPawn actual faction foreign key refused');
  let reads=0;const raw=Object.defineProperty({},'worldPawns',{enumerable:true,get(){reads++;throw Error('not data');}});expect(validWorldPawnsEnvelope256(raw,256,0,roster.nextId)).toBe(false);expect(reads).toBe(0);
  expect(validWorldPawnsEnvelope256({worldPawns:undefined},255,0,roster.nextId)).toBe(false);expect(validWorldPawnsEnvelope256({},255,0,roster.nextId)).toBe(true);
 });
 it('refuses historical own-undefined at the Decoder header before any geography access',()=>{
  const real=registryCamp(),wire=structuredClone(new SnapshotEncoder().encode(real,0,0));Object.defineProperty(wire.world,'schemaVersion',{value:255,enumerable:true,configurable:true,writable:true});Object.defineProperty(wire.world,'worldPawns',{value:undefined,enumerable:true});
  let reads=0;Object.defineProperty(wire,'geography',{enumerable:true,get(){reads++;throw Error('geometry must remain unread');}});
  expect(new SnapshotDecoder().adopt(wire).status).toBe('resync');expect(reads).toBe(0);
 });
});
