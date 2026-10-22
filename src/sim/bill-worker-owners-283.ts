import type {CookingBill} from './cooking-types.ts';
import type {BillWorkerOption283,BillWorkerOptions283} from './bill-worker-state-283.ts';
import {productionRecipeSkill283} from './bill-worker-rules-283.ts';
import {billWork,stationRecipe} from './production-recipes.ts';
import {backgroundWorkRefusal} from './colonist-backgrounds.ts';
import {effectiveSkillLevel,workPriority} from './work-types.ts';
import {actualPlayerOwner259} from './world-affiliation-259.ts';
import {isColonist} from './affiliation.ts';
import {captureHumanOwners,everyHumanPawnOwner} from './human-owners.ts';
import {campaignAuthority,secondaryValidationContext} from './secondary-site-context.ts';
import {hasLoadedRoot,registeredMapForValidation} from './world-map-context.ts';
import {isSchema283OrLater} from './schema-compatibility-257.ts';
import type {Pawn,Structure,World} from './types.ts';

/** Read-only original map views. No runtime cache, step or spatial union. */
function actualMaps(w:World):World[] {
 const root=campaignAuthority(w);
 if(root.worldMaps)return root.worldMaps.sites.flatMap(s=>{const map=registeredMapForValidation(root,s.id);return map?[map]:[];});
 const other=secondaryValidationContext(root);return [...hasLoadedRoot(root)?[root]:[],...other?[other]:[]];
}
const freeColonist=(w:World,p:Pawn):boolean=>isColonist(p)&&!p.prisoner&&!p.visitor&&!p.raid&&!p.podRescue&&p.state!=='dead'&&!p.health?.death
 &&(!w.worldFactions||actualPlayerOwner259(p,w.worldFactions.playerFactionId));

/** One namespace capture per request, never per bill/pawn planner visit. */
export function queryBillWorkerOptions283(w:World,structureId:number,billId:number):BillWorkerOptions283|undefined {
 if(!isSchema283OrLater(w.schemaVersion))return;
 const station=w.structures.find(s=>s.id===structureId&&stationRecipe(s)!==null),bill=station?.bills?.find(b=>b.id===billId);
 if(!bill)return;
 const skill=productionRecipeSkill283(bill.recipe),work=billWork(bill),people=captureHumanOwners(w).people,candidates:BillWorkerOption283[]=[];
 const seen=new Set<number>();
 for(const map of actualMaps(w))everyHumanPawnOwner(map,(p,kind)=>{
  if(!['map','starting-pod','ancient-casket','player-casket','ship-casket'].includes(kind)||seen.has(p.id)||!freeColonist(map,p))return true;
  seen.add(p.id);
  const refusal=backgroundWorkRefusal(p,work),level=skill===null?null:Math.max(0,Math.min(20,effectiveSkillLevel(p,skill,p.skills[skill]?.level??0)));
  const place=kind==='starting-pod'?'capsule initiale':kind==='map'?'sur carte':'en cryptosommeil';
  const description=[place,refusal??(workPriority(p,work)===0?'métier désactivé dans les priorités':'métier activé')].join(' · ');
  candidates.push({pawnId:p.id,name:p.name,level,description,enabled:!refusal});return true;
 });
 candidates.sort((a,b)=>Number(b.enabled)-Number(a.enabled)||(b.level??-1)-(a.level??-1)||a.name.localeCompare(b.name,'fr')||a.pawnId-b.pawnId);
 const id=bill.worker?.pawnId,selected=id==null?undefined:candidates.find(c=>c.pawnId===id);
 const person=id==null?undefined:people.get(id);
 const retained=selected??(person?{pawnId:person.id,name:person.name,level:null,description:person.status==='dead'?'décédé':person.status==='away'?'hors carte ou contenu':'parti',enabled:false}:undefined);
 return {structureId,billId,skill,candidates,...retained?{selected:{...retained}}:{}};
}

/** Actual GlobalBills holders only. Frozen departures/terminal losses and
 * abandoned archives are historical records, not live bill stacks to rewrite. */
