import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {preparedMap,registryCamp} from './helpers/world-maps-v255.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validBillWorkerBuilding283,validBillWorkerHistoricalTransport283,validBillWorkerWorld283} from '../src/sim/bill-worker-save-283.ts';
import {queryBillWorkerOptions283,notifyBillWorkerUnavailable283,normalizeBillWorkersAtInstall283} from '../src/sim/bill-worker-owners-283.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {legacyHumanAge} from '../src/sim/human-age.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {INTRINSIC_WORLD_FACTIONS} from '../src/sim/world-generation-settings.ts';
import {initialWorldPawns256,type WorldPawnOwner256} from '../src/sim/world-pawn-state-256.ts';
import {preparePassedToWorld256} from '../src/sim/world-pawn-transition-256.ts';
import {bindBornHumanFaction259} from '../src/sim/world-affiliation-259.ts';
import {captureHumanOwners} from '../src/sim/human-owners.ts';
import {reconcileTemperature} from '../src/sim/temperature.ts';
import type {CookingBill} from '../src/sim/cooking-types.ts';
import type {Structure,World} from '../src/sim/types.ts';

function station(w:World):Structure {
 const s=fixtureBuilding(w,'campfire',4,4) as Structure;
 s.bills=[newCookingBill(w.nextId++,'simple-meal',w.schemaVersion)];return s;
}
const policy=(pawnId:number|null)=>({pawnId,skillMin:4,skillMax:12});
const first=(s:Structure):CookingBill=>s.bills![0]!;

/** Prepared owner-boundary fixture, not paid casket construction/entry. The
 * same full human and original freight remain in the casket's real holder. */
function held(w:World):{c:PlayerCasket271;p:World['pawns'][number]} {
 const p=w.pawns.pop()!;p.age=legacyHumanAge();p.health=createMedicalRecord(w.tick);p.cryptosleepHeldAt271=w.tick;
 p.state='idle';p.jobId=null;p.haul=null;p.cooking=null;p.need=null;p.path=[];p.moveCooldown=0;p.bedId=null;p.orders={active:null,queue:[]};p.recreation.task=null;delete p.motion;delete p.bedSlot;
 const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};
 c.cryptosleep.human=p;w.structures.push(c);return {c,p};
}

test('literal minified bill settings have closed versions, bounds and own data without accessing a worker getter',()=>{
 const w=deconstructionCamp(2),s=station(w),bill=first(s);bill.worker=policy(w.pawns[0]!.id);
 expect(validBillWorkerBuilding283(s,283,w.nextId)).toBe(true);
 expect(validBillWorkerBuilding283(s,284,w.nextId)).toBe(true);
 expect(validBillWorkerBuilding283(s,282,w.nextId)).toBe(false);expect(validBillWorkerBuilding283(s,285,w.nextId)).toBe(false);
 for(const value of [undefined,null,false,[],{},policy(w.nextId),policy(-1),{...policy(null),skillMin:-1},{...policy(null),skillMax:21},{...policy(null),skillMin:13},{...policy(null),skillMax:1.5},{...policy(null),future284:true}]){
  const candidate=structuredClone(s);Object.defineProperty(first(candidate),'worker',{value,enumerable:true});expect(validBillWorkerBuilding283(candidate,283,w.nextId)).toBe(false);
 }
 let reads=0;const getter=structuredClone(s);Object.defineProperty(first(getter),'worker',{enumerable:true,get(){reads++;throw Error('Worker getter');}});
 expect(validBillWorkerBuilding283(getter,283,w.nextId)).toBe(false);expect(reads).toBe(0);
 const inherited=Object.assign(Object.create({worker:policy(null)}),newCookingBill(w.nextId++));
 expect(validBillWorkerBuilding283({...s,bills:[inherited]},283,w.nextId)).toBe(false);
});

