import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import type {Pawn,World} from './types.ts';
import type {PreparingGroup} from './group-capture.ts';
import type {CampaignGroupSummary,CampaignMapPresentation,CampaignSummary,WorldMapKind} from './world-map-state.ts';
import type {WorldAffiliation259} from './world-affiliation-259.ts';
import {validWorldAffiliation259} from './world-affiliation-259.ts';
import {boundWorldGroup} from './world-map-context.ts';

/** Transport knowledge about only the humans that this formation must capture.
 * No Pawn, possessions, clinical record, dossier or command authority is held. */
export interface GroupCapturePatients259 {mapId:number;patients:{pawnId:number;state:Pawn['state'];affiliation:WorldAffiliation259;capturedAt:number|null;originQuestId:number|null;podRescue:boolean}[]}
type Authority259=Pick<World,'schemaVersion'|'tick'|'nextId'>&Partial<Pick<World,'worldFactions'|'pawns'|'campaignPeople'>>;
type Patient259=GroupCapturePatients259['patients'][number];
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const exact=(v:Record<string,unknown>,keys:string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown):v is unknown[]=>Array.isArray(v)&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>!!d&&d.enumerable&&Object.hasOwn(d,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const captureRows=(g:CampaignGroupSummary['state'])=>'manifest'in g&&Array.isArray(g.humanPreparation?.passengers)?g.humanPreparation.passengers.filter(r=>!!r&&r.captureOnPickup259):[];
function facts(p:Pawn):Patient259 {if(!p.worldAffiliation259)throw Error('Actual capture patient has no faction instance');return {pawnId:p.id,state:p.state,affiliation:{...p.worldAffiliation259},capturedAt:p.prisoner?.capturedAt??null,originQuestId:p.originQuestId??null,podRescue:!!p.podRescue};}
const same=(a:Patient259,b:Patient259)=>a.pawnId===b.pawnId&&a.state===b.state&&a.capturedAt===b.capturedAt&&a.originQuestId===b.originQuestId&&a.podRescue===b.podRescue&&a.affiliation.revision===b.affiliation.revision&&a.affiliation.factionId===b.affiliation.factionId&&a.affiliation.hostFactionId===b.affiliation.hostFactionId&&a.affiliation.guestStatus===b.affiliation.guestStatus;
/** Called from the real map registry, before any presentation omits its roster. */
export function captureGroupCapturePatients259(map:World|undefined,mapId:number|null,g:CampaignGroupSummary['state']):GroupCapturePatients259|undefined {
 const rows=captureRows(g);if(!rows.length)return;
 if(!map||(Number(map.schemaVersion)!==259&&Number(map.schemaVersion)!==260&&(Number(map.schemaVersion)!==261&&(Number(map.schemaVersion)!==262&&!isSchema263OrLater(Number(map.schemaVersion)))))||mapId===null)throw Error('Capture preparation has no actual map owner');
 return {mapId,patients:rows.map(row=>{const p=map.pawns.find(p=>p.id===row.pawnId);if(!p)throw Error('Capture preparation lost its actual human');return facts(p);})};
}
/** Exact transport shape plus phase/faction facts. The active map also compares
 * every fact with the actual local person; inactive rows remain knowledge only. */
export function validGroupCapturePatients259(value:unknown,w:Authority259,row:Pick<CampaignGroupSummary,'id'|'localMapId'|'state'>,activeMapId:number|null):value is GroupCapturePatients259|undefined {
 const rows=captureRows(row.state);
 if(!rows.length)return value===undefined;
 if((Number(w.schemaVersion)!==259&&Number(w.schemaVersion)!==260&&(Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion)))))||row.state.admission?.revision!==2||row.localMapId===null||!record(value)||!exact(value,['mapId','patients'])||value.mapId!==row.localMapId||!dense(value.patients)||value.patients.length!==rows.length||!w.worldFactions||!Array.isArray(w.worldFactions.factions))return false;
 const f=w.worldFactions,ids=new Set<number>();
 for(const raw of value.patients){
  if(!record(raw)||!exact(raw,['pawnId','state','affiliation','capturedAt','originQuestId','podRescue'])||!int(raw.pawnId,1,w.nextId-1)||ids.has(raw.pawnId)||!validWorldAffiliation259(raw.affiliation)||raw.originQuestId!==null||raw.podRescue!==false)return false;
  const line=rows.find(r=>r.pawnId===raw.pawnId),a=raw.affiliation;
  if(!line||![a.factionId,a.hostFactionId].every(id=>id===null||f.factions.some(faction=>faction.id===id))||a.factionId===f.playerFactionId||!['idle','moving','working','sleeping','hungry','eating','recreating','resting','downed'].includes(String(raw.state)))return false;
  if(line.phase==='approach'){
   if(raw.state!=='downed'||a.guestStatus==='Prisoner'&&a.hostFactionId===f.playerFactionId||(a.guestStatus==='Guest'?raw.capturedAt!==null:!int(raw.capturedAt,0,w.tick)))return false;
  }else if(a.guestStatus!=='Prisoner'||a.hostFactionId!==f.playerFactionId||!int(raw.capturedAt,row.state.startedAt,w.tick))return false;
  if(row.localMapId===activeMapId){const p=Array.isArray(w.pawns)?w.pawns.find(p=>p.id===raw.pawnId):undefined;if(!p||!validWorldAffiliation259(p.worldAffiliation259)||!same(raw as unknown as Patient259,facts(p)))return false;}
  else if(!Array.isArray(w.campaignPeople)||!w.campaignPeople.some(p=>p.id===raw.pawnId&&p.status==='away'))return false;
  ids.add(raw.pawnId);
 }
 return true;
}

const projections=new WeakMap<World,{group:PreparingGroup;mapId:number;kind:WorldMapKind;patients:readonly Patient259[]}>();
/** Install only inside the metadata validator, after the existing group brand.
 * RAW fields alone never satisfy the runtime admission predicates. */
export function brandGroupCaptureProjection259(view:World,row:CampaignGroupSummary,metadata:CampaignMapPresentation|CampaignSummary):void {
 const bound=boundWorldGroup(view),map=metadata.maps.find(m=>m.id===row.localMapId);
 if((Number(view.schemaVersion)!==259&&Number(view.schemaVersion)!==260&&(Number(view.schemaVersion)!==261&&(Number(view.schemaVersion)!==262&&!isSchema263OrLater(Number(view.schemaVersion)))))||!bound||bound.state!==row.state||view.group!==row.state||row.localMapId===null||bound.localMapId!==row.localMapId||!map||!('manifest'in row.state)||!validGroupCapturePatients259(row.capturePatients259,view,row,metadata.activeMapId))return;
 projections.set(view,{group:row.state,mapId:row.localMapId,kind:map.kind,patients:row.capturePatients259?.patients??[]});
}
export function projectedGroupReform259(w:World):boolean {const proof=projections.get(w),bound=boundWorldGroup(w);return !!proof&&proof.group===w.group&&bound?.state===proof.group&&bound.localMapId===proof.mapId&&(proof.kind==='camp'||proof.kind==='legacy-site'||(Number(w.schemaVersion)===261||(Number(w.schemaVersion)===262||isSchema263OrLater(Number(w.schemaVersion))))&&proof.kind==='battlefield');}
export function projectedCapturePatient259(w:World,g:PreparingGroup,pawnId:number):boolean {const proof=projections.get(w);return !!proof&&proof.group===g&&projectedGroupReform259(w)&&proof.patients.some(p=>p.pawnId===pawnId);}
