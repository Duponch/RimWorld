import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {groupFormationAuthority,previewGroupFormation,groupTradeQuote,groupSourceChoices} from '../src/sim/group-authority.ts';
import {prepareGroupPickup,commitGroupPickup} from '../src/sim/group-loading.ts';
import {tryGroupDeparture} from '../src/sim/group-driver.ts';
import {captureGroupMass,type AwayGroup} from '../src/sim/group-capture.ts';
import {newGroupFreight,groupItemMassGrams} from '../src/sim/group-freight.ts';
import {validGroupFreightHistoricalTransport,validGroupFreightShape} from '../src/sim/group-freight-save.ts';
import {commercialPawnMass,commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {quoteOwnerTrade,draftOwnerTrade,type CommercialOwnerContext} from '../src/sim/commercial-owner-kernel.ts';
import {ensureCommercialPost} from '../src/sim/commercial-post.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {groupProvisionsWorkshopV391} from './scenarios/group-provisions-v391.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registeredMap,withWorldGroup,commitWorldGroupContext} from '../src/sim/world-map-context.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import type {GroupState} from '../src/sim/group-state.ts';
import {SCHEMA_VERSION,type World,type Command} from '../src/sim/types.ts';
const raw=(v:unknown)=>v as Record<string,unknown>;
const runtimes=new WeakMap<World,GroupCampaignRuntime256>();
function runtime(w:World){if(!w.worldMaps)return;let value=runtimes.get(w);if(!value){value=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());value.bootstrap(w);runtimes.set(w,value);}return value;}
function group(w:World):GroupState|undefined {return w.worldGroups?w.worldGroups.groups.find(g=>g.state.id===w.worldGroups!.selectedGroupId)?.state:w.group;}
const losses=(w:World)=>w.worldGroups?.losses??w.groupLosses??[];
function inGroup<T>(w:World,operation:(context:World)=>T):T {const g=group(w);if(!g)throw Error('Missing actual group');if(!w.worldGroups)return operation(w);const result=withWorldGroup(w,g.id,operation);if(result===undefined)throw Error('Missing actual group context');return result;}
function execute(w:World,c:Command){let command=c;if(w.worldMaps){
 if(c.type==='group-start'||c.type==='group-unload'){const originMapId=w.worldMaps.selectedMapId;if(originMapId===null)throw Error('No actual selected departure map');command={...c,originMapId};}
 else if(['group-cancel','group-route','group-buy','group-sell'].includes(c.type)){const current=group(w);if(!current)throw Error('No selected group');command={...c,groupId:current.id} as Command;}
 }return applyCommand(w,command,runtime(w));}
const accept=(w:World,c:Command)=>expect(execute(w,c),JSON.stringify(c)).toMatchObject({ok:true});
const advance=(w:World,count=1)=>stepWorld(w,count,undefined,runtime(w));
const until=(w:World,done:()=>boolean,max=2400)=>{for(let i=0;i<max&&!done();i++)advance(w);expect(done(),'tick '+w.tick).toBe(true);};
/** Authored pre255 atelier, not a current formation amputated after creation.
 * Cold load below strictly validates its historical scalar and whole source. */
function camp(historical=false,version=253){
 const f=groupProvisionsWorkshopV391(),w=f.world;
 Object.assign(w,{schemaVersion:version});delete w.worldMaps;delete w.worldGroups;delete w.wildlife;
 for(const pawn of w.pawns)if(pawn.mental)delete pawn.mental.wander;
 for(const pawn of w.pawns){pawn.foodPolicyId=w.foodPolicies[1]!.id;pawn.hunger=pawn.rest=100;}
 addMaterial(w,'wood',30,{type:'ground',x:3,z:5},'wood');const wood=w.piles.at(-1)!;wood.damage=7;
 addMaterial(w,'steel',20,{type:'ground',x:5,z:5},'steel');const steel=w.piles.at(-1)!;
 refreshStock(w);const result={...f,w,wood,steel,lines:[{pileId:f.rationId,quantity:4},{pileId:wood.id,quantity:12},{pileId:steel.id,quantity:20}]};
 return historical?result:promote(result);
}
/** Independent literal assertions, never an expected value computed by the
 * migration under test. RAW deserialization is the real strict cold boundary. */
