import type {World} from './types.ts';
/** A Site defender mandate must name its genuine selected threat. Ordinary
 * settlement/settled receipts remain the separate existing authority. */
export function validSiteDefenceSource263(w:World,version:number):boolean {
 const d=w.worldDefence263;if(version!==263||!d||d.source.kind==='foreign-settlement')return true;
 const source=d.source,site=w.worldSites263?.entries.find(s=>s.id===source.siteId);
 return site?.kind==='item-stash'&&!site.closed&&site.threat.kind===source.kind&&site.factionId===d.factionId;
}
