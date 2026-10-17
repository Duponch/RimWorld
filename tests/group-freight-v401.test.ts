import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {groupFormationAuthority,previewGroupFormation,groupTradeQuote,groupSourceChoices} from '../src/sim/group-authority.ts';
import {prepareGroupPickup,commitGroupPickup} from '../src/sim/group-loading.ts';
import {tryGroupDeparture} from '../src/sim/group-driver.ts';
import {captureGroupMass,type PreparingGroup,type AwayGroup} from '../src/sim/group-capture.ts';
import {newGroupFreight,groupItemMassGrams} from '../src/sim/group-freight.ts';
import {validGroupFreightHistoricalTransport,validGroupFreightShape} from '../src/sim/group-freight-save.ts';
import {commercialPawnMass,commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {quoteOwnerTrade,draftOwnerTrade,type CommercialOwnerContext} from '../src/sim/commercial-owner-kernel.ts';
import {ensureCommercialPost} from '../src/sim/commercial-post.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {groupProvisionsWorkshopV391} from './scenarios/group-provisions-v391.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
import {SCHEMA_VERSION,type World,type Command} from '../src/sim/types.ts';
const raw=(v:unknown)=>v as Record<string,unknown>;
const accept=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
const until=(w:World,done:()=>boolean,max=2400)=>{for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),'tick '+w.tick).toBe(true);};
function camp(){
  const f=groupProvisionsWorkshopV391(),w=f.world;
  for(const pawn of w.pawns){pawn.foodPolicyId=w.foodPolicies[1]!.id;pawn.hunger=pawn.rest=100;}
  addMaterial(w,'wood',30,{type:'ground',x:3,z:5},'wood');const wood=w.piles.at(-1)!;wood.damage=7;
  addMaterial(w,'steel',20,{type:'ground',x:5,z:5},'steel');const steel=w.piles.at(-1)!; // Steel has no admissible positive damage in this catalogue.
  refreshStock(w);return {...f,w,wood,steel,lines:[{pileId:f.rationId,quantity:4},{pileId:wood.id,quantity:12},{pileId:steel.id,quantity:20}]};
}
function formation(){const f=camp();accept(f.w,{type:'group-start',memberIds:f.memberIds,destination:legacyPlanet(f.w).civilianTile,sources:f.lines});return {...f,g:f.w.group as PreparingGroup};}
/** Prepared contact positions only; pickup/ID allocation/receipt/ledger use the
 * real synchronous producer. The separate transition test walks normally. */
function pickup(f:ReturnType<typeof formation>){
  const {w,g}=f;g.phase='loading';const line=g.manifest[g.cursor];if(!line)throw Error('No future source');
  const source=w.piles.find(i=>i.id===line.pileId)!,carrier=w.pawns.find(q=>q.id===line.carrierId)!;
  if(source.owner.type!=='ground')throw Error('Missing actual ground source');
  carrier.x=source.owner.x;carrier.z=source.owner.z;carrier.path=[];carrier.moveCooldown=0;carrier.planCooldown=0;delete carrier.motion;
  const plan=prepareGroupPickup(w,g,groupFormationAuthority(w,true));expect(plan.kind).toBe('ready');if(plan.kind!=='ready')throw Error(plan.reason);
  expect(commitGroupPickup(w,g,plan.plan)).toBe(true);return line;
}
function departed(){
  const f=formation();while(f.g.cursor<f.g.manifest.length)pickup(f);f.g.phase='leaving';
  for(const e of f.g.exits){const pawn=f.w.pawns.find(q=>q.id===e.pawnId)!;if(!e.cell)throw Error('No physical exit');Object.assign(pawn,e.cell,{path:[],moveCooldown:0,planCooldown:0,state:'idle'});delete pawn.motion;}
  tryGroupDeparture(f.w);const g=f.w.group;if(!g||!('members' in g))throw Error('No committed departure');return {...f,g};
}
const checkpoint=(w:World)=>{expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);return copy;};
const amount=(w:World,item:string)=>[...w.piles,...(w.group&&'items' in w.group?w.group.items:[]),...(w.groupLosses??[]).flatMap(l=>l.items)].filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0);

