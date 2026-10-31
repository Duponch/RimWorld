import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {delayAnimalImpact} from '../src/sim/wildlife-health.ts';
import {validWildlifeMotionTiming} from '../src/sim/wildlife-save.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {travelEnd,type TravelSegment} from '../src/sim/travel-timing.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

const originalHare={species:'hare'} as Pick<WildAnimal,'species'|'growthTracker'>;
/** A declared QA edge, not a fake command or timing implementation. Native
 * Walk rawcost900 pays max(1,900/450)=2 per Core =>450 actual Core. The current
 * persisted numeric codec then uses30/cardinal450, without adding a field. */
function paidCapEdge():TravelSegment {
 const m:TravelSegment={from:{x:4,z:5},to:{x:5,z:5},start:0,end:0,speedFactor:30/450,terrainDelay:0};m.end=travelEnd(m);return m;
}
function oldEdge():TravelSegment {
 const m:TravelSegment={from:{x:4,z:5},to:{x:5,z:5},start:0,end:0,speedFactor:1,terrainDelay:.2};m.end=travelEnd(m);return m;
}
/** Initial 32² fixture only. No public/human/mission save loaded or changed;
 * all records are declared before the first authoritative Core advance. */
function declared(capped:boolean):{world:World;animal:WildAnimal} {
 const world=deconstructionCamp(1,32);
 expect([world.schemaVersion,world.tick,world.phaseCore297]).toEqual([298,0,0]);
 enableWildlife(world,0);
 const animal:WildAnimal={id:world.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),
  x:5,z:5,food:.1,rest:1,state:'moving',path:[],nextDecision:100,motion:capped?paidCapEdge():oldEdge()};
 world.wildlife!.animals.push(animal);
 expect(validateWorld(world)).toEqual([]);
 return {world,animal};
}
function seven(world:World):void {
 const rng=world.rng,nextId=world.nextId,animalRng=world.wildlife!.rng;
 for(let i=0;i<7;i++){const before=effectiveCore297(world);expect(advanceWorldCore297(world).core).toBe(before+1);}
 expect([world.tick,world.phaseCore297,effectiveCore297(world)]).toEqual([0,7,7]);
 expect(world.rng).toBe(rng);expect(world.nextId).toBe(nextId);expect(world.wildlife!.rng).toBe(animalRng);
}

test('prospective paid450 animal codec extends to current298; the literal historical envelope remains admitted',()=>{
 const prospective=paidCapEdge(),legacy=oldEdge(),before=JSON.stringify([prospective,legacy]);
 expect(prospective.end).toBe(45);expect(legacy.end).toBe(3.2);
 expect(validWildlifeMotionTiming(0,296,originalHare,prospective)).toBe(false);
 expect(validWildlifeMotionTiming(0,298,originalHare,prospective,7)).toBe(true);
 expect(validWildlifeMotionTiming(0,298,originalHare,prospective)).toBe(false);
 for(const version of [87,256,263,296])expect(validWildlifeMotionTiming(0,version,originalHare,legacy)).toBe(true);
 expect(validWildlifeMotionTiming(0,298,originalHare,legacy,7)).toBe(true);
 expect(validWildlifeMotionTiming(0,299,originalHare,prospective,7)).toBe(false);
 expect(JSON.stringify([prospective,legacy])).toBe(before);
});

test('active prospective animal edge at real phase7 saves/reloads and preserves entire World through the next two actual Core',()=>{
 const {world,animal}=declared(true),edge=structuredClone(animal.motion);seven(world);
 expect(validateWorld(world)).toEqual([]);expect(animal.motion).toEqual(edge);
 const raw=serializeWorld(world),loaded=deserializeWorld(raw);
 expect(serializeWorld(loaded)).toBe(raw);expect(loaded.wildlife!.animals.find(a=>a.id===animal.id)!.motion).toEqual(edge);
 for(let i=0;i<2;i++){advanceWorldCore297(world);advanceWorldCore297(loaded);}
 expect(world.phaseCore297).toBe(9);expect(validateWorld(world)).toEqual([]);
 expect(serializeWorld(loaded)).toBe(serializeWorld(world));expect(animal.motion).toEqual(edge);
});

test('active historical animal edge is not converted or repriced by current297 whole save/reload at phase7',()=>{
 const {world,animal}=declared(false),edge=structuredClone(animal.motion);seven(world);
 const raw=serializeWorld(world),loaded=deserializeWorld(raw);
 expect(serializeWorld(loaded)).toBe(raw);expect(animal.motion).toEqual(edge);
 expect(loaded.wildlife!.animals.find(a=>a.id===animal.id)!.motion).toEqual(edge);
 expect(edge?.terrainDelay).toBe(.2);expect(edge?.speedFactor).toBe(1);expect(edge?.end).toBe(3.2);
});

test('current phase7 Snapshot and resident retain the same autonomous encoded animal edge',()=>{
 const {world,animal}=declared(true);seven(world);
 const packet=structuredClone(new SnapshotEncoder().encode(world,0,0));
 const full=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(full.status,full.status==='resync'?full.reason:'snapshot').toBe('applied');
 expect(resident.status,resident.status==='resync'?resident.reason:'resident').toBe('applied');
 if(full.status!=='applied'||resident.status!=='applied')throw Error('Current phase7 animal codec refused');
 expect(full.world.wildlife!.animals.find(a=>a.id===animal.id)!.motion).toEqual(animal.motion);
 expect(resident.world).toEqual(full.world);
});

test('actual animal impact intervals remain captured and exact through phase7 whole reload',()=>{
 const {world,animal}=declared(true);
 delayAnimalImpact(animal,0,true);
 expect(animal.stun).toEqual({sinceCore:0,untilCore:45});expect(animal.stagger).toEqual({sinceCore:0,untilCore:95});
 const edge=structuredClone(animal.motion);seven(world);
 expect(validateWorld(world)).toEqual([]);expect(animal.motion).toEqual(edge);
 const raw=serializeWorld(world),loaded=deserializeWorld(raw);
 expect(serializeWorld(loaded)).toBe(raw);expect(loaded.wildlife!.animals.find(a=>a.id===animal.id)!.motion).toEqual(edge);
});

test('autonomous codec refuses overspeed altered curve terrain delay future edge and human/future tokens',()=>{
 const base=paidCapEdge();
 for(const patch of [
  {speedFactor:4},{speedFactor:Number.NaN},{speedFactor:Infinity},{speedFactor:0},
  {terrainDelay:.1},{terrainDelay:-1},{terrainDelay:Infinity},{end:base.end+.01},
  {start:.8,end:.8+45},{coreMove297:true},{coreMoveWalk297:true},{coreMove297:true,coreMoveWalk297:true},
 ]){const m={...base,...patch} as TravelSegment;
  if('speedFactor'in patch&&Number.isFinite(m.speedFactor)&&m.speedFactor!>0)m.end=travelEnd(m);
  expect(validWildlifeMotionTiming(0,298,originalHare,m,7)).toBe(false);
 }
 const {world,animal}=declared(true);seven(world);const raw=JSON.parse(serializeWorld(world));
 const original=raw.wildlife.animals.find((a:WildAnimal)=>a.id===animal.id);
 original.motion.extraAnimalCore297=true;
 expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
});