function literalMigration(old:World,current:World){
 expect(current.schemaVersion).toBe(SCHEMA_VERSION);expect(current).not.toHaveProperty('group');expect(current).not.toHaveProperty('secondarySite');
 for(const key of Object.keys(old))if(!['schemaVersion','group','groupLosses','civilianPost','secondarySite'].includes(key))expect(raw(current)[key],key).toEqual(raw(old)[key]);
 expect(current.worldGroups!.losses).toEqual(old.groupLosses??[]);
 if(old.group){expect(current.worldGroups!.groups).toHaveLength(1);expect(current.worldGroups!.groups[0]!.state).toEqual(old.group);expect(current.worldGroups!.groups[0]!.originMapId).toBe(0);}
 else expect(current.worldGroups!.groups).toHaveLength(0);
 expect(current.worldMaps!.sites[0]).toMatchObject({id:0,tile:legacyPlanet(old).homeTile,kind:'settlement',createdAt:0});
 if(old.secondarySite){const site=current.worldMaps!.sites.find(m=>m.id===1)!;expect(site).toMatchObject({tile:old.secondarySite.tile,kind:'legacy-site',createdAt:old.secondarySite.createdAt,visit:old.secondarySite.visit});const local=registeredMap(current,1)!;for(const key of Object.keys(old.secondarySite.map))expect(raw(local)[key],`secondary.${key}`).toEqual(raw(old.secondarySite.map)[key]);expect(current.worldMaps!.sites).toHaveLength(2);expect(current.worldMaps!.selectedMapId).toBe(old.secondarySite.selected?1:0);}
 else expect(current.worldMaps!.sites).toHaveLength(1);
}
function promote<T extends {w:World;wood:World['piles'][number];steel:World['piles'][number]}>(f:T):T {const current=deserializeWorld(JSON.stringify(f.w));literalMigration(f.w,current);return {...f,w:current,wood:current.piles.find(i=>i.id===f.wood.id)!,steel:current.piles.find(i=>i.id===f.steel.id)!};}
function formation(f=camp(true),destination=legacyPlanet(f.w).civilianTile,sources=f.lines,migrate=true){accept(f.w,{type:'group-start',memberIds:f.memberIds,destination,sources});const result=migrate?promote(f):f,g=group(result.w);if(!g||!('manifest'in g))throw Error('Actual preparing owner absent');expect(g).not.toHaveProperty('travelPreparation');expect(g).not.toHaveProperty('admission');return {...result,g};}
/** Prepared contact positions only; actual producer pays pickup/ID/receipt. */
function pickup(f:ReturnType<typeof formation>){return inGroup(f.w,w=>{const g=group(w);if(!g||!('manifest'in g))throw Error('No preparing owner');g.phase='loading';const line=g.manifest[g.cursor];if(!line)throw Error('No future source');const source=w.piles.find(i=>i.id===line.pileId)!,carrier=w.pawns.find(q=>q.id===line.carrierId)!;if(source.owner.type!=='ground')throw Error('Missing actual ground source');carrier.x=source.owner.x;carrier.z=source.owner.z;carrier.path=[];carrier.moveCooldown=0;carrier.planCooldown=0;delete carrier.motion;const plan=prepareGroupPickup(w,g,groupFormationAuthority(w,true));expect(plan.kind).toBe('ready');if(plan.kind!=='ready')throw Error(plan.reason);expect(commitGroupPickup(w,g,plan.plan)).toBe(true);return line;});}
function departed(historical=false){const before=camp(true),f=formation(before,legacyPlanet(before.w).civilianTile,before.lines,!historical);while(f.g.cursor<f.g.manifest.length)pickup(f);f.g.phase='leaving';for(const e of f.g.exits){const pawn=f.w.pawns.find(q=>q.id===e.pawnId)!;if(!e.cell)throw Error('No physical exit');Object.assign(pawn,e.cell,{path:[],moveCooldown:0,planCooldown:0,state:'idle'});delete pawn.motion;}inGroup(f.w,ctx=>{tryGroupDeparture(ctx);return true;});const g=group(f.w);if(!g||!('members'in g))throw Error('No actual departure');return {...f,g};}
const checkpoint=(w:World)=>{expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);return copy;};
const amount=(w:World,item:string)=>{const g=group(w);return [...w.piles,...(g&&'items'in g?g.items:[]),...losses(w).flatMap(l=>l.items)].filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0);};
const fixtureText=readFileSync(new URL('./fixtures/group-freight-v401-prepared253.json',import.meta.url),'utf8');
function acquired253(){expect(createHash('sha256').update(fixtureText).digest('hex')).toBe('7601cf299c9d2c3f6e6f40649ba41f07f79cc2519ef8dd132e6278db015c3330');const old=JSON.parse(fixtureText) as World;expect(Number(old.schemaVersion)).toBe(253);expect([old.width,old.height]).toEqual([32,32]);expect(old.pawns.map(p=>p.id)).toEqual([93]);expect(old.secondarySite!.map.pawns.map(p=>p.id)).toEqual([89,91]);expect(old.secondarySite!.map.wildlife!.animals).toHaveLength(1);return old;}

