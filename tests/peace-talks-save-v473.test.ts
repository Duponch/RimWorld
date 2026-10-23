import {expect,test} from 'vitest';
import {preparedTradeRequestCamp462} from './scenarios/trade-requests-v462.ts';
import {serializeCampaign,deserializeCampaign,validateCampaignSchema292} from '../src/sim/serialization.ts';
import {validPeaceTalksSite293,validPeaceTalksHistorical293,validPeaceTalksBindings293,validPeaceTalksRegistryScalars293,validPeaceTalksArrival293} from '../src/sim/peace-talks-save-293.ts';
import {validateWorldSites263} from '../src/sim/world-sites-save-263.ts';
import type {WorldSitesState263} from '../src/sim/world-sites-state-263.ts';
import {worldNaturalGoodwill274,worldGoodwillChange274} from '../src/sim/world-diplomacy-274.ts';
import {validPendingEncounterShape261} from '../src/sim/caravan-pending-save-261.ts';
import {validCaravanBattlefield261,validRetainedArrivalShape261} from '../src/sim/caravan-encounter-save-261.ts';
import {draftPeaceDisaster293} from '../src/sim/peace-talks-disaster-293.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {PeaceTalksSite293,PeaceTalksOutcome293,PeaceTalksResult293} from '../src/sim/peace-talks-state-293.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {groupCaravanUnitMass256} from '../src/sim/group-caravan-mass-256.ts';
import {planetTile,planetTileCount} from '../src/sim/planet-geography-256.ts';
import {caravanMapAllowed261} from '../src/sim/caravan-incidents-261.ts';

/** Declared persistence fixtures over the acquired original caravan; no incident,
 * journey, negotiation or diplomatic success is claimed by their construction. */
function camp(){
 const {w,groupId,factionId}=preparedTradeRequestCamp462(),record=w.worldGroups!.groups.find(r=>r.state.id===groupId)!,g=record.state;
 if(!('members'in g))throw Error('Acquired original caravan absent');
 record.encounters261??={revision:1}; // Declared prospective permission, never migration.
 const queue=[g.tile],seen=new Set<number>();let free:number|undefined;
 while(queue.length&&seen.size<128){const tile=queue.shift()!;if(seen.has(tile))continue;seen.add(tile);if(caravanMapAllowed261(w,tile)){free=tile;break;}queue.push(...planetTile(w.planet!,tile)!.neighbours);}
 if(free===undefined)throw Error('No nearby real Battlefield-capable tile');g.tile=free;g.destination=free;g.route=[free];
 const faction=w.worldFactions!.factions.find(f=>f.id===factionId)!;
 const registry=w.worldSites263??={revision:1,nextId:1,entries:[]};
 const site:PeaceTalksSite293={kind:'peace-talks',id:registry.nextId++,tile:g.tile,factionId,createdAtCore:w.tick*10,expiresAtCore:w.tick*10+720000,mapId:null,questTag:'PeaceTalks_'+faction.name};
 registry.entries.push(site);return {w,site,record,g,faction};
}
function close(c:ReturnType<typeof camp>,outcome:PeaceTalksOutcome293='flounder'):PeaceTalksResult293{
 const {w,site,g,faction}=c,a=Math.min(faction.id,w.worldFactions!.playerFactionId),b=Math.max(faction.id,w.worldFactions!.playerFactionId),relation=w.worldFactions!.relations.find(r=>r.aId===a&&r.bId===b)!;
 const request=outcome==='disaster'?Math.min(-45,relation.kind==='hostile'?0:-75-relation.goodwill):outcome==='backfire'?-15:outcome==='success'?65:outcome==='triumph'?105:0;
 const change=worldGoodwillChange274(relation.goodwill,relation.kind,worldNaturalGoodwill274(faction)!,request)!;
 const result:PeaceTalksResult293={groupId:g.id,negotiatorId:g.members[0]!.id,outcome,negotiationAbility:Math.fround(1.15),goodwill:{before:relation.goodwill,kindBefore:relation.kind,requested:request,adjusted:change.adjustedGain,after:change.goodwillAfter,kindAfter:change.kindAfter},socialXp:{direct:true,requested:6000,credited:2100}};
 if(outcome==='triumph'){
  const quantity=Math.ceil(500/tradeCatalogueEntry('gold')!.baseMarketValue),id=w.nextId++;
  result.reward={budget:600,marketValue:quantity*tradeCatalogueEntry('gold')!.baseMarketValue,massGrams:quantity*groupCaravanUnitMass256('gold',true,293)!,delivered:[{id,item:'gold',quantity,carrierId:g.members[0]!.id}]};
 }
 if(outcome==='disaster'){
  const draft=draftPeaceDisaster293({root:w,groupId:g.id,siteId:site.id,factionId:site.factionId,atCore:w.tick*10,rng:w.rng,nextId:w.nextId});if(!draft.ok)throw Error(draft.reason);
  w.nextId=draft.nextId;c.record.pending261=draft.pending;result.attack={phase:'pending',groupId:g.id,points:draft.points,enemyIds:draft.enemyIds};
 }
 site.closed={reason:'resolved',atCore:w.tick*10,result};return result;
}

