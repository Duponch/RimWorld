import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {fresh259,actual259,preparedFood259,dropPreparedPetSupplies259,start259,camp259,newDownedRaider259,transport259,checkpoint259,removed259,laterGeoSettle259,require259} from './helpers/fresh-caravan-owners-v259.ts';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization.ts';
import {registeredMapId} from '../src/sim/world-map-context.ts';
import {validWorldAffiliationFields259} from '../src/sim/world-affiliation-259.ts';
import type {World} from '../src/sim/types.ts';

/** One opt-in aggregate, NON EXECUTED. Exactly one true new globe/new-game250,
 * one actual temporary Camp200 and (on a replay branch) one LaterGeoSettle250.
 * No picked successful seed retry, saved Camp3602/Aulnes promotion or injected
 * Pawn/faction/receipt is allowed. All declared stock/medical preparation occurs
 * before its saved baseline. ROOT runs alone after candidate hunk integration.
 */
test.runIf(process.env.ELSEWHERE_RUN_FRESH_OWNER259==='1')('fresh259 births, actual capture/carry cancellation, exclusive MapRemoved, later max1 settlement and exact transport',()=>{
 const destination=Number(process.env.ELSEWHERE_OWNER259_CAMP_TILE);
 if(!Number.isSafeInteger(destination)||destination<0)throw Error('Select and record one actual reachable Camp destination; no automatic route/seed retry');
 const settleTile=Number(process.env.ELSEWHERE_OWNER259_SETTLE_TILE);
 if(!Number.isSafeInteger(settleTile)||settleTile<0)throw Error('An actual later settlement destination is required for the acquired route');
 const resume=process.env.ELSEWHERE_OWNER259_RESUME_DECLARED,resumePreparedCapture=process.env.ELSEWHERE_OWNER259_RESUME_PREPARED_CAPTURE,resumeCamp=resumePreparedCapture??process.env.ELSEWHERE_OWNER259_RESUME_CAMP;
 const run=resumeCamp?(()=>{const bytes=readFileSync(resumeCamp,'utf8');if(createHash('sha256').update(bytes).digest('hex')!==(resumePreparedCapture?process.env.ELSEWHERE_OWNER259_RESUME_PREPARED_CAPTURE_SHA256:process.env.ELSEWHERE_OWNER259_RESUME_CAMP_SHA256))throw Error('Exact acquired Camp checkpoint SHA256 required');const root=deserializeCampaign(bytes);require259(root);if(root.worldGroups!.groups.length||root.worldMaps!.sites.length!==2||root.worldMaps!.sites.find(s=>s.id===root.worldMaps!.selectedMapId)?.kind!=='camp')throw Error('Resume only the acquired Camp checkpoint');return actual259(root);})():resume?(()=>{const bytes=readFileSync(resume,'utf8');if(createHash('sha256').update(bytes).digest('hex')!==process.env.ELSEWHERE_OWNER259_RESUME_DECLARED_SHA256)throw Error('Exact acquired pre-formation SHA256 required');const root=deserializeCampaign(bytes);require259(root);if(root.worldGroups!.groups.length||root.worldMaps!.sites.length!==1||root.startingArrival?.phase!=='opened')throw Error('Resume the acquired first formation baseline only');return actual259(root);})():fresh259();
 const home=run.local(),originals=home.pawns.filter(p=>p.worldAffiliation259?.factionId===run.root.worldFactions!.playerFactionId);
 if(originals.length!==(resumeCamp?2:3))throw Error('Actual original local cohort missing');
 const members=originals.slice(0,2),pet=home.wildlife?.animals.find(a=>a.domestic);
 if(!pet)throw Error('Actual initial animal producer supplied no pet; this case requires one, no animal is synthesized');
 const camp=resumeCamp?home:(()=>{
  if(!resume){members.forEach(p=>preparedFood259(home,p));preparedFood259(home,pet);}dropPreparedPetSupplies259(home,pet);checkpoint259(run.root,'declared-local-stocks-before-first-formation');
  const first=start259(run,home,members,destination,[pet.id]);run.until(()=>!!run.state(first)&&'members'in run.state(first)!,6000);
  const initial=run.away(first);expect(initial.members).toEqual(expect.arrayContaining(members));expect(initial.animalOwners!.members).toContain(pet);expect(initial.reorganization!.memberOrigins.every(o=>o.enteredAtAbsCore!==undefined)).toBe(true);
  transport259(run,'first-real-admission2-exit');return camp259(run,first);
 })(),campId=registeredMapId(camp)!;checkpoint259(run.root,'actual259-camp-before-raider');
 const patient=resumePreparedCapture?camp.pawns.find(p=>p.raid&&p.state==='downed'&&!p.prisoner&&p.worldAffiliation259?.factionId!==run.root.worldFactions!.playerFactionId):newDownedRaider259(run,camp),captain=members[0]!,fellow=members[1]!;
 if(!patient)throw Error('Same prepared downed original missing');
 if(!resumePreparedCapture){preparedFood259(camp,patient);preparedFood259(camp,captain);}checkpoint259(run.root,'declared-raider-injuries-and-finite-stocks-before-capture');
 const before=start259(run,camp,[captain,patient],run.root.planet!.homeTile,[pet.id]);expect(patient.prisoner).toBeUndefined();
 run.command({type:'group-cancel',groupId:before});expect(patient.prisoner).toBeUndefined();expect(patient.worldAffiliation259!.hostFactionId).toBeNull();
 const id=start259(run,camp,[captain,patient],run.root.planet!.homeTile,[pet.id]);let observed=false;
 for(let n=0;n<6000&&!observed;n++){
  const g=run.preparing(id),line=g.humanPreparation!.passengers.find(p=>p.pawnId===patient.id)!;
  const carrier=camp.pawns.find(p=>p.id===line.carrierId)!;
  const before={phase:line.phase,contact:Math.abs(carrier.x-patient.x)+Math.abs(carrier.z-patient.z)<=1,carrierEnd:carrier.motion?.end??run.root.tick,patientEnd:patient.motion?.end??run.root.tick};
  run.step();const next=run.preparing(id).humanPreparation!.passengers.find(p=>p.pawnId===patient.id)!;
  if(!patient.prisoner)continue;
  checkpoint259(run.root,'actual-contact-capture-before-carry-edge');
  expect(before.phase).toBe('approach');expect(before.contact).toBe(true);
  // The engine advances its confirmed tick and completes the preceding edge
  // before running pickup. Compare against that actual capture frontier, not
  // the previous frame where the same final edge may still be in flight.
  expect(patient.prisoner.capturedAt).toBe(run.root.tick);expect(before.carrierEnd).toBeLessThanOrEqual(patient.prisoner.capturedAt);expect(before.patientEnd).toBeLessThanOrEqual(patient.prisoner.capturedAt);
  expect(next.captureOnPickup259).toBe(true);expect(patient.worldAffiliation259).toMatchObject({guestStatus:'Prisoner',hostFactionId:run.root.worldFactions!.playerFactionId});observed=true;
 }
 if(!observed){checkpoint259(run.root,'failed-real-capture-contact');throw Error('Actual capture contact not reached inside6000 ticks');}
 run.until(()=>run.preparing(id).humanPreparation!.passengers.some(p=>p.pawnId===patient.id&&p.phase==='carry')&&!!patient.motion,1200);
 const dossier=patient.prisoner!,capturedAt=dossier.capturedAt;transport259(run,'actual-contact-capture-carried-edge');
 run.command({type:'group-cancel',groupId:id});expect(patient.prisoner).toBe(dossier);expect(patient.prisoner!.capturedAt).toBe(capturedAt);expect(patient.worldAffiliation259!.guestStatus).toBe('Prisoner');
 const afterCancel=checkpoint259(run.root,'capture-after-carry-cancel');

 // A real MapRemoved branch at exactly this acquired state. Same patient and
 // dormant dossier must move into one live WorldPawn, never compact duplicates.
 const removed=deserializeCampaign(afterCancel);require259(removed);const removedRun=actual259(removed),removedPatient=removedRun.local(campId).pawns.find(p=>p.id===patient.id)!,removedDossier=removedPatient.prisoner!;
 removed259(removedRun,campId,[captain.id,patient.id,fellow.id]);const retained=removed.worldPawns!.owners.find(r=>r.actor.id===patient.id)!;expect(retained.actor).toBe(removedPatient);expect(retained.kind).toBe('human');if(retained.kind==='human'){expect(retained.actor.prisoner).toBeUndefined();expect(retained.actor.prisonerHistory259).toBe(removedDossier);expect(retained.actor.prisonerHistory259!.capturedAt).toBe(capturedAt);}

 // Resume the exact main branch and let its next formation actually depart.
 // This is the acquired checkpoint consumed by the existing expiry opt-in.
 const resumed=deserializeCampaign(afterCancel);require259(resumed);const main=actual259(resumed),source=main.local(campId),active=[captain.id,patient.id].map(id=>source.pawns.find(p=>p.id===id)!);
 const terminalId=start259(main,source,active,resumed.planet!.homeTile,[pet.id]);main.until(()=>!!main.state(terminalId)&&'members'in main.state(terminalId)!,6000);
 checkpoint259(resumed,'actual259-before-terminal-expiry-preparation');transport259(main,'actual259-captive-animal-departed');

 // LaterGeoSettle is tested on a separate exact continuation. The real route
 // stays at its current tile only after the public pause; abandon the original
 // home and the temporary map with their true remaining owners before max1.
 main.command({type:'group-pause',groupId:terminalId,paused:true});
 main.command({type:'map-abandon',mapId:0,confirm:true});
 if(resumed.worldMaps!.sites.some(m=>m.id===campId))main.command({type:'map-abandon',mapId:campId,confirm:true});
 // A real settlement entry requires an arrived/stationary group. The caller
 // supplies a second near destination rather than forging tile/phase/motion.
 main.command({type:'group-route',groupId:terminalId,destination:settleTile});main.command({type:'group-pause',groupId:terminalId,paused:false});main.until(()=>main.away(terminalId).phase==='at-site',10000);
 checkpoint259(resumed,'actual259-before-later-settlement');laterGeoSettle259(main,terminalId);transport259(main,'real-max1-later-settlement');
},240000);