test('contact split/whole receipts preserve identity, damage and exact prospective counters; cancellation refunds no goods',()=>{
  const f=formation(),{w,g}=f,initialId=w.nextId;
  while(g.cursor<g.manifest.length)pickup(f);
  const wr=g.manifest.find(l=>l.item==='wood')!,sr=g.manifest.find(l=>l.item==='steel')!,wood=w.piles.find(i=>i.id===wr.carriedPileId)!,steel=w.piles.find(i=>i.id===sr.carriedPileId)!;
  expect(wr.carriedPileId).not.toBe(f.wood.id);expect(wr.carriedPileId).toBe(initialId);expect(f.wood.quantity).toBe(18);
  expect(sr.carriedPileId).toBe(f.steel.id);expect(steel).toBe(f.steel);expect(wood).toMatchObject({quantity:12,damage:7,owner:{type:'inventory',pawnId:wr.carrierId}});expect(steel.damage).toBeUndefined();
  expect(g.freight).toEqual({revision:1,woodLoaded:12,steelLoaded:20});checkpoint(w);
  accept(w,{type:'group-cancel'});expect(w.group).toBeUndefined();expect(w.piles).toContain(wood);expect(w.piles).toContain(steel);expect(amount(w,'wood')).toBe(30);expect(amount(w,'steel')).toBe(20);
  accept(w,{type:'group-unload',memberIds:f.memberIds});until(w,()=>!w.group);expect(w.piles.filter(i=>i.item==='wood'||i.item==='steel').every(i=>i.owner.type==='ground')).toBe(true);expect(amount(w,'wood')).toBe(30);expect(amount(w,'steel')).toBe(20);checkpoint(w);
});

test('capacity, contact, reservation and same-tick prepared drafts refuse atomically',()=>{
  const f=formation(),{w,g}=f;g.phase='loading';const line=g.manifest[0]!,carrier=w.pawns.find(q=>q.id===line.carrierId)!,source=w.piles.find(i=>i.id===line.pileId)!;
  carrier.x=20;carrier.z=20;const before=serializeWorld(w);expect(prepareGroupPickup(w,g,groupFormationAuthority(w,true)).kind).toBe('refused');expect(serializeWorld(w)).toBe(before);
  const naked=camp();naked.wood.quantity=75;naked.steel.quantity=75;refreshStock(naked.w);const saved=serializeWorld(naked.w);
  expect(previewGroupFormation(naked.w,[naked.memberIds[0]!],[{pileId:naked.wood.id,quantity:75},{pileId:naked.steel.id,quantity:75},{pileId:naked.rationId,quantity:1}],naked.destination).ok).toBe(false);expect(serializeWorld(naked.w)).toBe(saved);
  if(source.owner.type!=='ground')throw Error('Ground required');Object.assign(carrier,{x:source.owner.x,z:source.owner.z,path:[],moveCooldown:0});delete carrier.motion;
  const authority=groupFormationAuthority(w,true),blocked={...authority,reservedQuantity:()=>source.quantity};const stamp=serializeWorld(w);
  expect(prepareGroupPickup(w,g,blocked).kind).toBe('refused');expect(serializeWorld(w)).toBe(stamp);
  const plan=prepareGroupPickup(w,g,authority);if(plan.kind!=='ready')throw Error(plan.reason);source.quantity++;refreshStock(w);const changed=serializeWorld(w);
  expect(commitGroupPickup(w,g,plan.plan)).toBe(false);expect(serializeWorld(w)).toBe(changed);
});

test('ordinary loading/exit and physical return/deposit resume exactly, with independent real departure baseline',()=>{
  const f=camp(),{w}=f;addMaterial(w,'wood',3,{type:'inventory',pawnId:f.memberIds[0]!},'wood');refreshStock(w);
  accept(w,{type:'group-start',memberIds:f.memberIds,destination:f.destination,sources:f.lines});
  until(w,()=>!!w.group&&'manifest' in w.group&&w.group.cursor>0);const twin=checkpoint(w),at=w.tick;
  until(w,()=>!!w.group&&'members' in w.group);stepWorld(twin,w.tick-at);expect(serializeWorld(twin)).toBe(serializeWorld(w));
  const g=w.group as AwayGroup;expect(g.freight).toEqual({revision:1,woodLoaded:12,steelLoaded:20});expect(g.baseline.freight).toEqual({wood:15,steel:20});
  const roster=[...g.members];
  accept(w,{type:'group-route',destination:legacyPlanet(w).homeTile});until(w,()=>!w.group);checkpoint(w);
  expect(roster.every(p=>w.pawns.includes(p))).toBe(true);// The ordinary ground transfer may merge compatible stacks and retire a receipt ID.
  expect(w.piles.filter(i=>i.item==='wood'||i.item==='steel').every(i=>i.owner.type==='ground')).toBe(true);expect(amount(w,'wood')).toBe(33);expect(amount(w,'steel')).toBe(20);
});

