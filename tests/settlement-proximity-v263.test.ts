import {describe,it,expect} from 'vitest';
import {settlementProximityOffsets263,applySettlementProximity263} from '../src/sim/world-settlement-proximity-263.ts';
import type {WorldSurfaceTile} from '../src/sim/world-surface-geography.ts';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state.ts';
import type {WorldEvent} from '../src/sim/types.ts';

/** Declared rule fixtures: a tiny graph and diplomacy rows, no generated
 * planet, local map, clinical state, journey or campaign history claimed. */
function line(){return Array.from({length:7},(_,id):Pick<WorldSurfaceTile,'id'|'biome'|'hilliness'|'neighbours'>=>({id,biome:'temperate-forest',hilliness:'flat',neighbours:[id-1,id+1].filter(x=>x>=0&&x<7)}));}
const bases=Array.from({length:7},(_,tile)=>({id:tile+1,tile,factionId:2,name:'Établissement '+tile}));
function authority():Pick<WorldFactionRegistry256,'playerFactionId'|'relations'|'factions'> {return {playerFactionId:1,relations:[{aId:1,bId:2,goodwill:0,kind:'neutral'},{aId:1,bId:3,goodwill:-95,kind:'hostile'}],factions:[1,2,3].map(id=>({id,def:id===1?'PlayerColony':'OutlanderCivil',hidden:false,name:'Faction '+id,randomKey:id,colorFromSpectrum:0,leaderOwnerId:null}))};}
describe('settlement proximity263 bounded rules',()=>{
 it('uses land-edge distance, excludes the same tile and ends at five edges',()=>{
  const tiles=line(),before=JSON.stringify(tiles),offsets=settlementProximityOffsets263(tiles,0,bases);
  expect(offsets.map(o=>[o.distance,o.goodwill])).toEqual([[1,-30],[2,-30],[3,-20],[4,-10]]);expect(JSON.stringify(tiles)).toBe(before);
  expect(settlementProximityOffsets263(tiles,0,bases,new Set([2]))).toEqual([]);
 });
 it('does not measure through water or an impassable mountain',()=>{
  for(const kind of ['water','mountain']){const tiles=line();if(kind==='water')tiles[1]!.biome='ocean';else tiles[1]!.hilliness='impassable';expect(settlementProximityOffsets263(tiles,0,bases)).toEqual([]);}
 });
 it('sums each actual nearby base once by faction, clamps goodwill and updates relation kinds',()=>{
  const f=authority(),events:WorldEvent[]=[],offsets=settlementProximityOffsets263(line(),0,bases.slice(2,4));
  offsets.push({settlementId:99,factionId:3,name:'Autre',distance:4,goodwill:-10});applySettlementProximity263(f,offsets,events,90000);
  expect(f.relations).toEqual([{aId:1,bId:2,goodwill:-50,kind:'hostile'},{aId:1,bId:3,goodwill:-100,kind:'hostile'}]);expect(events).toHaveLength(1);expect(events[0]!.tick).toBe(90000);
 });
 it('refuses immutable recipients before changing any other relation',()=>{
  const f=authority(),events:WorldEvent[]=[],offsets=settlementProximityOffsets263(line(),0,bases.slice(2,4)),before=JSON.stringify(f);Object.defineProperty(f.relations[0]!,'kind',{writable:false});
  expect(()=>applySettlementProximity263(f,offsets,events,90000)).toThrow('immutable');expect(JSON.stringify(f)).toBe(before);expect(events).toEqual([]);
 });
 it('refuses an undeletable log slot before goodwill is written',()=>{
  const f=authority(),events:WorldEvent[]=[{tick:1,type:'command',message:'Historique'}],before=JSON.stringify(f);Object.defineProperty(events,'0',{configurable:false});
  expect(()=>applySettlementProximity263(f,settlementProximityOffsets263(line(),0,bases),events,90000)).toThrow('immutable');expect(JSON.stringify(f)).toBe(before);expect(events).toHaveLength(1);
 });
});
