import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {applyCommand} from '../src/sim/engine';
import {registeredMap} from '../src/sim/world-map-context';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259';
import {detachMapOwners} from '../src/sim/world-lost-owners';
import {isAncientCasket256} from '../src/sim/ancient-casket-state-256';
import {heldCasketLivingIds259,heldCasketGCUnknown259} from '../src/sim/world-pawn-casket-membership-259';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {captureWorldPawnHumans256} from '../src/sim/world-pawn-human-capture-256';
import {nativeWorldPawnFinderIds256} from '../src/sim/world-pawn-native-order-256';
import {preparePlanetHydration256} from '../src/sim/planet-geography-256';
import {validWorldMapRegistry} from '../src/sim/world-map-save';
import {validLostArchiveShape} from '../src/sim/world-lost-save';
import {validGroupMapContext} from '../src/sim/world-map-context-save';
import {validGeographicSiteClimate256} from '../src/sim/site-climate-save';
import {registeredMapPresentation,campaignOnlySummary} from '../src/sim/world-map-presentation';
import {validRegisteredPresentation,validCampaignSummary} from '../src/sim/world-map-projection-save';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {captureHumanOwners} from '../src/sim/human-owners';
import {validateHumanSocial} from '../src/sim/social-save';
import {generateActualAncientTempleLoot256,spawnActualAncientTempleLoot256} from '../src/sim/ancient-temple-loot-spawn-256';
import {prepareGeographicPhysicalMap256} from '../src/sim/geographic-map-physical-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {previewGroupFormation} from '../src/sim/group-authority';
import {actualCampRemovalAbsCore256} from '../src/sim/world-pawn-map-removed-256';
import type {World} from '../src/sim/types';
import {actual259,transport259,require259,checkpoint259} from './helpers/fresh-caravan-owners-v259';

