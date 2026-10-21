import {isPlayerCasket271} from '../sim/cryptosleep-state-271';
import {ITEM_DEFINITIONS} from '../sim/items';
import {buildingLabels} from './building-labels';
import {healthAnestheticText,healthCapacityRows,healthInjuryRows,healthStatusText} from './health-inspection';
import type {Structure,World} from '../sim/types';

export function cryptosleepInspectionText271(w:World,s:Structure):string|undefined {
 if(!isPlayerCasket271(s)||!s.cryptosleep)return;
 const human=s.cryptosleep.human,task=w.pawns.find(p=>p.cryptosleepTask?.casketId===s.id)?.cryptosleepTask;
 const state=human?`Occupant : ${human.name} · Cryptosommeil`:'Vide · Prêt à accueillir un colon';
 const progress=task&&(task.phase==='closing'||task.phase==='opening')?` · ${task.phase==='closing'?'Fermeture':'Ouverture'} : ${Math.min(100,Math.floor(task.progressCore/(task.phase==='closing'?500:300)*100))} %`:task?` · ${task.action==='carry'?'Portage vers le caisson':task.action==='open'?'Un colon vient ouvrir':'Un colon vient entrer'}`:'';
 return state+progress+' · Sans électricité · Ouverture sur place par un autre colon';
}

/** Inspect the one held original directly; never append it to local workers or
 * construct a mutable World/Pawn surrogate to render its medical condition. */
export function updateCryptosleepInspection271(root:HTMLElement,w:World,s:Structure|undefined):void {
 let section=root.querySelector<HTMLElement>('[data-cryptosleep-inspection]');
 if(!s||!isPlayerCasket271(s)||!s.cryptosleep){section?.remove();return;}
 if(!section){section=root.ownerDocument.createElement('section');section.dataset.cryptosleepInspection='';root.querySelector('.cell-card')?.append(section);}
 const doc=root.ownerDocument,summary=doc.createElement('p');summary.textContent=cryptosleepInspectionText271(w,s)??'';
 const open=section.querySelector<HTMLDetailsElement>('details')?.open??false;section.replaceChildren(summary);
 const human=s.cryptosleep.human;if(!human)return;
 const details=doc.createElement('details'),title=doc.createElement('summary'),identity=doc.createElement('p'),status=doc.createElement('p');
 details.open=open;details.dataset.cryptosleepHuman=String(human.id);title.textContent=`Dossier de ${human.name}`;
 identity.textContent=`${human.name} · Besoins suspendus : nourriture ${Math.round(human.hunger)} %, repos ${Math.round(human.rest)} % · Humeur ${Math.round(human.mood)} %`;
 status.textContent=healthStatusText(human,w);details.append(title,identity,status);
 const anesthesia=healthAnestheticText(human);if(anesthesia){const p=doc.createElement('p');p.textContent=anesthesia;details.append(p);}
 const list=doc.createElement('ul');
 for(const row of healthInjuryRows(human)){const li=doc.createElement('li');li.textContent=`${row.part} : ${row.description}`;list.append(li);}
 for(const row of healthCapacityRows(human)){const li=doc.createElement('li');li.textContent=`${row.label} : ${row.value}`;list.append(li);}
 details.append(list);
 const possessions=doc.createElement('p');possessions.textContent='Possessions conservées : '+([
  ...s.cryptosleep.items.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}`),
  ...s.cryptosleep.packed.map(p=>`${buildingLabels[p.building.kind]} emballé`),
 ].join(' · ')||'aucune');details.append(possessions);
 const note=doc.createElement('p');note.className='muted';note.textContent='Le caisson conserve cette personne et son état. Un colon doit ouvrir le caisson sur place pour la libérer.';details.append(note);section.append(details);
}
