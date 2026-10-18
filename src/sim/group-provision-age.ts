import {planetHomeCivilCore,planetAbsoluteCore256} from './planet-navigation.ts';
import {planetGeography256} from './planet-geography-256.ts';
import {worldSeasonalTemperature} from './world-surface-movement.ts';
import {mixedGroupProvisions,groupPemmicanCounter,setGroupPemmicanCounter} from './group-provisions.ts';
import {rotAge,rotRateAtTemperature,ticksUntilRot} from './food-preservation.ts';
import {seasonTemperature,geographicPlanetClimateDefinition256,geographicOutdoorTemperature262} from './site-climate.ts';
import {calendarTick} from './calendar.ts';
import {tileCoordinates} from './planet-generation.ts';
import type {GroupState} from './group-state.ts';
import type {World,MaterialPile} from './types.ts';
type Away=Extract<GroupState,{members:unknown}>;
export function groupAmbientTemperature256(w:World,g:Away,atCore=w.tick*10):number {
 const planet=w.planet!;
 const civil=(planetHomeCivilCore(w)-(w.tick*10-atCore))/10;
 if(planet.revision===3){const tile=planetGeography256(planet).surface.tiles[g.tile];if(!tile)throw Error('Unknown geographic provision climate tile');if(w.climate?.revision===4&&w.climate.irregular262===true)return geographicOutdoorTemperature262(geographicPlanetClimateDefinition256(planet,g.tile),g.tile,planetAbsoluteCore256(planet,planetHomeCivilCore(w)-(w.tick*10-atCore)));return worldSeasonalTemperature(tile,planetAbsoluteCore256(planet,civil*10));}
 const tile=planet.tiles[g.tile];if(!tile)throw Error('Unknown literal provision climate tile');
 return seasonTemperature(tileCoordinates(tile).latitude,tile.meanTemperature,civil);
}
export function groupProvisionClimateRate(w:World,g:Away):number{return rotRateAtTemperature(groupAmbientTemperature256(w,g));}
function provisions(g:Away):MaterialPile[]{
 const owners=new Set([...g.members,...g.animalOwners?.members??[]].map(p=>p.id));
 return g.items.filter(p=>p.item==='pemmican'&&p.owner.type==='inventory'&&owners.has(p.owner.pawnId));
}
/** At actual committed departure, settle the map interval then use the current
 * planet tile. No stock creation, re-aging or former fridge rate kept forever. */
export function adoptGroupProvisionClimate(w:World,g:Away):void {
 if(!mixedGroupProvisions(g))return;const rate=groupProvisionClimateRate(w,g);
 for(const p of provisions(g))p.rot={progress:rotAge(p,w.tick),atTick:w.tick,...rate!==1?{rate}:{}};
}
/** Before personal deaths/ingestion. Only real prospective provision owners
 * age; frozen terminal inventories and the historical mode are untouched. */
export function advanceGroupProvisionAges(w:World,g:Away):void {
 if(!mixedGroupProvisions(g))return;
 const rate=groupProvisionClimateRate(w,g),items=provisions(g),expired=items.filter(p=>ticksUntilRot(p,w.tick)<=0),units=expired.reduce((n,p)=>n+p.quantity,0);
 if(!Number.isSafeInteger(groupPemmicanCounter(g,'spoiled')+units)||!Number.isSafeInteger((w.spoiled.pemmican??0)+units))throw Error('Group spoilage counter overflow');
 const expiredIds=units?new Set(expired.map(p=>p.id)):undefined;
 for(const p of items)if(!expiredIds?.has(p.id)&&rate!==(p.rot?.rate??1))p.rot={progress:rotAge(p,w.tick),atTick:w.tick,...rate!==1?{rate}:{}};
 if(!units)return;g.items=g.items.filter(p=>!expiredIds!.has(p.id));
 setGroupPemmicanCounter(g,'spoiled',groupPemmicanCounter(g,'spoiled')+units);w.spoiled.pemmican=(w.spoiled.pemmican??0)+units;
 w.events.push({tick:w.tick,type:'need',message:`${units} unités de pemmican du groupe ont pourri.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
