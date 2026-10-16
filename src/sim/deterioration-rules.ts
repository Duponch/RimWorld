import {footprintCells} from './definitions.ts';
import {isShelfKind} from './shelf-storage.ts';
import {isRoofed} from './roof-rules.ts';
import {weatherRainRate} from './weather.ts';
import {DETERIORATION_RATES,isDeteriorationItem} from './deterioration-content.ts';
import type {ThermalLayout} from './thermal-topology.ts';
import type {MaterialPile,World} from './types.ts';
export type DeteriorationStatus='outside'|'covered-outside'|'unroofed-inside'|'protected-shelf'|'protected-inside'|'terrain-exposed'|'not-ground'|'out-of-scope';
export interface DeteriorationExposure {status:DeteriorationStatus;baseRate:number;rate:number;roofed:boolean;usesOutdoorTemperature:boolean;terrainFactor:number}
export interface DeteriorationEnvironment {shelves:ReadonlySet<number>;rain:number;layout?:ThermalLayout}
/** One rare pass or selected-pile inspection; no grid or thermal flood. */
export function captureDeteriorationEnvironment(w:World,layout?:ThermalLayout):DeteriorationEnvironment {
 const shelves=new Set<number>();for(const s of w.structures)if(isShelfKind(s.kind)&&s.shelf)for(const c of footprintCells(s))shelves.add(c.z*w.width+c.x);
 return {shelves,rain:weatherRainRate(w),layout};
}
function containsSorted(cells:readonly number[],cell:number):boolean {let low=0,high=cells.length-1;while(low<=high){const mid=(low+high)>>>1,v=cells[mid]!;if(v===cell)return true;if(v<cell)low=mid+1;else high=mid-1;}return false;}
/** Snapshot path uses serialized retained thermal regions, not a new layout build. */
export function deteriorationExposure(w:World,pile:MaterialPile,environment?:DeteriorationEnvironment):DeteriorationExposure {
 const neutral={baseRate:0,rate:0,roofed:false,usesOutdoorTemperature:true,terrainFactor:0};
 if(w.schemaVersion<252||!isDeteriorationItem(pile.item))return {status:'out-of-scope',...neutral};
 const baseRate=DETERIORATION_RATES[pile.item];if(pile.owner.type!=='ground')return {status:'not-ground',...neutral,baseRate};
 const e=environment??captureDeteriorationEnvironment(w),cell=pile.owner.z*w.width+pile.owner.x;
 const roofed=isRoofed(w,cell),inside=e.layout?(e.layout.indices[cell]??-1)>=0:(w.thermal?.regions??[]).some(r=>containsSorted(r.cells,cell));
 const tile=w.tiles[cell],terrainFactor=tile&&(tile.terrain==='marsh'||tile.terrain==='water')&&!tile.bridge&&!tile.floor?3:0;
 const flags={baseRate,roofed,usesOutdoorTemperature:!inside,terrainFactor};
 if(e.shelves.has(cell))return {status:'protected-shelf',...flags,rate:0};
 const rate=baseRate*((roofed?0:.5)+(inside?0:.5)+terrainFactor)*(roofed?1:1+4*e.rain);
 return {status:rate===0?'protected-inside':roofed&&inside?'terrain-exposed':roofed?'covered-outside':inside?'unroofed-inside':'outside',...flags,rate};
}
