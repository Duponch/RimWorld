import {legacyFlora} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {BIOME_FLORA} from '../src/sim/biome-flora';
import {faunaBiome} from '../src/sim/animal-species';
import {selectProspectiveBiome,prospectiveBiomeScores} from '../src/sim/tundra-world';
import {generateStartingWorld,startingSiteChoices,resolveStartingSite} from '../src/sim/starting-world';
import {createScenarioWorld} from '../src/sim/new-game';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {stepWorld} from '../src/sim/engine';
import {validSite} from '../src/sim/site';
import {validatePlanet} from '../src/sim/planet-save';
import {validSiteClimate} from '../src/sim/site-climate-save';
import {validTundraTransport,tundraHistoricalFieldsAbsent} from '../src/sim/tundra-save';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';

test('four delivered candidates use the verified scores and reject unsupported dry climates',()=>{
 expect(selectProspectiveBiome(-12,700)).toBe('tundra');expect(selectProspectiveBiome(-10,600)).toBe('boreal-forest');expect(selectProspectiveBiome(16.2,900)).toBe('temperate-forest');expect(selectProspectiveBiome(30,650)).toBe('arid-shrubland');
 expect(prospectiveBiomeScores(-12,700).find(([b])=>b==='tundra')![1]).toBe(12);expect(()=>selectProspectiveBiome(30,599)).toThrow();
});

test('tundra ecology preserves absent species weights and actual density',()=>{
 const flora=BIOME_FLORA.tundra;expect(flora.plantDensity).toBe(.19);expect(flora.regrowDays).toBe(28);expect(flora.totalCoreWeight).toBe(9.26);expect(Object.values(flora.weights).reduce((a,b)=>a+b,0)).toBeCloseTo(4.38);
 const fauna=faunaBiome('tundra',true);expect(fauna.animalDensity).toBe(1.1);expect(fauna.totalCommonality).toBe(13.53);expect(fauna.entries.map(e=>[e.species,e.commonality])).toEqual([['hare',2],['snow-hare',2],['muffalo',1]]);
});

test('v1 reconstruction stays the default; v2 is explicit, cold, score classified and deterministic',()=>{
 for(const seed of [42,84618]){
  const legacy=generateStartingWorld(seed);expect(legacy).toEqual(generateStartingWorld(seed,1));expect(legacy.revision).toBe(1);expect(legacy.tiles.some(t=>t.biome==='tundra')).toBe(false);
  const next=generateStartingWorld(seed,2);expect(next).toEqual(generateStartingWorld(seed,2));expect(next.revision).toBe(2);expect(next.tiles.every(t=>t.rainfall>=600&&t.rainfall<=1800)).toBe(true);
  for(const t of next.tiles)if(t.biome!=='ocean'&&t.id!==0)expect(t.biome).toBe(selectProspectiveBiome(t.meanTemperature,t.rainfall));
 }
});

test('prepared local tundra starts a real colony with snow, sparse ecology and its cold preset',()=>{
 const w=createScenarioWorld(42,64,'crashlanded',{biome:'tundra',hilliness:'small-hills'});expect(w.site?.biome).toBe('tundra');expect(legacyFlora(w).biome).toBe('tundra');expect(w.wildlife?.population?.biome).toBe('tundra');expect(w.snow?.lastTick).toBe(0);expect(w.climate?.revision).toBe(1);expect(validTundraTransport(w,239)).toBe(true);
 const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);stepWorld(w,20);stepWorld(copy,20);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const before=structuredClone(w);const bad=JSON.parse(serializeWorld(w));
 for(const policy of bad.apparelPolicies)policy.allowedItems=policy.allowedItems.filter((item:string)=>item!=='recon-armor'&&!item.endsWith('-tuque'));
 for(const tile of bad.tiles)if(tile.ore==='uranium')delete tile.ore;
 bad.schemaVersion=238;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Future tundra provenance/);expect(w).toEqual(before);
});

test('prospective globe tundra preserves the exact chosen tile climate through launch and bridge',()=>{
 let selected:{seed:number;tile:number}|undefined;
 for(const seed of [42,84618,901]){const p=generateStartingWorld(seed,2),tile=startingSiteChoices(p).find(id=>p.tiles[id]!.biome==='tundra');if(tile!==undefined){selected={seed,tile};break;}}
 expect(selected).toBeDefined();if(!selected)throw Error('no selectable tundra in bounded seeds');const choice={version:2 as const,...selected},resolved=resolveStartingSite(choice);
 const w=createScenarioWorld(resolved.seed,64,'crashlanded',resolved.site,undefined,choice);expect(w.planet?.revision).toBe(2);expect(w.climate?.revision).toBe(2);expect(validSiteClimate(w.climate,239,w)).toBe(true);expect(validSiteClimate(w.climate,238,w)).toBe(false);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(adopted.status).toBe('applied');stepWorld(w,10);expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('applied');expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('historical and current provenance gates reject toundra contamination without migration',()=>{
 const w=createScenarioWorld(42,64,'crashlanded',{biome:'tundra',hilliness:'small-hills'});expect(validSite(w.site,238,w.scenario)).toBe(false);expect(tundraHistoricalFieldsAbsent(w,238)).toBe(false);
 const p=generateStartingWorld(42,2);expect(validatePlanet(p,w,238).length).toBeGreaterThan(0);const legacy=structuredClone(p);legacy.revision=1;expect(validatePlanet(legacy,w,239).length).toBeGreaterThan(0);
 const bad=structuredClone(w);delete bad.snow;expect(validTundraTransport(bad,239)).toBe(false);const packet=structuredClone(new SnapshotEncoder().encode(bad,0,6));expect(new SnapshotDecoder().adopt(packet).status).toBe('resync');
});


test('local tundra cannot discard its mandatory cold climate through RAW or checkpoint',()=>{
 const w=createScenarioWorld(42,64,'crashlanded',{biome:'tundra',hilliness:'small-hills'});expect(w.scenario?.revision).toBeLessThan(9);delete w.climate;
 expect(validTundraTransport(w,239)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
 expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6))).status).toBe('resync');
});
