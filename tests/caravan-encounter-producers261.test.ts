import {afterEach,expect,test,vi} from 'vitest';
import {pendingFixture261,admitted261,away261,checkpoint261,totals261} from './helpers/caravan-encounter261-acquired.ts';
import {serializeCampaign,deserializeCampaign} from '../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {quoteMeetingTrade261,prepareMeetingTrade261} from '../src/sim/caravan-meeting-trade-261.ts';
import {prepareDemandPayment261} from '../src/sim/caravan-demand-payment-261.ts';
import type {CampaignState} from '../src/sim/world-map-state.ts';

afterEach(()=>vi.restoreAllMocks());
const opt=test.skipIf(process.env.TRAVEL261_ENCOUNTER_SIM!=='1');
function exactReload(root:CampaignState){admitted261(root);const raw=serializeCampaign(root),restored=deserializeCampaign(raw);admitted261(restored);expect(serializeCampaign(restored)).toBe(raw);expect(campaignPresentation(restored)).toEqual(campaignPresentation(root));}
function foreignOriginals(root:CampaignState,people:readonly {id:number}[],items:readonly {id:number}[]){
 for(const p of people){const rows=root.worldPawns!.owners.filter(r=>r.actor.id===p.id);expect(rows).toHaveLength(1);expect(rows[0]!.actor).toBe(p);expect(root.worldGroups!.groups.every(r=>!('members'in r.state)||r.state.members.every(q=>q.id!==p.id))).toBe(true);}
 for(const p of items){const rows=root.worldPawns!.owners.filter(r=>r.items.some(i=>i.id===p.id));expect(rows).toHaveLength(1);expect(rows[0]!.items.find(i=>i.id===p.id)).toBe(p);}
}
function registryCloneRefusals(root:CampaignState,record:NonNullable<CampaignState['worldGroups']>['groups'][number],plan:{current():boolean;commit():void}){
 const registry=root.worldGroups!,groups=registry.groups,slot=groups.indexOf(record),before=serializeCampaign(root);expect(slot).toBeGreaterThanOrEqual(0);
 groups[slot]=structuredClone(record);expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);groups[slot]=record;
 registry.groups=groups.slice();expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);registry.groups=groups;expect(plan.current()).toBe(true);
}
function projection261(root:CampaignState){
 admitted261(root);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),check=()=>{const adopted=decoder.adopt(structuredClone(encoder.encode(root,0,0)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(campaignPresentation(root));};
 check();const delta=structuredClone(encoder.encode(root,0,0));expect(delta.kind).toBe('delta');const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(campaignPresentation(root));return check;
}

opt.each(['meeting','demand','ambush'] as const)('prepared %s: true producer births exclusive pending, breaks batch, saves and freezes exact owners',kind=>{
 const {root,runtime,record,pending,boundary,people,piles}=pendingFixture261(kind),g=away261(record);
 expect(g.members).toEqual(people);for(const p of piles)expect(g.items).toContain(p);expect(record.localMapId).toBeNull();expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([0]);expect(root.worldMaps!.retired.some(r=>r.id===1)).toBe(true);
 const foreignIds=[...pending.people,...pending.items].map(p=>p.id);expect(new Set(foreignIds).size).toBe(foreignIds.length);for(const p of pending.items){expect(['inventory','apparel','equipment']).toContain(p.owner.type);if('pawnId'in p.owner){const id=p.owner.pawnId;expect(pending.people.some(q=>q.id===id)).toBe(true);}}
 for(const p of pending.people)expect(root.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);
 if(kind==='ambush'){expect(pending.decision).toBe('forced');expect(record.story261).toBeUndefined();}else{expect(pending.decision).toBe('open');expect(record.story261?.lastFire[kind]).toBe(boundary*10);expect(record.story261?.recent).toEqual([kind]);}
 projection261(root);exactReload(root);
 const frozen=serializeCampaign(root);stepWorld(root,300,undefined,runtime);expect(serializeCampaign(root)).toBe(frozen);
 const retry=applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'retry'},runtime);expect(retry.ok).toBe(kind==='ambush');expect(serializeCampaign(root)).toBe(frozen);
 if(kind==='ambush'){expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'continue'},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(frozen);}
},120_000);