test('contact split/whole receipts preserve identity, damage and exact prospective counters; cancellation refunds no goods',()=>{
  const f=formation(),{w,g}=f,initialId=w.nextId;
  while(g.cursor<g.manifest.length)pickup(f);
  const wr=g.manifest.find(l=>l.item==='wood')!,sr=g.manifest.find(l=>l.item==='steel')!,wood=w.piles.find(i=>i.id===wr.carriedPileId)!,steel=w.piles.find(i=>i.id===sr.carriedPileId)!;
  expect(wr.carriedPileId).not.toBe(f.wood.id);expect(wr.carriedPileId).toBe(initialId);expect(f.wood.quantity).toBe(18);
  expect(sr.carriedPileId).toBe(f.steel.id);expect(steel).toBe(f.steel);expect(wood).toMatchObject({quantity:12,damage:7,owner:{type:'inventory',pawnId:wr.carrierId}});expect(steel.damage).toBeUndefined();
  expect(g.freight).toEqual({revision:1,woodLoaded:12,steelLoaded:20});checkpoint(w);
  accept(w,{type:'group-cancel'});expect(group(w)).toBeUndefined();expect(w.piles).toContain(wood);expect(w.piles).toContain(steel);expect(amount(w,'wood')).toBe(30);expect(amount(w,'steel')).toBe(20);
  accept(w,{type:'group-unload',memberIds:f.memberIds});until(w,()=>!group(w));expect(w.piles.filter(i=>i.item==='wood'||i.item==='steel').every(i=>i.owner.type==='ground')).toBe(true);expect(amount(w,'wood')).toBe(30);expect(amount(w,'steel')).toBe(20);checkpoint(w);
});

test('capacity, contact, reservation and same-tick prepared drafts refuse atomically',()=>{
 const f=formation(),{w,g}=f;g.phase='loading';
 inGroup(w,v=>{const line=g.manifest[0]!,carrier=v.pawns.find(q=>q.id===line.carrierId)!,source=v.piles.find(i=>i.id===line.pileId)!;carrier.x=20;carrier.z=20;const before=serializeWorld(w);expect(prepareGroupPickup(v,g,groupFormationAuthority(v,true)).kind).toBe('refused');expect(serializeWorld(w)).toBe(before);
 if(source.owner.type!=='ground')throw Error('Ground required');Object.assign(carrier,{x:source.owner.x,z:source.owner.z,path:[],moveCooldown:0});delete carrier.motion;const authority=groupFormationAuthority(v,true),blocked={...authority,reservedQuantity:()=>source.quantity},stamp=serializeWorld(w);expect(prepareGroupPickup(v,g,blocked).kind).toBe('refused');expect(serializeWorld(w)).toBe(stamp);
 const plan=prepareGroupPickup(v,g,authority);if(plan.kind!=='ready')throw Error(plan.reason);source.quantity++;refreshStock(v);commitWorldGroupContext(v);const changed=serializeWorld(w);expect(commitGroupPickup(v,g,plan.plan)).toBe(false);expect(serializeWorld(w)).toBe(changed);return true;});
 const naked=camp();naked.wood.quantity=75;naked.steel.quantity=75;refreshStock(naked.w);const saved=serializeWorld(naked.w);expect(previewGroupFormation(naked.w,[naked.memberIds[0]!],[{pileId:naked.wood.id,quantity:75},{pileId:naked.steel.id,quantity:75},{pileId:naked.rationId,quantity:1}],naked.destination).ok).toBe(false);expect(serializeWorld(naked.w)).toBe(saved);
});

