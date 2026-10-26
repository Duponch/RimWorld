import {describe,it,expect} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {toxicFalloutCellsPerCore294,toxicFalloutActive294} from '../src/sim/toxic-fallout-state-294.ts';
import {advanceToxicFalloutEnvironment294,toxicFalloutCellOrder294,addFalloutRotAge294} from '../src/sim/toxic-fallout-environment-294.ts';
import {adoptToxicFallout294,eligibleToxicFallout294,resolveSelectedToxicFallout294,finishToxicFallout294} from '../src/sim/toxic-fallout-incident-294.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {updateFoodTemperatures} from '../src/sim/thermal-food.ts';
import {CORPSE_DESSICATION_TICKS} from '../src/sim/corpses.ts';
import {rotAge} from '../src/sim/food-preservation.ts';
import {TICKS_PER_DAY,type World} from '../src/sim/types.ts';

/** Explicit prepared condition readers; these short states are not claimed as
 * storyteller births or as complete valid campaign saves. */
function prepared(size=32):World {
  const w=deconstructionCamp(0,size);w.tick=1;w.resources=[];w.piles=[];w.roofing={constructed:[],build:[],remove:[],cursor:0};
  w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:79,nextCheck:30100,introDone:false,checks:0,opportunities:1,heatwaves:0,
    toxicFallout:{adoptedAt:0,count:1,lastStart:0,active:{startCore:1,endCore:1000,rng:37,cursor:0}}};
  return w;
}
describe('map-owned fallout environment and its physical losses294',()=>{
  it('uses native float Ceil, one full cell cycle, and a constant bounded visit count per step',()=>{
    expect(toxicFalloutCellsPerCore294(10000)).toBe(7);expect(toxicFalloutCellsPerCore294(62500)).toBe(38);
    for(const area of [1,12,1024,62500]){const {offset,stride}=toxicFalloutCellOrder294(52,area),cells=new Set(Array.from({length:area},(_,i)=>(offset+i*stride)%area));expect(cells.size).toBe(area);}
    const w=prepared(),work=advanceToxicFalloutEnvironment294(w)!;expect(work.coreTicks).toBe(10);expect(work.cells).toBe(10);expect(work.plantTrials).toBe(0);
    expect(w.miscIncidents!.toxicFallout!.active!.cursor).toBe(10);
  });
  it('does no work, state allocation or random draw when absent, and clips the first/last partial Core steps',()=>{
    const w=prepared();delete w.miscIncidents!.toxicFallout!.active;const before=JSON.stringify(w);expect(advanceToxicFalloutEnvironment294(w)).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
    w.miscIncidents!.toxicFallout!.active={startCore:5,endCore:7,rng:37,cursor:0};expect(toxicFalloutActive294(w,7)).toBe(true);expect(toxicFalloutActive294(w,8)).toBe(false);
    expect(advanceToxicFalloutEnvironment294(w)).toMatchObject({coreTicks:3,cells:3});finishToxicFallout294(w);expect(w.miscIncidents!.toxicFallout!.active).toBeUndefined();
    const events=w.events.length;finishToxicFallout294(w);expect(w.events.length).toBe(events);
  });
  it('ages the same ground food on its visited cell, leaves covered and carried goods exact, and credits corpses only',()=>{
    const w=prepared(),order=toxicFalloutCellOrder294(w.seed,w.width*w.height);
    const cell=(i:number)=>{const index=(order.offset+i*order.stride)%(w.width*w.height);return {x:index%w.width,z:Math.floor(index/w.width)};};
    const food=(i:number)=>({id:w.nextId++,kind:'food' as const,item:'rice' as const,quantity:10,owner:{type:'ground' as const,...cell(i)},rot:{progress:0,atTick:0,rate:0}});
    const outside=food(0),covered=food(1),carried={...food(2),owner:{type:'pawn' as const,pawnId:500}},body={id:w.nextId++,kind:'corpse' as const,item:'hare-corpse' as const,quantity:1,owner:{type:'ground' as const,...cell(3)},rot:{progress:0,atTick:0,rate:0}};
    w.piles=[outside,covered,carried,body];w.roofing!.constructed=[covered.owner.z*w.width+covered.owner.x];
    const carrierBefore=structuredClone(carried),coveredBefore=structuredClone(covered);expect(advanceToxicFalloutEnvironment294(w)).toMatchObject({itemsAged:2});
    expect(outside.rot).toEqual({progress:300,atTick:1,rate:0});expect(body.rot).toMatchObject({progress:300,fallout294:300,atTick:1});
    expect(carried).toEqual(carrierBefore);expect(covered).toEqual(coveredBefore);expect(outside.quantity).toBe(10);
    updateFoodTemperatures(w);expect(body.rot).toMatchObject({progress:300,fallout294:300});expect(rotAge(body,1)).toBe(300);
  });
  it('preserves an indivisible corpse credit through thermal anchoring and stops adding age at desiccation',()=>{
    const rot={progress:200,atTick:1,rate:0};addFalloutRotAge294(rot,2,true);addFalloutRotAge294(rot,3,true);expect(rot).toMatchObject({progress:800,fallout294:600,atTick:3});
    const w=prepared(),{offset}=toxicFalloutCellOrder294(w.seed,1024),body={id:w.nextId++,kind:'corpse' as const,item:'hare-corpse' as const,quantity:1,owner:{type:'ground' as const,x:offset%32,z:Math.floor(offset/32)},rot:{progress:CORPSE_DESSICATION_TICKS,atTick:1}};w.piles=[body];
    const before=structuredClone(body);expect(advanceToxicFalloutEnvironment294(w)!.itemsAged).toBe(0);expect(body).toEqual(before);
  });
  it('kills plants without harvest, records the physical loss, and resumes exactly from a cloned cursor/random frontier',()=>{
    const w=prepared(),{offset}=toxicFalloutCellOrder294(w.seed,1024),plant={id:w.nextId++,x:offset%32,z:Math.floor(offset/32),kind:'rice' as const,amount:10,growth:1,growthTick:0};w.resources=[plant];
    // xorshift(1) is below the independently specified native .0065 trial.
    w.miscIncidents!.toxicFallout!.active!.rng=1;const reloaded=structuredClone(w),rng=w.rng;
    expect(advanceToxicFalloutEnvironment294(w)).toMatchObject({plantsKilled:1,plantTrials:1});advanceToxicFalloutEnvironment294(reloaded);
    expect(w.resources).toEqual([]);expect(w.piles).toEqual([]);expect(w.rng).toBe(rng);expect(w.destroyed).toEqual(reloaded.destroyed);
    expect(w.miscIncidents).toEqual(reloaded.miscIncidents);expect(w.resources).toEqual(reloaded.resources);
  });
  it('a roof prevents plant trials and death, with no hidden random draw or growth reward',()=>{
    const w=prepared(),{offset}=toxicFalloutCellOrder294(w.seed,1024),plant={id:w.nextId++,x:offset%32,z:Math.floor(offset/32),kind:'tree' as const,amount:12};w.resources=[plant];w.roofing!.constructed=[offset];const before=structuredClone(plant),rng=w.miscIncidents!.toxicFallout!.active!.rng;
    expect(advanceToxicFalloutEnvironment294(w)).toMatchObject({plantTrials:0,plantsKilled:0});expect(plant).toEqual(before);expect(w.miscIncidents!.toxicFallout!.active!.rng).toBe(rng);
  });
  it('adopts only during play, keeps rejected tickets exact, and births a finite native-duration local incident after day60',()=>{
    const w=prepared();delete w.miscIncidents!.toxicFallout;w.gameProfile=crashlandedProfile();w.tick=60*TICKS_PER_DAY-1;adoptToxicFallout294(w);
    const before=structuredClone(w.miscIncidents),rng=w.rng;expect(eligibleToxicFallout294(w)).toBe(false);expect(resolveSelectedToxicFallout294(w,81)).toBe(false);expect(w.miscIncidents).toEqual(before);
    w.tick++;expect(resolveSelectedToxicFallout294(w,81)).toBe(true);const active=w.miscIncidents!.toxicFallout!.active!;expect(active.startCore).toBe(w.tick*10);expect(active.endCore-active.startCore).toBeGreaterThanOrEqual(150000);expect(active.endCore-active.startCore).toBeLessThanOrEqual(630000);expect(w.rng).toBe(rng);
    w.tick=Math.floor(active.endCore/10)+1;finishToxicFallout294(w);expect(eligibleToxicFallout294(w)).toBe(false);w.tick=w.miscIncidents!.toxicFallout!.lastStart!+90*TICKS_PER_DAY;expect(eligibleToxicFallout294(w)).toBe(true);
  });
});
