import {describe,expect,it} from 'vitest';
import {prepareFalloutExposureScenario481} from './scenarios/toxic-fallout-v481.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {rotAge} from '../src/sim/food-preservation.ts';
import {isRoofed,roofIndex} from '../src/sim/roof-rules.ts';
import {TOXIC_FALLOUT_DOSE_INTERVAL294,toxicFalloutActive294} from '../src/sim/toxic-fallout-state-294.ts';
import {finishToxicFallout294} from '../src/sim/toxic-fallout-incident-294.ts';
import {toxicFalloutExposure294} from '../src/sim/toxic-fallout-dose-294.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import type {Command,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason).toBe(true);};
const human=(w:World,id:number)=>{const p=w.pawns.find(p=>p.id===id);if(!p)throw Error('Actual runtime human missing');return p;};
const nextBoundary=(w:World)=>Math.ceil(((Math.floor(w.tick*10/TOXIC_FALLOUT_DOSE_INTERVAL294)+1)*TOXIC_FALLOUT_DOSE_INTERVAL294)/10);
function firstDose(f:ReturnType<typeof prepareFalloutExposureScenario481>){const before=Math.ceil(f.nextDoseCore/10)-f.world.tick;expect(before).toBeGreaterThan(0);expect(before).toBeLessThan(350);stepWorld(f.world,before);}