test('steel cargo leaves ordinary textile commerce working, binds fresh contract quotes and stays unknown to individuals',()=>{
  const f=camp(),{w}=f;
  // Declared commerce precondition; no learning, transaction or route credited.
  for(const pawn of w.pawns){delete pawn.background;delete pawn.traits;pawn.skills.social={level:8,xp:0,dailyXp:0,passion:0};}
  // Declared actual inventory rations; sources[] credits no new pickup.
  addMaterial(w,'food',4,{type:'inventory',pawnId:f.memberIds[0]!},'survival-meal');
  addMaterial(w,'steel',2,{type:'inventory',pawnId:f.memberIds[0]!},'steel');addMaterial(w,'textile',40,{type:'inventory',pawnId:f.memberIds[0]!},'cloth');addMaterial(w,'silver',1000,{type:'inventory',pawnId:f.memberIds[0]!},'silver');
  accept(w,{type:'group-start',memberIds:f.memberIds,destination:legacyPlanet(w).civilianTile,sources:[]});const preparing=w.group as PreparingGroup;preparing.phase='leaving';
  for(const e of preparing.exits){if(!e.cell)throw Error('Exit');const p=w.pawns.find(q=>q.id===e.pawnId)!;Object.assign(p,e.cell,{path:[],moveCooldown:0,planCooldown:0,state:'idle'});delete p.motion;}
  tryGroupDeparture(w);const g=w.group as AwayGroup;Object.assign(g,{phase:'at-site',tile:legacyPlanet(w).civilianTile,route:[legacyPlanet(w).civilianTile],segment:null,stop:{kind:'at-site'}});expect(ensureCommercialPost(w)).toBe(true);expect(g.baseline.food).toBe(4);expect(g.ledger.foodLoaded).toBe(0);checkpoint(w);
  const steel=g.items.find(i=>i.item==='steel')!,cloth=g.items.find(i=>i.item==='cloth')!,sell=[{pileId:cloth.id,quantity:5}],q=groupTradeQuote(w,'sell',sell);if(!q.ok)throw Error(q.reason);
  g.freight!.woodLoaded++;expect(applyCommand(w,{type:'group-sell',lines:sell,quote:q.signature}).ok).toBe(false);g.freight!.woodLoaded--;
  const current=groupTradeQuote(w,'sell',sell);if(!current.ok)throw Error(current.reason);accept(w,{type:'group-sell',lines:sell,quote:current.signature});
  const med=w.civilianPost!.stock.find(i=>i.item==='medicine')!,buy=[{pileId:med.id,quantity:1}],offer=groupTradeQuote(w,'buy',buy);if(!offer.ok)throw Error(offer.reason);accept(w,{type:'group-buy',lines:buy,quote:offer.signature});
  const after=w.group as AwayGroup;expect(after.items.find(i=>i.id===steel.id)).toEqual(steel);expect(after.baseline.freight).toEqual({wood:0,steel:2});checkpoint(w);
  expect(groupItemMassGrams('wood',true)).toBe(400);expect(groupItemMassGrams('steel',true)).toBe(500);expect(groupItemMassGrams('steel',true,252)).toBeUndefined();expect(commercialItemMassGrams('steel')).toBeUndefined();expect(commercialPawnMass(after.members[0]!,after.items,w.schemaVersion)).toBeNull();
  const mass=captureGroupMass(after.members,after.items,true)!;
  const c:CommercialOwnerContext={tick:w.tick,nextId:w.nextId,version:w.schemaVersion,scope:'individual-witness',members:after.members,negotiator:after.members[0]!,items:after.items,post:w.civilianPost!,mass,ledgerStamp:[],pileCountElsewhere:w.piles.length,inventoryLimit:256};
  const individual=quoteOwnerTrade(c,'sell',[{pileId:cloth.id,quantity:1}]);if(!individual.ok)throw Error(individual.reason);expect(draftOwnerTrade(c,individual)).toBeNull();raw(c).groupFreight=1;expect(draftOwnerTrade(c,individual)).toBeNull();
});

test('terminal steel remains counted with its group, then survives after all active members die without a recreated contract',()=>{
  const f=departed(),{w}=f,g=f.g;checkpoint(w);const baseline=structuredClone(g.baseline.freight),steel=g.items.find(i=>i.item==='steel')!;
  const ownerId=steel.owner.type==='inventory'?steel.owner.pawnId:-1;
  const terminal=(id:number)=>{const person=(w.group as AwayGroup).members.find(p=>p.id===id)!;person.health=createMedicalRecord(w.tick);addResolvedInjury(person.health,'left-hand','cut',6000,()=>.999999);person.health.bloodLoss=BLOOD_UNIT-1;person.medicalCare='none';const s=medicalStatus(person.health);person.state=s==='mobile'?'idle':s;};
  terminal(ownerId);until(w,()=>!!w.groupLosses?.some(l=>l.pawn.id===ownerId),8);expect(w.groupLosses!.find(l=>l.pawn.id===ownerId)!.items.some(i=>i.id===steel.id)).toBe(true);expect((w.group as AwayGroup).baseline.freight).toEqual(baseline);checkpoint(w);
  const invalid=structuredClone(w);invalid.groupLosses!.find(l=>l.pawn.id===ownerId)!.items.find(i=>i.id===steel.id)!.quantity++;expect(validateWorld(invalid).length).toBeGreaterThan(0);
  const remaining=(w.group as AwayGroup).members.map(p=>p.id);for(const id of remaining)terminal(id);until(w,()=>!w.group,8);const saved=checkpoint(w);expect(saved.group).toBeUndefined();expect(saved.groupLosses!.flatMap(l=>l.items).some(i=>i.id===steel.id)).toBe(true);expect(amount(w,'steel')).toBe(20);
});

