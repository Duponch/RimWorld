import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {newFermentationState265,fermentationSpeed265,validFermentationState265,fermentationContents265,FERMENTING_DURATION_CORE_265} from '../src/sim/fermentation-state-265.ts';
import {advanceFermentation265,barrelFillAllowed265,barrelFreeCapacity265,finishBarrelFill265,processBarrelExtraction265} from '../src/sim/fermentation-runtime-265.ts';
import {validFermentationWorld265} from '../src/sim/fermentation-save-265.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {advanceFurniture} from '../src/sim/furniture-transfer.ts';
import {furnitureDuration} from '../src/sim/furniture-rules.ts';
import {designateDeconstruction} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import type {Job,MaterialPile,Structure,World} from '../src/sim/types.ts';

/** Isolated, explicitly prepared physical fixture. No claim of played crop,
 * research or construction acquisition; engine production is tested separately. */
function fixture(){
  const w=miningCamp(),p=w.pawns[0]!;
  w.structures=[];w.jobs=[];w.packed=[];p.motion=null;p.moveCooldown=0;p.jobId=null;p.haul=null;p.cooking=null;p.path=[];
  p.x=14;p.z=15;p.priorities.haul=1;
  const s:Structure={id:w.nextId++,kind:'fermenting-barrel',x:15,z:15,orientation:0,footprint:'standard',material:'wood',fermentation:newFermentationState265()};
  w.structures.push(s);temperature(w,s,21);return {w,p,s};
}
function temperature(w:World,s:Structure,value:number){w.thermal={regions:[{cells:[s.z*w.width+s.x],temperature:value}]};}
function rare(w:World){for(let i=0;i<25;i++){w.tick++;advanceFermentation265(w);}}
const total=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function heldWort(w:World,quantity:number):MaterialPile {
  const p=w.pawns[0]!;addMaterial(w,'wort',quantity,{type:'pawn',pawnId:p.id},'wort');
  const pile=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;
  p.haul={sourcePileId:pile.id,carryPileId:pile.id,quantity,phase:'deliver',destination:{type:'fermenting-barrel',structureId:w.structures[0]!.id},serviceProgress:20};return pile;
}

test('safe temperatures, optimal speed and Rare ruin cadence are distinct',()=>{
  expect(fermentationSpeed265(-20)).toBe(.1);expect(fermentationSpeed265(-1)).toBe(.1);
  expect(fermentationSpeed265(3)).toBeCloseTo(.55);expect(fermentationSpeed265(7)).toBe(1);expect(fermentationSpeed265(60)).toBe(1);
  const {w,s}=fixture();s.fermentation!.wort=5;temperature(w,s,33);rare(w);
  expect(s.fermentation!.progress).toBe(Math.fround(250/FERMENTING_DURATION_CORE_265));
  expect(s.fermentation!.ruin).toBe(Math.fround(.00001));
  temperature(w,s,-1);const damage=s.fermentation!.ruin;rare(w);expect(s.fermentation!.ruin).toBe(damage);
  const before=structuredClone(s.fermentation);temperature(w,s,3);rare(w);
  expect(s.fermentation!.progress).toBe(Math.fround(before!.progress+Math.fround(250/FERMENTING_DURATION_CORE_265*.55)));
  temperature(w,s,32);expect(barrelFillAllowed265(w,s)).toBe(false);
  for(const t of [1,30]){temperature(w,s,t);expect(barrelFillAllowed265(w,s)).toBe(true);}
  for(const t of [0,31]){temperature(w,s,t);expect(barrelFillAllowed265(w,s)).toBe(false);}
});

test('filling consumes the actual held wort only after contact and 200 Core work, with weighted progress',()=>{
  const {w,p,s}=fixture();Object.assign(s.fermentation!,{wort:10,progress:.5,ruin:.7});const pile=heldWort(w,5);
  p.haul!.serviceProgress=19;const before=structuredClone(w);expect(finishBarrelFill265(w,p,pile)).toBe(false);expect(w).toEqual(before);
  p.haul!.serviceProgress=20;p.x=10;expect(finishBarrelFill265(w,p,pile)).toBe(false);
  p.x=14;pile.forbidden=true;expect(finishBarrelFill265(w,p,pile)).toBe(false);delete pile.forbidden;
  expect(finishBarrelFill265(w,p,pile)).toBe(true);expect(w.piles).not.toContain(pile);
  expect(s.fermentation).toEqual({wort:15,progress:Math.fround(5/15),ruin:0});
  p.haul=null;s.fermentation!.progress=1;expect(barrelFreeCapacity265(w,s.id)).toBe(0);
});

test('full, reserved and spoiled wort deliveries refuse without altering either owner',()=>{
  const {w,p,s}=fixture();const pile=heldWort(w,5);s.fermentation!.wort=23;
  let before=structuredClone(w);expect(finishBarrelFill265(w,p,pile)).toBe(false);expect(w).toEqual(before);
  s.fermentation!.wort=0;pile.rot={progress:30000,atTick:w.tick,rate:1};before=structuredClone(w);
  expect(finishBarrelFill265(w,p,pile)).toBe(false);expect(w).toEqual(before);
  pile.rot={progress:0,atTick:w.tick};const other=structuredClone(p);other.id=w.nextId++;other.haul=structuredClone(p.haul);w.pawns.push(other);
  expect(barrelFreeCapacity265(w,s.id,p.id)).toBe(0);
});