opt('actual Meeting trade refuses stale/overdrawn baskets, transfers partial originals and Continue passes foreign originals once',()=>{
 const {root,runtime,record,pending}=pendingFixture261('meeting');if(pending.kind!=='meeting')throw Error('Actual Meeting absent');const g=away261(record),tick=root.tick,foreignPeople=pending.people.slice();
 const meal=g.items.find(p=>p.item==='survival-meal'&&p.quantity>1)!;expect(meal).toBeDefined();const amount=meal.quantity,owner=structuredClone(meal.owner),allBefore=totals261([...g.items,...pending.items]),nextId=root.nextId,lines=[{pileId:meal.id,quantity:-1}];
 const q=quoteMeetingTrade261(root,record,lines);if(!q.ok)throw Error(q.reason);expect(q.paid).toBeLessThan(0);expect(q.forgone).toBe(0);const before=serializeCampaign(root),checkProjection=projection261(root);
 expect(applyCommand(root,{type:'caravan-meeting-trade',groupId:g.id,lines,quote:q.signature+'stale',acceptShortfall:false},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
 expect(quoteMeetingTrade261(root,record,[{pileId:meal.id,quantity:-(amount+1)}]).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
 const unaffordable=q.goods.find(p=>p.side==='buy'&&!p.refusal&&p.unitPrice!==null&&p.unitPrice>7);expect(unaffordable).toBeDefined();expect(quoteMeetingTrade261(root,record,[{pileId:unaffordable!.id,quantity:1}]).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
 const stale=prepareMeetingTrade261(root,record,lines,q.signature,false);if(!stale.ok)throw Error(stale.reason);const index=g.items.indexOf(meal);g.items[index]=structuredClone(meal);const replaced=serializeCampaign(root);expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(replaced);g.items[index]=meal;
 Object.defineProperty(meal,'quantity',{writable:false});expect(stale.current()).toBe(false);expect(()=>stale.commit()).toThrow();expect(serializeCampaign(root)).toBe(before);Object.defineProperty(meal,'quantity',{writable:true});
 registryCloneRefusals(root,record,stale);
 expect(applyCommand(root,{type:'caravan-meeting-trade',groupId:g.id,lines,quote:q.signature,acceptShortfall:false},runtime).ok).toBe(true);checkProjection();
 expect(g.items.find(p=>p.id===meal.id)).toBe(meal);expect(meal).toMatchObject({quantity:amount-1,owner});const fragment=pending.items.find(p=>p.id===nextId)!;expect(fragment).toMatchObject({item:meal.item,quantity:1,owner:{type:'inventory',pawnId:pending.traderId}});expect(fragment).not.toBe(meal);expect(root.nextId).toBe(nextId+2);expect(totals261([...g.items,...pending.items])).toEqual(allBefore);
 expect(g.reorganization?.sent['survival-meal']).toBe(1);expect(g.reorganization?.received.silver).toBe(-q.paid);expect(root.tick).toBe(tick);exactReload(root);
 const foreignItems=pending.items.slice(),foreignStock=totals261(foreignItems),playerGoods=g.items.map(p=>structuredClone(p));
 expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'continue'},runtime).ok).toBe(true);checkProjection();expect(record.pending261).toBeUndefined();expect(g.items).toEqual(playerGoods);foreignOriginals(root,foreignPeople,foreignItems);expect(totals261(root.worldPawns!.owners.filter(r=>foreignPeople.some(p=>p.id===r.actor.id)).flatMap(r=>r.items))).toEqual(foreignStock);expect(root.tick).toBe(tick);expect(root.nextId).toBe(nextId+2);
 const completed=checkpoint261(root,'meeting-objects-04-after-real-trade-and-continue');exactReload(root);expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'continue'},runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(completed);
},120_000);

// Whole/partial object payment is exercised by caravan-demand-payment261-resume
// from the acquired999 RAW through actual split/merge commands. Two complete
// ten-meal stacks cannot satisfy the native demand and correctly fall back.

opt('actual human Demand cedes original7 with true captivity/loss receipt while its finite goods stay with original8',()=>{
 const {root,runtime,record,pending,people}=pendingFixture261('demand','human');if(pending.kind!=='demand')throw Error('Actual Demand absent');const g=away261(record),victim=people.find(p=>p.id===7)!,retained=people.find(p=>p.id===8)!,goods=g.items.slice(),quantities=totals261(goods),tick=root.tick,nextId=root.nextId,foreignPeople=pending.people.slice(),foreignItems=pending.items.slice(),origin=g.reorganization!.memberOrigins.find(o=>o.pawnId===victim.id)!,oldLosses=structuredClone(root.worldGroups!.losses);
 expect(pending.demands).toEqual([{kind:'human',id:7}]);const captor=pending.factionId;
 expect(applyCommand(root,{type:'caravan-encounter-choice',groupId:g.id,choice:'give'},runtime).ok).toBe(true);const remaining=away261(record);expect(remaining.members).toEqual([retained]);expect(record.pending261).toBeUndefined();expect(root.tick).toBe(tick);expect(root.nextId).toBe(nextId);expect(totals261(remaining.items)).toEqual(quantities);for(const p of goods){expect(remaining.items).toContain(p);expect(p.owner).toEqual({type:'inventory',pawnId:8});}
 const rows=root.worldPawns!.owners.filter(r=>r.actor.id===victim.id);expect(rows).toHaveLength(1);const captive=rows[0]!;expect(captive.actor).toBe(victim);expect(captive).toMatchObject({kind:'human',entryKind259:'caravan-exit',enteredAtAbsCore:origin.enteredAtAbsCore,clockCore:tick*10,items:[],packed:[],captivity261:{factionId:captor,atCore:tick*10}});expect(captive.free).not.toBe(true);expect(victim.worldAffiliation259).toMatchObject({factionId:root.worldFactions!.playerFactionId,hostFactionId:null,guestStatus:'Guest'});expect(remaining.reorganization!.memberOrigins.some(o=>o.pawnId===victim.id)).toBe(false);expect(root.worldGroups!.losses).toEqual(oldLosses);
 const receipts=root.worldGroups!.lostMemories.filter(m=>m.otherId===7&&m.at===tick);expect(receipts.length).toBeGreaterThan(0);expect(receipts.some(m=>m.receiverId===8&&m.kind==='colonist-lost')).toBe(true);expect(receipts.some(m=>m.receiverId===9&&m.kind==='colonist-lost')).toBe(true);for(const m of receipts)expect(m).toMatchObject({caravanCession261:{groupId:g.id,tile:g.tile,captorFactionId:captor}});
 foreignOriginals(root,foreignPeople,foreignItems);checkpoint261(root,'demand-human-04-after-real-give');exactReload(root);
},120_000);
