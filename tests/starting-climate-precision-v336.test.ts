import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {describe,expect,it} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createStartingCandidateRoster,startingPartyFromRoster} from '../src/sim/starting-candidates.ts';
import {resolveStartingSite} from '../src/sim/starting-world.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {sameDerivedClimateNumber,seasonalAmplitude,validClimateDefinition,type StartingSiteClimate} from '../src/sim/site-climate.ts';
import {validSiteClimate} from '../src/sim/site-climate-save.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

// Confirmed native Chrome values, world seed 42 / tile 81, tick 30. Node's
// atan2 conversion differs by one ULP; these literals are the saved authority.
const NATIVE_CENTER:[number,number,number]=[0.24862922409680574,-0.6289373245170977,0.7366283667863294];
const NATIVE_CLIMATE:StartingSiteClimate={revision:2,adoptedAt:0,calendarOrigin:241500,definition:{
  latitude:-38.97176371108642,longitude:71.34926369396949,
  meanTemperature:5.730848541160359,rainfall:1395.6754298880696,amplitude:18.10499532045594,
}};
let base:World|undefined;
function fixture():World {
  if(!base){
    const choice={version:1 as const,seed:42,tile:81},site=resolveStartingSite(choice);
    const party=startingPartyFromRoster(333,createStartingCandidateRoster(333));
    base=createScenarioWorld(site.seed,32,'crashlanded',site.site,party,choice);
    const tile=legacyPlanet(base).tiles[81]!;
    legacyPlanet(base).tiles[81]={...tile,center:[...NATIVE_CENTER],
      meanTemperature:NATIVE_CLIMATE.definition.meanTemperature,rainfall:NATIVE_CLIMATE.definition.rainfall};
    base.climate=structuredClone(NATIVE_CLIMATE);
  }
  // Keep a valid initial arrival rather than inventing the observed history.
  return structuredClone(base);
}
function climate(world:World):StartingSiteClimate {
  if(world.climate?.revision!==2)throw new Error('Expected starting climate');
  return world.climate;
}
/** The immediately greater representable value, independent of the tolerance. */
function nextUp(value:number):number {
  const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);
  view.setBigUint64(0,view.getBigUint64(0)+(value>=0?1n:-1n));return view.getFloat64(0);
}

describe('native starting climate precision without changing saved values',()=>{
  it('admits the recorded boreal geography and preserves the complete save on reload',()=>{
    const world=fixture(),before=structuredClone(world);
    expect(world.seed).toBe(562907305);expect(world.planet?.generationSeed).toBe(42);
    expect(world.planet?.homeTile).toBe(81);expect(world.site?.biome).toBe('boreal-forest');
    expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(true);
    expect(validateWorld(world)).toEqual([]);
    const resumed=deserializeWorld(serializeWorld(world));
    expect(resumed).toEqual(before);expect(resumed.climate).toEqual(NATIVE_CLIMATE);
    expect(world).toEqual(before);
  });

  for(const field of ['latitude','longitude','amplitude'] as const){
    it(`admits one adjacent representable ${field} value without rewriting it`,()=>{
      const world=fixture(),definition=climate(world).definition;
      definition[field]=nextUp(definition[field]);
      if(field==='latitude')definition.amplitude=seasonalAmplitude(definition.latitude);
      const before=structuredClone(world.climate);
      expect(validClimateDefinition(definition)).toBe(true);
      expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(true);
      expect(world.climate).toEqual(before);
    });
    for(const sign of [-1,1])it(`rejects ${field} tampering beyond 1e-11 (${sign})`,()=>{
      const world=fixture(),definition=climate(world).definition;
      definition[field]+=sign*2e-11;
      if(field==='latitude')definition.amplitude=seasonalAmplitude(definition.latitude);
      expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(false);
    });
    for(const invalid of [NaN,Infinity,-Infinity])it(`rejects nonfinite ${field}: ${invalid}`,()=>{
      const world=fixture();climate(world).definition[field]=invalid;
      expect(validClimateDefinition(climate(world).definition)).toBe(false);
      expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(false);
    });
  }

  for(const field of ['meanTemperature','rainfall'] as const){
    it(`rejects even one ULP of measured ${field} mismatch`,()=>{
      const world=fixture(),definition=climate(world).definition;
      definition[field]=nextUp(definition[field]);
      expect(definition[field]).not.toBe(NATIVE_CLIMATE.definition[field]);
      expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(false);
    });
  }
  for(const field of ['calendarOrigin','adoptedAt'] as const){
    it(`rejects ${field} + 1`,()=>{
      const world=fixture();climate(world)[field]+=1;
      expect(validSiteClimate(world.climate,SCHEMA_VERSION,world)).toBe(false);
    });
  }
  it('retains strict keys, revisions and geographic ranges',()=>{
    const world=fixture(),saved=climate(world);
    for(const bad of [{...saved,future:1},{...saved,[Symbol('future')]:1},{...saved,revision:3},
      {...saved,definition:{...saved.definition,future:1}},
      {...saved,definition:{...saved.definition,[Symbol('future')]:1}},
      {...saved,definition:{...saved.definition,latitude:91}},
      {...saved,definition:{...saved.definition,longitude:181}},
      {...saved,definition:{...saved.definition,amplitude:29}}]){
      expect(validSiteClimate(bad,SCHEMA_VERSION,world)).toBe(false);
    }
    expect(validSiteClimate(saved,229,world)).toBe(false);
  });
  it('keeps the derived comparison finite and limited to two machine epsilons',()=>{
    expect(sameDerivedClimateNumber(1,1+2*Number.EPSILON)).toBe(true);
    expect(sameDerivedClimateNumber(1,1+3*Number.EPSILON)).toBe(false);
    for(const invalid of [NaN,Infinity,-Infinity]){
      expect(sameDerivedClimateNumber(invalid,invalid)).toBe(false);
      expect(sameDerivedClimateNumber(1,invalid)).toBe(false);
    }
  });
});
