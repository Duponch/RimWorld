import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {shipReactorCycleHits275,shipReactorFrequency275,shipReactorGenerationInterval275,advanceShipReactorThreats275,type ShipReactorRaidSource275} from '../src/sim/ship-reactor-threats-275.ts';
import {validateShipReactorThreats275,validShipReactorRaidSource275} from '../src/sim/ship-reactor-threat-save-275.ts';
import {enableRaids,advanceRaids,exitRaider} from '../src/sim/raids.ts';
import {createRaidGroup} from '../src/sim/raid-spawn.ts';
import {validateRaids} from '../src/sim/raid-save.ts';
import type {World} from '../src/sim/types.ts';

function futureHits(w:World,count:number):{core:number;cycle:number}[]{
 const owner=w.shipReactorThreats275!,found:{core:number;cycle:number}[]=[];
 for(let cycle=0;cycle<32&&found.length<count;cycle++)for(const hit of shipReactorCycleHits275(owner.seed,cycle)){
  const core=(shipReactorGenerationInterval275(owner.generationAtCore)+cycle*90+hit)*1000;
  if(core>owner.adoptedAtCore)found.push({core,cycle});
 }
 expect(found.length).toBeGreaterThanOrEqual(count);return found.slice(0,count);
}
function ownerFixture(){const w=deconstructionCamp(2);w.tick=1;advanceShipReactorThreats275(w,true);return w;}

test('Core frequency curve, stochastic absence, active/rest windows and minimum spacing remain bounded',()=>{
 for(const [x,y] of [[0,.1],[.3,.5],[.6,.8],[1,1],[1.55,1.1],[2.2,1.2],[10,2]])expect(shipReactorFrequency275(x!)).toBe(Math.fround(y!));
 const counts=new Set<number>();
 for(let seed=1;seed<=200;seed++)for(let cycle=0;cycle<3;cycle++){
  const hits=shipReactorCycleHits275(seed,cycle);counts.add(hits.length);
  expect(shipReactorCycleHits275(seed,cycle)).toEqual(hits);expect(hits.length).toBeLessThanOrEqual(2);
  expect(hits.every((hit,i)=>Number.isInteger(hit)&&hit>=0&&hit<=60&&(i===0||hit-hits[i-1]!>=2))).toBe(true);
 }
 expect(counts.has(0)).toBe(true);expect(counts.has(1)).toBe(true);expect(counts.has(2)).toBe(true);
});

test('generation anchor follows Float32 days and nearest-even intervals, without an activation-relative cycle',()=>{
 expect(shipReactorGenerationInterval275(500)).toBe(0);expect(shipReactorGenerationInterval275(1500)).toBe(2);
 expect(shipReactorGenerationInterval275(60000)).toBe(60);expect(shipReactorGenerationInterval275(75000,15000)).toBe(60);
 const w=ownerFixture(),first=futureHits(w,1)[0]!;
 const original=structuredClone(w.shipReactorThreats275!);w.tick=(first.core+1000)/10;advanceShipReactorThreats275(w,false);
 expect(w.shipReactorThreats275!.recent).toEqual([]);expect(w.shipReactorThreats275!.seed).toBe(original.seed);expect(w.shipReactorThreats275!.generationAtCore).toBe(original.generationAtCore);
 advanceShipReactorThreats275(w,true);expect(w.shipReactorThreats275!.recent).toEqual([]);expect(w.shipReactorThreats275!.adoptedAtCore).toBe(original.adoptedAtCore);
});

test('inactive maps do not acquire or alter a raid calendar; failed entry consumes its actual opportunity once',()=>{
 const w=deconstructionCamp(2);enableRaids(w);const initial=structuredClone(w);advanceShipReactorThreats275(w,false);expect(w).toEqual(initial);
 w.tick=1;advanceShipReactorThreats275(w,true);const due=futureHits(w,1)[0]!;
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!x||!z||x===w.width-1||z===w.height-1)w.tiles[z*w.width+x]={terrain:'rock'};
 const calendarRng=w.raids!.rng,ids=w.nextId;w.tick=due.core/10;advanceShipReactorThreats275(w,true);
 expect(w.shipReactorThreats275!.recent).toEqual([{atCore:due.core,cycle:due.cycle,points:500,result:'failed'}]);
 expect(w.raids!.rng).toBe(calendarRng);expect(w.nextId).toBe(ids);expect(w.raids!.serial).toBe(0);
 const once=structuredClone(w);advanceShipReactorThreats275(w,true);expect(w).toEqual(once);expect(validateShipReactorThreats275(w)).toEqual([]);
});