/** Independent otherwise valid registries; no fabricated physical holder. */
function collidingSiteRegistries293(registry:WorldSitesState263):WorldSitesState263[]{
 const terminal=registry.entries.find((s):s is PeaceTalksSite293=>s.kind==='peace-talks'&&!!s.closed);
 if(!terminal)throw Error('Expected a valid terminal fixture');
 const sameKind=structuredClone(registry),otherKind=structuredClone(registry);
 sameKind.entries.push({...structuredClone(terminal),questTag:terminal.questTag+' duplicate ID'});
 otherKind.entries.push({kind:'item-stash',id:terminal.id,tile:terminal.tile,factionId:null,createdAtCore:terminal.createdAtCore,mapId:null,expiresAtCore:null,heldAtCore:terminal.createdAtCore,items:[],threat:{kind:'none'}});
 return [sameKind,otherKind];
}

test('strict292 migration changes only the number and grants no PeaceTalks offer, tag, XP or receipt',()=>{
 const {w}=preparedTradeRequestCamp462(),old=JSON.parse(serializeCampaign(w));old.schemaVersion=292;
 // The direct validator consumes the already hydrated immutable geography.
 // JSON.parse alone loses that representation witness; it changes no saved fact.
 for(const site of old.worldMaps.sites)if(site.map)expect(Object.hasOwn(site.map,'schemaVersion')).toBe(false);
 expect(validateCampaignSchema292({...old,planet:w.planet})).toEqual([]);const raw=JSON.stringify(old),loaded=deserializeCampaign(raw);
 expect(JSON.parse(serializeCampaign(loaded))).toEqual({...old,schemaVersion:293});expect(JSON.stringify(old)).toBe(raw);
});

test('PeaceTalks fields stay closed in every historical registry and retained transport lane before293',()=>{
 const samples=[{worldSites263:{entries:[{kind:'peace-talks'}]}},{world:{worldSites263:{entries:[{questTag:'PeaceTalks_x'}]}}},{worldGroups:{groups:[{arrival261:{action:{kind:'peace-talks',siteId:1}}}]}},{campaignMap:{groups:[{pending261:{kind:'peace-talks',peaceTalksSiteId293:1}}]}},{worldMaps:{sites:[{battlefield261:{peaceTalksSiteId293:1}}]}},{summary:{maps:[{battlefield261:{retained:{destination:{action:{kind:'peace-talks',siteId:1}}}}}]}}];
 for(const sample of samples)for(const v of [263,284,291,292])expect(validPeaceTalksHistorical293(sample,v)).toBe(false);
});

test('future294 and numeric schema strings stay closed without running getters or reading terrain',()=>{
 let reads=0;const raw={worldSites263:{entries:[]}};Object.defineProperty(raw,'resources',{get(){reads++;throw Error('terrain read');}});
 expect(validPeaceTalksHistorical293(raw,293)).toBe(true);expect(reads).toBe(0);
 for(const version of [294,'293',NaN])expect(validPeaceTalksHistorical293({},version)).toBe(false);
 const getter={};Object.defineProperty(getter,'worldSites263',{enumerable:true,get(){reads++;throw Error('registry getter');}});
 expect(validPeaceTalksHistorical293(getter,292)).toBe(false);expect(reads).toBe(0);
});

test('active PeaceTalks is a registry entry with no physical holder and reload preserves the whole campaign',()=>{
 const {w,site}=camp(),ids=new Set<number>();expect(validateWorldSites263(w.worldSites263,w,ids)).toEqual([]);expect(ids.size).toBe(0);
 const raw=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);expect(site.mapId).toBeNull();
});

