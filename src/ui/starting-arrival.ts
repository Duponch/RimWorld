import type { World } from '../sim/types';
import './starting-arrival.css';

export interface StartingArrivalPresentation {
  phase:'incoming'|'landed'|'blocked';label:string;names:readonly string[];paused:boolean;
}
/** Only the three genuinely contained people are described before opening. */
export function startingArrivalPresentation(world:Pick<World,'tick'|'startingArrival'>,speed:number):StartingArrivalPresentation|undefined {
  const arrival=world.startingArrival;if(!arrival||arrival.phase==='opened')return undefined;
  const phase=world.tick>=arrival.openAt?'blocked':arrival.phase;
  return {phase,label:phase==='blocked'?'Ouverture obstruée':`${arrival.pods.length} capsules ${phase==='incoming'?'en approche':'au sol'}`,
    names:arrival.pods.map(pod=>pod.pawn.name),paused:speed===0};
}

export interface StartingArrivalUI {
  update:(world:World,speed:number)=>void;reset:()=>void;dispose:()=>void;
}
export function createStartingArrivalUI(host:HTMLElement,options:{onResume:()=>void}):StartingArrivalUI {
  const doc=host.ownerDocument,root=doc.createElement('aside'),content=doc.createElement('div');
  root.className='starting-arrival';root.hidden=true;root.setAttribute('aria-label','Arrivée des colons');
  content.className='starting-arrival-message';content.setAttribute('role','status');content.setAttribute('aria-live','polite');
  const label=doc.createElement('strong'),names=doc.createElement('span'),hint=doc.createElement('span'),resume=doc.createElement('button');
  label.className='starting-arrival-label';names.className='starting-arrival-names';hint.className='starting-arrival-hint';
  resume.type='button';resume.textContent='Reprendre';resume.className='starting-arrival-resume';
  resume.hidden=true;
  content.append(label,names,hint);root.append(content,resume);host.append(root);
  const controller=new AbortController(),listenerOptions={signal:controller.signal};
  let disposed=false,paused=false;
  resume.addEventListener('click',()=>{if(!disposed&&!root.hidden&&paused)options.onResume();},listenerOptions);
  // This panel has no scroll region: wheel keeps bubbling to the map zoom.
  for(const type of ['pointerdown','pointerup','click','dblclick','keydown','keyup'] as const)root.addEventListener(type,event=>event.stopPropagation(),listenerOptions);
  const text=(node:HTMLElement,value:string)=>{if(node.textContent!==value)node.textContent=value;};
  const reset=()=>{if(root.hidden)return;root.hidden=true;paused=false;resume.hidden=true;root.removeAttribute('data-phase');};
  return {
    update(world,speed){
      if(disposed)return;const state=startingArrivalPresentation(world,speed);if(!state){reset();return;}
      paused=state.paused;root.dataset.phase=state.phase;
      text(label,state.label);text(names,state.names.join(' · '));
      text(hint,`${state.phase==='blocked'?'Les sorties doivent être libres pour ouvrir les capsules. ':''}${paused?'La partie est en pause.':''}`.trim());
      hint.hidden=!hint.textContent;resume.hidden=!paused;root.hidden=false;
    },
    reset(){if(!disposed)reset();},
    dispose(){if(disposed)return;disposed=true;controller.abort();root.remove();},
  };
}
