import {expect,test} from 'vitest';
import {preparePeaceTalksBirth293} from '../src/sim/peace-talks-producer-293.ts';
import {planetGeography256} from '../src/sim/planet-geography-256.ts';
import {worldBiomeCanSettle} from '../src/sim/world-biome-properties.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {caravanMapAllowed261} from '../src/sim/caravan-incidents-261.ts';
import {preparedTradeRequestCamp462} from './scenarios/trade-requests-v462.ts';

/** Declared preparation on the acquired real geographic home/factions. No
 * engine step, offered encounter, reconstructed leader or fake surface.
 * Isolate one existing non-permanent faction as hostile before the test. */
function camp(){
 const {w}=preparedTradeRequestCamp462(),factions=w.worldFactions!;
 const faction=factions.factions.find(f=>f.def==='OutlanderRough')!;
 if(!faction||!w.planet||w.planet.revision!==3)throw Error('Actual geographic fixture missing');
 for(const r of factions.relations){if(r.aId!==factions.playerFactionId&&r.bId!==factions.playerFactionId)continue;const id=r.aId===factions.playerFactionId?r.bId:r.aId;
  if(id===faction.id){r.goodwill=-80;r.kind='hostile';}else{const other=factions.factions.find(f=>f.id===id)!;if(['OutlanderCivil','OutlanderRough','TribeCivil','TribeRough'].includes(other.def)){r.goodwill=0;r.kind='neutral';}}
 }
 w.worldSites263={revision:1,nextId:1,entries:[]};
 const relation=factions.relations.find(r=>r.aId===Math.min(faction.id,factions.playerFactionId)&&r.bId===Math.max(faction.id,factions.playerFactionId))!;
 const leader=factions.leaders.find(l=>l.factionId===faction.id)!;
 if(!leader)throw Error('Actual physical leader missing');return {w,faction,relation,leader};
}

test('birth is prepared without mutation, uses a real free reachable5..13 tile, then commits once',()=>{
 const {w,faction}=camp(),before=JSON.stringify(w),rng=w.rng,nextId=w.nextId,birth=preparePeaceTalksBirth293(w);
 expect(JSON.stringify(w)).toBe(before);expect(birth.ok).toBe(true);if(!birth.ok)throw Error(birth.reason);
 const site=birth.site;expect(site.factionId).toBe(faction.id);expect(site.questTag).toBe('PeaceTalks_'+faction.name);expect(site.mapId).toBeNull();
 expect(Number.isInteger((site.expiresAtCore-site.createdAtCore)/60000)).toBe(true);
 expect((site.expiresAtCore-site.createdAtCore)/60000).toBeGreaterThanOrEqual(12);expect((site.expiresAtCore-site.createdAtCore)/60000).toBeLessThanOrEqual(28);
 const planet=w.planet;if(!planet||planet.revision!==3)throw Error('Actual geography missing');
 const tiles=planetGeography256(planet).surface.tiles,home=w.worldMaps!.sites.find(s=>s.kind==='settlement')!.tile!;
 let frontier=new Set([home]),seen=new Set(frontier),distance=0;
 while(!frontier.has(site.tile)&&distance<=13){const next=new Set<number>();for(const id of frontier)for(const n of tiles[id]!.neighbours)if(!seen.has(n)&&worldBiomeCanSettle(tiles[n]!.biome)&&tiles[n]!.hilliness!=='impassable'){seen.add(n);next.add(n);}frontier=next;distance++;}
 expect(frontier.has(site.tile)).toBe(true);expect(distance).toBeGreaterThanOrEqual(5);expect(distance).toBeLessThanOrEqual(13);
 expect([...w.worldMaps!.sites,...w.worldFactions!.settlements].some(s=>s.tile===site.tile)).toBe(false);
 expect(caravanMapAllowed261(w,site.tile)).toBe(true);
 expect(birth.current()).toBe(true);birth.commit();expect(w.worldSites263!.entries).toEqual([site]);expect(w.worldSites263!.nextId).toBe(2);expect(w.nextId).toBe(nextId);expect(w.rng).not.toBe(rng);expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();
});

