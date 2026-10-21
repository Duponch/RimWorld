import {existsSync} from 'node:fs';
import {expect,test} from 'vitest';
import {preparedGiftCamp274,GIFT_CAMP_SOURCE274} from './helpers/diplomatic-gifts-v450.ts';
import {withWorldGroup} from '../src/sim/world-map-context.ts';
import {arriveGeographicGroupPost256} from '../src/sim/group-geographic-post-256.ts';
import {quoteGroupGift274} from '../src/sim/group-gift-274.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {validCommercialGifts274} from '../src/sim/group-gift-state-274.ts';
import {createGiftReceiptProvenance274} from '../src/sim/diplomatic-gift-provenance-274.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {World} from '../src/sim/types.ts';

function givenToRough(){
 const f=preparedGiftCamp274(),{w}=f,registry=w.worldFactions!;
 const faction=registry.factions.find(row=>row.def==='OutlanderRough')!,settlement=registry.settlements.find(row=>row.factionId===faction.id)!;
 const relation=registry.relations.find(row=>row.aId===Math.min(faction.id,registry.playerFactionId)&&row.bId===Math.max(faction.id,registry.playerFactionId))!;
 const g=w.worldGroups!.groups.find(row=>row.state.id===f.groupId)!.state;
 if(!('members'in g))throw Error('Actual original caravan absent.');
 // Declared finite preparation before the tested gift: this real rough faction
 // is neutral0 and the same acquired caravan is at its real settlement. This
 // claims neither a played peace negotiation nor an additional natural trip.
 relation.goodwill=0;relation.kind='neutral';
 Object.assign(g,{tile:settlement.tile,destination:settlement.tile,route:[settlement.tile],segment:null,stop:{kind:'at-site'}});
 expect(withWorldGroup(w,g.id,view=>arriveGeographicGroupPost256(view,g))).toBe(true);
 const lines=[{pileId:f.clothId,quantity:60}],q=withWorldGroup(w,g.id,view=>quoteGroupGift274(view,lines));
 if(!q?.ok)throw Error(q?.reason??'Actual rough post unavailable.');
 expect(q.naturalGoodwill).toBe(-130);
 expect(applyCommand(w,{type:'group-gift274',groupId:g.id,lines,quote:q.signature}).ok).toBe(true);
 const post=w.worldGroups!.posts.find(row=>row.id===q.postId)!.state;
 expect(validateWorld(w)).toEqual([]);
 return {w,groupId:g.id,factionId:faction.id,settlementId:settlement.id,postId:q.postId,post};
}

test.skipIf(!existsSync(GIFT_CAMP_SOURCE274))('real rough-post receipt refuses a forged natural target through RAW and public ownership boundaries',()=>{
 const f=givenToRough(),raw=serializeCampaign(f.w),bad=deserializeCampaign(raw);if(!('pawns'in bad))throw Error('Expected actual loaded campaign');
 const post=bad.worldGroups!.posts.find(row=>row.id===f.postId)!.state;
 post.gifts274!.recent[0]!.naturalGoodwill=0;
 // At goodwill0 both natural targets produce the same arithmetic result. Only
 // provenance against the immutable actual recipient can detect this forgery.
 expect(validCommercialGifts274(post.gifts274,274,bad.tick,bad.nextId)).toBe(true);
 expect(validateWorld(bad)).toContain('Invalid diplomatic gift recipient provenance.');
 expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();
 expect(serializeCampaign(f.w)).toBe(raw);
 const packet=structuredClone(new SnapshotEncoder().encode(f.w,0,0));
 expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('applied');
 if(packet.kind!=='checkpoint'||packet.world.campaignMap?.revision!==2)throw Error('Actual public gift post absent.');
 const row=packet.world.campaignMap.groups.find(group=>group.id===f.groupId);
 if(!row?.post)throw Error('Actual observed post absent.');
 row.post.gifts274!.recent[0]!.naturalGoodwill=0;
 expect(new SnapshotDecoder().adopt(packet).status).toBe('resync');
 expect(serializeCampaign(f.w)).toBe(raw);
});

test.skipIf(!existsSync(GIFT_CAMP_SOURCE274))('recipient provenance survives later defeat, relation changes and settlement removal while historical IDs remain bounded',()=>{
 const f=givenToRough(),registry=structuredClone(f.w.worldFactions!),post=structuredClone(f.post);
 const faction=registry.factions.find(row=>row.id===f.factionId)!;
 faction.lifecycle259={revision:1,defeated:true,temporary:false};
 const relation=registry.relations.find(row=>row.aId===Math.min(faction.id,registry.playerFactionId)&&row.bId===Math.max(faction.id,registry.playerFactionId))!;
 relation.goodwill=-75;relation.kind='hostile';
 const live=createGiftReceiptProvenance274(registry,274);
 expect(live(post,f.postId)).toBe(true);
 const unrelated=registry.settlements.find(row=>row.id!==f.settlementId)!;
 const redirected=structuredClone(post);redirected.gifts274!.recent[0]!.settlementId=unrelated.id;
 expect(live(redirected,f.postId)).toBe(false);
 registry.settlements=registry.settlements.filter(row=>row.id!==f.settlementId);
 const historical=createGiftReceiptProvenance274(registry,274);
 expect(historical(post,f.postId)).toBe(true);
 expect(historical(post)).toBe(true); // Legitimate legacy canonical alias.
 expect(historical(post,f.postId+1)).toBe(false);
 expect(createGiftReceiptProvenance274(undefined,274)(post)).toBe(false);
 expect(createGiftReceiptProvenance274(registry,273)(post,f.postId)).toBe(false);
 const future=structuredClone(post);future.gifts274!.recent[0]!.settlementId=registry.nextSettlementId;
 expect(historical(future,f.postId)).toBe(false);
 const foreign=structuredClone(post);foreign.gifts274!.recent[0]!.factionId=registry.nextFactionId;
 expect(historical(foreign,f.postId)).toBe(false);
});