test('ordinary loading/exit and physical return/deposit resume exactly, with independent real departure baseline',()=>{
  const prepared=camp(true);addMaterial(prepared.w,'wood',3,{type:'inventory',pawnId:prepared.memberIds[0]!},'wood');refreshStock(prepared.w);
  const f=formation(prepared,prepared.destination),{w}=f;
  until(w,()=>{const g=group(w);return !!g&&'manifest'in g&&g.cursor>0;});const twin=checkpoint(w),at=w.tick;
  until(w,()=>{const g=group(w);return !!g&&'members'in g;});advance(twin,w.tick-at);expect(serializeWorld(twin)).toBe(serializeWorld(w));
  const g=group(w) as AwayGroup;expect(g.freight).toEqual({revision:1,woodLoaded:12,steelLoaded:20});expect(g.baseline.freight).toEqual({wood:15,steel:20});
  const roster=[...g.members];
  accept(w,{type:'group-route',destination:legacyPlanet(w).homeTile});until(w,()=>!group(w));checkpoint(w);
  expect(roster.every(p=>w.pawns.includes(p))).toBe(true);// The ordinary ground transfer may merge compatible stacks and retire a receipt ID.
  expect(w.piles.filter(i=>i.item==='wood'||i.item==='steel').every(i=>i.owner.type==='ground')).toBe(true);expect(amount(w,'wood')).toBe(33);expect(amount(w,'steel')).toBe(20);
});

test('steel cargo leaves ordinary textile commerce working, binds fresh contract quotes and stays unknown to individuals',()=>{
  const f=camp(true),w=f.w;
  // Declared commerce precondition; no learning, transaction or route credited.
  for(const pawn of w.pawns){delete pawn.background;delete pawn.traits;pawn.skills.social={level:8,xp:0,dailyXp:0,passion:0};}
  // Declared actual inventory rations; sources[] credits no new pickup.
  addMaterial(w,'food',4,{type:'inventory',pawnId:f.memberIds[0]!},'survival-meal');
  addMaterial(w,'steel',2,{type:'inventory',pawnId:f.memberIds[0]!},'steel');addMaterial(w,'textile',40,{type:'inventory',pawnId:f.memberIds[0]!},'cloth');addMaterial(w,'silver',1000,{type:'inventory',pawnId:f.memberIds[0]!},'silver');
  const migrated=formation(f,legacyPlanet(w).civilianTile,[]),current=migrated.w;const preparing=migrated.g;preparing.phase='leaving';
  for(const e of preparing.exits){if(!e.cell)throw Error('Exit');const p=current.pawns.find(q=>q.id===e.pawnId)!;Object.assign(p,e.cell,{path:[],moveCooldown:0,planCooldown:0,state:'idle'});delete p.motion;}
  inGroup(current,ctx=>{tryGroupDeparture(ctx);return true;});const g=group(current) as AwayGroup;Object.assign(g,{phase:'at-site',tile:legacyPlanet(current).civilianTile,route:[legacyPlanet(current).civilianTile],segment:null,stop:{kind:'at-site'}});expect(inGroup(current,ensureCommercialPost)).toBe(true);expect(g.baseline.food).toBe(4);expect(g.ledger.foodLoaded).toBe(0);checkpoint(current);
  const steel=g.items.find(i=>i.item==='steel')!,cloth=g.items.find(i=>i.item==='cloth')!,sell=[{pileId:cloth.id,quantity:5}],q=inGroup(current,v=>groupTradeQuote(v,'sell',sell));if(!q.ok)throw Error(q.reason);
  g.freight!.woodLoaded++;expect(execute(current,{type:'group-sell',lines:sell,quote:q.signature}).ok).toBe(false);g.freight!.woodLoaded--;
  const fresh=inGroup(current,v=>groupTradeQuote(v,'sell',sell));if(!fresh.ok)throw Error(fresh.reason);accept(current,{type:'group-sell',lines:sell,quote:fresh.signature});
  const med=inGroup(current,v=>v.civilianPost)!.stock.find(i=>i.item==='medicine')!,buy=[{pileId:med.id,quantity:1}],offer=inGroup(current,v=>groupTradeQuote(v,'buy',buy));if(!offer.ok)throw Error(offer.reason);accept(current,{type:'group-buy',lines:buy,quote:offer.signature});
  const after=group(current) as AwayGroup;expect(after.items.find(i=>i.id===steel.id)).toEqual(steel);expect(after.baseline.freight).toEqual({wood:0,steel:2});checkpoint(current);
  expect(groupItemMassGrams('wood',true)).toBe(400);expect(groupItemMassGrams('steel',true)).toBe(500);expect(groupItemMassGrams('steel',true,252)).toBeUndefined();expect(commercialItemMassGrams('steel')).toBeUndefined();expect(commercialPawnMass(after.members[0]!,after.items,current.schemaVersion)).toBeNull();
  const mass=captureGroupMass(after.members,after.items,true)!;
  const c:CommercialOwnerContext={tick:current.tick,nextId:current.nextId,version:current.schemaVersion,scope:'individual-witness',members:after.members,negotiator:after.members[0]!,items:after.items,post:inGroup(current,v=>v.civilianPost)!,mass,ledgerStamp:[],pileCountElsewhere:current.piles.length,inventoryLimit:256};
  const individual=quoteOwnerTrade(c,'sell',[{pileId:cloth.id,quantity:1}]);if(!individual.ok)throw Error(individual.reason);expect(draftOwnerTrade(c,individual)).toBeNull();raw(c).groupFreight=1;expect(draftOwnerTrade(c,individual)).toBeNull();
});

