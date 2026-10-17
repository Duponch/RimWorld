import {expect,test} from 'vitest';
import {generateWorld} from '../src/sim/generation.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {bindBornHumanFaction259,commitCapturedGuest259} from '../src/sim/world-affiliation-259.ts';
import {captureGroupCapturePatients259,validGroupCapturePatients259,brandGroupCaptureProjection259,projectedCapturePatient259,projectedGroupReform259} from '../src/sim/group-human-projection-259.ts';
import {brandGroupProjection} from '../src/sim/world-map-context.ts';
import {actualReform259} from '../src/sim/group-human-admission-259.ts';
import {validGroupHumanPreparation257} from '../src/sim/group-human-admission-257.ts';
import type {World} from '../src/sim/types.ts';
import type {PreparingGroup} from '../src/sim/group-capture.ts';
import type {CampaignGroupSummary,CampaignMapPresentation} from '../src/sim/world-map-state.ts';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state.ts';

/** Prepared record/projection fixtures only. No played capture, campaign RAW,
 * world generation parity, physical carry chronology or performance claim. */
function fixture(active=true,captured=true){
 const map=generateWorld(159,32,32);map.tick=12;map.nextId=100;
 const factions:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:3,nextSettlementId:1,factions:[{id:1,def:'PlayerColony',hidden:false,name:'Prepared player',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}},{id:2,def:'Pirate',hidden:false,name:'Prepared foreign',randomKey:2,colorFromSpectrum:.5,leaderOwnerId:null,lifecycle259:{revision:1,defeated:false,temporary:false}}],relations:[],settlements:[],leaders:[]};
 map.worldFactions=factions;const patient=startingPawn(17,'Prepared patient',4,5,0,55,map.seed,map.tick,259);patient.faction='outlaws';patient.state='downed';expect(bindBornHumanFaction259(map,patient,2)).toBe(true);map.pawns=[patient];
 if(captured){patient.prisoner=createPrisonerState(map,patient);commitCapturedGuest259(map,patient);}
 const g:PreparingGroup={id:3,startedAt:10,destination:0,phase:'leaving',admission:{revision:2},memberIds:[7,17],rendezvous:{x:4,z:5},meeting:[{pawnId:7,cell:{x:4,z:5}},{pawnId:17,cell:{x:5,z:5}}],manifest:[],cursor:0,exits:[{pawnId:7,cell:{x:0,z:5}},{pawnId:17,cell:{x:0,z:6}}],humanPreparation:{revision:1,releaseIds:[],passengers:[{pawnId:17,carrierId:7,phase:captured?'carry':'approach',captureOnPickup259:true}]},ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
 const action={ok:true},row:CampaignGroupSummary={id:3,originMapId:1,localMapId:1,phase:g.phase,originTile:5,tile:5,memberIds:[7,17],mass:null,filthPresent:false,context:{seed:159,width:32,height:32},entryActions:{visit:action,camp:action,settle:action},state:g,capturePatients259:captureGroupCapturePatients259(map,1,g)};
 const metadata:CampaignMapPresentation={revision:2,activeMapId:active?1:0,rootMapId:0,campaignSeed:159,mapSize:{width:32,height:32},maxSettlements:1,selectedGroupId:3,maps:[{id:1,tile:5,kind:'camp',createdAt:5,pawnCount:1,selected:active,actions:{view:action,settle:action,abandon:action},abandonConsequences:{pawns:[],groundItems:0,structures:0}}],groups:[row],groupLosses:[],lossContexts:[],lostMemories:[],incidents:[]};
 const view={...map,pawns:active?[patient]:[],group:g,campaignPeople:active?[]:[{id:17,name:patient.name,status:'away' as const}],campaignMap:metadata} as World;delete view.worldMaps;delete view.worldGroups;
 const brand=()=>{brandGroupProjection(view,{originMapId:1,localMapId:1,context:row.context,state:g},5);brandGroupCaptureProjection259(view,row,metadata);};
 return {map,patient,g,row,metadata,view,brand};
}
test('active captured patient compares all facts, keeps dossier original and uses only a private brand',()=>{
 const f=fixture(),dossier=f.patient.prisoner,before=JSON.stringify(f.patient);expect(validGroupCapturePatients259(f.row.capturePatients259,f.view,f.row,1)).toBe(true);expect(actualReform259(f.view)).toBe(false);f.brand();expect(actualReform259(f.view)).toBe(true);expect(projectedCapturePatient259(f.view,f.g,17)).toBe(true);expect(f.patient.prisoner).toBe(dossier);expect(JSON.stringify(f.patient)).toBe(before);
});
test('other displayed map carries only bounded human knowledge, pending and current capture',()=>{
 for(const captured of [false,true]){const f=fixture(false,captured);expect(f.view.pawns).toEqual([]);expect(validGroupCapturePatients259(f.row.capturePatients259,f.view,f.row,0)).toBe(true);f.brand();expect(projectedGroupReform259(f.view)).toBe(true);expect(projectedCapturePatient259(f.view,f.g,17)).toBe(true);expect(validGroupHumanPreparation257(f.g.humanPreparation,f.view,f.g,259,true)).toBe(true);expect(Object.keys(f.row.capturePatients259!.patients[0]!)).toEqual(['pawnId','state','affiliation','capturedAt','originQuestId','podRescue']);}
});
test('wrong map, future capture date, unknown faction and future schema refuse',()=>{
 const f=fixture(false),value=f.row.capturePatients259!;
 expect(validGroupCapturePatients259({...value,mapId:2},f.view,f.row,0)).toBe(false);
 const future=structuredClone(value);future.patients[0]!.capturedAt=13;expect(validGroupCapturePatients259(future,f.view,f.row,0)).toBe(false);
 const foreign=structuredClone(value);foreign.patients[0]!.affiliation.hostFactionId=99;expect(validGroupCapturePatients259(foreign,f.view,f.row,0)).toBe(false);
 expect(validGroupCapturePatients259(value,{...f.view,schemaVersion:258} as unknown as World,f.row,0)).toBe(false);
 f.brand();expect(validGroupHumanPreparation257(f.g.humanPreparation,f.view,f.g,258,true)).toBe(false);
});
test('mechanical ID and full actor payload cannot become an inactive human witness',()=>{
 const f=fixture(false),value=structuredClone(f.row.capturePatients259!);value.patients[0]!.pawnId=18;const row={...f.row,state:{...f.g,humanPreparation:{...f.g.humanPreparation!,passengers:[{...f.g.humanPreparation!.passengers[0]!,pawnId:18}]}}};
 expect(validGroupCapturePatients259(value,f.view,row,0)).toBe(false);
 const actor=structuredClone(f.row.capturePatients259!);Object.assign(actor.patients[0]!,{mechKind:'scyther'});expect(validGroupCapturePatients259(actor,f.view,f.row,0)).toBe(false);
});
test('changed active fact, duplicate patient, missing witness and stale group brand refuse',()=>{
 const f=fixture(),value=structuredClone(f.row.capturePatients259!);value.patients[0]!.capturedAt=11;expect(validGroupCapturePatients259(value,f.view,f.row,1)).toBe(false);
 const duplicate=structuredClone(f.row.capturePatients259!);duplicate.patients.push(duplicate.patients[0]!);expect(validGroupCapturePatients259(duplicate,f.view,f.row,1)).toBe(false);expect(validGroupCapturePatients259(undefined,f.view,f.row,1)).toBe(false);
 f.brand();f.view.group={...f.g};expect(projectedGroupReform259(f.view)).toBe(false);
});
test('settlement kind and RAW metadata without private group brand grant no reform authority',()=>{
 const f=fixture();brandGroupCaptureProjection259(f.view,f.row,f.metadata);expect(projectedGroupReform259(f.view)).toBe(false);f.metadata.maps[0]!.kind='settlement';f.brand();expect(projectedGroupReform259(f.view)).toBe(false);
});
