import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {deserializeCampaign} from '../src/sim/serialization';
import {registeredMapId} from '../src/sim/world-map-context';
import {groupAnimalFormationReason259} from '../src/sim/group-animal-formation-256';
import {actual259,require259,transport259,checkpoint259,start259,laterGeoSettle259} from './helpers/fresh-caravan-owners-v259';

/** The previous pilot stopped after the already verified2904→2905 interval and
 * pause, but omitted the final RAW on command refusal. Recover that same
 * deterministic boundary only, with no fresh route, actor or favorable wait. */
test.runIf(process.env.ELSEWHERE_RECOVER_DEPARTURE259==='1')('recovers the one verified departure interval and pause omitted by the failed pilot export',()=>{
 const path=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CHECKPOINT,sha=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_SHA256;
 if(!path||!sha)throw Error('Exact acquired departure RAW and SHA256 required');const bytes=readFileSync(path,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
 const root=deserializeCampaign(bytes);require259(root);expect(root.tick).toBe(2904);const run=actual259(root),g=run.away(5);expect(g.members.map(p=>p.id)).toEqual([7,28366]);expect(g.animalOwners?.members.map(a=>a.id)).toEqual([2389]);
 run.step();expect(root.tick).toBe(2905);run.command({type:'group-pause',groupId:5,paused:true});expect(run.away(5).paused).toBe(true);expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([0,1]);checkpoint259(root,'actual259-paused2905-before-abandon-refusal');
},90000);
/** Resume the sole actual paused2905 boundary. The earlier formation, contact,
 * departure and verified2904→2905 interval must not be played again. */
test.runIf(process.env.ELSEWHERE_RUN_PAUSED2905_CONTINUATION259==='1')('continues the actual paused departure after the preserved nonempty-casket refusal',()=>{
 const path=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CHECKPOINT,sha=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_SHA256;
 if(!path||!sha)throw Error('Exact actual paused2905 RAW and SHA256 required');
 const bytes=readFileSync(path,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
 const root=deserializeCampaign(bytes);require259(root);expect(root.tick).toBe(2905);
 const run=actual259(root),g=run.away(5);expect(g.paused).toBe(true);expect(g.members.map(p=>p.id)).toEqual([7,28366]);expect(g.animalOwners?.members.map(a=>a.id)).toEqual([2389]);
 expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([0,1]);
 const originalIds={people:g.members.map(p=>p.id),animals:g.animalOwners!.members.map(a=>a.id),items:g.items.map(p=>p.id)};
 run.command({type:'map-abandon',mapId:0,confirm:true});checkpoint259(root,'actual259-home-retired-with-original-holders');
 run.command({type:'map-abandon',mapId:1,confirm:true});checkpoint259(root,'actual259-no-active-map-original-caravan');
 expect(root.worldMaps!.sites).toHaveLength(0);expect(run.away(5).members.map(p=>p.id)).toEqual(originalIds.people);
 expect(run.away(5).animalOwners!.members.map(a=>a.id)).toEqual(originalIds.animals);expect(run.away(5).items.map(p=>p.id)).toEqual(originalIds.items);
 const tile=Number(process.env.ELSEWHERE_OWNER259_SETTLE_TILE);if(tile!==50387)throw Error('Use only the previously declared settlement destination50387');
 run.command({type:'group-route',groupId:5,destination:tile});run.command({type:'group-pause',groupId:5,paused:false});run.until(()=>run.away(5).phase==='at-site',10000);
 checkpoint259(root,'actual259-before-later-settlement');laterGeoSettle259(run,5);transport259(run,'real-max1-later-settlement');
},240000);
/** The home was actually removed in resettlement08. Continue its exact saved
 * Camp-only state; neither the earlier abandonment nor the journey is replayed. */
test.runIf(process.env.ELSEWHERE_RUN_RETIRED_HOME_CONTINUATION259==='1')('continues the actual retired-home2905 boundary through last Camp removal and geographic settlement',()=>{
 const path=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CHECKPOINT,sha=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_SHA256;
 if(!path||sha!=='c4487688a97e9b860e1063337ee2b75cc99c7fe8f791611fe235ab071bdb106c')throw Error('Exact actual retired-home2905 RAW and SHA256 required');
 const bytes=readFileSync(path,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
 const root=deserializeCampaign(bytes);require259(root);expect(root.tick).toBe(2905);
 expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([1]);expect(root.worldMaps!.retired.some(s=>s.id===0&&s.removedAt===2905)).toBe(true);
 const run=actual259(root),g=run.away(5);expect(g.paused).toBe(true);expect(g.members.map(p=>p.id)).toEqual([7,28366]);expect(g.animalOwners?.members.map(a=>a.id)).toEqual([2389]);
 const originalIds={people:g.members.map(p=>p.id),animals:g.animalOwners!.members.map(a=>a.id),items:g.items.map(p=>p.id)};
 run.command({type:'map-abandon',mapId:1,confirm:true});checkpoint259(root,'actual259-no-active-map-original-caravan');
 expect(root.worldMaps!.sites).toHaveLength(0);expect(run.away(5).members.map(p=>p.id)).toEqual(originalIds.people);
 expect(run.away(5).animalOwners!.members.map(a=>a.id)).toEqual(originalIds.animals);expect(run.away(5).items.map(p=>p.id)).toEqual(originalIds.items);
 if(process.env.ELSEWHERE_OWNER259_SETTLE_TILE!=='50387')throw Error('Use only the previously declared settlement destination50387');
 run.command({type:'group-route',groupId:5,destination:50387});run.command({type:'group-pause',groupId:5,paused:false});run.until(()=>run.away(5).phase==='at-site',10000);
 checkpoint259(root,'actual259-before-later-settlement');laterGeoSettle259(run,5);transport259(run,'real-max1-later-settlement');
},240000);
/** Same acquired main branch, optionally after the actual contact resumed from
 * cancellation. Earlier capture/formation and MapRemoved/GC are not replayed. */
test.runIf(process.env.ELSEWHERE_RUN_SETTLEMENT_CONTINUATION259==='1')('continues the exact cancelled capture through actual departure and max1 geographic resettlement',()=>{
 const path=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CHECKPOINT,sha=process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_SHA256;
 if(!path||!sha)throw Error('Exact acquired cancelled-capture RAW and SHA256 required');
 const raw=readFileSync(path,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sha);
 const root=deserializeCampaign(raw);require259(root);const run=actual259(root),source=run.local(),mapId=registeredMapId(source)!;
 if(root.worldMaps!.sites.find(s=>s.id===mapId)?.kind!=='camp')throw Error('Actual acquired Camp required');
 const captain=source.pawns.find(p=>p.id===Number(process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CAPTAIN_ID)),patient=source.pawns.find(p=>p.id===Number(process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_CAPTIVE_ID)),pet=source.wildlife?.animals.find(a=>a.id===Number(process.env.ELSEWHERE_SETTLEMENT_CONTINUATION259_ANIMAL_ID));
 if(!captain||!patient?.prisoner||!pet||patient.worldAffiliation259?.guestStatus!=='Prisoner')throw Error('The same declared original captain, captive and animal are required');
 // Ordinary wander can be admitted directly. The existing ungathered line
 // preserves its captured edge and suppresses only future wandering decisions;
 // the real handler still has to finish both edges and reach contact.
 const existing=root.worldGroups!.groups;
 let id:number;
 if(existing.length){
  if(existing.length!==1||existing[0]!.localMapId!==mapId||!('manifest'in existing[0]!.state))throw Error('Expected only the same actual contact preparation');
  const g=existing[0]!.state;expect(g.admission?.revision).toBe(2);expect(g.memberIds).toEqual([captain.id,patient.id]);
  expect(g.animalPreparation?.lines).toEqual([{animalId:pet.id,handlerId:captain.id,mode:'lead',gathered:true}]);id=g.id;
 }else{
  expect(groupAnimalFormationReason259(source,pet)).toBeUndefined();
  const edge=structuredClone(pet.motion),position={x:pet.x,z:pet.z};checkpoint259(root,'after-cancel-before-direct-reformation');
  id=start259(run,source,[captain,patient],root.planet!.homeTile,[pet.id]);expect(pet.motion).toEqual(edge);expect(pet).toMatchObject(position);
 }
 run.until(()=>!!run.state(id)&&'members'in run.state(id)!,6000);
 checkpoint259(root,'actual259-before-terminal-expiry-preparation');transport259(run,'actual259-captive-animal-departed');
 run.command({type:'group-pause',groupId:id,paused:true});run.command({type:'map-abandon',mapId:0,confirm:true});
 if(root.worldMaps!.sites.some(s=>s.id===mapId))run.command({type:'map-abandon',mapId,confirm:true});
 const tile=Number(process.env.ELSEWHERE_OWNER259_SETTLE_TILE);if(!Number.isSafeInteger(tile)||tile<0)throw Error('Previously declared actual settlement destination required');
 run.command({type:'group-route',groupId:id,destination:tile});run.command({type:'group-pause',groupId:id,paused:false});run.until(()=>run.away(id).phase==='at-site',10000);
 checkpoint259(root,'actual259-before-later-settlement');laterGeoSettle259(run,id);transport259(run,'real-max1-later-settlement');
},240000);
