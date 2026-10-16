import {mixedGroupProvisions} from './group-provisions.ts';
import {rotAge,rotRateAtTemperature,ticksUntilRot} from './food-preservation.ts';
import {seasonTemperature} from './site-climate.ts';
import {calendarTick} from './calendar.ts';
import {tileCoordinates} from './planet-generation.ts';
import type {GroupState} from './group-state.ts';
import type {World,MaterialPile} from './types.ts';
type Away=Extract<GroupState,{members:unknown}>;
function climateRate(w:World,g:Away):number {
 const tile=w.planet!.tiles[g.tile]!;
 const civil=calendarTick(w)-(w.expeditionSite?.calendarOffset??0);
 return rotRateAtTemperature(seasonTemperature(tileCoordinates(tile).latitude,tile.meanTemperature,civil));
}
function provisions(g:Away):MaterialPile[]{
 const owners=new Set(g.members.map(p=>p.id));
 return g.items.filter(p=>p.item==='pemmican'&&p.owner.type==='inventory'&&owners.has(p.owner.pawnId));
}
/** At actual committed departure, settle the map interval then use the current
 * planet tile. No stock creation, re-aging or former fridge rate kept forever. */
export function adoptGroupProvisionClimate(w:World,g:Away):void {
 if(!mixedGroupProvisions(g))return;const rate=climateRate(w,g);
 for(const p of provisions(g))p.rot={progress:rotAge(p,w.tick),atTick:w.tick,...rate!==1?{rate}:{}};
}
/** Before personal deaths/ingestion. Only real prospective provision owners
 * age; frozen terminal inventories and the historical mode are untouched. */
export function advanceGroupProvisionAges(w:World,g:Away):void {
 if(!mixedGroupProvisions(g))return;
 const rate=climateRate(w,g),items=provisions(g),expired=items.filter(p=>ticksUntilRot(p,w.tick)<=0),units=expired.reduce((n,p)=>n+p.quantity,0);
 if(!Number.isSafeInteger(g.provisions!.pemmicanSpoiledUnits+units)||!Number.isSafeInteger((w.spoiled.pemmican??0)+units))throw Error('Group spoilage counter overflow');
 const expiredIds=units?new Set(expired.map(p=>p.id)):undefined;
 for(const p of items)if(!expiredIds?.has(p.id)&&rate!==(p.rot?.rate??1))p.rot={progress:rotAge(p,w.tick),atTick:w.tick,...rate!==1?{rate}:{}};
 if(!units)return;g.items=g.items.filter(p=>!expiredIds!.has(p.id));
 g.provisions!.pemmicanSpoiledUnits+=units;w.spoiled.pemmican=(w.spoiled.pemmican??0)+units;
 w.events.push({tick:w.tick,type:'need',message:`${units} unités de pemmican du groupe ont pourri.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