const envelopes=(s:unknown)=>[
 {structures:[s]}, {packed:[{building:s}]},
 {world:{schemaVersion:282},structures:{removed:[],upserted:[s]}},
 {worldMaps:{sites:[{map:{structures:[s],packed:[{building:s}]}}]}},
 {group:{packed:[{building:s}]}},
 {worldGroups:{groups:[{state:{packed:[{building:s}]}}],losses:[{packed:[{building:s}]}],abandonedContents:[{humans:[{packed:[{building:s}]}]}]}},
 {worldPawns:{owners:[{actor:{id:1},packed:[{building:s}]}],heldPlayerCaskets271:[{casket:{cryptosleep:{packed:[{building:s}]}}}]}},
 {structures:[{cryptosleep:{packed:[{building:s}]}},{shipCryptosleep277:{packed:[{building:s}]}}]},
 {visitors:{departed:[{pawn:{id:1},packed:[{building:s}]}]}},
];

test('historical future fields are refused throughout the actual custody envelopes and public sparse upserts',()=>{
 const s={bills:[{worker:policy(1)}]};
 for(const raw of envelopes(s)){const before=JSON.stringify(raw);expect(validBillWorkerHistoricalTransport283(raw,282)).toBe(false);expect(validBillWorkerHistoricalTransport283(raw,283)).toBe(true);expect(validBillWorkerHistoricalTransport283(raw,284)).toBe(true);expect(validBillWorkerHistoricalTransport283(raw,285)).toBe(false);expect(JSON.stringify(raw)).toBe(before);}
 let reads=0;const s2={bills:[{}]};Object.defineProperty(s2.bills[0]!,'worker',{enumerable:true,get(){reads++;throw Error('Historical getter');}});
 expect(validBillWorkerHistoricalTransport283({structures:[s2]},282)).toBe(false);expect(reads).toBe(0);
});

test('current reference guards visit nested packed siblings but do not inspect terrain, personal physiology or capture humans for unnamed bills',()=>{
 const w=deconstructionCamp(2),s=station(w);first(s).worker=policy(null);let reads=0;
 for(const key of ['tiles','resources','pawns'] as const)Object.defineProperty(w,key,{enumerable:true,configurable:true,get(){reads++;throw Error(`No ${key} read`);}});
 expect(validBillWorkerWorld283(w)).toBe(true);expect(reads).toBe(0);
 const original=deconstructionCamp(2),nested=station(original);first(nested).worker=policy(null);
 const bad=structuredClone(nested);first(bad).worker!.skillMax=21;
 for(const raw of [...envelopes(bad),{groups:[{state:{packed:[{building:bad}]}}]}, {animalLosses:[{packed:[{building:bad}]}]}])expect(validBillWorkerWorld283({...original,...raw} as World)).toBe(false);
 // A real registered temporary map, with its same human and cargo owners.
 // These are guard-only assertions after prepared custody, not full admission.
 const root=registryCamp(),remote=preparedMap(root),remoteStation=station(remote),person=remote.pawns[0]!;
 first(remoteStation).worker=policy(null);
 const cargo=structuredClone(remoteStation);cargo.id=root.nextId++;first(cargo).id=root.nextId++;
 remote.packed.push({building:cargo,owner:{type:'inventory',pawnId:person.id}});
 // Prepare one actual roofed enclosed air cell so thermal is genuinely present.
 const centre=6*remote.width+6;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)fixtureBuilding(remote,'wall',6+dx,6+dz);
 remote.tiles[centre]!.terrain='soil';remote.home=[centre];
 remote.roofing={constructed:[centre],build:[],remove:[],cursor:0};reconcileTemperature(remote);
 expect(remote.thermal?.regions.some(r=>r.cells.includes(centre))).toBe(true);
 flushRegisteredMap(remote);
 const body=root.worldMaps!.sites.find(site=>site.map?.pawns.some(p=>p.id===person.id))!.map!;
 // Capture the already-owned namespace once before traps, as the public guard
 // receives its existing lazy owner reader; no alternate person is invented.
 const owners=captureHumanOwners(root);
 for(const key of ['tiles','resources','home','roofing','snow','thermal'] as const){
  expect(Object.hasOwn(body,key),key).toBe(true);
  Object.defineProperty(body,key,{enumerable:true,configurable:true,get(){reads++;throw Error(`No registered ${key} read`);}});
 }
 expect(validBillWorkerWorld283(root,()=>{throw Error('Unnamed bills must not capture humans');})).toBe(true);
 first(remoteStation).worker=policy(person.id);first(cargo).worker=policy(person.id);
 expect(validBillWorkerWorld283(root,()=>owners)).toBe(true);
 first(cargo).worker=policy(root.nextId-1);
 expect(validBillWorkerWorld283(root,()=>owners)).toBe(false);
 first(cargo).worker=policy(null);first(remoteStation).worker!.skillMax=21;
 expect(validBillWorkerWorld283(root,()=>owners)).toBe(false);expect(reads).toBe(0);
});