test('terminal steel remains counted with its group, then survives after all active members die without a recreated contract',()=>{
  const f=departed(),{w}=f,g=f.g;checkpoint(w);const baseline=structuredClone(g.baseline.freight),steel=g.items.find(i=>i.item==='steel')!;
  const ownerId=steel.owner.type==='inventory'?steel.owner.pawnId:-1;
  const terminal=(id:number)=>{const person=(group(w) as AwayGroup).members.find(p=>p.id===id)!;person.health=createMedicalRecord(w.tick);addResolvedInjury(person.health,'left-hand','cut',6000,()=>.999999);person.health.bloodLoss=BLOOD_UNIT-1;person.medicalCare='none';const s=medicalStatus(person.health);person.state=s==='mobile'?'idle':s;};
  terminal(ownerId);until(w,()=>!!losses(w)?.some(l=>l.pawn.id===ownerId),8);expect(losses(w)!.find(l=>l.pawn.id===ownerId)!.items.some(i=>i.id===steel.id)).toBe(true);expect((group(w) as AwayGroup).baseline.freight).toEqual(baseline);checkpoint(w);
  const invalid=structuredClone(w);losses(invalid)!.find(l=>l.pawn.id===ownerId)!.items.find(i=>i.id===steel.id)!.quantity++;expect(validateWorld(invalid).length).toBeGreaterThan(0);
  const remaining=(group(w) as AwayGroup).members.map(p=>p.id);for(const id of remaining)terminal(id);until(w,()=>!group(w),8);const saved=checkpoint(w);expect(saved.group).toBeUndefined();expect(losses(saved)!.flatMap(l=>l.items).some(i=>i.id===steel.id)).toBe(true);expect(amount(w,'steel')).toBe(20);
});

test('252 migration validates both original maps first and grants no active group contract or baseline',()=>{
 const f=departed(true),old=f.w,g=f.g;delete g.freight;delete g.baseline.freight;g.items=g.items.filter(i=>i.item!=='steel');Object.assign(old,{schemaVersion:252});const before=JSON.parse(JSON.stringify(old)) as World,next=deserializeWorld(JSON.stringify(old));literalMigration(before,next);const moved=group(next) as AwayGroup;expect(moved.freight).toBeUndefined();expect(moved.baseline.freight).toBeUndefined();expect(moved.items.some(i=>i.item==='wood')).toBe(true);
 const native=acquired253();Object.assign(native,{schemaVersion:252});expect(validGroupFreightHistoricalTransport(native,252)).toBe(true);const restored=deserializeWorld(JSON.stringify(native));literalMigration(native,restored);
 const bad=JSON.parse(JSON.stringify(native)) as World;raw(bad.secondarySite!.map).group={freight:newGroupFreight()};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/freight/i);
 const malformed=JSON.parse(JSON.stringify(native)) as World;raw(malformed.secondarySite!.map.tiles[0]).terrain='invalid';expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/252/);
});