describe('played local fallout481 from finite prepared property',()=>{
 it('crosses the real global dose boundary with exposed/roofed originals and ordinary whole saves',()=>{
  const f=prepareFalloutExposureScenario481(32),w=f.world;
  expect(validateWorld(w)).toEqual([]);const initial=serializeWorld(w);expect(serializeWorld(deserializeWorld(initial))).toBe(initial);
  const steps=Math.ceil(f.nextDoseCore/10)-w.tick;stepWorld(w,steps-1);
  expect(human(w,f.ids.exposedHuman).health?.toxicBuildup?.severity??0).toBe(f.baseline.exposedToxic);
  expect(human(w,f.ids.coveredHuman).health?.toxicBuildup?.severity??0).toBe(f.baseline.coveredToxic);
  stepWorld(w,1);
  expect(human(w,f.ids.exposedHuman).health!.toxicBuildup!.severity).toBeGreaterThan(f.baseline.exposedToxic);
  expect(human(w,f.ids.coveredHuman).health?.toxicBuildup?.severity??0).toBe(f.baseline.coveredToxic);
  expect(w.wildlife!.animals.find(a=>a.id===f.ids.animal)!.health!.toxicBuildup!.severity).toBeGreaterThan(f.baseline.animalToxic);
  expect(validateWorld(w)).toEqual([]);const played=serializeWorld(w);expect(serializeWorld(deserializeWorld(played))).toBe(played);
 });

 it('plays600steps and resumes the same whole campaign through poison, cell work, crops and rot',()=>{
  const f=prepareFalloutExposureScenario481(64),w=f.world;stepWorld(w,200);
  const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);
  stepWorld(w,400);stepWorld(copy,400);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
  expect(human(w,f.ids.exposedHuman).health!.toxicBuildup!.severity).toBeGreaterThan(f.baseline.exposedToxic);
  expect(human(w,f.ids.coveredHuman).health?.toxicBuildup?.severity??0).toBe(f.baseline.coveredToxic);
  const outside=w.piles.find(p=>p.id===f.ids.exposedFood)!,inside=w.piles.find(p=>p.id===f.ids.coveredFood)!;
  expect(outside).toBeDefined();expect(inside).toBeDefined();expect(rotAge(outside,w.tick)).toBeGreaterThan(rotAge(inside,w.tick));
  // Deaths remain actual outcomes; this fixed stream is not searched to force
  // a crop casualty, nor repaired when one occurs.
  expect(f.ids.exposedCrops.filter(id=>w.resources.some(p=>p.id===id)).length).toBeLessThanOrEqual(20);
  expect(f.ids.coveredCrops.every(id=>w.resources.some(p=>p.id===id))).toBe(true);
  const a=w.wildlife!.animals.find(a=>a.id===f.ids.animal)!;expect(f.cells.animalArea.some(c=>c.x===a.x&&c.z===a.z)).toBe(true);
 });

 it('actually walks the poisoned original to an existing roof and blocks its next environmental dose',()=>{
  const f=prepareFalloutExposureScenario481(32),w=f.world;firstDose(f);const id=f.ids.exposedHuman;
  command(w,{type:'draft-move',pawnIds:[id],target:f.cells.humanShelter,queue:false});
  let traversed=false,arrived=false;
  for(let n=0;n<100;n++){
   const p=human(w,id);if(p.motion&&p.motion.end>w.tick)traversed=true;
   if(p.x===f.cells.humanShelter.x&&p.z===f.cells.humanShelter.z&&(!p.motion||p.motion.end<=w.tick)){arrived=true;break;}
   stepWorld(w,1);
  }
  expect(traversed).toBe(true);expect(arrived).toBe(true);const p=human(w,id),before=p.health!.toxicBuildup!.severity;
  expect(isRoofed(w,roofIndex(w,p))).toBe(true);stepWorld(w,nextBoundary(w)-w.tick);
  expect(human(w,id).health!.toxicBuildup!.severity).toBeLessThanOrEqual(before);
  const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(validateWorld(w)).toEqual([]);
 });

 it('transfers the real poisoned original into a casket, reloads frozen ownership and resumes after ejection',()=>{
  const f=prepareFalloutExposureScenario481(32),w=f.world;
  // A single finite empty casket is explicitly prepared before the transition;
  // neither its construction nor its power/research chain is claimed played.
  const casket:ShipCasket277={id:w.nextId++,kind:'ship-cryptosleep-casket',x:16,z:14,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};
  w.structures.push(casket);firstDose(f);const id=f.ids.exposedHuman;
  command(w,{type:'draft',pawnIds:[id],enabled:false});command(w,{type:'order-enter-ship-casket',pawnId:id,casketId:casket.id});
  for(let n=0;n<200&&!casket.shipCryptosleep277.occupant;n++)stepWorld(w,1);
  expect(casket.shipCryptosleep277.occupant?.kind).toBe('human');expect(w.pawns.some(p=>p.id===id)).toBe(false);
  const held=casket.shipCryptosleep277.occupant;if(held?.kind!=='human')throw Error('Casket did not retain the original human');
  expect(held.pawn.id).toBe(id);const frozen=structuredClone(held.pawn),raw=serializeWorld(w),restored=deserializeWorld(raw);
  expect(serializeWorld(restored)).toBe(raw);stepWorld(w,350);stepWorld(restored,350);expect(held.pawn).toEqual(frozen);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  command(w,{type:'eject-ship-casket',casketId:casket.id});const resumed=human(w,id);expect(resumed).toBe(held.pawn);expect(resumed.health!.toxicBuildup!.severity).toBe(frozen.health!.toxicBuildup!.severity);
  command(w,{type:'draft',pawnIds:[id],enabled:true});const before=resumed.health!.toxicBuildup!.severity;stepWorld(w,nextBoundary(w)-w.tick);
  expect(human(w,id).health!.toxicBuildup!.severity).toBeGreaterThan(before);expect(validateWorld(w)).toEqual([]);
 });

 it('plays the exact fixed-seed duration and strict end once, preserving actual deaths, remains and losses',()=>{
  const f=prepareFalloutExposureScenario481(32),w=f.world,active=w.miscIncidents!.toxicFallout!.active!,endCore=active.endCore;
  const finalActiveStep=Math.floor(endCore/10),firstEndedStep=finalActiveStep+1;
  expect(firstEndedStep-f.startedAt).toBeLessThanOrEqual(15004);expect(firstEndedStep-f.startedAt).toBeGreaterThan(15000);
  const deaths=new Map<number,NonNullable<World['pawns'][number]['health']>['death']>();
  const observe=()=>{
   const owners=captureHumanOwners(w);
   for(const id of [f.ids.exposedHuman,f.ids.coveredHuman]){
    const slot=owners.byId.get(id);expect(slot,'Original human identity cannot be replaced').toBeDefined();
    const death=slot?.pawn?.health?.death;if(death){if(deaths.has(id))expect(death).toEqual(deaths.get(id));else deaths.set(id,structuredClone(death));}
    if(deaths.has(id))expect(slot?.status).toBe('dead');
   }
   const living=w.wildlife!.animals.filter(a=>a.id===f.ids.animal),bodies=w.piles.filter(p=>p.corpse?.animalId===f.ids.animal);
   expect(living.length+bodies.length).toBeLessThanOrEqual(1);
   if(bodies.length){const body=bodies[0]!;expect(body.id).toBe(f.ids.animal);expect(body.corpse!.health.death).toBeDefined();expect(body.corpse!.species).toBe('labrador-retriever');}
  };
  while(w.tick<finalActiveStep){stepWorld(w,Math.min(1000,finalActiveStep-w.tick));observe();}
  expect(w.tick).toBe(finalActiveStep);expect(toxicFalloutActive294(w)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const beforeEnd=serializeWorld(w),copy=deserializeWorld(beforeEnd);expect(serializeWorld(copy)).toBe(beforeEnd);
  const originalGoods=new Set(w.piles.filter(p=>[f.ids.exposedFood,f.ids.coveredFood,f.ids.exposedWood,f.ids.coveredWood].includes(p.id)).map(p=>p.id));
  const originalCrops=new Set(w.resources.filter(p=>[...f.ids.exposedCrops,...f.ids.coveredCrops].includes(p.id)).map(p=>p.id));
  stepWorld(w,1);stepWorld(copy,1);expect(w.tick).toBe(firstEndedStep);expect(toxicFalloutActive294(w)).toBe(false);expect(w.miscIncidents!.toxicFallout!.active).toBeUndefined();
  expect(serializeWorld(copy)).toBe(serializeWorld(w));observe();expect(validateWorld(w)).toEqual([]);
  for(const p of w.pawns)if(p.health&&!p.health.death)expect(toxicFalloutExposure294(w,p,true,medicalCivilTick271(p.health))).toBeUndefined();
  for(const id of [f.ids.exposedFood,f.ids.coveredFood,f.ids.exposedWood,f.ids.coveredWood])if(!originalGoods.has(id))expect(w.piles.some(p=>p.id===id)).toBe(false);
  for(const id of [...f.ids.exposedCrops,...f.ids.coveredCrops])if(!originalCrops.has(id))expect(w.resources.some(p=>p.id===id)).toBe(false);
  const endings=()=>w.events.filter(e=>e.message.startsWith('Les retombées toxiques se dissipent.')).length;
  expect(endings()).toBe(1);const afterEnd=serializeWorld(w);expect(serializeWorld(deserializeWorld(afterEnd))).toBe(afterEnd);
  // Duplicate finish/zero-time resume cannot replay exposure, restore lost
  // goods or regenerate plants. True geographic density readers have their
  // separate site3 tests; this site2 fixture only proves condition release.
  finishToxicFallout294(w);stepWorld(w,0);finishToxicFallout294(w);expect(endings()).toBe(1);expect(serializeWorld(w)).toBe(afterEnd);
 });
});
