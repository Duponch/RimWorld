import {groupHumanPendingPassenger259} from '../src/sim/group-human-admission-257';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {groupAnimalReason256,groupAnimalFormationReason259,groupAnimalChoices256} from '../src/sim/group-animal-formation-256';
import {previewGroupFormation} from '../src/sim/group-authority';
import {captureGroupMass} from '../src/sim/group-capture';
import {animalCaravanCapacityGrams256} from '../src/sim/group-animal-capacity-256';
import {slaughterContact} from '../src/sim/animal-slaughter';
import {animalBody} from '../src/sim/wildlife-health';
import {usableGroupPackAnimal258} from '../src/sim/group-packed-animal-loading-258';
import {actual259,require259,start259,checkpoint259,transport259} from './helpers/fresh-caravan-owners-v259';

/** ROOT-only continuation of exact retained2047/2093 failures. No factory,
 * earlier1807/1927 progression, favorable wait, movement edit or new supplies. */
function acquired(contact2093=false){
 const path=process.env[contact2093?'ELSEWHERE_ANIMAL_WANDER259_CONTACT_CHECKPOINT':'ELSEWHERE_ANIMAL_WANDER259_CHECKPOINT'],sha=process.env[contact2093?'ELSEWHERE_ANIMAL_WANDER259_CONTACT_SHA256':'ELSEWHERE_ANIMAL_WANDER259_SHA256'];
 if(!path||!sha)throw Error('Exact acquired RAW and SHA256 are required');
 const raw=readFileSync(path,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sha);
 const root=deserializeCampaign(raw);require259(root);expect(root.tick).toBe(contact2093?2093:2047);
 const run=actual259(root),map=run.local(),pet=map.wildlife!.animals.find(a=>a.id===2389)!;
 const captain=map.pawns.find(p=>p.id===Number(process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CAPTAIN_ID)),patient=map.pawns.find(p=>p.id===Number(process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CAPTIVE_ID));
 if(!pet||!captain||!patient?.prisoner||root.worldGroups!.groups.length)throw Error('Same captain, captive, animal and no formation required');
 expect(pet.state).toBe('moving');expect(pet.motion).toMatchObject({start:2039,end:2049.913739108887});expect(pet.wander?.job?.kind).toBe('goto');
 if(contact2093){expect(captain.id).toBe(7);expect(patient.id).toBe(28366);expect(patient.medicalSleep).toBe(true);expect(captain.motion).toMatchObject({start:2091.7456949966163,end:2095.3790283299495});}
 return {root,run,map,pet,captain,patient};
}
const enabled=process.env.ELSEWHERE_RUN_ANIMAL_WANDER259==='1';
test.runIf(enabled)('ordinary walking is prospective259 formation-only; danger, old schemas, unloading guard and route still refuse',()=>{
 const f=acquired(),before=serializeCampaign(f.root),edge=structuredClone(f.pet.motion);
 expect(groupAnimalReason256(f.map,f.pet)).toBeDefined();
 expect(groupAnimalFormationReason259(f.map,f.pet)).toBeUndefined();
 expect(groupAnimalChoices256(f.map).find(r=>r.animal===f.pet)?.ok).toBe(true);
 const preview=previewGroupFormation(f.map,[f.captain.id,f.patient.id],[],f.root.planet!.homeTile,[],[f.pet.id]);expect(preview.ok).toBe(true);
 const ids=new Set([f.captain.id,f.patient.id,f.pet.id]),items=f.map.piles.filter(i=>'pawnId'in i.owner&&ids.has(i.owner.pawnId)),packed=f.map.packed.filter(i=>i.owner.type==='inventory'&&ids.has(i.owner.pawnId));
 const mass=captureGroupMass([f.captain,f.patient],items,true,259,packed,[f.pet]);expect(mass).toBeDefined();expect(animalCaravanCapacityGrams256(f.pet)).toBe(0);expect(usableGroupPackAnimal258(f.map,f.pet)).toBe(false);expect(animalBody(f.pet).capacities.moving).toBeGreaterThan(0);
 if(preview.ok){expect(preview.mass.grams).toBe(mass!.grams);expect(preview.mass.capacityGrams).toBe(mass!.capacityGrams);}
 expect(previewGroupFormation(f.map,[f.captain.id,f.patient.id],[],-1,[],[f.pet.id]).ok).toBe(false);
 // Declared policy negatives on this detached QA branch, never published/played.
 const schema=f.map.schemaVersion;for(const version of [256,257,258,260]){Object.assign(f.map,{schemaVersion:version});expect(groupAnimalFormationReason259(f.map,f.pet)).toBeDefined();}Object.assign(f.map,{schemaVersion:schema});
 f.pet.threat={targetId:f.captain.id,harmedAtCore:f.root.tick*10};expect(groupAnimalFormationReason259(f.map,f.pet)).toBeDefined();expect(previewGroupFormation(f.map,[f.captain.id,f.patient.id],[],f.root.planet!.homeTile,[],[f.pet.id]).ok).toBe(false);delete f.pet.threat;
 expect(f.pet.motion).toEqual(edge);expect(serializeCampaign(f.root)).toBe(before);
});
test.runIf(enabled)('same actual next tick and reload preserve the animal edge; cancellation releases only intent',()=>{
 const f=acquired(),edge=structuredClone(f.pet.motion),health=structuredClone(f.pet.health),position={x:f.pet.x,z:f.pet.z},id=start259(f.run,f.map,[f.captain,f.patient],f.root.planet!.homeTile,[f.pet.id]);
 expect(f.pet.motion).toEqual(edge);expect(f.pet).toMatchObject(position);expect(f.pet.health).toEqual(health);expect(f.run.preparing(id).animalPreparation!.lines[0]!).toMatchObject({animalId:f.pet.id,mode:'lead',gathered:false});
 // Existing ROOT helper performs exact RAW, same-tick full/changed delta and
 // ONE real next-tick replay; it does not prepare another factory or journey.
 transport259(f.run,'animal-wander259-admitted-active-edge');expect(f.root.tick).toBe(2048);expect(f.pet.motion).toEqual(edge);expect(f.pet).toMatchObject(position);expect(f.run.preparing(id).animalPreparation!.lines[0]!.gathered).toBe(false);
 f.run.command({type:'group-cancel',groupId:id});expect(f.root.worldGroups!.groups).toHaveLength(0);expect(f.pet.motion).toEqual(edge);expect(f.pet).toMatchObject(position);expect(f.map.wildlife!.animals.find(a=>a.id===f.pet.id)).toBe(f.pet);
 const cancelled=checkpoint259(f.root,'animal-wander259-cancel-same-active-edge');expect(serializeCampaign(deserializeCampaign(cancelled))).toBe(cancelled);
},90000);
test.runIf(enabled)('real handler contact gathers the same animal only after both original edges finish',()=>{
 const f=acquired(true),edge=structuredClone(f.pet.motion)!,captainEdge=structuredClone(f.captain.motion)!,patientHealth=structuredClone(f.patient.health),id=start259(f.run,f.map,[f.captain,f.patient],f.root.planet!.homeTile,[f.pet.id]);
 // The acquired2093 has a real pre-existing sleep: only the existing atomic
 // releaseWork may end it, after the captain's captured edge has finished.
 expect(f.patient.medicalSleep).toBe(true);expect(f.patient.health).toEqual(patientHealth);expect(f.captain.motion).toEqual(captainEdge);expect(f.pet.motion).toEqual(edge);expect(f.run.preparing(id).humanPreparation!.releaseIds).toContain(f.patient.id);
 expect(groupHumanPendingPassenger259(f.map,f.patient.id)).toBe(true);
 // Declared policy negatives only; no simulated tick runs under a forged version.
 const schema=f.map.schemaVersion;for(const version of [257,258,260]){Object.assign(f.map,{schemaVersion:version});expect(groupHumanPendingPassenger259(f.map,f.patient.id)).toBe(false);}Object.assign(f.map,{schemaVersion:schema});
 let acquiredContact=false,releasedMedicalSleep=false;
 for(let n=0;n<1200&&!acquiredContact;n++){
  const line=f.run.preparing(id).animalPreparation!.lines.find(l=>l.animalId===f.pet.id)!,handler=f.map.pawns.find(p=>p.id===line.handlerId)!;
  const wasGathered=line.gathered,previousAnimal=structuredClone(f.pet),previousHandler=structuredClone(handler);f.run.step();
  const state=f.run.state(id);if(!state||!('manifest'in state)){checkpoint259(f.root,'animal-wander259-contact-boundary');throw Error(`Formation changed before observed animal contact at${f.root.tick}: ${JSON.stringify({state:state?.phase,events:f.map.events.slice(-5)})}`);}
  if(!releasedMedicalSleep&&!state.humanPreparation!.releaseIds.includes(f.patient.id)){
   releasedMedicalSleep=true;expect(captainEdge.end).toBeLessThanOrEqual(f.root.tick);expect(groupHumanPendingPassenger259(f.map,f.patient.id)).toBe(true);expect(f.patient.medicalSleep).toBeUndefined();expect(f.patient.health?.tick).toBe(f.root.tick);expect(f.patient.state).toBe('downed');
   expect(f.patient.prisoner?.capturedAt).toBe(1806);expect(f.patient.health?.injuries.map(i=>i.id)).toEqual([1,2,3,4,5]);expect(f.pet.motion).toEqual(edge);
   const raw=checkpoint259(f.root,'animal-wander259-pending-passenger-after-real-release');expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
  }
  if(releasedMedicalSleep)expect(f.patient.medicalSleep).toBeUndefined();else expect(f.patient.medicalSleep).toBe(true);
  const next=state.animalPreparation!.lines.find(l=>l.animalId===f.pet.id)!;
  if(!wasGathered&&next.gathered){acquiredContact=true;expect(edge.end).toBeLessThanOrEqual(f.root.tick);expect(previousAnimal.motion?.end??0).toBeLessThanOrEqual(f.root.tick);expect(previousHandler.motion?.end??0).toBeLessThanOrEqual(f.root.tick);expect(slaughterContact(f.map,previousHandler,previousAnimal)).toBe(true);}
 }
 expect(releasedMedicalSleep).toBe(true);expect(acquiredContact).toBe(true);expect(f.map.wildlife!.animals.find(a=>a.id===2389)).toBe(f.pet);const raw=checkpoint259(f.root,'animal-wander259-real-contact');expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
},240000);
