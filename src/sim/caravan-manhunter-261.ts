import {CARAVAN_MANHUNTER_DATA_261} from './caravan-manhunter-data-261.ts';
import {INITIAL_ANIMAL_FACTS_256,type InitialAnimalFact256} from './initial-animal-data-256.ts';
import {constructFreshInitialWildAnimal256} from './initial-animal-constructor-256.ts';
import {stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {roundWorldInteger} from './world-rivers.ts';
import {worldSeasonalTemperature,worldSurfaceCoordinates} from './world-surface-movement.ts';
import {planetTile} from './planet-geography-256.ts';
import {planetAbsoluteCore256,planetHomeCivilCore} from './planet-navigation.ts';
import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import {combineWorldSeed} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import type {CampaignState} from './world-map-state.ts';
import type {WildAnimal} from './wildlife-state.ts';
const f=Math.fround,facts=INITIAL_ANIMAL_FACTS_256 as Readonly<Record<string,InitialAnimalFact256>>;
type Kind=typeof CARAVAN_MANHUNTER_DATA_261[number];
export function manhunterWeight261(power:number,points:number):number {
 const budget=Math.max(f(points),70);if(f(power*2)>budget)return 0;
 const count=Math.min(roundWorldInteger(f(budget/power)),100);return Math.max(0,Math.min(1,f(f(100-count)/90)));
}
/** Native tile hash and annual/daily/sun facts, existing independent Perlin.
 * Pure current frontier: no unsaved temperature cache enters save behavior. */
export function manhunterTileTemperatures261(root:CampaignState,tileId:number):{season:number;outdoor:number}|undefined {
 const planet=root.planet;if(planet?.revision!==3)return;const tile=planetTile(planet,tileId);if(!tile||!('elevation'in tile))return;
 const absolute=planetAbsoluteCore256(planet,planetHomeCivilCore(root)),tick=absolute===0?1:absolute,season=worldSeasonalTemperature(tile,tick),longitude=worldSurfaceCoordinates(tile).longitude;
 const dayTick=((tick+geographicLongitudeOffsetCore256(longitude))%60000+60000)%60000,day=f((dayTick||1)/60000),angle=f(f(f(Math.PI)*2)*f(day+f(.32))),sun=f(f(Math.cos(angle))*7);
 const noise=createWorldPerlin({frequency:4.999999873689376e-6,lacunarity:2,persistence:.5,octaves:3,quality:'medium',seed:combineWorldSeed(Math.imul(tileId,397),199372327)}),daily=f(f(noise(tick,0,0))*7);
 return {season,outdoor:f(season+f(daily+sun))};
}
export function selectManhunterKind261(points:number,temperature:{season:number;outdoor:number}|undefined,draw:()=>number):Kind|undefined {
 const rows=CARAVAN_MANHUNTER_DATA_261.filter(r=>r.canArrive&&r.passesFences&&(!temperature||temperature.season>r.minimum&&temperature.season<r.maximum&&temperature.outdoor>r.minimum&&temperature.outdoor<r.maximum));
 let total=f(0),selected:Kind|undefined;
 for(const row of rows){const weight=manhunterWeight261(row.power,points);total=f(total+weight);if(total>0&&draw()<f(weight/total))selected=row;}
 if(selected)return selected;
 if(rows.length&&points>Math.min(...rows.map(r=>r.power))*2)return rows.reduce((a,b)=>a.power>=b.power?a:b);
}
/** Current fresh animal producer (declared NPC-generation adaptation; no native
 * WorldPawn reuse/random/name parity). Unsupported history is visible/repeatable;
 * it is never retried with a healthy replacement or another species. */
export function draftManhunterRoster261(root:CampaignState,tile:number,basePoints:number,initialRng:number,canFireChecked=false):{animals:WildAnimal[];nextId:number;rng:number}|undefined {
 const points=f(basePoints*.75),stream=stagedCampArrivalRandom256(initialRng),random={value:stream.value,integer:stream.integer,float:(min:number,max:number)=>max<=min?f(min):f(f(stream.value()*f(f(max)-f(min)))+f(min))};
 if(!canFireChecked&&!selectManhunterKind261(points,undefined,random.value))return;
 const temperature=manhunterTileTemperatures261(root,tile);if(!temperature)throw Error('Missing actual Manhunter tile climate');
 const kind=selectManhunterKind261(points,temperature,random.value)??selectManhunterKind261(points,undefined,random.value);if(!kind)return;
 const count=Math.max(2,Math.min(100,roundWorldInteger(f(points/kind.power)))),animals:WildAnimal[]=[];let nextId=root.nextId;
 for(let i=0;i<count;i++){
  if(!Number.isSafeInteger(nextId+1))throw Error('Manhunter animal namespace exhausted');
  const made=constructFreshInitialWildAnimal256({fact:facts[kind.defId]!,id:nextId++,cell:{x:0,z:0},tick:root.tick,random});
  if(made.status==='blocked')throw Error(`Manhunter ${kind.defId}: ${made.reason}`);
  animals.push(made.animal);
 }
 return {animals,nextId,rng:stream.rng};
}
