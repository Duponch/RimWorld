import {readShipReactorStart275} from '../sim/ship-reactor-runtime-275';
import type {ShipReactorCommand275} from '../sim/ship-reactor-state-275';
import type {Structure,World} from '../sim/types';

export function shipReactorInspectionText275(w:World,s:Structure):string {
  const state=s.shipReactor275;
  if(!state)return 'Réacteur stellaire en veille · Démarrage manuel · 1 000 W disponibles';
  if(state.state==='running')return 'Réacteur stellaire opérationnel · Démarrage achevé · 1 000 W disponibles';
  const left=Math.max(0,state.endCore-w.tick*10);
  return `Démarrage stellaire en cours · ${left>0?`${(left/60000).toFixed(1).replace('.',',')} jours restants`:'Fin imminente'} · Le signal attire des attaques sur cette carte · 1 000 W disponibles`;
}

/** The dialog captures the actual connected reactors. Confirmation sends that
 * list back to authority; changing the ship while it is open cannot expand it. */
export function updateShipReactorInspection275(root:HTMLElement,w:World,s:Structure|undefined,send:(c:ShipReactorCommand275)=>void):void {
  let section=root.querySelector<HTMLElement>('[data-ship-reactor-inspection]');
  if(s?.kind!=='ship-reactor'){section?.remove();return;}
  if(!section){section=root.ownerDocument.createElement('section');section.dataset.shipReactorInspection='';root.querySelector('.cell-card')?.append(section);}
  const doc=root.ownerDocument,text=shipReactorInspectionText275(w,s);
  let summary=section.querySelector('p');
  if(!summary){summary=doc.createElement('p');section.append(summary);}
  if(summary.textContent!==text)summary.textContent=text;
  const plan=readShipReactorStart275(w,s.id);
  let button=section.querySelector<HTMLButtonElement>('[data-ship-reactor-start]');
  if(!plan.ok){button?.remove();return;}
  if(!button){button=doc.createElement('button');button.type='button';button.className='secondary-action';button.dataset.shipReactorStart='';button.textContent='Démarrer le réacteur';section.append(button);}
  button.onclick=()=>{
    const current=readShipReactorStart275(w,s.id);if(!current.ok)return;
    doc.querySelector<HTMLDialogElement>('dialog[data-ship-reactor-confirm]')?.remove();
    const dialog=doc.createElement('dialog');dialog.dataset.shipReactorConfirm='';dialog.className='caravan-encounter-dialog';dialog.style.maxWidth='min(640px,92vw)';
    const title=doc.createElement('h2'),body=doc.createElement('p'),warning=doc.createElement('p'),actions=doc.createElement('div');
    title.textContent=current.reactorIds.length>1?'Démarrer les réacteurs reliés ?':'Démarrer le réacteur stellaire ?';
    body.textContent=`${current.reactorIds.length>1?`Les ${current.reactorIds.length} réacteurs reliés vont commencer leur démarrage`:'Le réacteur va commencer son démarrage'}. La mise en service prend quatorze jours.`;
    warning.textContent='Le signal attirera des attaques pendant le démarrage. Préparez les défenses de la colonie avant de commencer.';
    const cancel=doc.createElement('button'),confirm=doc.createElement('button');cancel.type=confirm.type='button';cancel.className='secondary-action';cancel.textContent='Annuler';confirm.textContent='Démarrer';confirm.dataset.shipReactorConfirmStart='';
    const close=()=>{dialog.close();dialog.remove();};cancel.onclick=close;dialog.addEventListener('cancel',()=>dialog.remove(),{once:true});
    confirm.onclick=()=>{confirm.disabled=true;send({type:'ship-reactor-start',reactorId:s.id,reactorIds:[...current.reactorIds]});close();};
    actions.append(cancel,confirm);dialog.append(title,body,warning,actions);doc.body.append(dialog);dialog.showModal();
  };
}
