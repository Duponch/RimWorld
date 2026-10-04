import { beforeEach,expect,test,vi } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { adoptSmallIncidents,advanceSmallIncidents,resolveSelectedSmallAnimal,smallAcceptance,
  smallAnimalCandidates,SMALL_ACTIVE_TICKS,SMALL_CHECK_INTERVAL,SMALL_CYCLE_START,
  SMALL_CYCLE_TICKS,SMALL_INTRO_TICK,SMALL_RAW_WEIGHT,SMALL_REFIRE_TICKS } from '../src/sim/cassandra-small.ts';
import { validSmallIncidents } from '../src/sim/cassandra-small-save.ts';
import { startAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import type { World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

// This suite owns the producer/calendar contract. Real waking, pursuit and
// combat are checked separately by the animal-controller integration suite.
vi.mock('../src/sim/animal-manhunter.ts',()=>({startAnimalManhunter:vi.fn(()=>true)}));
beforeEach(()=>vi.mocked(startAnimalManhunter).mockReset().mockReturnValue(true));

function colony(tick=0,seed=42):World {
  const world=createWorld(seed,16,16);world.gameProfile=crashlandedProfile();world.tick=tick;
  adoptSmallIncidents(world);return world;
}
function animal(id:number,species:WildAnimal['species']='hare',state:WildAnimal['state']='idle'):WildAnimal {
  return {id,species,state,sex:'female',ageTicks:600_000,x:5,z:5,food:.2,rest:.8,path:[],nextDecision:0};
}
function populate(world:World,animals:WildAnimal[]):void {
  world.wildlife={profile:'biome-fauna-v2',rng:12345,animals,eatenPlants:0,eatenNutrition:0,eatenItems:0};
}

test('adoption is prospective, requires schema183/profile and never touches other PRNGs',()=>{
  const historical=createWorld(7,16,16),legacyRng=historical.rng;
  adoptSmallIncidents(historical);expect(historical.smallIncidents).toBeUndefined();
  historical.gameProfile=crashlandedProfile();historical.schemaVersion=182 as World['schemaVersion'];
  adoptSmallIncidents(historical);expect(historical.smallIncidents).toBeUndefined();expect(historical.rng).toBe(legacyRng);
  const world=colony(SMALL_INTRO_TICK-1),state=world.smallIncidents!,privateRng=state.rng;
  expect(state).toMatchObject({adoptedAt:SMALL_INTRO_TICK-1,cycle:-1,pending:[],introDone:false,opportunities:0,incidents:0});
  adoptSmallIncidents(world);advanceSmallIncidents(world);expect(state.rng).toBe(privateRng);
  expect(validSmallIncidents(state,183,world)).toBe(true);
});

test('intro is a single J3.4 opportunity, not a guaranteed spawned animal or a retrospective event',()=>{
  expect(SMALL_INTRO_TICK).toBe(20400);expect(SMALL_RAW_WEIGHT).toBe(5);
  const world=colony(SMALL_INTRO_TICK-1),state=world.smallIncidents!,rng=world.rng;
  world.tick=SMALL_INTRO_TICK;advanceSmallIncidents(world);advanceSmallIncidents(world);
  expect(state).toMatchObject({introDone:true,opportunities:1,incidents:0});
  expect(startAnimalManhunter).not.toHaveBeenCalled();expect(world.wildlife).toBeUndefined();expect(world.rng).toBe(rng);
  const late=colony(SMALL_INTRO_TICK);advanceSmallIncidents(late);
  expect(late.smallIncidents!.opportunities).toBe(0);
});

test('selection uses existing wild animal power, includes a sleeper, and changes threshold at J7',()=>{
  const world=colony(7*6000-1),hare=animal(100),sleeping=animal(101,'gazelle','sleeping'),fox=animal(102,'red-fox');
  const dead=animal(103,'hare','dead'),down=animal(104,'hare','downed'),domestic={...animal(105),domestic:{}} as WildAnimal;
  const enraged={...animal(106),manhunter:{startedAtCore:0,rng:1,zeroRestTicks:0}};
  const retaliating={...animal(107),retaliation:{targetId:1,untilCore:world.tick*10+30}};
  populate(world,[hare,sleeping,fox,dead,down,domestic,enraged,retaliating]);
  expect(smallAnimalCandidates(world).map(a=>a.id)).toEqual([100,101]);
  world.tick++;expect(smallAnimalCandidates(world).map(a=>a.id)).toEqual([100,101,102]);
  populate(world,[sleeping]);const identities=world.wildlife!.animals,worldRng=world.rng,wildRng=world.wildlife!.rng;
  expect(resolveSelectedSmallAnimal(world)).toBe(true);
  expect(startAnimalManhunter).toHaveBeenCalledWith(world,sleeping);
  expect(world.wildlife!.animals).toBe(identities);expect(identities).toHaveLength(1);
  expect(world.rng).toBe(worldRng);expect(world.wildlife!.rng).toBe(wildRng);
});

test('failed start is not an incident or letter, and minRefire counts actual successful starts',()=>{
  const world=colony(SMALL_INTRO_TICK-1),state=world.smallIncidents!,selected=animal(100);populate(world,[selected]);
  world.tick=SMALL_INTRO_TICK;vi.mocked(startAnimalManhunter).mockReturnValue(false);advanceSmallIncidents(world);
  expect(state.incidents).toBe(0);expect(state.lastIncidentTick).toBeUndefined();expect(world.events).toEqual([]);
  vi.mocked(startAnimalManhunter).mockReturnValue(true);
  expect(resolveSelectedSmallAnimal(world)).toBe(true);expect(state.lastIncidentTick).toBe(world.tick);
  const privateRng=state.rng;world.tick+=SMALL_REFIRE_TICKS-1;
  expect(resolveSelectedSmallAnimal(world)).toBe(false);expect(state.rng).toBe(privateRng);
  world.tick++;expect(resolveSelectedSmallAnimal(world)).toBe(true);expect(state.incidents).toBe(2);
});

test('ThreatSmall calendar uses276 active slots,360 rest slots and at most one opportunity',()=>{
  expect(SMALL_CYCLE_START).toBe(66000);expect(SMALL_ACTIVE_TICKS).toBe(27600);expect(SMALL_CYCLE_TICKS).toBe(63600);
  const counts=new Set<number>();
  for(let seed=1;seed<=32;seed++){
    const world=colony(SMALL_CYCLE_START-1),state=world.smallIncidents!;state.rng=seed;
    world.tick=SMALL_CYCLE_START;advanceSmallIncidents(world);
    counts.add(state.pending.length+state.opportunities);
    expect(state.pending.length+state.opportunities).toBeLessThanOrEqual(1);
    expect(validSmallIncidents(state,183,world)).toBe(true);
    if(state.pending.length){
      const date=state.pending[0]!;expect(date%SMALL_CHECK_INTERVAL).toBe(0);
      expect(date).toBeGreaterThanOrEqual(SMALL_CYCLE_START);expect(date).toBeLessThan(SMALL_CYCLE_START+SMALL_ACTIVE_TICKS);
      const privateRng=state.rng;world.tick=date-1;advanceSmallIncidents(world);expect(state.rng).toBe(privateRng);
      world.tick=date;advanceSmallIncidents(world);expect(state.pending).toEqual([]);expect(state.opportunities).toBe(1);
      advanceSmallIncidents(world);expect(state.opportunities).toBe(1);
      world.tick=SMALL_CYCLE_START+SMALL_ACTIVE_TICKS;advanceSmallIncidents(world);
      expect(state.opportunities).toBe(1);
    }
  }
  expect([...counts].sort()).toEqual([0,1]);
});

test('acceptance uses the threat-point curve and wealthy zero acceptance suppresses the prepared date',()=>{
  expect([0,800,1800,2800,10000].map(smallAcceptance)).toEqual([1,1,.5,0,0]);
  const world=colony(SMALL_CYCLE_START-1),state=world.smallIncidents!;
  world.economy={wealth:{knownStorytellerWealth:1_000_000},adaptationDays:100} as World['economy'];
  state.rng=1;world.tick=SMALL_CYCLE_START;advanceSmallIncidents(world);
  expect(state.pending).toEqual([]);expect(state.opportunities).toBe(0);
});

test('adoption inside a started window skips it without rolls, then prepares the next future opening',()=>{
  const world=colony(SMALL_CYCLE_START+100),state=world.smallIncidents!,privateRng=state.rng;
  expect(state.cycle).toBe(0);expect(state.pending).toEqual([]);
  world.tick=SMALL_CYCLE_START+200;advanceSmallIncidents(world);expect(state.rng).toBe(privateRng);
  expect(validSmallIncidents(state,183,world)).toBe(true);
  state.rng=1;world.tick=SMALL_CYCLE_START+SMALL_CYCLE_TICKS;advanceSmallIncidents(world);
  expect(state.cycle).toBe(1);expect(state.rng).not.toBe(1);
  expect(validSmallIncidents(state,183,world)).toBe(true);
});

test('skipped spans discard old dates and missed openings instead of replaying incidents',()=>{
  const world=colony(SMALL_CYCLE_START-1),state=world.smallIncidents!;state.rng=1;
  world.tick=SMALL_CYCLE_START;advanceSmallIncidents(world);expect(state.pending).toHaveLength(1);
  world.tick=state.pending[0]!+1;advanceSmallIncidents(world);expect(state.opportunities).toBe(0);expect(state.pending).toEqual([]);
  const privateRng=state.rng;world.tick=SMALL_CYCLE_START+2*SMALL_CYCLE_TICKS+1;advanceSmallIncidents(world);
  expect(state.cycle).toBe(2);expect(state.pending).toEqual([]);expect(state.rng).toBe(privateRng);
  expect(validSmallIncidents(state,183,world)).toBe(true);
});

test('J11 itself is silent and a slot-zero roll is not postponed into a guaranteed incident',()=>{
  // Fixed private stream: one hit at slot zero. The same opening date is
  // allowed in later cycles, proving this is the minimum-days guard only.
  const world=colony(SMALL_CYCLE_START-1),state=world.smallIncidents!;
  state.rng=577;populate(world,[animal(100)]);world.tick=SMALL_CYCLE_START;advanceSmallIncidents(world);
  expect(state.opportunities).toBe(0);expect(startAnimalManhunter).not.toHaveBeenCalled();
  expect(state.pending).toEqual([]);world.tick+=SMALL_CHECK_INTERVAL;advanceSmallIncidents(world);
  expect(state.opportunities).toBe(0);
  expect(validSmallIncidents({...state,opportunities:1,incidents:1,lastIncidentTick:SMALL_CYCLE_START},183,world)).toBe(false);
  state.rng=577;world.tick=SMALL_CYCLE_START+SMALL_CYCLE_TICKS;advanceSmallIncidents(world);
  expect(state.opportunities).toBe(1);expect(state.incidents).toBe(1);
  expect(state.lastIncidentTick).toBe(world.tick);expect(validSmallIncidents(state,183,world)).toBe(true);
});

test('strict shape rejects hidden182 fields, past/off-window dates and inconsistent state',()=>{
  const world=colony(SMALL_CYCLE_START-1),state=world.smallIncidents!;state.rng=1;
  world.tick=SMALL_CYCLE_START;advanceSmallIncidents(world);
  expect(validSmallIncidents(undefined,182,world)).toBe(true);expect(validSmallIncidents(state,182,world)).toBe(false);
  for(const patch of [{future:1},{rng:0},{cycle:-1},{nextCheck:world.tick},{introDone:false},
    {opportunities:2},{incidents:1},{pending:[world.tick]},
    {pending:[SMALL_CYCLE_START+SMALL_ACTIVE_TICKS]},{pending:[state.pending[0]!,state.pending[0]!]}]){
    expect(validSmallIncidents({...state,...patch},183,world),JSON.stringify(patch)).toBe(false);
  }
  expect(validSmallIncidents(state,183,{...world,gameProfile:undefined})).toBe(false);
});

test('pending date and private stream continue exactly across a plain saved-state round trip',()=>{
  const original=colony(SMALL_CYCLE_START-1);original.smallIncidents!.rng=1;
  original.tick=SMALL_CYCLE_START;advanceSmallIncidents(original);
  const restored=JSON.parse(JSON.stringify(original)) as World;
  expect(validSmallIncidents(restored.smallIncidents,183,restored)).toBe(true);
  for(const tick of [original.smallIncidents!.pending[0]!,SMALL_CYCLE_START+SMALL_CYCLE_TICKS,
    SMALL_CYCLE_START+SMALL_CYCLE_TICKS+SMALL_ACTIVE_TICKS]){
    original.tick=tick;restored.tick=tick;advanceSmallIncidents(original);advanceSmallIncidents(restored);
    expect(restored.smallIncidents).toEqual(original.smallIncidents);
    expect(restored.events).toEqual(original.events);
  }
});
