import type { Command,World } from '../sim/types';
import { TICKS_PER_DAY } from '../sim/types';
import { traitSummary } from './traits-inspection';
import { startingSkills } from '../sim/skills';

/** Existing right-hand alerts host the letter; modal content uses textContent
 * even for names restored from a save. No simulation writes in presentation. */
export function createArrivalUI(send:(command:Command)=>Promise<unknown>):{update:(world:World)=>void} {
  const dialog=document.createElement('dialog');dialog.id='arrival-dialog';dialog.className='help-dialog';
  const title=document.createElement('h2'),body=document.createElement('p'),remaining=document.createElement('p'),error=document.createElement('p');error.setAttribute('role','alert');
  const accept=document.createElement('button'),reject=document.createElement('button'),postpone=document.createElement('button');
  accept.id='accept-arrival';reject.id='reject-arrival';postpone.id='postpone-arrival';
  accept.textContent='Accueillir';reject.textContent='Refuser';postpone.textContent='Décider plus tard';
  dialog.append(title,body,remaining,error,accept,reject,postpone);document.body.append(dialog);
  const letter=document.createElement('button');letter.id='arrival-letter';letter.className='arrival-letter';
  const enable=document.getElementById('enable-arrivals') as HTMLButtonElement;
  let current:World|undefined,shown:number|undefined,busy=false,enabling=false;
  postpone.onclick=()=>dialog.close();letter.onclick=()=>{shown=current?.arrivals?.pending?.id;if(shown!==undefined){error.textContent='';dialog.showModal();}};
  const answer=async(yes:boolean)=>{if(shown===undefined||busy)return;busy=true;accept.disabled=reject.disabled=true;error.textContent='';try{await send({type:'answer-arrival',offerId:shown,accept:yes});dialog.close();}catch(e){error.textContent=e instanceof Error?e.message:String(e);}finally{busy=false;accept.disabled=reject.disabled=false;}};
  accept.onclick=()=>void answer(true);reject.onclick=()=>void answer(false);
  enable.onclick=()=>{if(enabling)return;enabling=true;enable.disabled=true;void send({type:'enable-arrivals'}).catch(e=>{enable.title=e instanceof Error?e.message:String(e);}).finally(()=>{enabling=false;enable.disabled=false;});};
  return {update(world){
    current=world;enable.hidden=!!world.gameProfile||!!world.arrivals;enable.disabled=enabling;
    const offer=world.arrivals?.pending;
    if(!offer){letter.remove();if(dialog.open)dialog.close();return;}
    if(dialog.open&&shown!==offer.id)dialog.close();
    letter.textContent=`${offer.name} · demande d’accueil`;
    // Keep the interactive node attached across status refreshes (keyboard focus).
    const alerts=document.getElementById('alerts')!;if(letter.parentElement!==alerts)alerts.prepend(letter);
    title.textContent=`${offer.name} souhaite rejoindre la colonie`;
    const skills=startingSkills(offer.profile),labels={construction:'Construction',medicine:'Médecine',shooting:'Tir',melee:'Mêlée'};
    const best=(Object.keys(labels) as (keyof typeof labels)[]).sort((a,b)=>skills[b].level-skills[a].level)[0]!;
    body.textContent=`Ce voyageur cherche un nouveau foyer. Meilleure compétence : ${labels[best]} ${skills[best].level}. Traits : ${traitSummary(offer)}. En l’accueillant, prévoyez sa nourriture, son couchage et son travail. Un refus attristera les colons pendant six jours.`;
    remaining.textContent=`Temps restant : ${Math.ceil((offer.expiresAt-world.tick)*24/TICKS_PER_DAY)} h. Vous pouvez différer votre réponse ; sans réponse, la demande expire.`;
  }};
}
