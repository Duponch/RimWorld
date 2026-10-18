import {foggedCell256} from './exploration-state-256.ts';
import {isColonist} from './affiliation.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
import type {ItemStash263} from './world-sites-state-263.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World,Cell} from './types.ts';
/** Actual prospective SignalAction/RectTrigger continuation; no pawn or item
 * owner is represented twice, and no loaded historical map gains a trigger. */
export interface WorldSiteAmbush263 {
 revision:1;siteId:number;kind:'ambush-edge'|'ambush-hidden';bornAtCore:number;
 points:number;payload:'human'|'manhunters'|'mechanoids';rng:number;
 storage:AncientRect256;trigger:AncientRect256;center:Cell;
 phase:'armed'|'active';activatedAtCore:number|null;releaseAtCore:number|null;
 lastTick:number;explosionAtCore:number|null;
 humanIds:number[];animalIds:number[];mechanoidIds:number[];
}
export const AMBUSH_SEED_PARTS_263={'ambush-edge':1412216193,'ambush-hidden':921085483} as const;
/** Called at the genuine1600 phase, AFTER Fog1500, using its own actual
 * generation stream. The selected result is saved, never selected on load. */
export function armWorldSiteAmbush263(w:World,site:ItemStash263,storage:AncientRect256,random:WorldGenerationRandom):void {
 if(Number(w.schemaVersion)!==263||w.worldSiteThreat263||!['ambush-edge','ambush-hidden'].includes(site.threat.kind)||site.mapId!==null||site.closed)throw Error('Actual unpublished263 Site ambush required');
 if(site.threat.kind!=='ambush-edge'&&site.threat.kind!=='ambush-hidden')throw Error('Actual ambush tag required');
 const points=Math.fround(site.threat.points*Math.fround(.8)),ticket=random.integer(0,3),canMech=points>=110&&!!w.worldFactions?.factions.some(f=>f.def==='Mechanoid'&&!f.lifecycle259?.defeated);
 const payload=ticket===0?'manhunters':ticket===1&&canMech?'mechanoids':'human',trigger={minX:Math.max(0,storage.minX-12),maxX:Math.min(w.width-1,storage.maxX+12),minZ:Math.max(0,storage.minZ-12),maxZ:Math.min(w.height-1,storage.maxZ+12)},center={x:Math.floor((trigger.minX+trigger.maxX)/2),z:Math.floor((trigger.minZ+trigger.maxZ)/2)};
 w.worldSiteThreat263={revision:1,siteId:site.id,kind:site.threat.kind,bornAtCore:w.tick*10,points,payload,rng:(random.integerValue()>>>0)||1,storage:{...storage},trigger,center,phase:'armed',activatedAtCore:null,releaseAtCore:null,lastTick:w.tick,explosionAtCore:null,humanIds:[],animalIds:[],mechanoidIds:[]};
}
const inside=(c:Cell,r:AncientRect256)=>c.x>=r.minX&&c.x<=r.maxX&&c.z>=r.minZ&&c.z<=r.maxZ;
/** Whether this actual10Core local window crosses the hash60 consultation.
 * Testing only its last Core tick would permanently miss9/10 SiteID phases. */
export function siteAmbushHashDue263(tick:number,siteId:number):boolean {
 if(!Number.isSafeInteger(tick)||tick<1||!Number.isSafeInteger(siteId)||siteId<1)return false;
 const startModulo=((tick-1)%6)*10,until=(60-(startModulo+siteId%60)%60)%60||60;return until<=10;
}
/** Unfog has the normal true-tick cadence; rectangle consultation is60Core.
 * SiteId phases the original local interval instead of claiming Core ThingID
 * parity. No elapsed checks are replayed after load, pause or map switching. */
export function siteAmbushTriggered263(w:World,s:WorldSiteAmbush263):boolean {
 if(Number(w.schemaVersion)!==263||w.worldSiteThreat263!==s||s.phase!=='armed'||s.lastTick===w.tick)return false;
 s.lastTick=w.tick;
 if(s.kind==='ambush-hidden'&&s.explosionAtCore!==null)return true;
 if(!foggedCell256(w,s.center.z*w.width+s.center.x))return true;
 if(!siteAmbushHashDue263(w.tick,s.siteId))return false;
 return w.pawns.some(p=>p.state!=='dead'&&!p.health?.death&&isColonist(p)&&inside(p,s.trigger));
}
/** Called only for an ACTUAL explosion-affected cell, not a UI/combat intent.
 * Save the real notification if the remaining engine phase has not run yet. */
export function notifySiteAmbushExplosion263(w:World,cell:Cell,core:number):void {
 const s=w.worldSiteThreat263;if(Number(w.schemaVersion)!==263||!s||s.phase!=='armed'||s.kind!=='ambush-hidden'||!inside(cell,s.trigger))return;
 if(!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10)throw Error('Actual Site ambush explosion clock required');
 s.explosionAtCore??=core;
}
