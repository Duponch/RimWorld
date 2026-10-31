import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {newCorePathBudget297} from './core-path-budget-297.ts';
import {validateCapturedGeographicMapInit256,type CapturedGeographicMapInit256} from './geographic-map-init-context-256.ts';
import {createMineableGenerationRecorder256} from './local-mineable-generation-256.ts';
/** Actual geographic map construction shared by the new home and temporary
 * maps. This is the physical-terrain frontier, not a completed scenario:
 * definition steps (deposits, roads, ruins, arrivals, plants and animals)
 * still belong to the caller's ordered generation pipeline. */
import type {World,Tile} from './types.ts';
import type {GeographicPlanetState} from './planet-state.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';
import {emptyGeographicLandscape256} from './generation.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {geographicLocalSite256} from './site-geographic-256.ts';
import {describeWorldSite,surfaceCoastAngle256} from './world-site-geography.ts';
import {LOCAL_BIOME_RULES_256} from './local-biome-rules-v256.ts';
import {localMapInit256} from './local-map-init-256.ts';
import {composeLocalSurface256,type LocalDefinitionContext256} from './local-composition-256.ts';
import {createGeographicSiteClimate256,seasonalOutdoorTemperature} from './site-climate.ts';
import {createDeteriorationState} from './deterioration-content.ts';
import {newBreakdownCalendar} from './breakdowns.ts';
import {createApparelWearCalendar} from './apparel-renewal.ts';

export interface GeographicPhysicalMapInputs256 {
 readonly planet:GeographicPlanetState;readonly factions:WorldFactionRegistry256;
 readonly tile:number;readonly width:number;readonly height:number;
 readonly schemaVersion?:number;
 readonly tick:number;readonly calendarOrigin:number;readonly nextId:number;readonly rng:number;
 readonly definitionContext:LocalDefinitionContext256;
 /** Actual captured successful pre-mutator stream. Omission preserves the closed default. */
 readonly init?:CapturedGeographicMapInit256;
 /** Required by composed factories; omitted only by isolated terrain controls. */
 readonly initialWeather?:{readonly gameInitDataPresent:boolean;readonly daysPassedSinceSettle:number};
}
export function prepareGeographicPhysicalMap256(input:GeographicPhysicalMapInputs256){
 const {planet,factions,tile,width,height,tick,calendarOrigin,nextId,rng}=input;
 if(!input.definitionContext||!Number.isSafeInteger(tick)||tick<0||!Number.isSafeInteger(calendarOrigin)||!Number.isSafeInteger(nextId)||nextId<1||!Number.isSafeInteger(rng)||rng<1||rng>0xffffffff||factions.generatedAt>tick)throw Error('Missing actual campaign clocks or ownership frontier');
 const owner=planetGeography256(planet),description=describeWorldSite(owner.surface,owner.roads,tile);
 const site=geographicLocalSite256(planet,tile),rules=LOCAL_BIOME_RULES_256[site.biome];
 if(input.init!==undefined)validateCapturedGeographicMapInit256(input.init,description.mapSeed,width,height);
 const init=input.init??localMapInit256(description.mapSeed,width,height);
 const world:World=emptyGeographicLandscape256(description.mapSeed,width,height);
 world.tick=tick;if(isCorePhysicalSchema297(Number(input.schemaVersion??world.schemaVersion)))world.corePathBudget297=newCorePathBudget297(tick);else delete world.corePathBudget297;world.rng=rng;world.planet=planet;world.worldFactions=factions;world.site=site;
 world.climate=createGeographicSiteClimate256(planet,tile,{tick,calendarOrigin,schemaVersion:input.schemaVersion});
 const mineables=createMineableGenerationRecorder256(width,height,nextId);
 const composition=composeLocalSurface256({width,height,site:description,rules,mutatorCode:site.mutatorCode,mineableOwner:mineables,
  lakeCoastAngle:surfaceCoastAngle256(owner.surface,tile,'lake'),init,definitionContext:input.definitionContext,
  ...input.initialWeather?{initialWeather:{...input.initialWeather,tick,runtimeSeed:world.seed,outsideTemperature:seasonalOutdoorTemperature(world),rainfall:world.climate.definition.rainfall,tutorial:input.definitionContext.tutorial,forcedWeather:null,largeFire:false,preventRain:false,rainDisabledUntilCore:0,activeConditionCount:0 as const}}:{}});
 const mineablePlan=mineables.finish({edifices:composition.rocks.edifices,stones:composition.rocks.stones,ores:composition.deposits?.ores,terrain:composition.terrain});
 world.nextId=mineablePlan.nextId;
 if(composition.initialWeather)world.weather=composition.initialWeather.weather;
 world.deterioration=createDeteriorationState(world.seed,tick);world.breakdown=newBreakdownCalendar(world.seed,tick);
 world.apparelWear=createApparelWearCalendar(tick,(world.seed^0x0a77e1)>>>0);
 world.tiles=composition.terrain.map((ground,index):Tile=>{
  const edifice=composition.rocks.edifices[index]===1;
  const ore=composition.deposits?.ores[index];
  return edifice?{terrain:'rock',stone:composition.rocks.stones[index]!,mineable:mineablePlan.owners.get(index)!,...(ore?{ore}:{})}:ground==='rough-stone'?{terrain:ground,stone:composition.rocks.stones[index]!}:{terrain:ground};
 });
 const thin:number[]=[],thick:number[]=[];
 for(let i=0;i<composition.rocks.roof.length;i++){const roof=composition.rocks.roof[i];if(roof===1)thin.push(i);else if(roof===2)thick.push(i);}
 if(thin.length||thick.length)world.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin,thick}};
 return {frontier:'physical-terrain-only' as const,world,description,composition,initialization:{gasDiffusionCycleIndex:init.gasDiffusionCycleIndex,...composition.initialWeather?{outerRandom:init.random,outerAfterWeather:composition.initialWeather.outerAfterWeather}:{}}};
}
