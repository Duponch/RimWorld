import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {registeredCampaign} from './world-map-context.ts';
import {peaceDiplomat293,draftPeaceSocialXp293,peaceOutcome293,peaceGoodwillRequest293} from './peace-talks-rules-293.ts';
import {worldGoodwillChange274,worldNaturalGoodwill274,validWorldRelationKind274} from './world-diplomacy-274.ts';
import {draftPeaceDisaster293} from './peace-talks-disaster-293.ts';
import {draftPeaceTriumph293} from './peace-talks-rewards-293.ts';
import {healthRandom} from './health.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {openGroupReorganization,withGroupExchange} from './group-reorganization-balance.ts';
import {removalWritesMutable259,sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
import type {CampaignState} from './world-map-state.ts';
import type {PeaceTalksOutcome293,PeaceTalksSite293,PeaceTalksResult293} from './peace-talks-state-293.ts';
import type {Pawn,CommandResult} from './types.ts';

const fail=(reason:string)=>({ok:false as const,reason});
const siteAt=(root:CampaignState,id:number):PeaceTalksSite293|undefined=>root.worldSites263?.entries.find((s):s is PeaceTalksSite293=>s.kind==='peace-talks'&&s.id===id);
/** Pure target reader: birth-only hostility/leader gates are not reapplied. */
export function peaceTalksArrivalReason293(input:CampaignState,groupId:number,siteId:number,tile:number):string|undefined {
 const root=registeredCampaign(input),site=siteAt(root,siteId),record=root.worldGroups?.groups.find(r=>r.state.id===groupId),g=record?.state;
 if((Number(root.schemaVersion)!==293&&(Number(root.schemaVersion)!==294&&(Number(root.schemaVersion)!==295&&(Number(root.schemaVersion)!==296&&!isCorePhysicalSchema297(Number(root.schemaVersion))))))||!root.worldSites263||!root.worldGroups||!root.worldFactions)return 'Les pourparlers exigent leur vraie campagne actuelle.';
 if(!site||site.closed||site.tile!==tile||root.tick*10>=site.expiresAtCore)return 'Ce lieu de pourparlers est absent, résolu ou expiré.';
 if(!record||record.localMapId!==null||!g||!('members'in g)||!record.encounters261||record.pending261||record.pendingEntry263)return 'Choisissez une caravane hors carte disponible.';
 if(!root.worldFactions.factions.some(f=>f.id===site.factionId))return 'La faction de ce lieu est absente.';
}
export type PreparedPeaceResolution293={ok:false;reason:string}|{ok:true;outcome:PeaceTalksOutcome293;current():boolean;commit():CommandResult};
/** One sealed write set publishes terminal, relation, direct XP and physical
 * owners together. Drafts never allocate IDs or consume the source RNG. */
export function preparePeaceTalksResolution293(input:CampaignState,groupId:number,siteId:number):PreparedPeaceResolution293 {
 try{
  const root=registeredCampaign(input),site=siteAt(root,siteId);if(!site)return fail('Le lieu de pourparlers est absent.');
  const reason=peaceTalksArrivalReason293(root,groupId,siteId,site.tile);if(reason)return fail(reason);
  const groups=root.worldGroups!,sites=root.worldSites263!,factions=root.worldFactions!,record=groups.groups.find(r=>r.state.id===groupId)!,g=record.state;
  if(!('members'in g)||g.segment||g.tile!==site.tile||g.destination!==site.tile||!['at-site','awaiting-entry','stationary'].includes(g.phase)||g.lastPersonalTick!==root.tick)return fail('La caravane doit avoir réellement terminé son arrivée.');
  if(groups.groups.some(r=>r.pending261||r.pendingEntry263))return fail('Une rencontre ou une entrée réelle attend déjà sa résolution.');
  if(![record,site,factions,groups.events].every(plainWorldPawnData256))return fail('Un propriétaire de la résolution contient des données invalides.');
  const chosen=peaceDiplomat293(g.members);if(!chosen)return fail('Aucun diplomate admissible dans cette caravane.');
  const faction=factions.factions.find(f=>f.id===site.factionId)!,a=Math.min(site.factionId,factions.playerFactionId),b=Math.max(site.factionId,factions.playerFactionId),pairs=factions.relations.filter(r=>r.aId===a&&r.bId===b),relation=pairs[0];
  const natural=worldNaturalGoodwill274(faction);if(pairs.length!==1||!relation||!validWorldRelationKind274(relation.goodwill,relation.kind,293)||natural===undefined)return fail('La véritable relation de faction est invalide.');
  const tick=root.tick,nextId=root.nextId,rng=root.rng,random={rng},draw=()=>healthRandom(random),outcome=peaceOutcome293(chosen.ability,draw());
  const requested=peaceGoodwillRequest293(outcome,outcome==='flounder'?0:draw(),relation.goodwill,relation.kind),change=worldGoodwillChange274(relation.goodwill,relation.kind,natural,requested);
  if(!change||outcome==='disaster'&&change.kindAfter!=='hostile')return fail('Le changement diplomatique ne peut pas être conservé.');
  const xp=draftPeaceSocialXp293(chosen.pawn),writes:MapRemovalWrite259[]=[],put=(object:object,key:string,value:unknown)=>writes.push({object,key,present:true,value});
  const result:PeaceTalksResult293={groupId,negotiatorId:chosen.pawn.id,outcome,negotiationAbility:chosen.ability,
   goodwill:{before:relation.goodwill,kindBefore:relation.kind,requested,adjusted:change.adjustedGain,after:change.goodwillAfter,kindAfter:change.kindAfter},socialXp:{direct:true,requested:6000,credited:xp.credited}};
  let allocated=nextId;
  if(outcome==='disaster'){
   const attack=draftPeaceDisaster293({root,groupId,siteId,factionId:site.factionId,atCore:tick*10,rng:random.rng,nextId});if(!attack.ok)return attack;
   allocated=attack.nextId;random.rng=attack.rng;result.attack={phase:'pending',groupId,points:attack.points,enemyIds:attack.enemyIds};
   put(record,'pending261',attack.pending);put(groups,'selectedGroupId',groupId);
  }else if(outcome==='triumph'){
   const reward=draftPeaceTriumph293({group:g,factionDef:faction.def,tile:site.tile,tick,version:293,rng:random.rng,nextId});if(!reward.ok)return reward;
   allocated=reward.nextId;random.rng=reward.rng;
   const history=withGroupExchange(g.reorganization??openGroupReorganization(g,groups.losses,tick,g.members.map(p=>({pawnId:p.id,originMapId:record.originMapId,context:record.context}))),'received',reward.items);
   put(g,'items',[...g.items,...reward.items]);put(g,'reorganization',history);
   result.reward={budget:reward.budget,marketValue:reward.marketValue,massGrams:reward.massGrams,delivered:reward.delivered};
  }
  // Existing raid controllers keep their mandate/category until their actual
  // combat transition. World peace does not yet stop those provisional Lords.
  const actors=relation.kind!==change.kindAfter?captureActorBeds256(root).actors.filter((p):p is Pawn=>!('species'in p)&&p.worldAffiliation259?.factionId===site.factionId&&!p.prisoner&&!p.raid):[];
  for(const p of actors)if(p.faction!==(change.kindAfter==='hostile'?'outlaws':'outlanders'))put(p,'faction',change.kindAfter==='hostile'?'outlaws':'outlanders');
  put(relation,'goodwill',change.goodwillAfter);put(relation,'kind',change.kindAfter);if(xp.credited>0)put(chosen.pawn.skills,'social',xp.skill);
  put(site,'closed',{atCore:tick*10,reason:'resolved',result});put(root,'nextId',allocated);put(root,'rng',random.rng);
  const labels:Record<PeaceTalksOutcome293,string>={disaster:'désastre : attaque de la caravane en préparation',backfire:'échec diplomatique',flounder:'discussion sans progrès',success:'succès diplomatique',triumph:'triomphe et cadeaux physiques'};
  put(groups,'events',[...groups.events,{tick,type:'command' as const,message:`Pourparlers : ${labels[outcome]}. Relations ${relation.goodwill} → ${change.goodwillAfter} ; ${xp.credited.toLocaleString('fr-FR')} XP Social acquises.`}].slice(-80));
  const entries=sites.entries,records=groups.groups,factionRows=factions.factions,relations=factions.relations;
  const seal=sealRemovalOriginal259({record,site,faction,relation,actors,events:groups.events},writes,[]);let used=false;
  const current=()=>!used&&(Number(root.schemaVersion)===293||(Number(root.schemaVersion)===294||(Number(root.schemaVersion)===295||(Number(root.schemaVersion)===296||isCorePhysicalSchema297(Number(root.schemaVersion))))))&&root.tick===tick&&root.nextId===nextId&&root.rng===rng&&root.worldSites263===sites&&sites.entries===entries&&entries.includes(site)&&root.worldGroups===groups&&groups.groups===records&&records.includes(record)&&record.state===g&&root.worldFactions===factions&&factions.factions===factionRows&&factionRows.includes(faction)&&factions.relations===relations&&relations.includes(relation)&&removalWritesMutable259(writes)&&seal(0);
  if(!current())return fail('Un destinataire des pourparlers n’est pas modifiable.');
  return {ok:true,outcome,current,commit(){if(!current())return {ok:false,code:'invalid-command',reason:'Les propriétaires des pourparlers ont changé.'};used=true;for(const w of writes)if(!Reflect.set(w.object,w.key,w.value))throw Error('Admitted PeaceTalks write failed');return {ok:true};}};
 }catch{return fail('La résolution ne peut pas être préparée sans modifier les originaux.');}
}
/** True campaign SIM only; expiry preserves terminal tag/history. */
export function expirePeaceTalks293(input:CampaignState):void {
 const root=registeredCampaign(input);if((Number(root.schemaVersion)!==293&&(Number(root.schemaVersion)!==294&&(Number(root.schemaVersion)!==295&&(Number(root.schemaVersion)!==296&&!isCorePhysicalSchema297(Number(root.schemaVersion))))))||!root.worldSites263)return;
 const due=root.worldSites263.entries.filter((s):s is PeaceTalksSite293=>s.kind==='peace-talks'&&!s.closed&&root.tick*10>=s.expiresAtCore),writes:MapRemovalWrite259[]=due.map(s=>({object:s,key:'closed',present:true,value:{atCore:root.tick*10,reason:'expired'}}));
 if(!removalWritesMutable259(writes))throw Error('PeaceTalks expiry recipients are not mutable');
 for(const w of writes)if(!Reflect.set(w.object,w.key,w.value))throw Error('Admitted PeaceTalks expiry failed');
}
