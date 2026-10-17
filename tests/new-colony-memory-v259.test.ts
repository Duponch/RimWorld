import {expect,test} from 'vitest';
import {registryCamp,preparedMap,command} from './helpers/world-maps-v255';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context';
import {stepWorld,serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index';
import {captureNewColonyReceivers259,resetNewColonyMemories259,notifyMapLost,lostThoughtsAt,validLostMemories} from '../src/sim/world-map-lost';
import {configureSettlementLimit} from '../src/sim/world-map-options';
import {mapActions,settleRegisteredMap,settlementTileAction} from '../src/sim/world-map-authority';
import {validWorldMapRegistry} from '../src/sim/world-map-save';
import {worldPawnOriginProjection256,validWorldPawnOriginProjection256} from '../src/sim/world-pawn-origin-projection-256';
import {registerProjectedWorldPawns256} from '../src/sim/world-pawn-transport-save-256';
import {registeredMapPresentation,campaignOnlySummary} from '../src/sim/world-map-presentation';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {validRegisteredPresentation,validCampaignSummary} from '../src/sim/world-map-projection-save';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {TICKS_PER_DAY,type World} from '../src/sim/types';
import {planetTileCount} from '../src/sim/planet-geography-256';
/** Declared resident Camp checkpoint, not a played abandonment/new generation. */
function camp(){const w=registryCamp();expect(w.schemaVersion).toBe(260);w.worldMaps!.sites[0]!.kind='camp';stepWorld(w,4);return w;}
const thoughts=(w:World,p:World['pawns'][number],tick=w.tick)=>lostThoughtsAt(p,tick,w.worldGroups!.lostMemories,new Map());
const blankUrgent={generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]};
test('both actual notification kinds share one family and reset Hope to one fresh Optimism, without changing phase dates',()=>{
 const w=camp(),p=w.pawns[0]!,receivers=captureNewColonyReceivers259(w);resetNewColonyMemories259(w,0,'new-colony',receivers);const at=w.tick;
 expect(thoughts(w,p,at+8*TICKS_PER_DAY-1)[0]!.offset).toBe(10);expect(thoughts(w,p,at+8*TICKS_PER_DAY)[0]!.offset).toBe(5);expect(thoughts(w,p,at+16*TICKS_PER_DAY)).toEqual([]);
 resetNewColonyMemories259(w,0,'new-colony-settled',receivers);expect(w.worldGroups!.lostMemories.filter(m=>m.receiverId===p.id)).toEqual([{receiverId:p.id,mapId:0,otherId:null,kind:'new-colony-settled',at:w.tick}]);expect(thoughts(w,p)[0]!.offset).toBe(10);
 resetNewColonyMemories259(w,0,'new-colony',receivers);expect(w.worldGroups!.lostMemories.filter(m=>m.receiverId===p.id)).toHaveLength(1);expect(w.worldGroups!.lostMemories.find(m=>m.receiverId===p.id)!.kind).toBe('new-colony');
});
test('real map-settle dates the existing Camp conversion; preview/refusal/repeated action produce no memory or date mutation',()=>{
 const w=camp(),r=w.worldMaps!.sites[0]!,created=r.createdAt,before=serializeCampaign(w);expect(mapActions(w,0).settle.ok).toBe(true);expect(serializeCampaign(w)).toBe(before);expect(settleRegisteredMap(w,999).ok).toBe(false);expect(serializeCampaign(w)).toBe(before);
 command(w,{type:'map-settle',mapId:0});expect(r.createdAt).toBe(created);expect(r.settledAt).toBe(w.tick);expect(r.settledAt).toBeGreaterThan(created);expect(w.worldGroups!.lostMemories.every(m=>m.kind==='new-colony-settled'&&m.mapId===0&&m.at===w.tick)).toBe(true);expect(w.worldGroups!.lostMemories).toHaveLength(w.pawns.length);expect(validateWorld(w)).toEqual([]);
 const exact=serializeCampaign(w);expect(deserializeCampaign(exact).worldGroups!.lostMemories).toEqual(w.worldGroups!.lostMemories);expect(serializeCampaign(deserializeCampaign(exact))).toBe(exact);expect(settleRegisteredMap(w,0).ok).toBe(false);expect(serializeCampaign(w)).toBe(exact);
});
test('the memory grammar and registry reject258 privilege, forged clocks/anchors and family duplicates',()=>{
 const w=camp();command(w,{type:'map-settle',mapId:0});const memories=w.worldGroups!.lostMemories;expect(validLostMemories(memories,w.tick,w.nextId,258)).toBe(false);expect(validLostMemories(memories,w.tick,w.nextId,259)).toBe(true);expect(validLostMemories([...memories,{...memories[0]!,kind:'new-colony'}],w.tick,w.nextId,259)).toBe(false);
 const raw=JSON.parse(serializeCampaign(w));for(const change of [(v:typeof raw)=>v.schemaVersion=258,(v:typeof raw)=>v.worldMaps.sites[0].settledAt=undefined,(v:typeof raw)=>v.worldMaps.sites[0].settledAt=v.tick+1,(v:typeof raw)=>v.worldMaps.sites[0].kind='camp',(v:typeof raw)=>v.worldGroups.lostMemories[0].at--]){const bad=structuredClone(raw);change(bad);expect(validWorldMapRegistry(bad)).toBe(false);}
 const good=serializeCampaign(w),loaded=deserializeCampaign(good);expect(serializeCampaign(loaded)).toBe(good);expect(loaded.worldGroups!.lostMemories).toEqual(memories);
});
test('same-tick full/delta/campaign-only require the actual live settlement clock and reject hostile metadata atomically',()=>{
 const w=camp(),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=structuredClone(encoder.encode(w,0,0));const prior=decoder.adopt(first);expect(prior.status).toBe('applied');if(prior.status!=='applied')throw Error('Initial checkpoint failed');const frozen=structuredClone(prior.world);
 command(w,{type:'map-settle',mapId:0});const packet=structuredClone(encoder.encode(w,0,0));expect(packet.kind).toBe('delta');const bad=structuredClone(packet);if(bad.world.campaignMap?.revision!==2)throw Error('Missing actual registered metadata');bad.world.campaignMap.lostMemories[0]!.at--;
 expect(decoder.adopt(bad).status).toBe('resync');expect(prior.world).toEqual(frozen);const accepted=decoder.adopt(packet);expect(accepted.status).toBe('applied');if(accepted.status==='applied')expect(accepted.world).toEqual(campaignPresentation(w));expect(validRegisteredPresentation(registeredMapPresentation(w)!)).toBe(true);
 command(w,{type:'map-view',mapId:null});const summary=campaignOnlySummary(w);expect(validCampaignSummary(summary)).toBe(true);const only={type:'campaign-only' as const,epoch:10,revision:1,stepMs:0,speed:0,summary,urgentThreats:blankUrgent},other=new SnapshotDecoder();expect(other.adoptCampaignOnly(structuredClone(only)).status).toBe('applied');const falseClock=structuredClone(only);falseClock.revision++;falseClock.summary.maps[0]!.settledAt=falseClock.summary.maps[0]!.settledAt!-1;expect(validCampaignSummary(falseClock.summary)).toBe(false);expect(other.adoptCampaignOnly(falseClock).status).toBe('resync');
});
test('retired-memory FK checkpoint uses existing scalar proof even without WorldPawns; absence or changed settledAt refuses projection',()=>{
 const w=camp(),id=w.worldMaps!.nextMapId++,tile=w.planet!.revision===3?0:w.planet!.civilianTile;delete w.worldPawns;
 // Declared scalar retired-settlement event only: no claimed removal or owner transfer.
 w.worldMaps!.retired.push({id,tile,kind:'settlement',createdAt:0,settledAt:1,removedAt:2,reason:'abandon'});w.worldGroups!.lostMemories=[{receiverId:w.pawns[0]!.id,mapId:id,otherId:null,kind:'new-colony-settled',at:1}];
 const proof=worldPawnOriginProjection256(w);expect(proof.worldPawnOrigins).toEqual([{mapId:id,tile,removedAt:2,settledAt:1}]);expect(validWorldPawnOriginProjection256(proof,259,w.tick,w.nextId,planetTileCount(w.planet!),new Set([0]))).toBe(true);expect(validWorldPawnOriginProjection256(proof,258,w.tick,w.nextId,planetTileCount(w.planet!),new Set([0]))).toBe(false);
 const view=structuredClone(registeredMapPresentation(w)!);expect(validRegisteredPresentation(view)).toBe(true);expect(registerProjectedWorldPawns256(view,new Set())).toEqual([]);if(view.campaignMap?.revision!==2)throw Error('Missing real registered projection');delete view.campaignMap.worldPawnOrigins;expect(validRegisteredPresentation(view)).toBe(false);
 const again=structuredClone(registeredMapPresentation(w)!);if(again.campaignMap?.revision!==2)throw Error('Missing real registered projection');again.campaignMap.worldPawnOrigins![0]!.settledAt=2;expect(validRegisteredPresentation(again)).toBe(false);
});
test('abandonment captures actual on-map recipients before transfer, preserves other loss receivers and does not derive beneficiaries from archives',()=>{
 const w=registryCamp(),map=registeredMap(w,0)!,other=preparedMap(w,52,'camp'),onRemoved=map.pawns[0]!,outside=other.pawns[0]!,receivers=captureNewColonyReceivers259(w);expect(receivers).toContain(onRemoved);expect(receivers).toContain(outside);
 notifyMapLost(w,map,0,true,receivers);expect(w.worldGroups!.lostMemories.find(m=>m.receiverId===onRemoved.id&&m.kind==='new-colony')).toMatchObject({mapId:0,at:w.tick,otherId:null});expect(w.worldGroups!.lostMemories.some(m=>m.receiverId===outside.id&&m.kind==='colonist-lost')).toBe(true);expect(w.worldGroups!.lostMemories.some(m=>m.receiverId===onRemoved.id&&m.otherId===onRemoved.id)).toBe(false);
 const prior=structuredClone(w.worldGroups!.lostMemories);notifyMapLost(w,map,0,false,receivers);expect(w.worldGroups!.lostMemories.filter(m=>m.kind==='new-colony')).toEqual(prior.filter(m=>m.kind==='new-colony'));flushRegisteredMap(map);
});

