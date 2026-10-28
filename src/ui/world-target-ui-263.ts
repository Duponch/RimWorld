import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {worldTargetActions263} from '../sim/world-target-access-263';
import type {World} from '../sim/types';
import type {WorldSite263,WorldEntryTarget263} from '../sim/world-sites-state-263';
import type {PeaceTalksArrival293} from '../sim/peace-talks-state-293';

/** Confirmed scalar labels only. Hidden ambush variants, points, generation
 * inputs and held owner records never become a globe tooltip. */
export function worldSiteLabel263(site:WorldSite263,atCore:number):string {
 if(site.kind==='destroyed-settlement')return 'Établissement en ruines';
 if(site.kind==='peace-talks')return `Pourparlers · expire dans ${(Math.max(0,site.expiresAtCore-atCore)/60000).toLocaleString('fr-FR',{maximumFractionDigits:1})} j`;
 const remaining=site.expiresAtCore===null?null:Math.max(0,site.expiresAtCore-atCore);
 return `Réserve d’objets${remaining===null?'':` · expire dans ${(remaining/60000).toLocaleString('fr-FR',{maximumFractionDigits:1})} j`}`;
}
export interface WorldTargetChoice263 {key:string;label:string;target:WorldEntryTarget263|PeaceTalksArrival293;ok:boolean;reason?:string;confirmAttack:boolean}
/** The same product admission reads the real target; this view adds labels and
 * the neutral/friendly confirmation, never permissions or preview mutations. */
export function worldTargetChoices263(world:World,tile:number):WorldTargetChoice263[] {
 if(!isSchema263OrLater(Number(world.schemaVersion)))return [];
 const result:WorldTargetChoice263[]=[],registry=world.worldFactions;
 for(const settlement of registry?.settlements??[]){
  if(settlement.tile!==tile||settlement.factionId===registry!.playerFactionId)continue;
  const owner=registry!.factions.find(f=>f.id===settlement.factionId);if(!owner||owner.hidden)continue;
  const relation=registry!.relations.find(r=>r.aId===Math.min(settlement.factionId,registry!.playerFactionId)&&r.bId===Math.max(settlement.factionId,registry!.playerFactionId));
  const target:WorldEntryTarget263={kind:'attack-settlement',settlementId:settlement.id,factionId:settlement.factionId,confirmed:true},access=worldTargetActions263(world,target,tile);
  result.push({key:`attack:${settlement.id}`,label:`Attaquer ${settlement.name}`,target,ok:access.ok&&!!relation,reason:access.reason??(!relation?'La relation de faction est absente.':undefined),confirmAttack:relation?.kind!=='hostile'});
 }
 for(const site of world.worldSites263?.entries??[]){
  if(site.tile!==tile||site.kind==='item-stash'&&site.closed)continue;
  if(site.kind==='peace-talks'){
   if((Number(world.schemaVersion)!==293&&(Number(world.schemaVersion)!==294&&(Number(world.schemaVersion)!==295&&(Number(world.schemaVersion)!==296&&Number(world.schemaVersion)!==297))))||site.closed)continue;
   const available=world.tick*10<site.expiresAtCore,faction=world.worldFactions?.factions.find(f=>f.id===site.factionId);
   result.push({key:`peace:${site.id}`,label:`Participer aux pourparlers${faction?` · ${faction.name}`:''}`,target:{kind:'peace-talks',siteId:site.id},ok:available&&!!faction,...!available?{reason:'Le délai des pourparlers est écoulé.'}:!faction?{reason:'La faction destinataire est absente.'}:{},confirmAttack:false});continue;
  }
  const target:WorldEntryTarget263={kind:'visit-site',siteId:site.id},access=worldTargetActions263(world,target,tile);
  result.push({key:`site:${site.id}`,label:`Visiter · ${worldSiteLabel263(site,world.tick*10)}`,target,ok:access.ok,...access.reason?{reason:access.reason}:{},confirmAttack:false});
 }
 return result;
}

/** A small owned modal, matching existing map confirmation conventions. The
 * caller rechecks target/route/authority after acceptance, before sending. */
export function createWorldTargetConfirmation263(host:HTMLElement){
 const doc=host.ownerDocument;let dialog:HTMLDialogElement|undefined,resolve:((accepted:boolean)=>void)|undefined;
 function close(accepted=false){const finish=resolve;resolve=undefined;if(dialog){dialog.close();dialog.remove();dialog=undefined;}finish?.(accepted);}
 return {
  close,
  ask(label:string):Promise<boolean>{
   close();const previous=doc.activeElement,panel=doc.createElement('dialog'),heading=doc.createElement('h3'),body=doc.createElement('p'),cancel=doc.createElement('button'),accept=doc.createElement('button');dialog=panel;
   panel.className='map-registry-confirmation';panel.setAttribute('aria-label','Confirmer l’attaque de cet établissement');heading.textContent=label;body.textContent='Cet établissement appartient à une faction neutre ou amie. Confirmer l’attaque et les conséquences sur votre relation ?';cancel.type=accept.type='button';cancel.textContent='Annuler';accept.textContent='Confirmer l’attaque';
   const finish=(accepted:boolean)=>{close(accepted);if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);panel.addEventListener('cancel',event=>{event.preventDefault();finish(false);});panel.addEventListener('keydown',event=>event.stopPropagation());panel.append(heading,body,cancel,accept);host.append(panel);
   const pending=new Promise<boolean>(done=>{resolve=done;});panel.showModal();cancel.focus();return pending;
  },
 };
}