test('a named choice resolves against humans, not merely allocated IDs, and a retained dead human is still a valid saved reference',()=>{
 const w=medicalCamp(2),s=station(w),p=w.pawns[0]!,bill=first(s);bill.worker=policy(p.id);
 expect(validBillWorkerWorld283(w)).toBe(true);bill.worker=policy(s.id);expect(validBillWorkerWorld283(w)).toBe(false);
 bill.worker=policy(p.id);controlledInjury(w,p,'heart',20000,'cut');expect(p.state).toBe('dead');expect(bill.worker).toEqual(policy(null));
 // An archived/minified stack can still carry a pre-ValidateSettings name.
 bill.worker=policy(p.id);const before=JSON.stringify(w);expect(validBillWorkerWorld283(w)).toBe(true);expect(JSON.stringify(w)).toBe(before);
});

test('options include every actual local person and colony casket holder, disabled work stays named but a zero priority remains selectable',()=>{
 const w=deconstructionCamp(4),s=station(w),[a,b]=w.pawns;
 for(const p of w.pawns){delete p.background;p.priorities.cook=0;p.skills.cooking={level:8,xp:0,dailyXp:0,passion:0};}
 b!.background={childhood:'school-child',adulthood:'merchant'};
 const {p:contained}=held(w);first(s).worker=policy(contained.id);const before=JSON.stringify(w),result=queryBillWorkerOptions283(w,s.id,first(s).id)!;
 expect(result.candidates).toHaveLength(4);expect(result.candidates.find(o=>o.pawnId===a!.id)).toMatchObject({enabled:true,description:expect.stringContaining('désactivé')});
 expect(result.candidates.find(o=>o.pawnId===b!.id)).toMatchObject({enabled:false,description:expect.stringContaining('Incapacité')});
 expect(result.selected).toMatchObject({pawnId:contained.id,enabled:true,description:expect.stringContaining('cryptosommeil')});expect(JSON.stringify(w)).toBe(before);
 expect(queryBillWorkerOptions283(w,s.id,-1)).toBeUndefined();
});

test('actual other-map colonists are choices while travellers remain selected knowledge only',()=>{
 const {w,g}=reorganizationCamp256(),s=station(w),away=g.members[0]!;first(s).worker=policy(away.id);
 const before=JSON.stringify(w),result=queryBillWorkerOptions283(w,s.id,first(s).id)!;
 expect(result.candidates.some(c=>g.members.some(p=>p.id===c.pawnId))).toBe(false);expect(result.selected).toMatchObject({pawnId:away.id,name:away.name,enabled:false});expect(JSON.stringify(w)).toBe(before);
 const root=registryCamp(),remote=preparedMap(root),remoteId=remote.pawns[0]!.id,local=station(root);
 expect(queryBillWorkerOptions283(root,local.id,first(local).id)!.candidates.some(c=>c.pawnId===remoteId)).toBe(true);
 flushRegisteredMap(remote);
});

test('casket and caravan bill references remain exact and an unresolved packed human reference is refused without normalizing it',()=>{
 const w=deconstructionCamp(3),s=station(w),{c,p}=held(w);first(s).worker=policy(p.id);
 const packed:Structure={id:w.nextId++,kind:'stonecutter',x:7,z:7,orientation:0,footprint:'standard',material:'wood',bills:[newCookingBill(w.nextId++,'stone-blocks',283)]};
 first(packed).worker=policy(p.id);c.cryptosleep.packed.push({building:packed,owner:{type:'inventory',pawnId:p.id}});
 const before=JSON.stringify(w);expect(validBillWorkerWorld283(w)).toBe(true);normalizeBillWorkersAtInstall283(w,s);expect(JSON.stringify(w)).toBe(before);
 first(packed).worker=policy(w.nextId-1);const bad=JSON.stringify(w);expect(validBillWorkerWorld283(w)).toBe(false);expect(JSON.stringify(w)).toBe(bad);
});