test('252 future fields and new local inventory refuse in RAW/full/delta; ground, visitor and off-map wood are preserved',()=>{
 const old=acquired253();Object.assign(old,{schemaVersion:252});
 for(const group of [{freight:newGroupFreight()},{baseline:{freight:{wood:0,steel:0}}},{manifest:[{item:'wood'}]}]){const bad=structuredClone(old);raw(bad).group=group;raw(bad).world={};expect(validGroupFreightHistoricalTransport(bad,252)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/freight/i);}
 const actualWood=old.secondarySite!.map.piles.find(i=>i.item==='wood')!,owner=old.pawns[0]!,wood={...actualWood,owner:{type:'inventory' as const,pawnId:owner.id}},invalid=structuredClone(old);invalid.secondarySite!.map.piles=invalid.secondarySite!.map.piles.filter(p=>p.id!==wood.id);invalid.piles.push(wood);
 expect(validGroupFreightHistoricalTransport(invalid,252)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/freight/i);const invalidView=structuredClone(campaignPresentation(old)),originalViewWood=invalidView.piles.find(p=>p.item==='wood')!;const viewWood={...originalViewWood,owner:{type:'inventory' as const,pawnId:invalidView.pawns[0]!.id}};invalidView.piles=invalidView.piles.map(p=>p.id===viewWood.id?viewWood:p);refreshStock(invalidView);expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(invalidView,0,0)))).toMatchObject({status:'resync'});
 const source=structuredClone(old),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(campaignPresentation(source),0,0)));expect(first,JSON.stringify(first)).toMatchObject({status:'applied'});
 const good=structuredClone(encoder.encode(campaignPresentation(source),0,0));if(good.kind!=='delta')throw Error('Delta needed');const bad=structuredClone(good);bad.piles={removed:[],upserted:[viewWood]};raw(bad).schemaVersion=252;expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(decoder.adopt(good)).toMatchObject({status:'applied'});
 const witness={schemaVersion:252,pawns:[{id:1,visitor:{role:'trader'}}],piles:[{item:'steel',owner:{type:'inventory',pawnId:1}}]};expect(validGroupFreightHistoricalTransport(witness,252)).toBe(true);expect(validGroupFreightHistoricalTransport({schemaVersion:252,piles:[{item:'steel',owner:{type:'ground',x:0,z:0}}]},252)).toBe(true);
});

test('freight exact shape, contact counters and paired baseline are enforced by RAW and Decoder at the same tick',()=>{
  expect(validGroupFreightShape({freight:undefined},253)).toBe(false);expect(validGroupFreightShape({baseline:{freight:{wood:0,steel:0}}},253)).toBe(false);
  const f=formation();pickup(f);const w=f.w,encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');const good=structuredClone(encoder.encode(w,0,0));
  const bad=structuredClone(good);const metadata=bad.world.campaignMap;if(!metadata||metadata.revision!==2)throw Error('Missing actual group projection');metadata.groups[0]!.state.freight!.woodLoaded++;expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(decoder.adopt(good)).toMatchObject({status:'applied'});
  const a=departed().w;for(const change of [(g:AwayGroup)=>{g.baseline.freight!.wood++;},(g:AwayGroup)=>{delete g.freight;},(g:AwayGroup)=>{delete g.baseline.freight;},(g:AwayGroup)=>{raw(g.freight).extra=0;}]){const b=structuredClone(a);change(group(b) as AwayGroup);expect(()=>serializeWorld(b)).toThrow();expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(b,0,0)))).toMatchObject({status:'resync'});}
  const legacyBefore=camp(true,252),legacy=formation(legacyBefore,legacyPlanet(legacyBefore.w).civilianTile,[{pileId:legacyBefore.rationId,quantity:4}]).w;expect(group(legacy)).not.toHaveProperty('freight');expect(inGroup(legacy,groupSourceChoices).some(c=>c.pile.item==='wood'||c.pile.item==='steel')).toBe(false);
  const projection=campaignPresentation(a).campaignMap;if(!projection||projection.revision!==2)throw Error('Missing registered group projection');expect(projection.groups[0]!.state.freight).toEqual(group(a)!.freight);
});
