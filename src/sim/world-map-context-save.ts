import type {World} from './types.ts';
import {validGeographicSiteClimate256} from './site-climate-save.ts';
import type {WorldGroupRecord} from './world-map-state.ts';
import {validMapDimension} from './map-config.ts';
import {validScenario} from './scenario-save.ts';
import {validSite} from './site.ts';
import {validClimateDefinition,validGeographicClimateDefinition256} from './site-climate.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Header metadata only; neither a map geometry witness nor historical regeneration. */
export function validGroupMapContext(value:unknown,tick:number,version=255,geography?:Pick<World,'planet'|'worldMaps'|'campaignMap'>):value is WorldGroupRecord['context'] {if(!object(value)||!Object.hasOwn(value,'seed')||!Object.hasOwn(value,'width')||!Object.hasOwn(value,'height')||Object.keys(value).some(k=>!['seed','width','height','climate','site','scenario'].includes(k))||!int(value.seed,0,0xffffffff)||!validMapDimension(value.width)||!validMapDimension(value.height))return false;
 let budget=2048;const plain=(v:unknown,depth=0):boolean=>{if(v===null||typeof v!=='object')return typeof v!=='function'&&typeof v!=='symbol';if(depth>12||--budget<0)return false;if(Array.isArray(v)){if(Reflect.ownKeys(v).length!==v.length+1)return false;for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!('value'in d)||!plain(d.value,depth+1))return false;}return true;}return object(v)&&Object.values(v).every(x=>plain(x,depth+1));};if(!plain(value)||!validScenario(value.scenario,version,value.width,value.height))return false;
 const c=value.climate;if(c!==undefined){if(!object(c)||!int(c.adoptedAt,0,tick)||!Number.isSafeInteger(c.calendarOrigin))return false;if(c.revision===1){if(Object.keys(c).length!==4||!['revision','profile','adoptedAt','calendarOrigin'].every(k=>Object.hasOwn(c,k))||!['temperate-reference','boreal-reference','arid-reference','tundra-preset'].includes(c.profile as string))return false;}else if(c.revision===4){if(version<256||Object.keys(c).length!==5||!['revision','adoptedAt','calendarOrigin','tileId','definition'].every(k=>Object.hasOwn(c,k))||!int(c.tileId)||!validGeographicClimateDefinition256(c.definition)||!geography)return false;}else if((c.revision!==2&&c.revision!==3)||Object.keys(c).length!==4||!['revision','definition','adoptedAt','calendarOrigin'].every(k=>Object.hasOwn(c,k))||!validClimateDefinition(c.definition))return false;}
 if(!validSite(value.site,version,value.scenario as WorldGroupRecord['context']['scenario'],object(c)&&(c.revision===3||version>=256&&c.revision===4)))return false;
 return !object(c)||c.revision!==4||!!geography&&validGeographicSiteClimate256(c,version,{...geography,tick,site:value.site as World['site']});
}