test('partial mature barrels extract after real work; blocked ground keeps all contents',()=>{
  const {w,p,s}=fixture();Object.assign(s.fermentation!,{wort:7,progress:1,ruin:.3});p.brewing={barrelId:s.id,spot:{x:p.x,z:p.z},progress:0};
  const moves:unknown[]=[];let wakes=0;const process=()=>processBarrelExtraction265(w,p,(...args)=>moves.push(args),()=>wakes++);
  for(let i=0;i<19;i++)process();expect(total(w,'beer')).toBe(0);expect(s.fermentation!.wort).toBe(7);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addMaterial(w,'steel',75,{type:'ground',x,z},'steel');
  process();expect(p.brewing?.progress).toBe(20);expect(s.fermentation!.wort).toBe(7);expect(total(w,'beer')).toBe(0);
  w.piles=[];process();expect(s.fermentation).toEqual({wort:0,progress:0,ruin:.3});expect(p.brewing).toBeUndefined();
  expect(total(w,'beer')).toBe(7);expect(w.piles.every(i=>i.owner.type==='ground'&&i.rot===undefined)).toBe(true);expect(moves).toEqual([]);expect(wakes).toBe(1);
});

test('ruin is persistent on empty and mature barrels and records exactly the retired wort once',()=>{
  const {w,s}=fixture();temperature(w,s,33);rare(w);expect(s.fermentation!.ruin).toBe(Math.fround(.00001));
  Object.assign(s.fermentation!,{wort:11,progress:1,ruin:Math.fround(.999999)});rare(w);
  expect(s.fermentation).toEqual({wort:0,progress:0,ruin:1});expect(w.spoiled.wort).toBe(11);rare(w);expect(w.spoiled.wort).toBe(11);
});

test('real minification keeps the same scalar content and packed barrels do not ferment',()=>{
  const {w,p,s}=fixture();Object.assign(s.fermentation!,{wort:9,progress:.25,ruin:.2});
  const job:Job={id:w.nextId++,kind:'uninstall',furniture:{structureId:s.id,kind:s.kind},x:s.x,z:s.z,orientation:s.orientation,footprint:s.footprint,progress:0,status:'active',reservedBy:p.id,escrow:{wood:0,food:0}};
  w.jobs.push(job);p.jobId=job.id;
  for(let i=0;i<furnitureDuration(w,job);i++)advanceFurniture(w,p,job,()=>{throw Error('Already in contact');},()=>false);
  expect(w.structures).not.toContain(s);expect(w.packed[0]!.building).toBe(s);
  const state=structuredClone(s.fermentation);rare(w);expect(s.fermentation).toEqual(state);expect(validFermentationWorld265(w)).toBe(true);
});

test('deconstruction and damage account for loaded contents without duplicating wort or beer',()=>{
  const first=fixture();Object.assign(first.s.fermentation!,{wort:13,progress:.4});designateDeconstruction(first.w,first.s);
  expect(finishDeconstruction(first.w,first.p,first.w.jobs[0]!)).toBe(true);expect(first.w.deconstructed.lostWort).toBe(13);
  expect(total(first.w,'wood')).toBe(15);expect(total(first.w,'steel')).toBe(5);expect(total(first.w,'wort')).toBe(0);
  const second=fixture();Object.assign(second.s.fermentation!,{wort:8,progress:1});
  expect(damageStructure(second.w,second.s,10000,'bullet')).toBe(true);expect(second.w.destroyed?.lost.beer).toBe(8);expect(total(second.w,'beer')).toBe(0);
});

test('three exact fermentation fields and future task/packed/ledger fields obey the schema boundary',()=>{
  const {w,p,s}=fixture();expect(validFermentationState265(s.fermentation)).toBe(true);expect(validFermentationWorld265(w)).toBe(true);
  for(const bad of [{wort:26,progress:0,ruin:0},{wort:0,progress:.2,ruin:0},{wort:1,progress:0,ruin:1},{wort:1,progress:0,ruin:0,atTick:1}])expect(validFermentationState265(bad)).toBe(false);
  expect(validFermentationWorld265(w,264)).toBe(false);
  w.structures=[];w.packed=[{building:s,owner:{type:'ground',x:15,z:15}}];expect(validFermentationWorld265(w,264)).toBe(false);
  w.packed=[];w.deconstructed.lostBeer=1;expect(validFermentationWorld265(w,264)).toBe(false);delete w.deconstructed.lostBeer;
  p.brewing={barrelId:s.id,spot:{x:14,z:15},progress:0};expect(validFermentationWorld265(w,264)).toBe(false);
});

test('saved scalar state resumes the exact Rare progress and temperature damage',()=>{
  const {w,s}=fixture();Object.assign(s.fermentation!,{wort:6,progress:.2,ruin:.1});temperature(w,s,-3);rare(w);
  const resumed=JSON.parse(JSON.stringify(w)) as World;
  for(let i=0;i<100;i++){w.tick++;resumed.tick++;advanceFermentation265(w);advanceFermentation265(resumed);}
  expect(resumed).toEqual(w);expect(fermentationContents265(s)).toEqual({item:'wort',quantity:6});
});
