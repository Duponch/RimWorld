import {describe,it,expect} from 'vitest';
import {indexShipParts276,readShipAssembly276,connectedShipParts276} from '../src/sim/ship-part-reader-276.ts';
import {newShipCasketHolder277} from '../src/sim/ship-casket-state-277.ts';
import {validShipCasketHistoricalTransport277} from '../src/sim/ship-casket-save-277.ts';

const beam=(id:number,z:number)=>({id,kind:'ship-beam',x:10,z,orientation:0});
const casket=(kind='ship-cryptosleep-casket')=>({id:3,kind,x:10,z:14,orientation:0,shipCryptosleep277:newShipCasketHolder277(0)});
const index=(parts:ReturnType<typeof beam>[])=>{
 const built=indexShipParts276(parts,40,40);expect(built.ok).toBe(true);
 if(!built.ok)throw Error(built.reason);return built.index;
};

describe('V453 connected spatial caskets',()=>{
 it('uses the two physical cells as a bridge and never counts it as a reactor',()=>{
  const parts=[beam(1,10),beam(2,18),casket()],built=index(parts),report=readShipAssembly276(built,1);
  expect(report.ok).toBe(true);if(!report.ok)throw Error(report.reason);
  expect(report.partIds).toEqual([1,2,3]);
  expect(report.counts).toEqual({beam:2,engine:0,reactor:0,computer:0,sensors:0,casket:1});
  expect(report.occupiedCaskets).toBe(0);expect(report.launchImplemented).toBe(false);
 });
 it('splits the real graph after removal and excludes an ordinary colony casket',()=>{
  const parts=[beam(1,10),beam(2,18)];
  expect(connectedShipParts276(index(parts),1)).toMatchObject({ok:true,partIds:[1]});
  expect(connectedShipParts276(index([...parts,casket('cryptosleep-casket')]),1)).toMatchObject({ok:true,partIds:[1]});
 });
 it('a diagonal spatial casket does not supply a missing cardinal connection',()=>{
  const moved={...casket(),x:12};
  expect(connectedShipParts276(index([beam(1,10),beam(2,18),moved]),1)).toMatchObject({ok:true,partIds:[1]});
 });
 it('does not turn a future version or an explicitly false holder into old content',()=>{
  for(const version of [271,275,276]){
   expect(validShipCasketHistoricalTransport277({schemaVersion:version,structures:[casket()]},version)).toBe(false);
   expect(validShipCasketHistoricalTransport277({schemaVersion:version,pawns:[{shipCryptosleepHeldAt277:undefined}]},version)).toBe(false);
   expect(validShipCasketHistoricalTransport277({schemaVersion:version,secondarySite:{structures:[{kind:'wall',shipCryptosleep277:false}]}},version)).toBe(false);
  }
  expect(validShipCasketHistoricalTransport277({structures:[]},276)).toBe(true);
  expect(validShipCasketHistoricalTransport277({structures:[]},278)).toBe(false);
 });
 it('fences a sparse public task update before migration without reading geographic payloads',()=>{
  const packet={world:{schemaVersion:276},pawns:{updates:[{id:1,shipCasketTask277:false}]}};
  expect(validShipCasketHistoricalTransport277(packet,276)).toBe(false);
  const map={schemaVersion:276,structures:[],get tiles(){throw Error('Not a holder namespace');},get resources(){throw Error('Not a holder namespace');}};
  expect(validShipCasketHistoricalTransport277(map,276)).toBe(true);
 });
});