test('native unavailable notification changes only live bill names, preserves range and frozen archives, and repeats without a second message',()=>{
 const {w,g}=reorganizationCamp256(),s=station(w),id=g.members[0]!.id;first(s).worker=policy(id);
 const cargo:Structure={id:w.nextId++,kind:'stonecutter',x:7,z:7,orientation:0,footprint:'standard',material:'wood',bills:[{...newCookingBill(w.nextId++,'stone-blocks',283),worker:policy(id)}]};
 g.packed=[{building:cargo,owner:{type:'inventory',pawnId:id}}];
 // An immutable historical archive is intentionally outside GlobalBills.
 const archive=structuredClone(cargo);w.visitors={...w.visitors,departed:[{packed:[{building:archive}]}]} as World['visitors'];
 const tick=w.tick,rng=w.rng,nextId=w.nextId,humans=JSON.stringify(g.members),archiveBefore=JSON.stringify(archive);
 notifyBillWorkerUnavailable283(w,id);expect(first(s).worker).toEqual(policy(null));expect(first(cargo).worker).toEqual(policy(null));expect(JSON.stringify(archive)).toBe(archiveBefore);
 const messages=w.worldGroups!.events.length;notifyBillWorkerUnavailable283(w,id);expect(w.worldGroups!.events).toHaveLength(messages);
 expect(JSON.stringify(g.members)).toBe(humans);expect([w.tick,w.rng,w.nextId]).toEqual([tick,rng,nextId]);
});

test('real local clinical death clears only the name once and install cleans a retained dead name without rewriting saved input',()=>{
 const w=medicalCamp(2),s=station(w),p=w.pawns[0]!;first(s).worker=policy(p.id);controlledInjury(w,p,'heart',20000,'cut');
 expect(p.state).toBe('dead');expect(first(s).worker).toEqual(policy(null));
 const count=w.worldGroups?.events.filter(e=>e.message.includes('plage de compétence')).length??w.events.filter(e=>e.message.includes('plage de compétence')).length;
 reconcilePawnHealth(w,p);expect(w.worldGroups?.events.filter(e=>e.message.includes('plage de compétence')).length??w.events.filter(e=>e.message.includes('plage de compétence')).length).toBe(count);
 first(s).worker=policy(p.id);const raw=JSON.stringify(w);expect(validBillWorkerWorld283(w)).toBe(true);expect(JSON.stringify(w)).toBe(raw);
 normalizeBillWorkersAtInstall283(w,s);expect(first(s).worker).toEqual(policy(null));
});

test('install recognizes a literal legacy foreign faction even when the campaign owns a faction registry',()=>{
 // Targeted lifecycle-reader input: the old faction is literal; no fake
 // affiliation or claim of complete current foreign-Pawn save admission.
 const w=deconstructionCamp(2),s=station(w),p=w.pawns[0]!;
 const foreign=generateForeignWorldFactions256({version:w.schemaVersion,tick:w.tick,tiles:[{biome:'temperate-forest',hilliness:'flat',neighbours:[]}],selection:[...INTRINSIC_WORLD_FACTIONS],population:0,nextFactionId:1,nextSettlementId:1,nextThingId:w.nextId,random:new WorldGenerationRandom(461)});
 if(!foreign.ok)throw Error(foreign.reason);
 const complete=completeWorldFactionRegistry256({version:w.schemaVersion,draft:foreign.draft,playerDef:'PlayerColony',name:'Camp de contrôle',postWorldRandom:new WorldGenerationRandom(461)});
 if(!complete.ok)throw Error(complete.reason);w.worldFactions=complete.registry;w.nextId=foreign.nextThingId;
 p.faction='outlanders';delete p.worldAffiliation259;first(s).worker=policy(p.id);
 normalizeBillWorkersAtInstall283(w,s);expect(first(s).worker).toEqual(policy(null));
});

