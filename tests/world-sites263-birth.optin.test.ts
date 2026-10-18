import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import {stepWorld} from '../src/sim/engine';
import {registeredMap,registeredMaps} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {computeThreatPoints,summaryHealthPercent} from '../src/sim/threat-points';
import {isColonist} from '../src/sim/affiliation';
import {prepareItemStashBirth263} from '../src/sim/world-site-producer-263';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';
import {writeTestFileSync} from './test-output';

const INPUT_SHA='ba6e94ff453b63f6230ca6fc43f8ae737026275faa464a220c29beeacb6582d1';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function actual263(root:CampaignState):asserts root is World {if(!('tiles'in root)||Number(root.schemaVersion)!==263||root.width!==325||root.height!==325||root.planet?.revision!==3)throw Error('Actual native325 geographic source required');}
/** Named incident stimulus, not proof of a natural MTB draw or a player visit.
 * One acquired native325/winter export, one real tick, one SAME real producer.
 * No inserted Site/pending/actors, seed search, new generation or fallback. */
test.skipIf(process.env.WORLD_SITES263_BIRTH_SIM!=='1')('actual325: strict neutral262 migration, producer seals, one real ItemStash holder and exact RAW/checkpoint/delta',async()=>{
 const input=process.env.WORLD_SITES263_INPUT,expected=process.env.WORLD_SITES263_INPUT_SHA256;
 if(!input||expected!==INPUT_SHA)throw Error('Explicit acquired native325 input and its exact SHA required; no factory/fallback');
 const bytes=readFileSync(input,'utf8');expect(sha(bytes)).toBe(INPUT_SHA);const raw=await decodeStoredSave(bytes);
 expect(SCHEMA_VERSION).toBe(263);let root=deserializeCampaign(raw);
 actual263(root);
 expect(validateWorld(root)).toEqual([]);expect(Object.hasOwn(root,'worldSites263')).toBe(false);
 expect(serializeCampaign(root)).toBe(raw.replace(/^\{"schemaVersion":262,/,'{"schemaVersion":263,'));
 for(const map of registeredMaps(root))expect(Object.hasOwn(map,'worldSiteThreat263')).toBe(false);
 expect(()=>deserializeCampaign(raw.replace(/^\{/, '{"worldSites263":null,'))).toThrow();
 const tick=root.tick;stepWorld(root,1);expect(root.tick).toBe(tick+1);expect(root.worldSites263?.entries).toEqual([]);
 const registry=root.worldSites263;if(!registry)throw Error('True tick did not adopt prospective Site calendar');
 const homeRecord=root.worldMaps!.sites.find(s=>s.kind==='settlement')!,home=registeredMap(root,homeRecord.id)!,people=registeredMaps(root).flatMap(w=>w.pawns).filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead'&&!p.health?.death),wealth=home.economy?.wealth.knownStorytellerWealth??0;
 const points=computeThreatPoints({knownWealth:wealth,freeColonists:people.length,colonistHealthSum:people.reduce((n,p)=>n+(p.health?summaryHealthPercent(p.health):1),0),elapsedDays:root.tick/6000,adaptationDays:home.economy?.adaptationDays??0,seedBucket:Math.floor(root.tick/250)}).points;
 const before=serializeCampaign(root),birth=prepareItemStashBirth263(root,points);if(!birth.ok)throw Error('Actual named Site producer refused: '+birth.reason);
 expect(birth.current()).toBe(true);
 const originalItems=birth.site.items;birth.site.items=originalItems.slice();expect(birth.current()).toBe(false);birth.site.items=originalItems;expect(birth.current()).toBe(true);
 const relations=root.worldFactions!.relations;root.worldFactions!.relations=relations.slice();expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();root.worldFactions!.relations=relations;expect(birth.current()).toBe(true);
 const entries=registry.entries;registry.entries=entries.slice();expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();registry.entries=entries;
 const rngDescriptor=Object.getOwnPropertyDescriptor(root,'rng')!;Object.defineProperty(root,'rng',{...rngDescriptor,writable:false});expect(birth.current()).toBe(false);expect(()=>birth.commit()).toThrow();Object.defineProperty(root,'rng',rngDescriptor);
 expect(serializeCampaign(root)).toBe(before);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(root as World,0,0))).status).toBe('applied');
 birth.commit();expect(birth.current()).toBe(false);expect(registry.entries).toHaveLength(1);expect(registry.entries[0]).toBe(birth.site);
 expect(birth.site.items).toBe(originalItems);expect(birth.site.mapId).toBe(null);expect(birth.site.items.every(p=>p.owner.type==='world-site263'&&p.owner.siteId===birth.site.id)).toBe(true);
 expect((birth.site.expiresAtCore!-birth.site.createdAtCore)/60000).toBeGreaterThanOrEqual(12);expect((birth.site.expiresAtCore!-birth.site.createdAtCore)/60000).toBeLessThanOrEqual(28);expect(Number.isInteger((birth.site.expiresAtCore!-birth.site.createdAtCore)/60000)).toBe(true);
 expect(validateWorld(root)).toEqual([]);const packet=structuredClone(encoder.encode(root as World,0,0));expect(packet.kind).toBe('delta');const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(registeredMapPresentation(root));
 const after=serializeCampaign(root);writeTestFileSync('artifacts/world-sites263/01-real-birth-RAW.json',after);root=deserializeCampaign(after);expect(serializeCampaign(root)).toBe(after);expect(validateWorld(root)).toEqual([]);
 writeTestFileSync('artifacts/world-sites263/01-real-birth-receipt.json',JSON.stringify({input,inputSHA256:INPUT_SHA,tick:root.tick,points,rawSHA256:sha(after),notice:'Named real producer stimulus only; no natural MTB/entry/contact/retreat qualification.'},null,2));expect(readFileSync(input,'utf8')).toBe(bytes);
},120_000);
