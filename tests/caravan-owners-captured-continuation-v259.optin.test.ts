import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {deserializeCampaign} from '../src/sim/serialization';
import {registeredMapId} from '../src/sim/world-map-context';
import {actual259,require259,transport259,checkpoint259,removed259,start259,laterGeoSettle259} from './helpers/fresh-caravan-owners-v259';

/** Continues the one acquired physical capture. No world generation, first
 * departure, raid, injury preparation or approach is replayed by this case. */
test.runIf(process.env.ELSEWHERE_RUN_CAPTURE_CONTINUATION259==='1')('continues the actual carried captive through cancellation, exclusive MapRemoved and max1 resettlement',()=>{
 const path=process.env.ELSEWHERE_CAPTURE_CONTINUATION259_CHECKPOINT,sha=process.env.ELSEWHERE_CAPTURE_CONTINUATION259_SHA256;
 if(!path||!sha)throw Error('Exact acquired capture RAW and SHA256 required');
 const raw=readFileSync(path,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sha);
 const root=deserializeCampaign(raw);require259(root);const run=actual259(root),camp=run.local(),campId=registeredMapId(camp)!;
 const records=root.worldGroups!.groups.filter(r=>r.localMapId===campId&&'manifest'in r.state&&r.state.admission?.revision===2);
 expect(records).toHaveLength(1);const id=records[0]!.state.id,g=run.preparing(id),line=g.humanPreparation!.passengers.find(r=>r.phase==='carry'&&r.captureOnPickup259)!;
 if(!line||root.worldMaps!.sites.find(s=>s.id===campId)?.kind!=='camp')throw Error('Actual captured and carried Camp original required');
 const patient=camp.pawns.find(p=>p.id===line.pawnId)!,captain=camp.pawns.find(p=>p.id===line.carrierId)!,fellow=camp.pawns.find(p=>p.id!==captain.id&&p.worldAffiliation259?.factionId===root.worldFactions!.playerFactionId)!,pet=camp.wildlife?.animals.find(a=>g.animalPreparation?.lines.some(row=>row.animalId===a.id));
 if(!patient.prisoner||!fellow||!pet||!patient.motion)throw Error('Same dossier, fellow, animal and carried edge must be present');
 transport259(run,'actual-contact-capture-carried-edge');
 const dossier=patient.prisoner,capturedAt=dossier.capturedAt;
 run.command({type:'group-cancel',groupId:id});expect(patient.prisoner).toBe(dossier);expect(patient.prisoner.capturedAt).toBe(capturedAt);expect(patient.worldAffiliation259!.guestStatus).toBe('Prisoner');
 const afterCancel=checkpoint259(root,'capture-after-carry-cancel');
 const removed=deserializeCampaign(afterCancel);require259(removed);const removedRun=actual259(removed),removedPatient=removedRun.local(campId).pawns.find(p=>p.id===patient.id)!,removedDossier=removedPatient.prisoner!;
 removed259(removedRun,campId,[captain.id,patient.id,fellow.id]);const retained=removed.worldPawns!.owners.find(r=>r.actor.id===patient.id)!;
 expect(retained.actor).toBe(removedPatient);expect(retained.kind).toBe('human');if(retained.kind==='human'){expect(retained.actor.prisoner).toBeUndefined();expect(retained.actor.prisonerHistory259).toBe(removedDossier);expect(retained.actor.prisonerHistory259!.capturedAt).toBe(capturedAt);}
 const resumed=deserializeCampaign(afterCancel);require259(resumed);const main=actual259(resumed),source=main.local(campId),active=[captain.id,patient.id].map(id=>source.pawns.find(p=>p.id===id)!);
 const terminalId=start259(main,source,active,resumed.planet!.homeTile,[pet.id]);main.until(()=>!!main.state(terminalId)&&'members'in main.state(terminalId)!,6000);
 checkpoint259(resumed,'actual259-before-terminal-expiry-preparation');transport259(main,'actual259-captive-animal-departed');
 main.command({type:'group-pause',groupId:terminalId,paused:true});main.command({type:'map-abandon',mapId:0,confirm:true});
 if(resumed.worldMaps!.sites.some(m=>m.id===campId))main.command({type:'map-abandon',mapId:campId,confirm:true});
 const settleTile=Number(process.env.ELSEWHERE_OWNER259_SETTLE_TILE);if(!Number.isSafeInteger(settleTile)||settleTile<0)throw Error('Previously declared actual later settlement tile required');
 main.command({type:'group-route',groupId:terminalId,destination:settleTile});main.command({type:'group-pause',groupId:terminalId,paused:false});main.until(()=>main.away(terminalId).phase==='at-site',10000);
 checkpoint259(resumed,'actual259-before-later-settlement');laterGeoSettle259(main,terminalId);transport259(main,'real-max1-later-settlement');
},240000);
