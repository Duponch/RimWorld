import { describe,expect,it } from 'vitest';
import { generateWorld } from '../src/sim/generation.ts';
import { generatePlanet,tileCoordinates } from '../src/sim/planet-generation.ts';
import { resolveSite } from '../src/sim/site.ts';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization.ts';
import { adoptSiteClimate,adoptStartingSiteClimate,automaticStartDay,climateDate,climateOriginAtAdoption,climateTick,
  planetTileClimateDefinition,seasonalAmplitude,seasonalOutdoorTemperature,siteClimateDefinition,startingSiteClimateOrigin,
  TEMPERATE_CLIMATE,TICKS_PER_YEAR,validClimateDefinition,type ClimateDefinition } from '../src/sim/site-climate.ts';
import { validSiteClimate } from '../src/sim/site-climate-save.ts';
import type { World } from '../src/sim/types.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

function fixture(latitude=22.21,meanTemperature=16.2):World {
  const world=generateWorld(42,16,16);
  world.site=resolveSite(world.seed,{biome:'temperate-forest',hilliness:'small-hills'});
  world.planet=generatePlanet(73,{biome:'temperate-forest',latitude,longitude:-18.23,meanTemperature,rainfall:923,hilliness:'small-hills'},0);
  world.scenario={id:'crashlanded',revision:9,landing:{x:8,z:8}};
  expect(adoptStartingSiteClimate(world,planetTileClimateDefinition(world.planet.tiles[0]!))).toBe(true);
  return world;
}
const definition=(latitude:number,meanTemperature=100):ClimateDefinition=>({latitude,longitude:0,meanTemperature,rainfall:900,amplitude:seasonalAmplitude(latitude)});

describe('climat prospectif de la vraie tuile de départ',()=>{
  it('dérive les champs de la tuile et adopte Auto à 06:00 sans modifier ressources ou RNG',()=>{
    const world=generateWorld(42,16,16),before=JSON.stringify(world),rng=world.rng;
    const planet=generatePlanet(73,{biome:'boreal-forest',latitude:-39.71,longitude:13.47,meanTemperature:5.3,rainfall:655},0);
    const tile=planet.tiles[0]!,climate=planetTileClimateDefinition(tile),coordinates=tileCoordinates(tile);
    expect(climate).toEqual({...coordinates,meanTemperature:5.3,rainfall:655,amplitude:seasonalAmplitude(coordinates.latitude)});
    expect(adoptStartingSiteClimate(world,climate)).toBe(true);
    expect(world.climate).toEqual({revision:2,adoptedAt:0,calendarOrigin:automaticStartDay(climate.latitude,5.3)*6000+1500,definition:climate});
    const {climate:adopted,...rest}=world;expect(rest).toEqual(JSON.parse(before));expect(world.rng).toBe(rng);
    expect(siteClimateDefinition(world)).toEqual(climate);expect(siteClimateDefinition(world)).not.toBe(climate);
    climate.meanTemperature=99;expect(siteClimateDefinition(world).meanTemperature).toBe(5.3);
    expect(climateTick(world)%6000).toBe(1500);
  });

  it('refuse de réadopter ou de retoucher une campagne ayant commencé',()=>{
    const world=fixture(),before=JSON.stringify(world);
    expect(adoptStartingSiteClimate(world,definition(60))).toBe(false);expect(JSON.stringify(world)).toBe(before);
    delete world.climate;world.tick=1;const elapsed=JSON.stringify(world);
    expect(adoptStartingSiteClimate(world,definition(60))).toBe(false);expect(JSON.stringify(world)).toBe(elapsed);
  });

  it('borne strictement chaque champ, l’amplitude et les clés de la définition',()=>{
    const good=definition(90);expect(validClimateDefinition(good)).toBe(true);expect(validClimateDefinition(definition(-90))).toBe(true);
    for(const bad of [null,[],{}, {...good,latitude:91},{...good,longitude:-181},{...good,meanTemperature:101},
      {...good,meanTemperature:NaN},{...good,rainfall:-1},{...good,rainfall:10001},{...good,amplitude:27},
      {...good,extra:1},{...good,[Symbol('extra')]:1},Object.defineProperty({...good},'rainfall',{get:()=>900})]) {
      expect(validClimateDefinition(bad)).toBe(false);
    }
    const world=generateWorld(42,16,16),before=JSON.stringify(world);
    expect(adoptStartingSiteClimate(world,{...good,rainfall:Infinity})).toBe(false);expect(JSON.stringify(world)).toBe(before);
  });

  it('valide uniquement le schéma 230 lié au site et à son homeTile',()=>{
    const world=fixture();expect(validSiteClimate(world.climate,230,world)).toBe(true);
    expect(validSiteClimate(world.climate,229,world)).toBe(false);
    expect(validSiteClimate({...world.climate,extra:1},230,world)).toBe(false);
    expect(validSiteClimate({...world.climate,[Symbol('extra')]:1},230,world)).toBe(false);
    expect(validSiteClimate({...world.climate,calendarOrigin:0},230,world)).toBe(false);
    expect(validSiteClimate({...world.climate,adoptedAt:1},230,{...world,tick:1})).toBe(false);
    expect(validSiteClimate(world.climate,230,{...world,planet:undefined})).toBe(false);
    expect(validSiteClimate(world.climate,230,{...world,site:{...world.site!,revision:2,biome:'boreal-forest'}})).toBe(false);
    expect(validSiteClimate(world.climate,230,{...world,site:{...world.site!,hilliness:'flat'}})).toBe(false);
    expect(validSiteClimate(world.climate,230,{...world,scenario:{...world.scenario!,revision:8}})).toBe(false);
    expect(validSiteClimate(world.climate,230,{...world,planet:{...world.planet!,adoptedAt:1}})).toBe(false);
    const changed=structuredClone(world);changed.planet!.homeTile=changed.planet!.civilianTile;
    expect(validSiteClimate(changed.climate,230,changed)).toBe(false);
  });

  it('rejette une température ou des précipitations modifiées indépendamment du globe',()=>{
    const world=fixture();if(world.climate?.revision!==2)throw new Error('Expected starting climate');
    for(const field of ['meanTemperature','rainfall','latitude','longitude'] as const){
      const changed=structuredClone(world.climate.definition);changed[field]+=1;
      if(field==='latitude')changed.amplitude=seasonalAmplitude(changed.latitude);
      expect(validSiteClimate({...world.climate,definition:changed},230,world)).toBe(false);
    }
  });

  it('renvoie false sans jeter sur un globe brut malformé, même avant validation planétaire',()=>{
    const world=fixture(),planet=world.planet!,tile=planet.tiles[0]!;
    const invalidTiles=[null,{}, {...tile,center:null},{...tile,center:[]},{...tile,center:[0,'1',0]},
      {...tile,center:[NaN,0,1]},{...tile,center:[0,0,0]},{...tile,center:[0,1]},
      {...tile,meanTemperature:'16'},{...tile,rainfall:Infinity},{...tile,id:1},{...tile,biome:'ocean'}];
    const invalidPlanets:unknown[]=[null,[],{}, {...planet,tiles:null},{...planet,tiles:[]},
      {...planet,homeTile:'0'},{...planet,homeTile:-1},{...planet,homeTile:162},
      ...invalidTiles.map(bad=>({...planet,tiles:planet.tiles.map((t,i)=>i===0?bad:t)}))];
    for(const bad of invalidPlanets){
      const input={...world,planet:bad} as unknown as World;
      expect(()=>validSiteClimate(world.climate,230,input)).not.toThrow();expect(validSiteClimate(world.climate,230,input)).toBe(false);
    }
  });

  it('conserve les quadrums et inverse les saisons australes seulement pour la révision 2',()=>{
    const north=fixture(60,100),south=fixture(-60,100);
    for(let quadrum=0;quadrum<4;quadrum++){
      north.tick=south.tick=quadrum*15*6000;
      expect(climateDate(north)).toEqual({year:5500,day:1,quadrum,season:['Printemps','Été','Automne','Hiver'][quadrum]});
      expect(climateDate(south)).toEqual({year:5500,day:1,quadrum,season:['Automne','Hiver','Printemps','Été'][quadrum]});
    }
    north.tick+=15*6000;expect(climateDate(north).year).toBe(5501);
  });

  it('continue les températures et le calendrier de la tuile après copie de sauvegarde',()=>{
    const world=fixture(-39.71,5.3);world.tick=71831;
    const resumed:World=JSON.parse(JSON.stringify(world));
    expect(validSiteClimate(resumed.climate,230,resumed)).toBe(true);
    for(const delta of [0,1,5,6,6000,TICKS_PER_YEAR]){
      expect(seasonalOutdoorTemperature(resumed,resumed.tick+delta)).toBe(seasonalOutdoorTemperature(world,world.tick+delta));
      resumed.tick=world.tick=71831+delta;expect(climateDate(resumed)).toEqual(climateDate(world));
    }
    expect(startingSiteClimateOrigin(0,siteClimateDefinition(world))).toBe(world.climate!.calendarOrigin);
  });
});