test('Vanish retains a known player human without clinical death or kidnapping and installation keeps that named bill',()=>{
 // Prepared owner boundary, not a played destruction/casket campaign. Clone
 // this fixture's real local human, remove its old owner, then use the actual
 // WorldPawn entry transaction; no extra person or synthetic identity exists.
 const w=deconstructionCamp(2),s=station(w),original=w.pawns.at(-1)!,actor=structuredClone(original);
 const foreign=generateForeignWorldFactions256({version:w.schemaVersion,tick:0,tiles:[{biome:'temperate-forest',hilliness:'flat',neighbours:[]}],selection:[...INTRINSIC_WORLD_FACTIONS],population:0,nextFactionId:1,nextSettlementId:1,nextThingId:w.nextId,random:new WorldGenerationRandom(461)});
 if(!foreign.ok)throw Error(foreign.reason);
 const complete=completeWorldFactionRegistry256({version:w.schemaVersion,draft:foreign.draft,playerDef:'PlayerColony',name:'Camp de contrôle',postWorldRandom:new WorldGenerationRandom(461)});
 if(!complete.ok)throw Error(complete.reason);w.worldFactions=complete.registry;w.nextId=foreign.nextThingId;
 const knownBefore=[...captureHumanOwners(w).people.keys()].sort((a,b)=>a-b);
 delete actor.worldAffiliation259;expect(bindBornHumanFaction259(w,actor,complete.registry.playerFactionId)).toBe(true);
 w.pawns=w.pawns.filter(p=>p!==original);const state=w.worldPawns=initialWorldPawns256(0);
 const row:WorldPawnOwner256={kind:'human',actor,factionId:complete.registry.playerFactionId,originMapId:null,context:{seed:w.seed,width:w.width,height:w.height},clockCore:0,enteredAtAbsCore:0,mode:'dead',destroyed:true,items:[],packed:[]};
 const entry=preparePassedToWorld256(state,row,complete.registry,{float(){throw Error('Destroyed player entry must not draw a faction');}},{version:w.schemaVersion});
 expect(entry.ok).toBe(true);if(!entry.ok)throw Error(entry.reason);entry.commit();
 expect(state.owners).toHaveLength(1);expect(state.owners[0]!.actor).toBe(actor);expect(actor.id).toBe(original.id);expect(actor.state).not.toBe('dead');expect(actor.health?.death).toBeUndefined();expect(state.owners[0]!.captivity261).toBeUndefined();
 expect([...captureHumanOwners(w).people.keys()].sort((a,b)=>a-b)).toEqual(knownBefore);
 first(s).worker=policy(actor.id);const before=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
 expect(validBillWorkerWorld283(w)).toBe(true);normalizeBillWorkersAtInstall283(w,s);
 expect(first(s).worker).toEqual(policy(actor.id));expect(JSON.stringify(w)).toBe(before);expect([w.rng,w.nextId]).toEqual([rng,nextId]);
});

test('strict282 migration offers no worker policy and current full save keeps a real named reference exactly',()=>{
 const w=deconstructionCamp(2),s=station(w);expect(validateWorld(w)).toEqual([]);
 const old=JSON.parse(serializeWorld(w));old.schemaVersion=282;const text=JSON.stringify(old),copy=deserializeWorld(text);
 expect(JSON.parse(serializeWorld(copy))).toEqual({...old,schemaVersion:284});expect(first(copy.structures.find(p=>p.id===s.id)!).worker).toBeUndefined();
 first(s).worker=policy(w.pawns[0]!.id);expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 old.structures.find((p:Structure)=>p.id===s.id).bills[0].worker=policy(null);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/worker/i);
});

test.each([false,true])('public and resident checkpoint/delta retain the same worker and refuse a same-revision wrong human transaction (checkpoint=%s)',checkpoint=>{
 const w=deconstructionCamp(2),s=station(w),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 first(s).worker=policy(w.pawns[0]!.id);
 const opening=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 first(s).worker=policy(w.pawns[1]!.id);const good=structuredClone(encoder.encode(w,0,0,checkpoint)),bad=structuredClone(good);
 const buildings='structures'in bad?bad.structures!.upserted:bad.world.structures;first(buildings.find(b=>b.id===s.id)!).worker=policy(s.id);
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 const a=decoder.adopt(structuredClone(good)),b=resident.adopt(structuredClone(good));expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Good worker transaction refused');expect(first(a.world.structures.find(p=>p.id===s.id)!).worker).toEqual(policy(w.pawns[1]!.id));expect(b.world).toEqual(a.world);
});