test('two actual additional human Lords coexist with the original owner, retain equipment on retreat and survive loss of the beacon',()=>{
 const w=deconstructionCamp(2);enableRaids(w);
 const original=createRaidGroup(w,{count:1,sites:[{x:31,z:31}],random:{rng:14}})!;expect(original).not.toBeNull();
 w.tick=1;advanceShipReactorThreats275(w,true);const owner=w.shipReactorThreats275!,hits=futureHits(w,2),calendarRng=w.raids!.rng;
 for(let n=0;n<2;n++){
  const hit=hits[n]!;w.tick=hit.core/10;
  const source:ShipReactorRaidSource275={revision:1,mapId:owner.mapId,tile:owner.tile,atCore:hit.core,cycle:hit.cycle,points:500,factionId:null};
  const sites=Array.from({length:14},(_,i)=>n?{x:i+1,z:0}:{x:0,z:i+1});
  const group=createRaidGroup(w,{count:14,sites,random:{rng:100+n},composition:{budget:500,roster:Array.from({length:14},()=> 'drifter' as const)},shipReactor275:source})!;
  expect(group).not.toBeNull();owner.checkedAtCore=hit.core;owner.opportunities++;owner.spawned++;owner.lastFaction='outlaws';owner.recent.push({atCore:hit.core,cycle:hit.cycle,points:500,result:'human',raidId:group.id});
 }
 expect(w.raids!.active).toBe(original);expect(w.raids!.extraActive261).toHaveLength(2);expect(w.raids!.rng).toBe(calendarRng);
 expect(validateShipReactorThreats275(w)).toEqual([]);expect(validateRaids(w,275,new Set())).toEqual([]);
 const groups=w.raids!.extraActive261!,people=groups.flatMap(g=>g.members),items=w.piles.filter(p=>'pawnId'in p.owner&&people.includes(p.owner.pawnId));
 w.tick=Math.max(...groups.map(g=>g.deadline!));advanceShipReactorThreats275(w,false);advanceRaids(w);
 for(const p of w.pawns.filter(p=>people.includes(p.id)))expect(exitRaider(w,p)).toBe(true);
 advanceRaids(w);expect(w.raids!.extraActive261).toEqual([]);expect(w.raids!.extraResults261).toHaveLength(2);
 expect(w.raids!.departed.flatMap(d=>d.items).filter(p=>items.some(i=>i.id===p.id))).toEqual(expect.arrayContaining(items));
 expect(w.raids!.active).toBe(original);expect(w.shipReactorThreats275!.active).toBe(false);expect(w.raids!.rng).toBe(calendarRng);
 expect(validateRaids(w,275,new Set())).toEqual([]);
 const cold=JSON.parse(JSON.stringify(w)) as World;expect(validateShipReactorThreats275(cold)).toEqual([]);expect(validateRaids(cold,275,new Set())).toEqual([]);
 const source=cold.raids!.extraResults261![0]!.shipReactor275!;expect(validShipReactorRaidSource275(source,cold,cold.tick,'human')).toBe(true);
 source.mapId++;expect(validShipReactorRaidSource275(source,cold,cold.tick,'human')).toBe(false);
});

test('old/future pressure owners and foreign cycle/field changes are closed',()=>{
 const w=ownerFixture();expect(validateShipReactorThreats275(w)).toEqual([]);
 for(const version of [274,278])expect(validateShipReactorThreats275(w,version)).not.toEqual([]);
 for(const key of ['seed','mapId','generationAtCore'] as const){const copy=structuredClone(w);copy.shipReactorThreats275![key]++;expect(validateShipReactorThreats275(copy)).not.toEqual([]);}
 const copy=structuredClone(w);Object.defineProperty(copy.shipReactorThreats275!,'future276',{value:true,enumerable:true});expect(validateShipReactorThreats275(copy)).not.toEqual([]);
});
