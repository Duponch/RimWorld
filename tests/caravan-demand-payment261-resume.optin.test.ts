import {readFileSync} from 'node:fs';
import {afterEach,expect,test,vi} from 'vitest';
import {actualDemandPaymentContinuation261,demandCheckpoint261,DEMAND_INPUT_SHA261} from './helpers/caravan-demand261-resume.ts';
import {admitted261,away261,sha261,totals261} from './helpers/caravan-encounter261-acquired.ts';
import {serializeCampaign,deserializeCampaign} from '../src/sim/serialization.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {prepareDemandPayment261} from '../src/sim/caravan-demand-payment-261.ts';

// This one continuation requires a local acquired RAW. Flag1 without its exact
// path+SHA fails hard in the helper; ordinary npm test needs no historical tmp.
const preparedTest=process.env.TRAVEL261_DEMAND_PAYMENT_SIM==='1'?test:test.skip;
afterEach(()=>vi.restoreAllMocks());

preparedTest('acquired999: real split/merge then true Demand Give removes actual3 whole +9 partial, conserving every original owner and save',()=>{
 const {root,runtime,record,pending,people,input,fragmentId}=actualDemandPaymentContinuation261(),g=away261(record),tick=root.tick;
 const foreignPeople=pending.people.slice(),foreignItems=pending.items.slice(),foreignStock=totals261(foreignItems),goods=g.items.slice(),quantities=new Map(goods.map(p=>[p.id,p.quantity])),nextId=root.nextId;
 const losses=structuredClone(root.worldGroups!.losses),memories=structuredClone(root.worldGroups!.lostMemories),story=structuredClone(record.story261),origins=structuredClone(g.reorganization!.memberOrigins);
 expect(pending.demands).toEqual([{kind:'pile',id:fragmentId,quantity:3},{kind:'pile',id:2308,quantity:9}]);
 const whole=goods.find(p=>p.id===fragmentId)!,partial=goods.find(p=>p.id===2308)!;expect(whole.quantity).toBe(3);expect(partial.quantity).toBe(10);
 const owner=structuredClone(partial.owner),sentBefore=g.reorganization!.sent['survival-meal']??0;
 const before=serializeCampaign(root),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=decoder.adopt(structuredClone(encoder.encode(root,0,0)));expect(full.status).toBe('applied');if(full.status==='applied')expect(full.world).toEqual(campaignPresentation(root));
 {const restored=deserializeCampaign(before);admitted261(restored);expect(serializeCampaign(restored)).toBe(before);expect(campaignPresentation(restored)).toEqual(campaignPresentation(root));}
 expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'continue'},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
 const stale=prepareDemandPayment261(root,record);if(!stale.ok)throw Error(stale.reason);
 const slot=g.items.indexOf(partial);g.items[slot]=structuredClone(partial);expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);g.items[slot]=partial;
 Object.defineProperty(partial,'quantity',{writable:false});expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);Object.defineProperty(partial,'quantity',{writable:true});
 const registry=root.worldGroups!,records=registry.groups,index=records.indexOf(record);expect(index).toBeGreaterThanOrEqual(0);
 records[index]=structuredClone(record);expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);records[index]=record;
 registry.groups=records.slice();expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);registry.groups=records;expect(stale.current()).toBe(true);
 const result=applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'give'},runtime);
 const completed=demandCheckpoint261(root,'05-after-actual-give-or-refusal',{result});expect(result.ok,result.reason).toBe(true);
 const remaining=away261(record);expect(record.pending261).toBeUndefined();expect(remaining.members).toEqual(people);for(const p of people)expect(remaining.members).toContain(p);
 expect(root.tick).toBe(tick);expect(root.nextId).toBe(nextId+1);expect(record.story261).toEqual(story);expect(remaining.reorganization!.memberOrigins).toEqual(origins);expect(remaining.reorganization!.sent['survival-meal']).toBe(sentBefore+12);
 expect(remaining.items.find(p=>p.id===partial.id)).toBe(partial);expect(partial).toMatchObject({quantity:1,owner});
 for(const p of goods){const consumed=p.id===fragmentId?3:p.id===2308?9:0,expected=quantities.get(p.id)!-consumed;
  if(expected){expect(remaining.items.find(q=>q.id===p.id)).toBe(p);expect(p.quantity).toBe(expected);}
  else{expect(remaining.items.some(q=>q.id===p.id)).toBe(false);expect(root.worldPawns!.owners.some(r=>r.items.some(q=>q.id===p.id))).toBe(false);}
 }
 expect(totals261(remaining.items)).toEqual({'survival-meal':8,wood:9,silver:7});
 for(const p of foreignPeople){const rows=root.worldPawns!.owners.filter(r=>r.actor.id===p.id);expect(rows).toHaveLength(1);expect(rows[0]!.actor).toBe(p);expect(root.worldGroups!.groups.every(r=>!('members'in r.state)||r.state.members.every(q=>q.id!==p.id))).toBe(true);}
 for(const p of foreignItems){const rows=root.worldPawns!.owners.filter(r=>r.items.some(i=>i.id===p.id));expect(rows).toHaveLength(1);expect(rows[0]!.items.find(i=>i.id===p.id)).toBe(p);}
 expect(totals261(root.worldPawns!.owners.filter(r=>foreignPeople.some(p=>p.id===r.actor.id)).flatMap(r=>r.items))).toEqual(foreignStock);expect(root.worldGroups!.losses).toEqual(losses);expect(root.worldGroups!.lostMemories).toEqual(memories);
 const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('delta');const delta=decoder.adopt(packet);expect(delta.status).toBe('applied');if(delta.status==='applied')expect(delta.world).toEqual(campaignPresentation(root));
 {const reload=deserializeCampaign(completed);admitted261(reload);expect(serializeCampaign(reload)).toBe(completed);expect(campaignPresentation(reload)).toEqual(campaignPresentation(root));}
 expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'give'},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(completed);expect(sha261(readFileSync(input,'utf8'))).toBe(DEMAND_INPUT_SHA261);
},120_000);
