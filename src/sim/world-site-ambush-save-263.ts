import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import type {World} from './types.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,names:readonly string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
/** The caller's readonly actual construction may supply siteId before the map
 * header exists; loaded/MAIN maps derive it from their real registered header.
 * This never accepts a standalone persisted ambush as its own provenance. */
export function validWorldSiteAmbush263(w:World,version:number,constructionSiteId?:number):boolean {
 const d=Object.getOwnPropertyDescriptor(w,'worldSiteThreat263');if(!d)return !('worldSiteThreat263'in w);
 if(!isSchema263OrLater(version)||!d.enumerable||!Object.hasOwn(d,'value')||!plainWorldPawnData256(d.value)||!record(d.value))return false;
 const s=d.value,core=w.tick*10;
 if(!keys(s,['revision','siteId','kind','bornAtCore','points','payload','rng','storage','trigger','center','phase','activatedAtCore','releaseAtCore','lastTick','explosionAtCore','humanIds','animalIds','mechanoidIds'])||s.revision!==1||!int(s.siteId,1)||!['ambush-edge','ambush-hidden'].includes(String(s.kind))||!int(s.bornAtCore,0,core)||s.bornAtCore%10||typeof s.points!=='number'||!Number.isFinite(s.points)||s.points<0||s.points>8000||!['human','manhunters','mechanoids'].includes(String(s.payload))||!int(s.rng,1,0xffffffff)||!int(s.lastTick,s.bornAtCore/10,w.tick))return false;
 const rect=(v:unknown)=>record(v)&&keys(v,['minX','maxX','minZ','maxZ'])&&int(v.minX,0,w.width-1)&&int(v.maxX,v.minX,w.width-1)&&int(v.minZ,0,w.height-1)&&int(v.maxZ,v.minZ,w.height-1);
 if(!rect(s.storage)||!rect(s.trigger)||!record(s.center)||!keys(s.center,['x','z'])||!int(s.center.x,0,w.width-1)||!int(s.center.z,0,w.height-1))return false;
 const storage=s.storage as Record<'minX'|'maxX'|'minZ'|'maxZ',number>,trigger=s.trigger as typeof storage;
 if(trigger.minX!==Math.max(0,storage.minX-12)||trigger.maxX!==Math.min(w.width-1,storage.maxX+12)||trigger.minZ!==Math.max(0,storage.minZ-12)||trigger.maxZ!==Math.min(w.height-1,storage.maxZ+12)||s.center.x!==Math.floor((trigger.minX+trigger.maxX)/2)||s.center.z!==Math.floor((trigger.minZ+trigger.maxZ)/2))return false;
 if(s.explosionAtCore!==null&&(!int(s.explosionAtCore,s.bornAtCore,core)||s.kind!=='ambush-hidden'))return false;
 const all=new Set<number>();for(const name of ['humanIds','animalIds','mechanoidIds']as const){const a=s[name];if(!Array.isArray(a)||a.length>(name==='animalIds'?100:90)||a.some(id=>!int(id,1,w.nextId-1)||all.has(id)||!all.add(id)))return false;}
 if(s.payload!=='human'&&(s.humanIds as unknown[]).length||s.payload!=='manhunters'&&(s.animalIds as unknown[]).length||s.payload!=='mechanoids'&&(s.mechanoidIds as unknown[]).length)return false;
 if(s.phase==='armed'){if(s.activatedAtCore!==null||s.releaseAtCore!==null||all.size)return false;}
 else if(s.phase==='active'){if(!int(s.activatedAtCore,s.bornAtCore,core)||s.releaseAtCore!==s.activatedAtCore+(s.kind==='ambush-hidden'?120:0))return false;}
 else return false;
 const root=registeredCampaign(w),projection=w.campaignMap?.revision===2?w.campaignMap:undefined,mapId=root.worldMaps?registeredMapId(w):projection?.activeMapId,header=(root.worldMaps?.sites??projection?.maps??[]).find(m=>m.id===mapId),siteId=constructionSiteId??(header?.target263?.kind==='quest-site'?header.target263.siteId:undefined),site=w.worldSites263?.entries.find(x=>x.id===siteId);
 return s.siteId===siteId&&site?.kind==='item-stash'&&!site.closed&&(site.threat.kind==='ambush-edge'||site.threat.kind==='ambush-hidden')&&site.threat.kind===s.kind&&s.points===Math.fround(site.threat.points*Math.fround(.8));
}
