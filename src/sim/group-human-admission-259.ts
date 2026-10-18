import {projectedGroupReform259} from './group-human-projection-259.ts';
import type {Pawn,World} from './types.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {validWorldAffiliationForeignKeys259} from './world-affiliation-259.ts';
/** Only actual temporary-map reforming has Core autoCapture authority. */
export function actualReform259(w:World):boolean {const root=registeredCampaign(w),id=registeredMapId(w);return (Number(w.schemaVersion)===259||Number(w.schemaVersion)===260||w.schemaVersion===261)&&(root.worldMaps?id!==undefined&&root.worldMaps.sites.some(s=>s.id===id&&(s.kind==='camp'||s.kind==='legacy-site'||w.schemaVersion===261&&s.kind==='battlefield')):projectedGroupReform259(w));}
export function prospectiveHuman259(w:World):boolean {const root=registeredCampaign(w);return (Number(w.schemaVersion)===259||Number(w.schemaVersion)===260||w.schemaVersion===261)&&root.planet?.revision===3&&!!root.worldPawns&&!!root.worldFactions&&registeredMapId(w)!==undefined&&(!w.group||w.group.admission?.revision===2);}
export function hostedCaptive259(w:World,p:Pawn):boolean {const a=p.worldAffiliation259,f=registeredCampaign(w).worldFactions;return !!a&&!!f&&a.guestStatus==='Prisoner'&&a.hostFactionId===f.playerFactionId&&!!p.prisoner&&validWorldAffiliationForeignKeys259(p,f);}
export function autoCapturePatient259(w:World,p:Pawn):boolean {const a=p.worldAffiliation259,f=registeredCampaign(w).worldFactions;return prospectiveHuman259(w)&&actualReform259(w)&&p.state==='downed'&&!!a&&!!f&&a.factionId!==f.playerFactionId&&!hostedCaptive259(w,p)&&validWorldAffiliationForeignKeys259(p,f)&&p.originQuestId===undefined&&!p.podRescue;}
/** Real retained dossier/security. Reform may include nonsecure captives;
 * unsupported live combat/mental edges still have the shared named refusal. */
export function captiveAdmission259(w:World,p:Pawn):boolean {return prospectiveHuman259(w)&&hostedCaptive259(w,p)&&p.originQuestId===undefined&&!p.podRescue&&(actualReform259(w)||p.prisoner!.releasedAt===undefined&&p.prisoner!.mode!=='release'&&!p.prisoner!.escape&&!p.prisoner!.breakout?.active);}

export function newGroupAdmissionRevision259(w:World):1|2 {return prospectiveHuman259(w)?2:1;}