describe('conservation des climats historiques',()=>{
  it('conserve exactement rev1 et le monde 229 pendant migration et continuation',()=>{
    const world=generateWorld(72,16,16);world.tick=17234;expect(adoptSiteClimate(world)).toBe(true);
    const historical={...world,schemaVersion:229},resumed=deserializeWorld(JSON.stringify(historical));
    expect(resumed).toEqual({...historical,schemaVersion:SCHEMA_VERSION});
    expect(validSiteClimate(world.climate,229,world)).toBe(true);expect(validSiteClimate(resumed.climate,230,resumed)).toBe(true);
    expect(siteClimateDefinition(resumed)).toBe(TEMPERATE_CLIMATE);
    expect(resumed.climate!.calendarOrigin).toBe(climateOriginAtAdoption(world,17234));
    expect(deserializeWorld(serializeWorld(resumed))).toEqual(resumed);
    for(const tick of [17234,17235,23234,17234+TICKS_PER_YEAR]){
      world.tick=resumed.tick=tick;expect(climateTick(resumed)).toBe(climateTick(world));
      expect(seasonalOutdoorTemperature(resumed)).toBe(seasonalOutdoorTemperature(world));expect(climateDate(resumed)).toEqual(climateDate(world));
    }
  });

  it('ne crée aucun climat ni globe pendant migration d’un monde 229 non adopté',()=>{
    const world=generateWorld(73,16,16),historical={...world,schemaVersion:229};
    const resumed=deserializeWorld(JSON.stringify(historical));expect(resumed).toEqual({...historical,schemaVersion:SCHEMA_VERSION});
    expect(resumed.climate).toBeUndefined();expect(resumed.planet).toBeUndefined();
  });
});
