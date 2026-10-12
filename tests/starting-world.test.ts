import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {generateStartingWorld,localSeedForTile,parseWorldSeed,resolveStartingSite,startingSiteChoices,validStartingWorld} from '../src/sim/starting-world.ts';
import {createStartingCandidateRoster,startingPartyFromRoster} from '../src/sim/starting-candidates.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {validSiteClimate} from '../src/sim/site-climate-save.ts';
import {siteClimateDefinition} from '../src/sim/site-climate.ts';
import {validatePlanet} from '../src/sim/planet-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation.ts';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225.ts';

const party=startingPartyFromRoster(333,createStartingCandidateRoster(333));
function prepared(seed=333,tile=startingSiteChoices(generateStartingWorld(seed))[0]!) {
  const choice={version:1 as const,seed,tile},site=resolveStartingSite(choice);
  return createScenarioWorld(site.seed,32,'crashlanded',site.site,party,choice);
}

test('text seeds are bounded deterministic uint32 values, literal numeric seeds stay literal',()=>{
  expect(parseWorldSeed(' 42 ')).toBe(42);expect(parseWorldSeed('4294967295')).toBe(0xffffffff);
  expect(parseWorldSeed('Les Aulnes')).toBe(parseWorldSeed('Les Aulnes'));
  expect(parseWorldSeed('Les Aulnes')).not.toBe(parseWorldSeed('les aulnes'));
  for(const value of ['', ' ', 'x'.repeat(65), 'a\nb', '\u007fb'])expect(parseWorldSeed(value)).toBeUndefined();
});

test('prospective descriptors reject future keys, inherited fields, accessors and out of range values',()=>{
  const good={version:1,seed:333,tile:0};expect(validStartingWorld(good)).toBe(true);
  for(const bad of [null,[],{}, {...good,version:2},{...good,seed:-1},{...good,seed:2**32},
    {...good,tile:162},{...good,tile:.5},{...good,extra:1},{...good,[Symbol('extra')]:1},
    Object.assign(Object.create({seed:333}),{version:1,tile:0}),Object.defineProperty({...good},'tile',{get:()=>0})]) {
    expect(validStartingWorld(bad)).toBe(false);
    expect(()=>resolveStartingSite(bad as Parameters<typeof resolveStartingSite>[0])).toThrow();
  }
});

test('globe selection admits only supported land connected to the real destination',()=>{
  const planet=generateStartingWorld(333),choices=startingSiteChoices(planet);
  expect(choices).toContain(0);expect(choices).not.toContain(planet.civilianTile);
  expect(choices).toEqual([...new Set(choices)].sort((a,b)=>a-b));
  for(const tile of planet.tiles){
    if(tile.biome==='ocean'||tile.hilliness==='mountainous'||tile.id===planet.civilianTile)
      expect(()=>resolveStartingSite({version:1,seed:333,tile:tile.id})).toThrow();
  }
  const isolated=structuredClone(planet);isolated.tiles[0]!.neighbours=[];
  for(const tile of isolated.tiles)tile.neighbours=tile.neighbours.filter(id=>id!==0);
  expect(startingSiteChoices(isolated)).not.toContain(0);
});

test('all supported biomes and reliefs transfer from the chosen globe tile to the local world',()=>{
  const seenBiomes=new Set<string>(),seenReliefs=new Set<string>();
  for(const seed of [333,42,1,0,93]){
  const planet=generateStartingWorld(seed),choices=startingSiteChoices(planet);
  for(const id of choices){
    const tile=planet.tiles[id]!;
    if(seenBiomes.has(tile.biome)&&seenReliefs.has(tile.hilliness))continue;
    const world=prepared(seed,id);seenBiomes.add(tile.biome);seenReliefs.add(tile.hilliness);
    expect(world.seed).toBe(localSeedForTile(seed,id));expect(world.site).toMatchObject({biome:tile.biome,hilliness:tile.hilliness});
    expect(world.planet?.homeTile).toBe(id);expect(world.planet?.generationSeed).toBe(seed);
    expect(world.scenario?.revision).toBe(10);expect(world.climate?.revision).toBe(2);
    expect(siteClimateDefinition(world)).toMatchObject({meanTemperature:tile.meanTemperature,rainfall:tile.rainfall});
    expect(validateWorld(world)).toEqual([]);expect(validatePlanet(world.planet,world,SCHEMA_VERSION)).toEqual([]);
  }
  if(seenBiomes.size===3&&seenReliefs.size===3)break;
  }
  expect([...seenBiomes].sort()).toEqual(['arid-shrubland','boreal-forest','temperate-forest']);
  expect([...seenReliefs].sort()).toEqual(['flat','large-hills','small-hills']);
});

