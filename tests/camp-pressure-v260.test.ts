import {expect,test} from 'vitest';
import {newCampPressure260,validCampPressure260} from '../src/sim/camp-pressure-state-260';
import {validCamp260Historical} from '../src/sim/camp-schema-historical-260';
import {advanceCampPressure260} from '../src/sim/camp-pressure-260';
import {initializeCampRaidOwner260} from '../src/sim/camp-raid-owner-260';
import {convertCampRaidOwner260} from '../src/sim/cassandra-raids';
import {advanceRaids} from '../src/sim/raids';
import {validGroupCommand} from '../src/sim/group-command-shape';
import {UrgentThreatObserver} from '../src/bridge/urgent-threats';
import {initialWorldRegistry,registeredMap,flushRegisteredMap} from '../src/sim/world-map-context';
import {deconstructionCamp} from './scenarios/deconstruction';
import {createCampPressureMechanoidRaid260} from '../src/sim/mechanoid-raids';
import {validateMechanoidRaids} from '../src/sim/mechanoid-raid-save';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings';
import type {SettlementTile} from '../src/sim/world-settlement-placement';
/** Isolated declared32² timer fixture. No geographic generation, travel or raid success claimed. */
function timer(){const w=deconstructionCamp();w.schemaVersion=260;initialWorldRegistry(w);const site=w.worldMaps!.sites[0]!;site.kind='camp';site.campPressure=newCampPressure260(w.tick*10)!;return {w,site,map:registeredMap(w,site.id)!};}
test('prospective timer dates are safe and absent historical state is never armed',()=>{const p=newCampPressure260(120)!;expect(p).toEqual({revision:1,raidAtCore:240120,notifyAtCore:60120,alert:false,raidsSent:0});expect(newCampPressure260(Number.MAX_SAFE_INTEGER)).toBeUndefined();expect(validCampPressure260(p,260,'camp',12)).toBe(true);expect(validCampPressure260(p,259,'camp',12)).toBe(false);expect(validCampPressure260({...p,extra:1},260,'camp',12)).toBe(false);expect(validCampPressure260(p,260,'settlement',12)).toBe(false);const f=timer();delete f.site.campPressure;const rng=f.w.rng;advanceCampPressure260(f.w);expect(f.site.campPressure).toBeUndefined();expect(f.w.rng).toBe(rng);});
test('one-day letter and four-day failed attempt are distinct; failure advances only the real timer RNG',()=>{const {w,site,map}=timer(),p=site.campPressure!;w.tick=6000;advanceCampPressure260(w);expect(p.alert).toBe(true);expect(p.notifyAtCore).toBeNull();expect(p.raidsSent).toBe(0);const rng=w.rng,next=w.nextId,before=JSON.stringify(w.worldGroups!.events);advanceCampPressure260(w);expect(JSON.stringify(w.worldGroups!.events)).toBe(before);expect(w.rng).toBe(rng);w.tick=24000;advanceCampPressure260(w);expect(p.raidAtCore).toBeGreaterThanOrEqual(285000);expect(p.raidAtCore).toBeLessThanOrEqual(300000);expect(p.raidsSent).toBe(0);expect(w.rng).not.toBe(rng);expect(w.nextId).toBe(next);expect(map.raids).toBeUndefined();const after=w.rng;advanceCampPressure260(w);expect(w.rng).toBe(after);});
test('new dedicated owner has no Cassandra agenda, and ordinary raid stepping never spends a ticket',()=>{const {w,map}=timer();initializeCampRaidOwner260(map);flushRegisteredMap(map);expect(map.raids!.profile).toBe('camp-pressure-v1');expect(map.raids!.cassandra).toBeUndefined();const before=JSON.stringify(map.raids);advanceRaids(map);expect(JSON.stringify(map.raids)).toBe(before);convertCampRaidOwner260(map);expect(map.raids!.profile).toBe('cassandra-raids-v1');expect(map.raids!.serial).toBe(0);expect(map.raids!.completed).toBe(0);expect(map.raids!.cassandra!.pending[0]).toBeGreaterThan(w.tick);});
test.each([{rng:1,created:false},{rng:0x12345678,created:true}])('forced Camp producer preserves failure or creates actual edge machines without a Cassandra ticket: %j',({rng,created})=>{
 const w=deconstructionCamp();
 // Declared isolated producer fixture. Use the existing faction producers,
 // not a fabricated faction header or a played four-day campaign.
 const tiles:readonly SettlementTile[]=Array.from({length:128},(_,i)=>({biome:'temperate-forest',hilliness:'flat',neighbours:[(i+127)%128,(i+1)%128]}));
 const foreign=generateForeignWorldFactions256({version:260,tick:w.tick,tiles,selection:defaultWorldGenerationSettings().factions,population:3,nextFactionId:1,nextSettlementId:1,nextThingId:w.nextId,random:new WorldGenerationRandom(718)});
 if(!foreign.ok)throw Error(foreign.reason);
 const registry=completeWorldFactionRegistry256({version:260,draft:foreign.draft,playerDef:'PlayerColony',name:'Producteur Camp déclaré',postWorldRandom:new WorldGenerationRandom(991)});
 if(!registry.ok)throw Error(registry.reason);w.worldFactions=registry.registry;w.nextId=foreign.nextThingId;
 // Shared authorities must exist BEFORE the first local forwarding view,
 // as they do in the real geographic producer. Never graft them at runtime.
 initialWorldRegistry(w);const site=w.worldMaps!.sites[0]!;site.kind='camp';site.campPressure=newCampPressure260(w.tick*10)!;const map=registeredMap(w,site.id)!;
 expect(map.worldFactions).toBe(w.worldFactions);
 initializeCampRaidOwner260(map);flushRegisteredMap(map);
 // Explicit RNG branch fixture for the supported ranged composition; this
 // is not a retry of a played Camp attempt or a newly selected map seed.
 const first=w.nextId,calendar=JSON.stringify(map.raids!.mechanoid),random={rng},before=JSON.stringify(w);
 const group=createCampPressureMechanoidRaid260(map,450,random);
 if(!created){expect(group).toBeNull();expect(JSON.stringify(w)).toBe(before);expect(random.rng).toBe(rng);return;}
 expect(group).not.toBeNull();expect(group!.source260).toBe('camp-pressure');expect(map.raids!.mechActive).toBe(group);
 expect(group!.members).toEqual(map.mechanoids!.map(m=>m.id));expect(group!.members[0]).toBe(first);expect(w.nextId).toBe(first+group!.members.length);
 const faction=registry.registry.factions.find(f=>f.def==='Mechanoid')!;
 expect(map.mechanoids!.every(m=>m.worldFaction259?.factionId===faction.id&&(m.x===0||m.z===0||m.x===map.width-1||m.z===map.height-1))).toBe(true);
 expect(map.raids!.cassandra).toBeUndefined();expect(JSON.stringify(map.raids!.mechanoid)).toBe(calendar);expect(random.rng).not.toBe(rng);
 expect(validateMechanoidRaids(map)).toEqual([]);
});
test('ThreatBig map warning uses existing major pause and bootstrap never reannounces it',()=>{const {w,site}=timer(),observer=new UrgentThreatObserver();observer.bootstrap(w);w.tick=6000;advanceCampPressure260(w);expect(observer.capture(w,'major')).toBe(true);const notice=observer.snapshot().rows.find(r=>r.kind==='camp-detected')!;expect(notice.mapId).toBe(site.id);expect(notice.actorId).toBeUndefined();expect(observer.capture(w,'major')).toBe(false);observer.bootstrap(w);expect(observer.capture(w,'major')).toBe(false);});
test.each([{campPressure:undefined},{raids:{profile:'camp-pressure-v1'}},{archived:{mechActive:{source260:'camp-pressure'}}},{group:{reorganization:{birth:{kind:'reform',sourceMapId:1,at:0}}}}])('259 historical fence rejects any future260 ownership before neutral migration: %j',raw=>{expect(validCamp260Historical(raw,259)).toBe(false);expect(validCamp260Historical(raw,260)).toBe(true);});
test('raw historical fence never invokes an accessor',()=>{let read=false;const raw=Object.defineProperty({},'future',{get(){read=true;return 1;}});expect(validCamp260Historical(raw,259)).toBe(false);expect(read).toBe(false);});
test('Reform command is closed,260-only and requires its bounded preview fingerprint',()=>{const c={type:'group-reform',originMapId:1,memberIds:[5],sources:[],quote:'reform260:1:abc'};expect(validGroupCommand(c,260)).toBe(true);expect(validGroupCommand(c,259)).toBe(false);expect(validGroupCommand({...c,destination:undefined},260)).toBe(false);expect(validGroupCommand({...c,reform:true},260)).toBe(false);expect(validGroupCommand({...c,quote:''},260)).toBe(false);expect(validGroupCommand({...c,quote:'x'.repeat(257)},260)).toBe(false);});