test('birth excludes neutral/ally rather than treating omitted SlateRef<bool> as nullable permission',()=>{
 for(const kind of ['neutral','ally'] as const){const {w,relation}=camp();relation.kind=kind;relation.goodwill=kind==='ally'?80:0;const before=JSON.stringify(w);expect(preparePeaceTalksBirth293(w).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);}
});

test('dead chief or captive is refused, but an off-map downed chief is not a healthy requirement',()=>{
 const dead=camp();dead.leader.pawn.state='dead';expect(preparePeaceTalksBirth293(dead.w).ok).toBe(false);
 const prisoner=camp();prisoner.leader.pawn.worldAffiliation259={revision:1,factionId:prisoner.faction.id,hostFactionId:prisoner.w.worldFactions!.playerFactionId,guestStatus:'Prisoner'};expect(preparePeaceTalksBirth293(prisoner.w).ok).toBe(false);
 const down=camp();down.leader.pawn.state='downed';down.leader.pawn.health=createMedicalRecord();expect(preparePeaceTalksBirth293(down.w).ok).toBe(true);
});

test('terminal tags remain blocking and an active renamed faction still has its actual world object',()=>{
 const {w,faction}=camp(),proposal=preparePeaceTalksBirth293(w);if(!proposal.ok)throw Error(proposal.reason);
 w.worldSites263!.entries.push({...proposal.site,createdAtCore:0,expiresAtCore:10,closed:{atCore:10,reason:'expired'}});
 w.worldSites263!.nextId=2;expect(preparePeaceTalksBirth293(w).ok).toBe(false);
 const active=camp(),birth=preparePeaceTalksBirth293(active.w);if(!birth.ok)throw Error(birth.reason);birth.commit();active.faction.name+=' renommée';expect(preparePeaceTalksBirth293(active.w).ok).toBe(false);
 expect(faction.name).not.toContain('renommée');
});

test('pending settlement attack blocks only that actual faction, without consuming the source stream',()=>{
 const {w,faction}=camp(),record=w.worldGroups!.groups[0];if(!record)throw Error('Actual caravan fixture missing');
 record.pendingEntry263={revision:1,requestedAtCore:w.tick*10,target:{kind:'attack-settlement',settlementId:w.worldFactions!.settlements.find(s=>s.factionId===faction.id)!.id,factionId:faction.id,confirmed:true}};
 const before=JSON.stringify(w);expect(preparePeaceTalksBirth293(w).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('a retired non-battlefield tile without a marker cannot strand the Disaster branch',()=>{
 const {w}=camp(),first=preparePeaceTalksBirth293(w);if(!first.ok)throw Error(first.reason);
 w.worldMaps!.retired.push({id:w.worldMaps!.nextMapId++,tile:first.site.tile,kind:'camp',createdAt:0,removedAt:w.tick,reason:'abandon'});
 expect(caravanMapAllowed261(w,first.site.tile)).toBe(false);expect(first.current()).toBe(false);
 const next=preparePeaceTalksBirth293(w);if(!next.ok)throw Error(next.reason);
 expect(next.site.tile).not.toBe(first.site.tile);expect(caravanMapAllowed261(w,next.site.tile)).toBe(true);
});

test('stale sources, mutated plan and unwritable recipient refuse commit atomically',()=>{
 const {w,faction}=camp(),birth=preparePeaceTalksBirth293(w);if(!birth.ok)throw Error(birth.reason);const before=JSON.stringify(w),originalName=faction.name;
 faction.name+=' changed';expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();faction.name=originalName;
 const tag=birth.site.questTag;birth.site.questTag+=' changed';expect(birth.current()).toBe(false);birth.site.questTag=tag;
 const registry=w.worldSites263!,descriptor=Object.getOwnPropertyDescriptor(registry,'nextId')!;Object.defineProperty(registry,'nextId',{...descriptor,writable:false});expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();Object.defineProperty(registry,'nextId',descriptor);
 expect(JSON.stringify(w)).toBe(before);expect(birth.current()).toBe(true);
});

test('historical292 and future295 cannot obtain an offer through the current producer',()=>{
 for(const version of [292,295]){const {w}=camp();Object.assign(w,{schemaVersion:version});const before=JSON.stringify(w);expect(preparePeaceTalksBirth293(w).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);}
});
