import {isShipCasket277,type ShipCasketCommand277} from '../sim/ship-casket-state-277';
import {shipCasketOccupantLabel277} from '../sim/ship-casket-task-277';
import {healthAnestheticText,healthCapacityRows,healthInjuryRows,healthStatusText} from './health-inspection';
import {animalBody} from '../sim/wildlife-health';
import {animalNutritionMax} from '../sim/animal-life';
import {mechaAssessment} from '../sim/mechanoid-health';
import {ITEM_DEFINITIONS} from '../sim/items';
import {buildingLabels} from './building-labels';
import type {Structure,World} from '../sim/types';

export function shipCasketInspectionText277(w:World,s:Structure):string|undefined {
 if(!isShipCasket277(s)||!s.shipCryptosleep277)return;
 const o=s.shipCryptosleep277.occupant,t=w.pawns.find(p=>p.shipCasketTask277?.casketId===s.id)?.shipCasketTask277;
 return (o?`Occupant : ${shipCasketOccupantLabel277(o)} · Cryptosommeil`:'Vide · Prêt à accueillir un occupant')+(t?.phase==='closing'?` · Fermeture : ${Math.floor(t.progressCore/500*100)} %`:t?` · ${t.action==='carry'?'Portage vers le caisson':'Une personne vient entrer'}`:'')+' · Éjection directe · Sans alimentation requise';
}
/** Reads the actual held original. No surrogate World/Pawn and no clinical
 * advancement is used to show a suspended animal or mechanical body. */
export function updateShipCasketInspection277(root:HTMLElement,w:World,s:Structure|undefined,send:(c:ShipCasketCommand277)=>void):void {
 let section=root.querySelector<HTMLElement>('[data-ship-casket-inspection]');
 if(!s||!isShipCasket277(s)||!s.shipCryptosleep277){section?.remove();return;}
 if(!section){section=root.ownerDocument.createElement('section');section.dataset.shipCasketInspection='';root.querySelector('.cell-card')?.append(section);}
 const doc=root.ownerDocument,open=section.querySelector('details')?.open??false,summary=doc.createElement('p');summary.textContent=shipCasketInspectionText277(w,s)??'';section.replaceChildren(summary);
 const h=s.shipCryptosleep277,o=h.occupant;if(!o)return;
 const button=doc.createElement('button');button.type='button';button.className='secondary-action';button.dataset.shipCasketEject=String(s.id);button.textContent='Éjecter l’occupant';button.onclick=()=>{button.disabled=true;send({type:'eject-ship-casket',casketId:s.id});};section.append(button);
 const details=doc.createElement('details'),title=doc.createElement('summary'),identity=doc.createElement('p'),list=doc.createElement('ul');details.open=open;details.dataset.shipCasketOccupant=String(o.kind==='human'?o.pawn.id:o.kind==='animal'?o.animal.id:o.mech.id);title.textContent=`Dossier de ${shipCasketOccupantLabel277(o)}`;
 if(o.kind==='human'){
  identity.textContent=`${o.pawn.name} · Besoins suspendus : nourriture ${Math.round(o.pawn.hunger)} %, repos ${Math.round(o.pawn.rest)} %${o.pawn.prisoner?' · Prisonnier':''}`;
  const status=doc.createElement('p');status.textContent=healthStatusText(o.pawn,w);details.append(status);
  const anesthesia=healthAnestheticText(o.pawn);if(anesthesia){const p=doc.createElement('p');p.textContent=anesthesia;details.append(p);}
  for(const row of [...healthInjuryRows(o.pawn).map(r=>({label:r.part,value:r.description})),...healthCapacityRows(o.pawn)]){const li=doc.createElement('li');li.textContent=`${row.label} : ${row.value}`;list.append(li);}
 }else{
  const a=o.kind==='animal'?o.animal:o.mech,c=(o.kind==='animal'?animalBody(o.animal):mechaAssessment(o.mech)).capacities;
  identity.textContent=o.kind==='animal'?`Animal · Besoins suspendus : nourriture ${Math.round(o.animal.food/animalNutritionMax(o.animal)*100)} %, repos ${Math.round(o.animal.rest*100)} %`:'Mécanoïde · Aucun besoin organique · État mécanique conservé';
  for(const [label,value] of [['Conscience',c.consciousness],['Déplacement',c.moving],['Manipulation',c.manipulation]] as const){const li=doc.createElement('li');li.textContent=`${label} : ${Math.round(value*100)} %`;list.append(li);}
  if(a.health){const p=doc.createElement('p');p.textContent=`Dossier conservé : ${a.health.injuries.length} blessure(s), ${a.health.missing.length} partie(s) perdue(s).`;details.append(p);}
 }
 const possessions=doc.createElement('p');possessions.textContent='Possessions conservées : '+([...h.items.map(p=>`${p.quantity} ${ITEM_DEFINITIONS[p.item].label}`),...h.packed.map(p=>`${buildingLabels[p.building.kind]} emballé`)].join(' · ')||'aucune');
 details.prepend(title,identity);details.append(list,possessions);section.append(details);
}
