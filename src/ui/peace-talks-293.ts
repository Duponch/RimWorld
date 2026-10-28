import type {World} from '../sim/types';
import type {PeaceTalksSite293,PeaceTalksOutcome293} from '../sim/peace-talks-state-293';
import {ITEM_DEFINITIONS} from '../sim/items';

export interface PeaceTalksPresentation293 {
 schemaVersion:number;tick:number;
 worldSites263?:World['worldSites263'];worldFactions?:World['worldFactions'];
}
const labels:Record<PeaceTalksOutcome293,string>={disaster:'Désastre',backfire:'Échec diplomatique',flounder:'Sans progrès',success:'Succès diplomatique',triumph:'Triomphe'};
const days=(core:number)=>`${Math.max(0,core/60000).toLocaleString('fr-FR',{maximumFractionDigits:1})} j`;
const signed=(n:number)=>`${n>0?'+':''}${n.toLocaleString('fr-FR',{maximumFractionDigits:3})}`;
const relations={hostile:'hostiles',neutral:'neutres',ally:'alliées'} as const;
/** Confirmed scalar facts only: no quote, roll, route or mutation on inspection. */
export function peaceTalksFacts293(world:PeaceTalksPresentation293,site:PeaceTalksSite293) {
 const faction=world.worldFactions?.factions.find(f=>f.id===site.factionId);
 const title=`Pourparlers avec ${faction?.name??'une faction étrangère'}`,destination=`Lieu : case ${site.tile}.`;
 if(!site.closed)return {title,destination,status:world.tick*10>=site.expiresAtCore?'Le délai est écoulé.':`À rejoindre sous ${days(site.expiresAtCore-world.tick*10)}.`,body:'Envoyez une caravane et choisissez « Participer aux pourparlers » comme action à l’arrivée. Son meilleur diplomate négociera sur place. Un désastre peut provoquer une attaque.',active:world.tick*10<site.expiresAtCore};
 if(site.closed.reason==='expired')return {title,destination,status:'Pourparlers expirés.',body:'Aucune négociation ni récompense acquise.',active:false};
 const r=site.closed.result,effect=`Relations ${relations[r.goodwill.kindAfter]} : ${signed(r.goodwill.after-r.goodwill.before)} (${r.goodwill.after}). Social : ${signed(r.socialXp.credited)} XP.`;
 const physical=r.reward?` Cadeaux remis à la caravane : ${r.reward.delivered.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}`).join(', ')} ; ${(r.reward.massGrams/1000).toLocaleString('fr-FR',{maximumFractionDigits:2})} kg.`:r.attack?` ${r.attack.phase==='pending'?'L’attaque annoncée doit être préparée ; elle reste engagée.':'L’attaque a commencé sur une carte locale. Le combat et ses victimes restent réels.'}`:'';
 return {title,destination,status:`Pourparlers résolus · ${labels[r.outcome]}.`,body:effect+physical,active:false};
}
/** Keyed nodes and changed text only. History is never a second Thing owner. */
export function createPeaceTalks293(host:HTMLElement) {
 const doc=host.ownerDocument??document,section=doc.createElement('section'),heading=doc.createElement('h3'),intro=doc.createElement('p'),empty=doc.createElement('p'),list=doc.createElement('div');
 section.dataset.peaceTalks='';heading.textContent='Pourparlers diplomatiques';intro.textContent='Une rencontre de faction se rejoint avec une vraie caravane. La clôture des pourparlers ne garantit ni un accord ni une victoire militaire.';empty.textContent='Aucun pourparler signalé.';section.append(heading,intro,empty,list);host.append(section);
 const rows=new Map<number,{element:HTMLElement;title:HTMLElement;destination:HTMLElement;status:HTMLElement;body:HTMLElement;letter:HTMLButtonElement}>();
 const put=(node:HTMLElement,value:string)=>{if(node.textContent!==value)node.textContent=value;};let current:PeaceTalksPresentation293|undefined;
 return {update(world:PeaceTalksPresentation293){
  current=world;section.hidden=(Number(world.schemaVersion)!==293&&(Number(world.schemaVersion)!==294&&(Number(world.schemaVersion)!==295&&(Number(world.schemaVersion)!==296&&Number(world.schemaVersion)!==297))));
  const sites=(Number(world.schemaVersion)===293||(Number(world.schemaVersion)===294||(Number(world.schemaVersion)===295||(Number(world.schemaVersion)===296||Number(world.schemaVersion)===297))))?world.worldSites263?.entries.filter((s):s is PeaceTalksSite293=>s.kind==='peace-talks')??[]:[],ids=new Set(sites.map(s=>s.id));
  for(const [id,row]of rows)if(!ids.has(id)){row.element.remove();row.letter.remove();rows.delete(id);}empty.hidden=sites.length>0;
  for(const site of sites){let row=rows.get(site.id);if(!row){
   const element=doc.createElement('article'),title=doc.createElement('h4'),destination=doc.createElement('p'),status=doc.createElement('p'),body=doc.createElement('p'),letter=doc.createElement('button');
   element.dataset.peaceTalksSite=String(site.id);element.tabIndex=-1;status.dataset.peaceTalksStatus='';body.dataset.peaceTalksResult='';element.append(title,destination,status,body);list.append(element);letter.type='button';letter.className='arrival-letter';letter.dataset.peaceTalksLetter=String(site.id);
   const id=site.id;letter.onclick=()=>{const latest=current?.worldSites263?.entries.find(s=>s.id===id);if(!current||latest?.kind!=='peace-talks'||!peaceTalksFacts293(current,latest).active)return;if(doc.getElementById('quests-panel')?.hidden)doc.querySelector<HTMLButtonElement>('[data-panel="quests"]')?.click();requestAnimationFrame(()=>rows.get(id)?.element.focus());};
   row={element,title,destination,status,body,letter};rows.set(site.id,row);
  }
   const facts=peaceTalksFacts293(world,site);put(row.title,facts.title);put(row.destination,facts.destination);put(row.status,facts.status);put(row.body,facts.body);
   if(facts.active){put(row.letter,facts.title);const alerts=doc.getElementById('alerts');if(alerts&&row.letter.parentElement!==alerts)alerts.prepend(row.letter);}else row.letter.remove();
  }
 }};
}