test('252 migration validates both original maps first and grants no active group contract or baseline',()=>{
  const f=departed(),old=f.w;delete old.group!.freight;delete (old.group as AwayGroup).baseline.freight;
  // Historical wood inventory is admissible off-map; steel was not.
  (old.group as AwayGroup).items=(old.group as AwayGroup).items.filter(i=>i.item!=='steel');Object.assign(old,{schemaVersion:252});
  // The input remains historical252; the neutral migration ends at the
  // current schema, including later number-only terrain migrations.
  const before=structuredClone(old),next=deserializeWorld(JSON.stringify(old));expect(next).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(next.group!.freight).toBeUndefined();expect((next.group as AwayGroup).baseline.freight).toBeUndefined();expect((next.group as AwayGroup).items.some(i=>i.item==='wood')).toBe(true);
  const {w}=preparedCassandraExpedition();Object.assign(w,{schemaVersion:252});const saved=structuredClone(w);expect(deserializeWorld(JSON.stringify(w))).toEqual({...saved,schemaVersion:SCHEMA_VERSION});
  const bad=structuredClone(w);raw(bad.secondarySite!.map).group={freight:newGroupFreight()};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/freight/i);
  const malformed=structuredClone(w);raw(malformed.secondarySite!.map.tiles[0]).terrain='invalid';expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/252/);
});

test('252 future fields and new local inventory refuse in RAW/full/delta; ground, visitor and off-map wood are preserved',()=>{
  const f=camp(),old=f.w;Object.assign(old,{schemaVersion:252});
  for(const group of [{freight:newGroupFreight()},{baseline:{freight:{wood:0,steel:0}}},{manifest:[{item:'wood'}]}]){
    const bad=structuredClone(old);raw(bad).group=group;raw(bad).world={};expect(validGroupFreightHistoricalTransport(bad,252)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/freight/i);
  }
  const owner=old.pawns[0]!,wood=old.piles.find(i=>i.id===f.wood.id)!;wood.owner={type:'inventory',pawnId:owner.id};
  expect(validGroupFreightHistoricalTransport(old,252)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/freight/i);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(old,0,0)))).toMatchObject({status:'resync'});
  const source=structuredClone(old);source.piles.find(i=>i.id===wood.id)!.owner={type:'ground',x:3,z:5};const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(source,0,0)));expect(first.status).toBe('applied');
  const good=structuredClone(encoder.encode(source,0,0));if(good.kind!=='delta')throw Error('Delta needed');const bad=structuredClone(good);bad.piles={removed:[],upserted:[wood]};raw(bad).schemaVersion=252;
  expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(decoder.adopt(good)).toMatchObject({status:'applied'});
  const witness={schemaVersion:252,pawns:[{id:1,visitor:{role:'trader'}}],piles:[{item:'steel',owner:{type:'inventory',pawnId:1}}]};expect(validGroupFreightHistoricalTransport(witness,252)).toBe(true);expect(validGroupFreightHistoricalTransport({schemaVersion:252,piles:[{item:'steel',owner:{type:'ground',x:0,z:0}}]},252)).toBe(true);
});

test('freight exact shape, contact counters and paired baseline are enforced by RAW and Decoder at the same tick',()=>{
  expect(validGroupFreightShape({freight:undefined},253)).toBe(false);expect(validGroupFreightShape({baseline:{freight:{wood:0,steel:0}}},253)).toBe(false);
  const f=formation();pickup(f);const w=f.w,encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');const good=structuredClone(encoder.encode(w,0,0));
  const bad=structuredClone(good);bad.world.group!.freight!.woodLoaded++;expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(decoder.adopt(good)).toMatchObject({status:'applied'});
  const a=departed().w;for(const change of [(g:AwayGroup)=>{g.baseline.freight!.wood++;},(g:AwayGroup)=>{delete g.freight;},(g:AwayGroup)=>{delete g.baseline.freight;},(g:AwayGroup)=>{raw(g.freight).extra=0;}]){const b=structuredClone(a);change(b.group as AwayGroup);expect(()=>serializeWorld(b)).toThrow();expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(b,0,0)))).toMatchObject({status:'resync'});}
  const legacy=structuredClone(f.w);delete legacy.group!.freight;expect(groupSourceChoices(legacy).some(c=>c.pile.item==='wood'||c.pile.item==='steel')).toBe(false);
  expect(campaignPresentation(a).group!.freight).toEqual(a.group!.freight);
});