function globalBills(w:World):CookingBill[] {
 const root=campaignAuthority(w),seenBuildings=new Set<Structure>(),bills:CookingBill[]=[];
 const building=(s:Structure)=>{if(seenBuildings.has(s))return;seenBuildings.add(s);bills.push(...s.bills??[]);
  for(const pack of s.cryptosleep?.packed??[])building(pack.building);
  for(const pack of s.shipCryptosleep277?.packed??[])building(pack.building);
 };
 for(const map of actualMaps(w)){for(const s of map.structures)building(s);for(const p of map.packed)building(p.building);}
 // The current context may already own a just-transferred/reinstalled original
 // before its end-of-command flush. Identity dedup keeps the same stack once.
 for(const s of w.structures??[])building(s);for(const p of w.packed??[])building(p.building);
 for(const r of root.worldGroups?.groups??[])if('members'in r.state)for(const p of r.state.packed??[])building(p.building);
 if(w.group&&'members'in w.group)for(const p of w.group.packed??[])building(p.building);
 return bills;
}
function announce(w:World,name:string,count:number):void {
 if(!count)return;const root=campaignAuthority(w),events=root.worldGroups?.events??w.events;
 events.push({tick:w.tick,type:'need',message:`${name} n’est plus disponible : ${count} facture${count>1?'s':''} accepte${count>1?'nt':''} désormais quiconque ; la plage de compétence est conservée.`});
 if(events.length>80)events.splice(0,events.length-80);
}
/** Caller owns a committed death/faction-loss/kidnap event. No polling and no
 * changes to engaged work, queued orders, clocks, humans or other settings. */
export function notifyBillWorkerUnavailable283(w:World,pawnId:number):void {
 if(!isSchema283OrLater(w.schemaVersion))return;
 const affected=globalBills(w).filter(b=>b.worker?.pawnId===pawnId);if(!affected.length)return;
 const root=campaignAuthority(w),retained=root.worldPawns?.owners.find(r=>r.kind==='human'&&r.actor.id===pawnId),name=w.pawns?.find(p=>p.id===pawnId)?.name
  ??(retained?.kind==='human'?retained.actor.name:undefined)
  ??(w.group&&'members'in w.group?w.group.members.find(p=>p.id===pawnId)?.name:undefined)
  ??w.groupLosses?.find(l=>l.pawn.id===pawnId)?.pawn.name??'La personne choisie';
 for(const b of affected)b.worker={...b.worker!,pawnId:null};
 announce(w,name,affected.length);
}
/** SpawnSetup equivalent for this one original stack, never a RAW repair. */
export function normalizeBillWorkersAtInstall283(w:World,building:Structure):void {
 if(!isSchema283OrLater(w.schemaVersion)||!building.bills?.some(b=>b.worker?.pawnId!=null))return;
 const owners=captureHumanOwners(w),root=campaignAuthority(w),changed=new Map<number,{name:string;count:number}>();
 for(const bill of building.bills){const id=bill.worker?.pawnId;if(id==null)continue;
  const person=owners.people.get(id),slot=owners.byId.get(id);
  // Temporary absence and suspension are not unavailability. Knowledge alone
  // never becomes a fabricated Pawn; actual faction/captivity owners decide.
  const worldPawn=root.worldPawns?.owners.find(r=>r.kind==='human'&&r.actor.id===id);
  const pawn=slot?.pawn??(worldPawn?.kind==='human'?worldPawn.actor:undefined);
  const foreign=!!pawn&&(!isColonist(pawn)||!!root.worldFactions&&pawn.worldAffiliation259!==undefined&&pawn.worldAffiliation259.factionId!==root.worldFactions.playerFactionId);
  if(person&&person.status!=='dead'&&!foreign&&!worldPawn?.captivity261)continue;
  bill.worker={...bill.worker!,pawnId:null};const prior=changed.get(id);changed.set(id,{name:person?.name??'La personne choisie',count:(prior?.count??0)+1});
 }
 for(const row of changed.values())announce(w,row.name,row.count);
}