test('worker creation refuses a map seed or biome detached from its chosen tile',()=>{
  const choice={version:1 as const,seed:333,tile:0},site=resolveStartingSite(choice);
  expect(()=>createScenarioWorld((site.seed+1)>>>0,32,'crashlanded',site.site,party,choice)).toThrow(/correspond/);
  expect(()=>createScenarioWorld(site.seed,32,'crashlanded',{...site.site,biome:'boreal-forest'},party,choice)).toThrow(/correspond/);
  expect(()=>createScenarioWorld(site.seed,32,'camp',undefined,undefined,choice)).toThrow();
});

test('exact serialization and ordinary ticks preserve the chosen site, climate, people and RNG',()=>{
  const world=prepared(),saved=serializeWorld(world),resumed=deserializeWorld(saved);
  expect(resumed).toEqual(world);expect(serializeWorld(resumed)).toBe(saved);
  for(let i=0;i<6;i++){stepWorld(world);stepWorld(resumed);}
  expect(resumed).toEqual(world);expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('new starts cannot lose or downgrade their mandatory tile climate',()=>{
  const world=prepared();expect(validSiteClimate(undefined,SCHEMA_VERSION,world)).toBe(false);
  const bad=structuredClone(world);delete bad.climate;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  bad.climate={revision:1,profile:'temperate-reference',adoptedAt:0,calendarOrigin:1500};
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});

test('229 migration validates before changing the schema and never invents prospective geography',()=>{
  const old={...createScenarioWorld(42,32,'crashlanded'),schemaVersion:229};
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  expect(()=>deserializeWorld(JSON.stringify({...prepared(),schemaVersion:229}))).toThrow();
});

test('snapshot admission preserves its confirmed world when a new climate is removed or contradicted',()=>{
  const world=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(world,0,0,true)));
  expect(first.status).toBe('applied');
  stepWorld(world);const retry=structuredClone(encoder.encode(world,0,1,true));
  for(const kind of ['missing','temperature','profile'] as const){
    const packet=structuredClone(retry),bad=packet.world;
    if(kind==='missing')delete bad.climate;
    else if(kind==='profile')bad.climate={revision:1,profile:'temperate-reference',adoptedAt:0,calendarOrigin:1500};
    else if(bad.climate?.revision===2)bad.climate.definition.meanTemperature+=1;
    const rejected=decoder.adopt(structuredClone(packet));
    expect(rejected.status).toBe('resync');if(rejected.status!=='resync')throw Error('Invalid climate admitted');
    expect(rejected.reason).toBe(kind==='temperature'?'Climat du lieu de départ incohérent.':'Personne, possession ou propriétaire de capsule initiale invalide.');
  }
  const next=decoder.adopt(retry);
  expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(world);
});

test('confirmed plant forecasts keep the original output on tile climate boundaries',()=>{
  const world=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const reference=new Reference(),candidate=new NaturalResourcePresentation();
  while(world.startingArrival?.phase!=='opened')stepWorld(world);
  for(const tick of [27,28,1499,1500,1501,5999,6000,6001]){
    stepWorld(world,tick-world.tick);
    const result=decoder.adopt(structuredClone(encoder.encode(world,0,0,tick===27)));
    expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(candidate.read(result.world,tick===27,true)).toEqual(reference.read(result.world,tick===27,true));
  }
});
