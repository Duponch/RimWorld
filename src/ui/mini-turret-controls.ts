import { isColonist } from '../sim/affiliation';
import { turretReloadPawnReason,turretReloadReserved } from '../sim/mini-turret-reload';
import { miniTurretView,turretSeconds } from '../sim/mini-turret-presentation';
import { workPriority } from '../sim/work-types';
import type { Command,Structure,World } from '../sim/types';
import { setTooltip } from './tooltip';
import './mini-turret-controls.css';

/** Persistent controls: confirmed refreshes preserve keyboard focus and choice. */
export function updateMiniTurretControls(root:HTMLElement,world:World,structure:Structure|undefined,send:(command:Command)=>void):void {
  let card=root.querySelector<HTMLElement>('[data-turret-id]');
  const view=structure?miniTurretView(world,structure):null;
  if(!view){card?.remove();return;}
  if(!card){
    card=document.createElement('section');card.className='power-controls turret-controls';card.dataset.turretId=String(view.id);card.setAttribute('aria-label','Canon automatique');
    const heading=document.createElement('h3');heading.textContent='Canon automatique';card.append(heading);
    for(const name of ['ammo','phase','target','service','danger']){const row=document.createElement('p');row.dataset.turretFact=name;row.tabIndex=0;card.append(row);}
    for(const [name,label] of [['hold-fire','Retenir le feu'],['auto-reload','Réarmement automatique']] as const){
      const button=document.createElement('button');button.type='button';button.dataset[`turret${name==='hold-fire'?'HoldFire':'AutoReload'}`]='';button.textContent=label;card.append(button);
    }
    const label=document.createElement('label');label.textContent='Colon pour le réarmement ';const select=document.createElement('select');select.dataset.turretWorker='';label.append(select);card.append(label);
    const rearm=document.createElement('button');rearm.type='button';rearm.dataset.turretRearm='';rearm.textContent='Réarmer avec ce colon';card.append(rearm);
    const limit=document.createElement('p');limit.className='muted';limit.textContent='Désinstallation indisponible : le canon et ses phases restent dans le bâtiment.';limit.tabIndex=0;setTooltip(limit,{title:'Mini-tourelle fixe',body:limit.textContent});card.append(limit);root.append(card);
  }
  card.dataset.turretId=String(view.id);
  const fact=(name:string,text:string)=>{const row=card!.querySelector<HTMLElement>(`[data-turret-fact="${name}"]`)!;row.textContent=text;setTooltip(row,{title:'Canon automatique',body:text});};
  fact('ammo',`Canon : ${view.reserve.toFixed(2).replace(/\.00$/,'')} / 60 · ${view.shots} coup${view.shots>1?'s':''} disponible${view.shots>1?'s':''} · ${view.ammoQ} quarts`);
  fact('phase',`${view.phaseLabel}${view.reason&&view.phase!=='idle'?` · ${view.reason}`:''}`);
  const target=(t:NonNullable<typeof view.target>)=>`${t.label}${t.cell?` (${t.cell.x}, ${t.cell.z})`:''}`;
  fact('target',`Cible acquise : ${view.target?target(view.target):'aucune'}${view.burstTarget?` · Rafale capturée : ${target(view.burstTarget)}`:''}`);
  fact('service',view.services.length?view.services.map(s=>`${s.name} · ${s.phase==='pickup'?'prélèvement acier':s.progress>0?`service ${s.progress}/24`:'livraison acier'}`).join(' · '):'Réarmement : aucun transport engagé · 1 acier = 3 quarts · service au contact');
  fact('danger',view.wick?`Mèche engagée : ${turretSeconds(view.wick.remainingCore)} · danger rayon 3,9 · réparer ou arrêter ne désamorce pas`:'Portée géométrique 28,9 · visibilité et cible admissible requises');
  const removing=world.jobs.some(j=>j.deconstruction?.structureId===view.id);
  for(const [selector,type,enabled,text,body] of [
    ['[data-turret-hold-fire]','turret-hold-fire',view.holdFire,view.holdFire?'Reprendre le feu':'Retenir le feu','Retenir le feu annule l’échauffement. Une rafale déjà engagée peut terminer.'],
    ['[data-turret-auto-reload]','turret-auto-reload',view.autoReload,'Réarmement automatique','À moitié du canon ou moins, un colon capable transporte et consomme réellement l’acier. Un ordre personnel reste distinct.'],
  ] as const){const button=card.querySelector<HTMLButtonElement>(selector)!;button.textContent=text;button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-disabled',String(removing));setTooltip(button,{title:text,body:removing?'Déconstruction demandée.':body});button.onclick=()=>{if(!removing)send({type,structureId:view.id,enabled:!enabled});};}
  const select=card.querySelector<HTMLSelectElement>('[data-turret-worker]')!,choice=select.value;
  const workers=world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead');
  for(const option of [...select.options])if(!workers.some(p=>String(p.id)===option.value))option.remove();
  for(const worker of workers){let option=[...select.options].find(o=>o.value===String(worker.id));if(!option){option=document.createElement('option');option.value=String(worker.id);select.append(option);}option.textContent=worker.name;}
  if([...select.options].some(o=>o.value===choice))select.value=choice;
  const rearm=card.querySelector<HTMLButtonElement>('[data-turret-rearm]')!;
  const refreshOrder=()=>{const pawn=workers.find(p=>p.id===Number(select.value));const reason=removing?'Déconstruction demandée.':view.full?'Le canon est déjà plein.':turretReloadReserved(world,view.id)?'La mini-tourelle est déjà réservée.':!pawn?'Aucun colon présent.':turretReloadPawnReason(pawn)??(pawn.mental?.crisis?'Ce colon refuse les ordres pendant sa crise.':!workPriority(pawn,'haul')?'Le transport est désactivé dans le tableau Travail.':undefined);
    rearm.setAttribute('aria-disabled',String(!!reason));setTooltip(rearm,{title:'Réarmement personnel',body:reason??'Demander à ce colon de prendre l’acier disponible et de servir le canon au contact. Les accès et réservations sont vérifiés à la demande.'});
    rearm.onclick=()=>{if(!reason&&pawn)send({type:'order-haul',pawnId:pawn.id,queue:false,target:{type:'turret',structureId:view.id}});};};
  select.onchange=refreshOrder;refreshOrder();
}