test('deadline receipts preserve the original timeout and reject hidden, future or extra scalar fields',()=>{
 const c=camp(),at=c.site.expiresAtCore,context={...c.w,tick:at/10};c.site.closed={reason:'expired',atCore:at};
 expect(validPeaceTalksSite293(c.site,context)).toBe(true);expect(c.site.expiresAtCore).toBe(at);
 c.site.closed.atCore=at-10;expect(validPeaceTalksSite293(c.site,context)).toBe(false);c.site.closed.atCore=at;
 expect(validPeaceTalksSite293({...c.site,mapId:1},context)).toBe(false);expect(validPeaceTalksSite293({...c.site,heldAtCore:at},context)).toBe(false);
 let reads=0;Object.defineProperty(c.site,'closed',{enumerable:true,get(){reads++;throw Error('receipt getter');}});expect(validPeaceTalksSite293(c.site,context)).toBe(false);expect(reads).toBe(0);
});

test('all five terminal outcomes remain quest resolutions, with fractional applied XP and no imported full gain',()=>{
 for(const outcome of ['disaster','backfire','flounder','success','triumph'] as const){const c=camp(),r=close(c,outcome);r.socialXp.credited=17.125;
  expect(validPeaceTalksSite293(c.site,c.w)).toBe(true);expect(validPeaceTalksBindings293(c.w)).toBe(true);
  const raw=serializeCampaign(c.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 }
},120000);

test('terminal direct XP validates the real capped gain0..9000 in human units and rejects fabricated precision',()=>{
 const c=camp(),r=close(c);for(const credited of [0,.001,2100,6000,9000]){r.socialXp.credited=credited;expect(validPeaceTalksSite293(c.site,c.w)).toBe(true);}
 for(const credited of [-.001,9000.001,.0001,NaN,Infinity]){r.socialXp.credited=credited;expect(validPeaceTalksSite293(c.site,c.w)).toBe(false);}
});

test('historical goodwill verifies captured arithmetic without demanding the later relation or diplomat still match',()=>{
 const c=camp(),r=close(c,'success'),pair=c.w.worldFactions!.relations.find(p=>p.aId===Math.min(c.faction.id,c.w.worldFactions!.playerFactionId)&&p.bId===Math.max(c.faction.id,c.w.worldFactions!.playerFactionId))!;
 pair.goodwill=-80;pair.kind='hostile';expect(validPeaceTalksBindings293(c.w)).toBe(true);
 r.goodwill.adjusted++;expect(validPeaceTalksSite293(c.site,c.w)).toBe(false);
});

test('retained terminal tags remain blocking and a second active tile or duplicate ID is refused',()=>{
 const c=camp();close(c);const other={...c.site,id:c.w.worldSites263!.nextId++};c.w.worldSites263!.entries.push(other);
 expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).not.toEqual([]);expect(validPeaceTalksBindings293(c.w)).toBe(false);
 other.questTag+=' autre';expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).toEqual([]);
 const terminal=c.site.closed!;delete c.site.closed;delete other.closed;other.tile=(c.site.tile+1)%planetTileCount(c.w.planet!);
 expect(validPeaceTalksSite293(c.site,c.w)).toBe(true);expect(validPeaceTalksSite293(other,c.w)).toBe(true);
 expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).not.toEqual([]);expect(validPeaceTalksBindings293(c.w)).toBe(false);
 other.closed=terminal;expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).toEqual([]);expect(validPeaceTalksBindings293(c.w)).toBe(true);
 c.site.closed=terminal;expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).toEqual([]);expect(validPeaceTalksBindings293(c.w)).toBe(true);
 const otherId=other.id;other.id=c.site.id;expect(validateWorldSites263(c.w.worldSites263,c.w,new Set())).not.toEqual([]);expect(validPeaceTalksBindings293(c.w)).toBe(false);other.id=otherId;
 for(const registry of collidingSiteRegistries293(c.w.worldSites263!)){
  const invalid={...c.w,worldSites263:registry};expect(validateWorldSites263(registry,invalid,new Set())).not.toEqual([]);expect(validPeaceTalksRegistryScalars293(invalid)).toBe(false);expect(validPeaceTalksBindings293(invalid)).toBe(false);
  // Only the duplicate ID differs from this admissible scalar control.
  const repaired=structuredClone(registry);repaired.entries[repaired.entries.length-1]!.id=repaired.nextId++;
  const control={...c.w,worldSites263:repaired};expect(validateWorldSites263(repaired,control,new Set())).toEqual([]);expect(validPeaceTalksRegistryScalars293(control)).toBe(true);expect(validPeaceTalksBindings293(control)).toBe(true);
 }
},60000);
test('Triumph delivered rows are historical facts after consumption and cannot become extra inventory owners',()=>{
 const c=camp(),r=close(c,'triumph'),ids=new Set<number>();expect(c.g.items.some(p=>p.id===r.reward!.delivered[0]!.id)).toBe(false);
 expect(validateWorldSites263(c.w.worldSites263,c.w,ids)).toEqual([]);expect(ids.size).toBe(0);
 const raw=serializeCampaign(c.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 r.reward!.massGrams++;expect(validPeaceTalksSite293(c.site,c.w)).toBe(false);
});

test('Disaster preserves the exact foreign pending owner and refuses broken reciprocity before adoption',()=>{
 const c=camp(),r=close(c,'disaster'),pending=c.record.pending261!;
 expect(validPeaceTalksBindings293(c.w)).toBe(true);const raw=serializeCampaign(c.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 delete c.record.pending261;expect(validPeaceTalksBindings293(c.w)).toBe(false);c.record.pending261=pending;
 if(r.attack?.phase!=='pending')throw Error('Expected pending');r.attack.enemyIds=[...r.attack.enemyIds].reverse();if(r.attack.enemyIds.length===1)r.attack.enemyIds[0]=c.g.members[0]!.id;
 expect(validPeaceTalksBindings293(c.w)).toBe(false);
});

test('Disaster entered receipt survives map retirement but cannot bind a different retained Battlefield',()=>{
 const c=camp(),r=close(c,'disaster');if(!r.attack)throw Error('Expected attack');const {points,enemyIds}=r.attack;
 const maps=c.w.worldMaps!,mapId=maps.nextMapId;
 // Declared registry fixture: allocate an actual metadata row first, then retain
 // its exact retirement tombstone. No terrain generation or played battle claimed.
 maps.sites.push({id:mapId,tile:c.site.tile,kind:'battlefield',createdAt:c.w.tick,visit:null,battlefield261:{revision:1,kind:'peace-talks',won:false,factionId:c.faction.id,peaceTalksSiteId293:c.site.id,retained:{passStory:false,next:null,destination:null}}});maps.nextMapId++;
 delete c.record.pending261;r.attack={phase:'entered',mapId,atCore:c.w.tick*10,points,enemyIds};expect(validPeaceTalksBindings293(c.w)).toBe(true);
 maps.sites=maps.sites.filter(m=>m.id!==mapId);maps.retired.push({id:mapId,tile:c.site.tile,kind:'battlefield',createdAt:c.w.tick,removedAt:c.w.tick,reason:'battlefield-empty'});expect(validPeaceTalksBindings293(c.w)).toBe(true);
 r.attack.mapId=maps.nextMapId;expect(validPeaceTalksBindings293(c.w)).toBe(false);r.attack.mapId=mapId;
 maps.retired[maps.retired.length-1]!.tile=c.site.tile+1;expect(validPeaceTalksBindings293(c.w)).toBe(false);
});

test('new forced pending and Battlefield shapes reject292 and require their exact site provenance in293',()=>{
 const c=camp();close(c,'disaster');const p=c.record.pending261!;
 expect(validPendingEncounterShape261(p,293,c.w.nextId,c.w.tick*10)).toBe(true);expect(validPendingEncounterShape261(p,292,c.w.nextId,c.w.tick*10)).toBe(false);
 const context={version:293,atCore:c.w.tick*10,tileCount:999999,factionIds:new Set([c.faction.id]),mapIds:new Set<number>(),settlements:[]};
 const b={revision:1,kind:'peace-talks',won:false,factionId:c.faction.id,peaceTalksSiteId293:c.site.id,retained:{passStory:false,next:null,destination:null}};
 expect(validCaravanBattlefield261(b,context)).toBe(true);expect(validCaravanBattlefield261(b,{...context,version:292})).toBe(false);
 const bad={...b,peaceTalksSiteId293:undefined};expect(validCaravanBattlefield261(bad,context)).toBe(false);
});

test('stale arrived orders remain reloadable against the same terminal site without producing another map intent',()=>{
 const c=camp();close(c);c.record.arrival261={tile:c.site.tile,action:{kind:'peace-talks',siteId:c.site.id}};
 expect(validPeaceTalksArrival293(c.record.arrival261.action,293)).toBe(true);expect(validRetainedArrivalShape261(c.record.arrival261.action,292)).toBe(false);
 const raw=serializeCampaign(c.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);expect(c.record.pendingEntry263).toBeUndefined();
 c.record.arrival261.tile++;expect(validPeaceTalksBindings293(c.w)).toBe(false);
});

test('PeaceTalks full and Resident checkpoint reject a bad receipt then accept the exact valid revision',()=>{
 const c=camp();close(c);const valid=structuredClone(new SnapshotEncoder().encode(c.w,0,0));if(valid.kind!=='checkpoint')throw Error('Expected checkpoint');
 const bad=structuredClone(valid),site=bad.world.worldSites263!.entries.find(s=>s.kind==='peace-talks')!;if(site.kind!=='peace-talks')throw Error('Expected site');site.questTag='bad';
 const invalids=[bad,...collidingSiteRegistries293(valid.world.worldSites263!).map(registry=>{const packet=structuredClone(valid);packet.world.worldSites263=registry;return packet;})],before=JSON.stringify(valid);
 for(const invalid of invalids)for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  expect(receiver.adopt(structuredClone(invalid)).status).toBe('resync');const result=receiver.adopt(structuredClone(valid));expect(result.status).toBe('applied');expect(JSON.stringify(valid)).toBe(before);
 }
},60000);
test('PeaceTalks delta refusal preserves the confirmed world and retries retained originals exactly',()=>{
 const c=camp(),encoder=new SnapshotEncoder(),receivers=[new SnapshotDecoder(),new ResidentPresentationAssembler()],opening=structuredClone(encoder.encode(c.w,0,0));
 const held=receivers.map(receiver=>{const result=receiver.adopt(structuredClone(opening));if(result.status!=='applied')throw Error('Opening refused');return {world:result.world,before:JSON.stringify(result.world)};});
 close(c);const valid=structuredClone(encoder.encode(c.w,0,0));if(valid.kind!=='delta')throw Error('Expected delta');const bad=structuredClone(valid),site=bad.world.worldSites263!.entries.find(s=>s.kind==='peace-talks')!;
 if(site.kind!=='peace-talks'||site.closed?.reason!=='resolved')throw Error('Expected resolved');site.closed.result.socialXp.credited=9001;
 const invalids=[bad,...collidingSiteRegistries293(valid.world.worldSites263!).map(registry=>{const packet=structuredClone(valid);packet.world.worldSites263=registry;return packet;})],before=JSON.stringify(valid);
 for(const [i,receiver] of receivers.entries()){
  for(const invalid of invalids){expect(receiver.adopt(structuredClone(invalid)).status).toBe('resync');expect(JSON.stringify(held[i]!.world)).toBe(held[i]!.before);}
  expect(receiver.adopt(structuredClone(valid)).status).toBe('applied');expect(JSON.stringify(valid)).toBe(before);
 }
});

test('campaign-only presentation keeps terminal PeaceTalks without a selected local world',()=>{
 const c=camp();close(c);const summary=campaignOnlySummary(c.w);expect(validPeaceTalksBindings293(summary)).toBe(true);
 const encoder=new SnapshotEncoder(),geographic=encoder.encodeCampaignSummary(summary,true),packet={type:'campaign-only' as const,epoch:1,revision:1,stepMs:0,speed:0,urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]},summary:geographic.state,...geographic.geography?{geography:geographic.geography}:{}};
 const valid={...structuredClone(packet),revision:2},before=JSON.stringify(valid);
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  const opening=receiver.adoptCampaignOnly(structuredClone(packet));if(opening.status!=='applied')throw Error('Opening campaign refused');const held=JSON.stringify(opening.summary);
  for(const registry of collidingSiteRegistries293(valid.summary.worldSites263!)){
   const invalid=structuredClone(valid);invalid.summary.worldSites263=registry;expect(receiver.adoptCampaignOnly(invalid).status).toBe('resync');expect(JSON.stringify(opening.summary)).toBe(held);
  }
  expect(receiver.adoptCampaignOnly(structuredClone(valid)).status).toBe('applied');expect(JSON.stringify(valid)).toBe(before);
 }
});
