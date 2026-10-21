import {expect,test} from 'vitest';
import {existsSync} from 'node:fs';
import {writeTestFileSync} from './test-output.ts';
import {preparedGiftCamp274,GIFT_CAMP_SOURCE274,GIFT_CAMP_SOURCE_SHA274,GIFT_CAMP_PREPARATION274} from './helpers/diplomatic-gifts-v450.ts';
import {withWorldGroup} from '../src/sim/world-map-context.ts';
import {quoteGroupGift274} from '../src/sim/group-gift-274.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {withGroupExchange} from '../src/sim/group-reorganization-balance.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';

test.skipIf(!existsSync(GIFT_CAMP_SOURCE274))('optional acquired geographic post performs one real gift through the targeted command and keeps exact whole campaign reloads',()=>{
 const f=preparedGiftCamp274(),{w}=f,record=w.worldGroups!.groups.find(r=>r.state.id===f.groupId)!;if(!('members'in record.state))throw Error('Missing actual away group');
 const g=record.state,cloth=g.items.find(i=>i.id===f.clothId)!,wool=g.items.find(i=>i.id===f.woolId)!,lines=[{pileId:cloth.id,quantity:60},{pileId:wool.id,quantity:20}];
 const before=serializeCampaign(w),q=withWorldGroup(w,g.id,view=>quoteGroupGift274(view,lines));if(!q?.ok)throw Error(q?.reason??'Missing actual quote');
 expect(serializeCampaign(w)).toBe(before);writeTestFileSync('tmp/diplomatic-gifts-v450/prepared-post.json',before);
 writeTestFileSync('tmp/diplomatic-gifts-v450/prepared-post.meta.json',JSON.stringify({...f,w:undefined,source:GIFT_CAMP_SOURCE274,sourceSHA:GIFT_CAMP_SOURCE_SHA274,preparation:GIFT_CAMP_PREPARATION274,tick:w.tick,quote:{recognizedValue:q.recognizedValue,requestedGain:q.requestedGain,appliedGain:q.appliedGain,goodwillBefore:q.goodwillBefore,goodwillAfter:q.goodwillAfter}},null,2));
 const replay=deserializeCampaign(before),command={type:'group-gift274' as const,groupId:g.id,lines,quote:q.signature};if(!('pawns'in replay))throw Error('Expected acquired loaded campaign');
 for(const root of [w,replay])expect(applyCommand(root,command)).toMatchObject({ok:true});
 expect(validateWorld(w)).toEqual([]);expect(serializeCampaign(replay)).toBe(serializeCampaign(w));
 const post=w.worldGroups!.posts.find(p=>p.id===f.postId)!.state;expect(post.stock.find(p=>p.id===cloth.id)).toBe(cloth);expect(wool.quantity).toBe(20);expect(post.gifts274).toMatchObject({count:1,totals:{cloth:60,'muffalo-wool':20}});
 const after=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(after))).toBe(after);expect(applyCommand(w,command).ok).toBe(false);expect(serializeCampaign(w)).toBe(after);
 writeTestFileSync('tmp/diplomatic-gifts-v450/given.json',after);
});

test.skipIf(!existsSync(GIFT_CAMP_SOURCE274))('a declared neutral74 campaign gives real wool, becomes allied75 once and preserves the receipt after a later allied70 continuation',()=>{
 const f=preparedGiftCamp274(),{w}=f,g=w.worldGroups!.groups.find(r=>r.state.id===f.groupId)!.state;
 if(!('members'in g)||!g.reorganization)throw Error('Expected acquired physical caravan');
 const relation=w.worldFactions!.relations.find(r=>[r.aId,r.bId].includes(f.factionId)&&[r.aId,r.bId].includes(w.worldFactions!.playerFactionId))!;
 // Declared finite inputs: prior goodwill74 and60 extra wool in the same
 // inventory. No journey, production or earlier diplomatic gain is credited.
 relation.goodwill=74;relation.kind='neutral';const wool=g.items.find(p=>p.id===f.woolId)!;
 g.reorganization=withGroupExchange(g.reorganization,'received',[{...wool,quantity:60}]);wool.quantity=100;
 expect(validateWorld(w)).toEqual([]);const before=serializeCampaign(w),rng=w.rng;
 const lines=[{pileId:wool.id,quantity:100}],q=withWorldGroup(w,g.id,view=>quoteGroupGift274(view,lines));if(!q?.ok)throw Error(q?.reason??'Actual post absent');
 expect(q).toMatchObject({requestedGain:1,appliedGain:1,goodwillBefore:74,goodwillAfter:75,relationBefore:'neutral',relationAfter:'ally'});expect(serializeCampaign(w)).toBe(before);
 const command={type:'group-gift274' as const,groupId:g.id,lines,quote:q.signature};expect(applyCommand(w,command).ok).toBe(true);
 expect(relation).toMatchObject({goodwill:75,kind:'ally'});expect(w.rng).toBe(rng);expect(g.items.some(p=>p.id===wool.id)).toBe(false);
 const post=w.worldGroups!.posts.find(p=>p.id===f.postId)!.state;expect(post.stock.find(p=>p.id===wool.id)).toBe(wool);expect(post.gifts274!.count).toBe(1);
 const allied=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(allied))).toBe(allied);expect(applyCommand(w,command).ok).toBe(false);expect(serializeCampaign(w)).toBe(allied);
 relation.goodwill=70;expect(validateWorld(w)).toEqual([]);const continued=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(continued))).toBe(continued);
 expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0))).status).toBe('applied');expect(post.gifts274!.recent[0]).toMatchObject({goodwillAfter:75,relationAfter:'ally'});
 writeTestFileSync('tmp/diplomatic-gifts-v450/allied75.json',allied);writeTestFileSync('tmp/diplomatic-gifts-v450/allied70-continuation.json',continued);
},120000);