const enabled=process.env.ELSEWHERE_RUN_HELD_CASKETS259==='1';
const acquired='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json';
const acquiredSha='5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525';
function source(){const raw=readFileSync(acquired,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(acquiredSha);const root=deserializeCampaign(raw);require259(root);expect(root.tick).toBe(2905);return root;}
describe.skipIf(!enabled)('exact paused2905 retained caskets, no journey/capture replay',()=>{
 it('readonly actualA1807 confirmed projection previews its real humans while false anchors/local clocks/human affiliations remain refused',()=>{
  const text=readFileSync('tmp/test-runs/caravan-owners-v414-actual-continuations04-2026-10-17T18-23-44.880Z-23340/artifacts/caravan-owners-v259/capture-after-carry-cancel.json','utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('f08866bebcfb5c62d7ea9122dfa3076af964fbc840d0716bb7639d80a3b80664');
  const root=deserializeCampaign(text);if(!('pawns'in root))throw Error('The actual capture Camp1 is required for this full-map witness');
  const before=serializeCampaign(root);expect(root.tick).toBe(1807);expect(root.worldGroups!.groups).toEqual([]);
  const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(root,0,0)));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Actual confirmed projection required');
  const view=result.world;if(view.campaignMap?.revision!==2)throw Error('Missing confirmed registered projection');expect(view.campaignMap.activeMapId).toBe(1);expect(Object.hasOwn(view,'worldMaps')).toBe(false);
  const frozen=JSON.stringify(view),preview=()=>previewGroupFormation(view,[7,28366],[],50388);expect(preview().ok).toBe(true);
  const cloned=()=>({...structuredClone(view),planet:view.planet});
  for(const field of ['anchor','local-clock','human'] as const){
   const bad=cloned();if(bad.campaignMap?.revision!==2||bad.climate?.revision!==4)throw Error('Missing geographic projection');
   if(field==='anchor')bad.campaignMap.calendarOrigin=bad.campaignMap.calendarOrigin!+1;
   else if(field==='local-clock')bad.climate.calendarOrigin++;
   else bad.pawns.find(p=>p.id===7)!.worldAffiliation259!.factionId=bad.nextId;
   expect(previewGroupFormation(bad,[7,28366],[],50388).ok).toBe(false);
  }
  // A successful read preview does not acquire the real removal/entry clock.
  expect(()=>actualCampRemovalAbsCore256(view,view)).toThrow();
  expect(JSON.stringify(view)).toBe(frozen);expect(serializeCampaign(root)).toBe(before);expect(root.worldGroups!.groups).toEqual([]);
 });
 it('declared temple750 phase at acquired3408 uses an explicit actual clock, rejects the played campaign and keeps allocation-to-spawn birth identity',()=>{
  const text=readFileSync('tmp/test-runs/caravan-owners-v414-resettlement09-2026-10-17T20-17-22.890Z-18020/artifacts/caravan-owners-v259/actual259-before-later-settlement.json','utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('c046125c3615bc8e28af216bd5e98bc94a8b7f5abe4c0286a79db3d9d932336a');
  const root=deserializeCampaign(text),before=serializeCampaign(root),birth=Object.freeze({kind:'nonstarting-settlement' as const,atTick:root.tick,calendarOrigin:root.worldMaps!.calendarOrigin});
  expect(root.tick).toBe(3408);expect(root.worldMaps!.sites).toEqual([]);if(root.planet?.revision!==3)throw Error('Actual acquired geography required');
  const random=new WorldGenerationRandom(441),randomBefore=random.state;
  expect(()=>generateActualAncientTempleLoot256(root as unknown as World,random,birth)).toThrow(/unpublished/);expect(random.state).toEqual(randomBefore);
  // Declared32² phase-only physical birth on the acquired geography/clock.
  // This is not another settlement factory or a claimed played map.
  const {world:w}=prepareGeographicPhysicalMap256({planet:root.planet,factions:root.worldFactions!,tile:50387,width:32,height:32,tick:root.tick,calendarOrigin:birth.calendarOrigin,nextId:root.nextId,rng:root.rng,initialWeather:{gameInitDataPresent:false,daysPassedSinceSettle:0},definitionContext:{isStartingMap:false,mapInitializing:true,tutorial:false,nomadicFactor:.5,usedRectCells:new Set()}});
  const nextId=w.nextId,climate=w.climate,calendar=JSON.stringify(climate),rect={minX:0,minZ:0,maxX:3,maxZ:3};
  expect(()=>generateActualAncientTempleLoot256(w,random)).toThrow(/initial/);
  expect(()=>generateActualAncientTempleLoot256(w,random,{...birth,atTick:birth.atTick+1})).toThrow(/later-settlement/);
  expect(()=>generateActualAncientTempleLoot256(w,random,{...birth,calendarOrigin:birth.calendarOrigin+1})).toThrow(/later-settlement/);
  expect(w.nextId).toBe(nextId);expect(random.state).toEqual(randomBefore);
  const plan=generateActualAncientTempleLoot256(w,random,birth);expect(plan.status).toBe('ready');if(plan.status!=='ready')throw Error(plan.reason);
  expect(w.nextId).toBe(plan.nextId);expect(()=>spawnActualAncientTempleLoot256(w,plan,rect,random,{...birth})).toThrow(/unconsumed/);
  w.tick++;expect(()=>spawnActualAncientTempleLoot256(w,plan,rect,random,birth)).toThrow(/later-settlement/);w.tick--;
  w.climate=structuredClone(climate);expect(()=>spawnActualAncientTempleLoot256(w,plan,rect,random,birth)).toThrow(/unconsumed/);w.climate=climate;
  spawnActualAncientTempleLoot256(w,plan,rect,random,birth);expect(()=>spawnActualAncientTempleLoot256(w,plan,rect,random,birth)).toThrow(/unconsumed/);
  expect(w.tick).toBe(3408);expect(w.climate).toBe(climate);expect(JSON.stringify(w.climate)).toBe(calendar);expect(serializeCampaign(root)).toBe(before);
 });
 it('readonly last-Camp removal preflight keeps Pawn9 actual interaction with caravan7 and refuses nonhuman social endpoints',()=>{
  const text=readFileSync('tmp/test-runs/caravan-owners-v414-resettlement08-2026-10-17T20-13-41.603Z-25324/artifacts/caravan-owners-v259/actual259-home-retired-with-original-holders.json','utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('c4487688a97e9b860e1063337ee2b75cc99c7fe8f791611fe235ab071bdb106c');
  const root=deserializeCampaign(text),before=serializeCampaign(root),map=registeredMap(root,1)!,person=map.pawns.find(p=>p.id===9)!,history=JSON.stringify(person.social);
  expect(root.worldMaps!.sites.map(m=>m.id)).toEqual([1]);expect(person.social!.last).toEqual({otherId:7,kind:'chitchat',tick:873,initiated:true});
  const away=root.worldGroups!.groups.find(g=>g.state.id===5)!.state;if(!('members'in away))throw Error('Missing actual away group');expect(away.members.some(p=>p.id===7)).toBe(true);expect(map.pawns.some(p=>p.id===7)).toBe(false);
  const known=new Set(captureHumanOwners(map).people.keys());expect(known.has(7)).toBe(true);expect(validateHumanSocial(person,259,root.tick,known,[])).toEqual([]);
  const plan=prepareMapRemoved259(root,map,1,false);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.current()).toBe(true);
  const animal=root.worldPawns!.owners.find(r=>r.kind==='animal')!.actor.id,forged=structuredClone(person);forged.social!.last!.otherId=animal;
  expect(known.has(animal)).toBe(false);expect(validateHumanSocial(forged,259,root.tick,known,[])).toContain('Invalid last interaction.');
  expect(JSON.stringify(person.social)).toBe(history);expect(serializeCampaign(root)).toBe(before);expect(plan.current()).toBe(true);
 });
 it('readonly acquired removal projects real WorldPawn and held-human memory receivers without synthetic people or animal privileges',()=>{
  const text=readFileSync('tmp/test-runs/caravan-owners-v414-caskets11-actual03-2026-10-17T19-58-04.190Z-13672/artifacts/caravan-owners-v259/actual-retained-caskets-MapRemoved.json','utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('c4487688a97e9b860e1063337ee2b75cc99c7fe8f791611fe235ab071bdb106c');
  const root=deserializeCampaign(text);if(!('pawns'in root))throw Error('The actual remaining Camp1 is required for this full-map transport witness');
  const before=serializeCampaign(root),view=registeredMapPresentation(root)!,summary=campaignOnlySummary(root);
  // Clones preserve the already confirmed immutable geographic owner for direct predicate checks.
  const cloned=<T extends{planet?:unknown}>(value:T):T=>({...structuredClone(value),planet:value.planet});
  const memories=(w:typeof view)=>{if(w.campaignMap?.revision!==2)throw Error('Missing actual registered projection');return w.campaignMap.lostMemories;};
  expect(root.worldPawns!.owners.find(r=>r.actor.id===8)!.kind).toBe('human');expect(view.campaignPeople!.some(p=>p.id===8)).toBe(false);expect(summary.people.some(p=>p.id===8)).toBe(false);
  expect(validRegisteredPresentation(view)).toBe(true);expect(validCampaignSummary(summary)).toBe(true);
  // Keeping civilTick coherent must not make a different campaign anchor
  // compatible with the actual stored group/member geographic climates.
  const shiftedClock=cloned(summary);shiftedClock.calendarOrigin=shiftedClock.calendarOrigin!+1;shiftedClock.civilTick++;
  expect(validCampaignSummary(shiftedClock)).toBe(false);
  const missingClock=cloned(summary);delete missingClock.calendarOrigin;expect(validCampaignSummary(missingClock)).toBe(false);
  const full=structuredClone(new SnapshotEncoder().encode(root,0,0));expect(new SnapshotDecoder().adopt(full).status).toBe('applied');
  const summaryEncoder=new SnapshotEncoder(),header=summaryEncoder.campaignHeader(true),transport=summaryEncoder.encodeCampaignSummary(summary,true);
  const only={type:'campaign-only' as const,...header,stepMs:0,speed:0,summary:transport.state,...transport.geography?{geography:transport.geography}:{},urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}};
  expect(new SnapshotDecoder().adoptCampaignOnly(structuredClone(only)).status).toBe('applied');
  const animal=root.worldPawns!.owners.find(r=>r.kind==='animal')!.actor.id;
  for(const receiverId of [animal,root.worldPawns!.heldCaskets259![0]!.casket.id]){
   const bad=cloned(view);memories(bad)[0]!.receiverId=receiverId;expect(validRegisteredPresentation(bad)).toBe(false);
   const globe=cloned(summary);globe.lostMemories[0]!.receiverId=receiverId;expect(validCampaignSummary(globe)).toBe(false);
  }
  // Declared memory FK probe only, no claimed new notification: the already
  // retained human remains known through its single actual holder payload.
  const heldId=root.worldPawns!.heldCaskets259![0]!.casket.casket.humans[0]!.id;
  const heldView=cloned(view);heldView.campaignPeople=heldView.campaignPeople!.filter(p=>p.id!==heldId);memories(heldView)[0]!.receiverId=heldId;expect(validRegisteredPresentation(heldView)).toBe(true);
  const heldSummary=cloned(summary);heldSummary.people=heldSummary.people.filter(p=>p.id!==heldId);heldSummary.lostMemories[0]!.receiverId=heldId;expect(validCampaignSummary(heldSummary)).toBe(true);
  const absent=cloned(view);delete absent.worldPawns;expect(validRegisteredPresentation(absent)).toBe(false);
  const old={...cloned(view),schemaVersion:258} as unknown as typeof view;expect(validRegisteredPresentation(old)).toBe(false);
  let reads=0;const accessor=Object.defineProperty({...view},'worldPawns',{enumerable:true,get(){reads++;throw Error('not data');}});expect(validRegisteredPresentation(accessor)).toBe(false);expect(reads).toBe(0);
  const forged=structuredClone(full),fake=forged.world.worldPawns!.owners.find(r=>r.actor.id===animal)!;fake.kind='human' as never;if(forged.world.campaignMap?.revision!==2)throw Error('Missing actual packet projection');forged.world.campaignMap.lostMemories[0]!.receiverId=animal;expect(new SnapshotDecoder().adopt(forged).status).toBe('resync');
  expect(serializeCampaign(root)).toBe(before);
 });
 it('validates the preserved retired0 RAW with promoted camp1, while shifted origin clocks and local expedition mismatches stay refused',()=>{
  // Exact RED captured after the successful true removal; no command or step.
  const text=readFileSync('tmp/test-runs/caravan-owners-v414-caskets10-capture02-2026-10-17T19-52-55.198Z-23592/artifacts/caravan-owners-v259/actual-held-caskets-before-first-save-INVALID-DIAGNOSTIC.json','utf8');
  expect(createHash('sha256').update(text).digest('hex')).toBe('c4487688a97e9b860e1063337ee2b75cc99c7fe8f791611fe235ab071bdb106c');
  const raw=JSON.parse(text);raw.planet=preparePlanetHydration256(raw.planet,raw.schemaVersion).planet;
  const archive=raw.worldGroups.abandonedContents.find((a:{mapId:number})=>a.mapId===0),context=archive.context,before=JSON.stringify(raw);
  expect(raw.worldMaps.rootMapId).toBe(1);expect(raw.expeditionSite.tile).toBe(50386);expect(context.climate.tileId).toBe(50388);
  expect(validGroupMapContext(context,archive.removedAt,259,raw)).toBe(true);
  expect(validLostArchiveShape(archive,raw.tick,raw.nextId,259,raw)).toBe(true);expect(validWorldMapRegistry(raw)).toBe(true);
  // The local-map validator still binds its actual expedition marker, even
  // if a caller supplies the retired site's biome alongside its climate.
  expect(validGeographicSiteClimate256(context.climate,259,{...raw,site:context.site})).toBe(false);
  const shifted={...context,climate:{...context.climate,calendarOrigin:context.climate.calendarOrigin+1}};
  expect(validGroupMapContext(shifted,archive.removedAt,259,raw)).toBe(false);
  expect(validLostArchiveShape({...archive,context:shifted},raw.tick,raw.nextId,259,raw)).toBe(false);
  expect(validGroupMapContext({...context,climate:{...context.climate,tileId:raw.expeditionSite.tile}},archive.removedAt,259,raw)).toBe(false);
  expect(validGroupMapContext(context,archive.removedAt,255,raw)).toBe(false);expect(JSON.stringify(raw)).toBe(before);
 });
 it('transfers the exact holders once, preserves every payload and literal absent affiliation, resumes RAW/full/delta under suspension',()=>{
  const root=source(),map=registeredMap(root,0)!,holders=map.structures.filter(isAncientCasket256),people=holders.flatMap(c=>c.casket.humans),items=holders.flatMap(c=>c.casket.items),encoded=holders.map(c=>JSON.stringify(c)),rng=root.rng,nativePresent=Object.hasOwn(root.worldPawns!,'nativeOrder');
  expect(holders.map(c=>c.id)).toEqual([2227,2233]);expect(people.map(p=>p.id)).toEqual([2228,2234]);for(const p of people)expect(Object.hasOwn(p,'worldAffiliation259')).toBe(false);
  const plan=prepareMapRemoved259(root,map,0,false);expect(plan.ok).toBe(true);expect(root.rng).toBe(rng);
  const run=actual259(root);run.command({type:'map-abandon',mapId:0,confirm:true});
  // Other true map residents may legitimately draw their faction transition.
  // The pure casket preflight above itself consumed no gameplay word.
  expect(root.worldMaps!.retired.some(m=>m.id===0&&m.removedAt===2905)).toBe(true);
  const held=root.worldPawns!.heldCaskets259!;expect(held).toHaveLength(2);
  for(let i=0;i<held.length;i++){expect(held[i]!.casket).toBe(holders[i]);expect(JSON.stringify(held[i]!.casket)).toBe(encoded[i]);expect(held[i]!.registeredAtCore).toBe(29050);}
  expect(held.flatMap(e=>e.casket.casket.humans)).toEqual(people);expect(held.flatMap(e=>e.casket.casket.items)).toEqual(items);
  for(const p of people){expect(root.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);expect(root.worldGroups!.abandonedContents.flatMap(a=>a.humans).some(h=>h.id===p.id)).toBe(false);expect(captureWorldPawnHumans256(root).byId.get(p.id)!.pawn).toBe(p);}
  expect(heldCasketLivingIds259(root.worldPawns)).toEqual([2228,2234]);
  expect(Object.hasOwn(root.worldPawns!,'nativeOrder')).toBe(nativePresent);
  if(nativePresent)expect(nativeWorldPawnFinderIds256(root.worldPawns!).alive).toEqual(expect.arrayContaining([2228,2234]));
  for(const [,facts] of heldCasketGCUnknown259(root.worldPawns!)){expect(facts.keep).toEqual([]);expect(facts.unknown).toContain('literal-historical-faction-instance-absent');}
  const saved=checkpoint259(root,'actual-held-caskets-before-first-save'),loaded=deserializeCampaign(saved);expect(serializeCampaign(loaded)).toBe(saved);
  for(const corrupt of ['wrong-origin','future-registration','future-held','duplicate-holder','forged-politics'] as const){
   const forged=JSON.parse(saved),entry=forged.worldPawns.heldCaskets259[0];
   if(corrupt==='wrong-origin')entry.originMapId=forged.worldMaps.nextMapId;
   else if(corrupt==='future-registration')entry.registeredAtCore=(forged.tick+1)*10;
   else if(corrupt==='future-held')entry.casket.casket.heldAt=forged.tick+1;
   else if(corrupt==='duplicate-holder')forged.worldPawns.heldCaskets259.push(structuredClone(entry));
   else entry.free=true;
   expect(()=>deserializeCampaign(JSON.stringify(forged))).toThrow();expect(serializeCampaign(root)).toBe(saved);
  }
  transport259(run,'actual-retained-caskets-MapRemoved');
  expect(root.worldPawns!.heldCaskets259!.map(e=>JSON.stringify(e.casket))).toEqual(encoded);
  for(const p of root.worldPawns!.heldCaskets259!.flatMap(e=>e.casket.casket.humans))expect(Object.hasOwn(p,'worldAffiliation259')).toBe(false);
  const before=serializeCampaign(root);expect(applyCommand(root,{type:'map-abandon',mapId:0,confirm:true},run.runtime).ok).toBe(false);expect(serializeCampaign(root)).toBe(before);
 });
 it('requires a private current permit before detaching, refuses stale content and malformed future fields before mutation',()=>{
  const root=source(),map=registeredMap(root,0)!,before=JSON.stringify(root);
  expect(()=>detachMapOwners(map,0,root.worldMaps!.sites.find(m=>m.id===0)!.tile!)).toThrow(/casket/);expect(JSON.stringify(root)).toBe(before);
  const plan=prepareMapRemoved259(root,map,0,false);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
  expect(()=>detachMapOwners(map,0,root.worldMaps!.sites.find(m=>m.id===0)!.tile!,plan)).toThrow(/casket/);expect(JSON.stringify(root)).toBe(before);
  const holder=map.structures.find(isAncientCasket256)!;holder.casket.items[0]!.quantity++;const stale=JSON.stringify(root);expect(plan.current()).toBe(false);expect(()=>detachMapOwners(map,0,root.worldMaps!.sites.find(m=>m.id===0)!.tile!,plan)).toThrow(/casket/);expect(JSON.stringify(root)).toBe(stale);
  holder.casket.items[0]!.quantity--;const sameValue=prepareMapRemoved259(root,map,0,false);expect(sameValue.ok).toBe(true);if(!sameValue.ok)throw Error(sameValue.reason);holder.casket.humans[0]=structuredClone(holder.casket.humans[0]!);expect(sameValue.current()).toBe(false);
  const state=root.worldPawns!,legacy={worldPawns:{...state,heldCaskets259:[]}};expect(validWorldPawnsEnvelope256(legacy,258,root.tick*10,root.nextId)).toBe(false);
  for(const value of [undefined,[{originMapId:0,registeredAtCore:(root.tick+1)*10,enteredAtAbsCore:0,context:{},casket:holder}]])expect(validWorldPawnsEnvelope256({worldPawns:{...state,heldCaskets259:value}},259,root.tick*10,root.nextId)).toBe(false);
 });
 it('declared area assignment on the actual map person and contained original crosses only its preflighted removal phases',()=>{
  const root=source(),run=actual259(root),map=registeredMap(root,0)!,person=map.pawns.find(p=>p.id===8)!,holder=map.structures.find(isAncientCasket256)!,held=holder.casket.humans[0]!;
  // Declared QA metadata before the removal baseline, no step/new actor.
  run.command({type:'map-view',mapId:0});
  run.command({type:'allowed-area-create',label:'Prepared removal regression'});const areaId=map.allowedAreas!.at(-1)!.id;
  run.command({type:'assign-allowed-area',pawnId:person.id,areaId});
  held.mapAreas={revision:1,assignments:[{mapId:0,areaId}]};
  const holderExpected=structuredClone(holder);holderExpected.casket.humans[0]!.mapAreas={revision:1,assignments:[]};
  const baseline=serializeCampaign(root),plan=prepareMapRemoved259(root,map,0,false);expect(plan.ok).toBe(true);expect(serializeCampaign(root)).toBe(baseline);
  run.command({type:'map-abandon',mapId:0,confirm:true});
  expect(root.worldPawns!.owners.find(r=>r.actor===person)).toBeDefined();expect(person.mapAreas?.assignments.some(a=>a.mapId===0)).toBe(false);expect(person.allowedAreaId).toBeUndefined();
  expect(root.worldPawns!.heldCaskets259!.find(e=>e.casket===holder)!.casket.casket.humans[0]).toBe(held);expect(holder).toEqual(holderExpected);
  transport259(run,'declared-area-retained-casket-removal');
 });
});
