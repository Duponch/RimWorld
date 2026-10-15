import {validSite} from './site.ts';
import {validSiteClimate} from './site-climate-save.ts';
import {validateWildFlora} from './wild-flora.ts';
import type {World} from './types.ts';
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
/** Before any historical migration/projection can discard future provenance.
 * Wildlife's previously admitted dormant tundra profile stays historical. */
export function tundraHistoricalFieldsAbsent(raw:unknown,version:number):boolean {
 if(version>=239)return true;if(!record(raw))return false;
 if(record(raw.site)&&raw.site.biome==='tundra'||record(raw.flora)&&raw.flora.biome==='tundra'||record(raw.climate)&&raw.climate.profile==='tundra-preset')return false;
 const p=raw.planet;return !record(p)||p.revision!==2&&(!Array.isArray(p.tiles)||!p.tiles.some(t=>record(t)&&t.biome==='tundra'));
}
/** Shared RAW/full/delta gate on the fully reconstructed candidate. Other
 * biomes retain their existing admission path; no recomputation or adoption. */
export function validTundraTransport(w:World,version:number):boolean {
 if(!tundraHistoricalFieldsAbsent(w,version))return false;
 if(w.site?.biome!=='tundra')return w.flora?.biome!=='tundra'&&!(w.climate?.revision===1&&w.climate.profile==='tundra-preset');
 return version>=239&&w.site.revision===2&&w.snow!==undefined&&w.climate!==undefined&&validSite(w.site,version,w.scenario,w.expeditionSite!==undefined)&&validateWildFlora(w,version)&&validSiteClimate(w.climate,version,w);
}
