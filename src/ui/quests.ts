import { startingSkills } from '../sim/skills';
import { TICKS_PER_DAY,type Command,type World } from '../sim/types';
import type { JoinerQuest } from '../sim/quest-state';

const duration=(ticks:number,elapsed=false):string=>{
  const exact=Math.max(0,ticks)*1440/TICKS_PER_DAY;
  const minutes=elapsed?Math.floor(exact):Math.ceil(exact);
  if(minutes<60)return `${minutes} min`;
  const hours=Math.floor(minutes/60),remaining=minutes%60;
  return `${hours} h${remaining?` ${remaining} min`:''}`;
};
const ago=(ticks:number):string=>ticks<=0||duration(ticks,true)==='0 min'?'à l’instant':`il y a ${duration(ticks,true)}`;
const latest=(entries:readonly JoinerQuest[]):JoinerQuest|undefined=>entries.at(-1);

/** One persistent set of controls: tick-by-tick snapshot updates never replace
 * the focused button. Names from saves are written only through textContent. */
export function createQuestUI(send:(command:Command)=>Promise<unknown>):{update:(world:World)=>void} {
  const root=document.getElementById('quests-content');
  if(!root)throw new Error('Panneau Quêtes absent.');
  const heading=document.createElement('h3');heading.textContent='Asile et poursuite';heading.tabIndex=-1;
  const intro=document.createElement('p');intro.textContent='Si vous accueillez une personne poursuivie, préparez sa nourriture, un couchage et la défense du foyer avant l’arrivée du bandit annoncé.';
  const enable=document.createElement('button');enable.id='enable-quests';enable.type='button';enable.textContent='Recevoir des demandes d’asile';
  const status=document.createElement('p');status.id='quest-status';status.setAttribute('role','status');
  const details=document.createElement('p');details.id='quest-details';
  const timing=document.createElement('p');timing.id='quest-timing';
  const accept=document.createElement('button');accept.id='accept-quest';accept.type='button';accept.textContent='Accueillir et accepter la poursuite';
  const refuse=document.createElement('button');refuse.id='refuse-quest';refuse.type='button';refuse.textContent='Refuser sans pénalité';
  const response=document.createElement('div');response.className='quest-response';response.append(accept,refuse);
  const feedback=document.createElement('p');feedback.id='quest-feedback';feedback.setAttribute('role','alert');
  const historyHeading=document.createElement('h3');historyHeading.textContent='Dossiers précédents';
  const history=document.createElement('ol');history.id='quest-history';
  root.replaceChildren(heading,intro,enable,status,details,timing,response,feedback,historyHeading,history);
  const letter=document.createElement('button');letter.id='quest-letter';letter.className='arrival-letter';letter.type='button';
  letter.onclick=()=>{if(document.getElementById('quests-panel')?.hidden)document.querySelector<HTMLButtonElement>('[data-panel="quests"]')?.click();requestAnimationFrame(()=>heading.focus());};
  let current:World|undefined,busy=false,shownId:number|undefined;
  const historyNodes=new Map<number,HTMLLIElement>();let historySignature='__initial__';
  const updateHistory=(entries:readonly JoinerQuest[],tick:number):void=>{
    const terminal=entries.filter(q=>q.status==='refused'||q.status==='expired'||q.status==='concluded');
    const signature=terminal.map(q=>`${q.id}:${q.name}:${q.status}:${ago(tick-(q.endedAt??q.offeredAt))}`).join('|');
    if(signature===historySignature)return;
    historySignature=signature;historyHeading.hidden=history.hidden=!terminal.length;
    const ids=new Set(terminal.map(q=>q.id));for(const id of historyNodes.keys())if(!ids.has(id))historyNodes.delete(id);
    const rows=terminal.map(q=>{let row=historyNodes.get(q.id);if(!row){row=document.createElement('li');historyNodes.set(q.id,row);}
      const outcome=q.status==='concluded'?'conclue (issue neutre)':q.status==='refused'?'refusée sans pénalité':'expirée sans pénalité';
      row.textContent=`${q.name} · ${outcome} ${ago(tick-(q.endedAt??q.offeredAt))}`;return row;
    });
    history.replaceChildren(...rows);
  };
  const dispatch=async(command:Command):Promise<void>=>{
    if(busy)return;
    busy=true;enable.disabled=accept.disabled=refuse.disabled=true;feedback.textContent='';
    try{await send(command);}catch(error){feedback.textContent=error instanceof Error?error.message:String(error);}
    finally{busy=false;if(current)update(current);}
  };
  enable.onclick=()=>void dispatch({type:'enable-quests'});
  const answer=(yes:boolean):void=>{if(shownId!==undefined)void dispatch({type:'answer-quest',questId:shownId,accept:yes});};
  accept.onclick=()=>answer(true);refuse.onclick=()=>answer(false);

  function update(world:World):void {
    current=world;
    const eligible=!!world.gameProfile&&world.raids?.profile==='cassandra-raids-v1';
    const calendar=world.quests;
    updateHistory(calendar?.entries??[],world.tick);
    const entry=calendar?latest(calendar.entries):undefined;
    const offer=entry?.status==='offered'?entry:undefined;
    shownId=offer?.id;
    enable.hidden=!eligible||!!calendar;enable.disabled=busy;
    response.hidden=!offer;accept.disabled=refuse.disabled=busy||!offer;
    if(!eligible){status.textContent='Les demandes d’asile sont proposées dans le départ Atterrissage avec Cassandra.';details.textContent='';timing.textContent='';letter.remove();return;}
    if(!calendar){status.textContent='Les demandes d’asile sont désactivées.';details.textContent='Après activation, une première demande peut se présenter au bout de huit jours de jeu.';timing.textContent='';letter.remove();return;}
    if(!entry){status.textContent='Aucune demande en cours.';details.textContent='Une nouvelle personne pourra demander asile plus tard.';timing.textContent='';letter.remove();return;}
    const name=entry.name;
    if(offer){
      const skills=startingSkills(offer.profile);
      status.textContent=`${name} demande asile avant la fin de l’offre.`;
      details.textContent=`Profil : Construction ${skills.construction.level}, Médecine ${skills.medicine.level}, Tir ${skills.shooting.level}, Mêlée ${skills.melee.level}, Cuisine ${skills.cooking?.level??0}. En l’accueillant, vous recevez ce colon et sa chemise ; un bandit au couteau le poursuit. Aucun butin n’est promis.`;
      timing.textContent=`Répondez sous ${duration(offer.expiresAt-world.tick)}. Si vous acceptez, arrivée prévue dans ${duration(offer.joinDelay)} et poursuite dans ${duration(offer.raidDelay)} après votre réponse. Une bordure bloquée peut retarder ces entrées. Refuser ou laisser expirer n’a pas de pénalité.`;
    }else if(entry.status==='accepted'){
      if(entry.raidGroupId!==undefined){status.textContent=`${name} a rejoint la colonie ; le bandit est apparu.`;timing.textContent=`La demande sera conclue dans ${duration((entry.raidAt??world.tick)+60-world.tick)}. Le combat peut continuer après sa conclusion, sans victoire déclarée par la quête.`;}
      else if(entry.arrivedAt!==undefined){
        status.textContent=`${name} a rejoint la colonie. Le bandit annoncé n’est pas encore apparu.`;
        const due=Math.max((entry.acceptedAt??world.tick)+entry.raidDelay,entry.arrivedAt+entry.raidDelay-entry.joinDelay);
        timing.textContent=world.tick<due?`Poursuite prévue dans ${duration(due-world.tick)}. Préparez la défense.`:'Le bandit attend une bordure libre ou la fin de l’attaque en cours. La poursuite reste engagée.';
      }else{
        status.textContent=`${name} a été accueilli ; son arrivée reste attendue.`;
        const due=(entry.acceptedAt??world.tick)+entry.joinDelay;
        timing.textContent=world.tick<due?`Arrivée prévue dans ${duration(due-world.tick)}. Préparez nourriture et couchage.`:'Une bordure libre manque encore pour son arrivée. L’asile reste engagé.';
      }
      details.textContent='Préparez la nourriture, un couchage et la défense. La poursuite annoncée ne peut plus être annulée.';
    }else if(entry.status==='concluded'){
      status.textContent=`Quête de ${name} conclue, issue neutre.`;
      details.textContent='La poursuite et les blessés restent présents après cette conclusion. Continuez à défendre le foyer et à soigner les personnes touchées.';
      timing.textContent=entry.endedAt===undefined?'':`Demande conclue ${ago(world.tick-entry.endedAt)}.`;
    }else{
      status.textContent=entry.status==='refused'?`Demande de ${name} refusée sans pénalité.`:`Demande de ${name} expirée sans pénalité.`;
      details.textContent='Aucun colon, objet ou raid n’a été créé par cette demande.';
      timing.textContent='Une autre personne pourra demander asile plus tard.';
    }
    const showLetter=entry.status==='offered'||entry.status==='accepted';
    if(showLetter){
      letter.textContent=entry.status==='offered'?`Quête : ${name} demande asile`:`Quête : poursuite de ${name}`;
      const alerts=document.getElementById('alerts');if(alerts&&letter.parentElement!==alerts)alerts.prepend(letter);
    }else letter.remove();
  }
  return {update};
}