/** Separate opt-in REUSES the exact258 two-map checkpoint that ROOT acquired
 * before adoption. No old fixture is edited; malformed copies are disposable.
 */
test.runIf(process.env.ELSEWHERE_RUN_258_TWO_MAP_MIGRATION==='1')('strict258 validates both maps before neutral259 scalar migration',()=>{
 const file=process.env.ELSEWHERE_258_TWO_MAP_CHECKPOINT;if(!file)throw Error('Exact acquired258 two-map checkpoint is required');
 const raw=JSON.parse(readFileSync(file,'utf8')) as Omit<World,'schemaVersion'>&{schemaVersion:number};
 if(raw.schemaVersion!==258||raw.worldMaps?.sites.length!==2)throw Error('Expected exact258 campaign with two real map owners');
 const before=JSON.parse(JSON.stringify(raw)),loaded=deserializeCampaign(JSON.stringify(raw));expect(loaded.schemaVersion).toBe(259);const neutral=JSON.parse(serializeCampaign(loaded));neutral.schemaVersion=258;expect(neutral).toEqual(before);
 const inactive=raw.worldMaps.sites.find(s=>s.id!==raw.worldMaps!.rootMapId)?.map;
 if(!inactive?.pawns.length)throw Error('Second real map must own a Pawn for this strict boundary probe');
 inactive.pawns[0]!.worldAffiliation259={revision:1,factionId:null,hostFactionId:null,guestStatus:'Guest'};expect(validWorldAffiliationFields259(inactive.pawns[0] as unknown as Record<string,unknown>,258)).toBe(false);expect(()=>deserializeCampaign(JSON.stringify(raw))).toThrow(/258/);
 const broken=JSON.parse(JSON.stringify(before)) as World,other=broken.worldMaps!.sites.find(s=>s.id!==broken.worldMaps!.rootMapId)!.map!;other.tiles[0]!.terrain='future-terrain' as World['tiles'][number]['terrain'];expect(()=>deserializeCampaign(JSON.stringify(broken))).toThrow(/258/);
});