test('installation with an existing home records its own true date without renewing anyone’s optimism',()=>{
 const w=registryCamp();configureSettlementLimit(w,2);const planet=w.planet;if(!planet||planet.revision===3)throw Error('This declared fixture requires its literal old planet');const tile=planet.tiles.find(t=>settlementTileAction(w,t.id).ok)?.id;if(tile===undefined)throw Error('No actually admissible prepared site');const other=preparedMap(w,tile,'camp'),rootRecord=w.worldMaps!.sites[0]!;
 // Declared prior-settlement memory checkpoint, not a claimed earlier player action.
 rootRecord.settledAt=0;resetNewColonyMemories259(w,0,'new-colony-settled',captureNewColonyReceivers259(w));stepWorld(w,3);const before=structuredClone(w.worldGroups!.lostMemories),record=w.worldMaps!.sites.find(r=>r.id===1)!;
 configureSettlementLimit(w,2);try{command(w,{type:'map-settle',mapId:1});expect(record.settledAt).toBe(w.tick);expect(record.createdAt).toBe(0);expect(w.worldGroups!.lostMemories).toEqual(before);expect(registeredMap(w,1)).toBe(other);}finally{configureSettlementLimit(w,1);}
});
test('old258 memory literals remain accepted unchanged; future kind, undefined and hidden clocks never gain old-schema privileges',()=>{
 const old=[{receiverId:1,mapId:0,otherId:null,kind:'new-colony' as const,at:12}],bytes=JSON.stringify(old);expect(validLostMemories(old,20,3,258)).toBe(true);expect(validLostMemories(old,20,3,259)).toBe(true);expect(JSON.stringify(old)).toBe(bytes);expect(validLostMemories([{...old[0]!,kind:'new-colony-settled'}],20,3,258)).toBe(false);expect(validLostMemories(old,20,3,261)).toBe(false);
 const w=camp();command(w,{type:'map-settle',mapId:0});const raw=JSON.parse(serializeCampaign(w));Object.defineProperty(raw.worldMaps.sites[0],'settledAt',{value:w.tick,enumerable:false,configurable:true});expect(validWorldMapRegistry(raw)).toBe(false);let reads=0;Object.defineProperty(raw.worldMaps.sites[0],'settledAt',{get(){reads++;return w.tick;},enumerable:true,configurable:true});expect(validWorldMapRegistry(raw)).toBe(false);expect(reads).toBe(0);
});
