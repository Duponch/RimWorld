import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {describe,it,expect} from 'vitest';
import {validStartingParty} from '../src/sim/starting-candidates';
import {startingOriginalRequestFromRoster256,validStartingOriginalRequest256} from '../src/sim/starting-original-request-256';
import {constructDeliveredStartingOriginalRoster256} from '../src/sim/starting-original-roster-256';
import {validWorldPawnsEnvelope256,validateWorldPawnOwners256} from '../src/sim/world-pawn-save-256';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state';
/** Prepared scalar ownership witness only; not a generated world or Core
 * human birth distribution. The composed helper below uses actual terrain. */
function request(){return startingOriginalRequestFromRoster256(359,[{serial:6,generation:2,nameOverride:'Choix six'},{serial:1,generation:0},{serial:8,generation:1},{serial:4,generation:7,nameOverride:'Réserve <quatre>'},{serial:5,generation:0},{serial:2,generation:1},{serial:7,generation:0},{serial:3,generation:4}]);}
function player():WorldFactionRegistry256{return {revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:11,nextFactionId:12,nextSettlementId:1,factions:[{id:11,def:'PlayerColony',hidden:false,name:'Prepared player instance',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null}],relations:[],settlements:[],leaders:[]};}

describe('eight original starters before map generation (adapted births)',()=>{
 it('sends all eight final chooser entries and keeps legacy3 admission exact',()=>{
  const r=request();expect(validStartingOriginalRequest256(r)).toBe(true);expect(validStartingParty(r)).toBe(false);expect(validStartingParty({version:r.version,seed:r.seed,selected:r.selected})).toBe(true);
  expect(r.roster[3]).toEqual({serial:4,generation:7,nameOverride:'Réserve <quatre>'});
  const bad=structuredClone(r);bad.selected[0]={serial:2,generation:1};expect(validStartingOriginalRequest256(bad)).toBe(false);
  let reads=0;const getter=Object.defineProperty({...r},'roster',{enumerable:true,get(){reads++;throw Error('not data');}});expect(validStartingOriginalRequest256(getter)).toBe(false);expect(reads).toBe(0);
  const hole=structuredClone(r);delete hole.roster[4];expect(validStartingOriginalRequest256(hole)).toBe(false);
 });
 it('allocates eight actual identities from the current frontier and gives only the five unchosen to WorldPawns',()=>{
  const factions=player(),r=request(),roster=constructDeliveredStartingOriginalRoster256(r,{nextId:1007,factions,knownPeople:new Map(),knownThingIds:new Set(),context:{seed:123,width:250,height:250},absoluteCore:3600000});
  expect(Reflect.set(roster.selected[0]!,'pawn',structuredClone(roster.selected[0]!.pawn))).toBe(false);expect(roster.nextId).toBe(1015);expect(roster.selected.map(e=>e.serial)).toEqual([6,1,8]);expect(roster.selected.map(e=>e.pawn.id)).toEqual([1012,1007,1014]);expect(new Set(roster.all.map(e=>e.pawn)).size).toBe(8);expect(new Set(roster.all.map(e=>e.pawn.id)).size).toBe(8);
  expect(roster.worldPawns.owners).toHaveLength(5);
  for(let i=0;i<5;i++){const row=roster.worldPawns.owners[i]!,e=roster.reserves[i]!;expect(row.actor).toBe(e.pawn);expect(row.items).toBe(e.items);expect(row.packed).toBe(e.packed);expect(row).toMatchObject({kind:'human',factionId:11,originMapId:null,clockCore:0,enteredAtAbsCore:3600000,keepForever:true,startingPawnLeftBehind:true});expect(Object.hasOwn(row,'everColonist')).toBe(false);}
  expect(roster.reserves[0]!.pawn.name).toBe('Réserve <quatre>');expect(roster.selected.every(e=>!roster.worldPawns.owners.some(row=>row.actor===e.pawn))).toBe(true);
  expect(validWorldPawnsEnvelope256({worldPawns:roster.worldPawns},256,0,roster.nextId)).toBe(true);expect(validWorldPawnsEnvelope256({worldPawns:roster.worldPawns},255,0,roster.nextId)).toBe(false);
  expect(validateWorldPawnOwners256(roster.worldPawns,preparedSchema256({schemaVersion:SCHEMA_VERSION,tick:0,nextId:roster.nextId,worldFactions:factions}),new Set(roster.selected.map(e=>e.pawn.id)))).toEqual([]);
 });
 it('refuses duplicate chooser entries or allocator collisions before changing supplied owners',()=>{
  const factions=player(),before=JSON.stringify(factions),r=request(),input={nextId:1007,factions,knownPeople:new Map(),knownThingIds:new Set([1007]),context:{seed:123,width:250,height:250},absoluteCore:0};
  expect(()=>constructDeliveredStartingOriginalRoster256(r,input)).toThrow();expect(JSON.stringify(factions)).toBe(before);
  const bad=structuredClone(r);bad.roster[7]=bad.roster[6]!;expect(()=>constructDeliveredStartingOriginalRoster256(bad,{...input,knownThingIds:new Set()})).toThrow();expect(JSON.stringify(factions)).toBe(before);
 });
});
