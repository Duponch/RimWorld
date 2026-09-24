import type { Command,Pawn } from '../sim/types';
import { isColonist } from '../sim/affiliation';

export const draftLabel=(p:Pawn):string=>p.shooting?.stance?.phase==='aim'?'Mobilisé · vise':p.shooting?.stance?.phase==='cooldown'?'Mobilisé · récupération après tir':p.shooting?.order?'Mobilisé · rejoint sa position de tir':p.need?.kind==='sleep'?'Mobilisé · effondré de fatigue':p.draft?.target&& (p.x!==p.draft.target.x||p.z!==p.draft.target.z||p.moveCooldown>0)?`Mobilisé · vers ${p.draft.target.x}, ${p.draft.target.z}`:'Mobilisé · attend les ordres';
/** UI selection policy. The worker remains the authority when health changes. */
export const draftablePawns=(pawns:readonly Pawn[]):Pawn[]=>pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead'&&p.state!=='downed'&&!p.mental?.crisis);
export const draftedPawns=(pawns:readonly Pawn[]):Pawn[]=>draftablePawns(pawns).filter(p=>!!p.draft);
export function toggleDraft(pawns:Pawn[],send:(c:Command)=>void):void {
  const eligible=draftablePawns(pawns);
  if(eligible.length)send({type:'draft',pawnIds:eligible.map(p=>p.id),enabled:!eligible.every(p=>p.draft)});
}
export function createDraftControls(parent:HTMLElement,current:()=>Pawn[],send:(c:Command)=>void):void {
  const box=document.createElement('div');box.id='draft-controls';
  box.innerHTML='<button id="toggle-draft" class="secondary-action">Mobiliser · R</button><button id="stop-draft" class="secondary-action" hidden>Arrêter l’ordre</button><button id="fire-at-will" class="secondary-action" hidden>Tirer à volonté</button><label id="inspector-hostility-label" hidden>Réaction hostile <select id="inspector-hostility"><option value="flee">Fuir</option><option value="attack">Attaquer</option><option value="ignore">Ignorer</option></select></label><p id="draft-help" class="muted"></p>';
  box.querySelector<HTMLButtonElement>('#toggle-draft')!.onclick=()=>toggleDraft(current(),send);
  box.querySelector<HTMLButtonElement>('#stop-draft')!.onclick=()=>{const pawns=draftedPawns(current());if(pawns.length)send({type:'draft-stop',pawnIds:pawns.map(p=>p.id)});};
  box.querySelector<HTMLButtonElement>('#fire-at-will')!.onclick=()=>{const pawns=draftedPawns(current());if(pawns.length)send({type:'fire-at-will',pawnIds:pawns.map(p=>p.id),enabled:pawns.some(p=>p.draft?.holdFire)});};
  box.querySelector<HTMLSelectElement>('#inspector-hostility')!.onchange=e=>{const selected=draftablePawns(current()),p=selected.length===1?selected[0]:undefined;if(p)send({type:'hostility-response',pawnId:p.id,response:(e.target as HTMLSelectElement).value as 'flee'|'attack'|'ignore'});};
  parent.prepend(box);
}
export function updateDraftControls(parent:HTMLElement,pawns:Pawn[]):void {
  const toggle=parent.querySelector<HTMLButtonElement>('#toggle-draft');if(!toggle)return;
  const eligible=draftablePawns(pawns),drafted=eligible.filter(p=>!!p.draft),all=eligible.length>0&&drafted.length===eligible.length;
  parent.querySelector<HTMLElement>('#inspector-hostility-label')!.hidden=eligible.length!==1||!!eligible[0]?.draft;
  if(eligible.length===1)parent.querySelector<HTMLSelectElement>('#inspector-hostility')!.value=eligible[0]!.hostilityResponse??'flee';
  toggle.textContent=all?'Démobiliser · R':'Mobiliser · R';toggle.setAttribute('aria-pressed',String(all));toggle.disabled=!eligible.length;
  const stop=parent.querySelector<HTMLButtonElement>('#stop-draft')!;stop.hidden=!drafted.length;stop.disabled=!drafted.length;
  const fire=parent.querySelector<HTMLButtonElement>('#fire-at-will')!;fire.hidden=!drafted.length;fire.disabled=!drafted.length;fire.setAttribute('aria-pressed',String(drafted.length>0&&drafted.every(p=>!p.draft!.holdFire)));fire.textContent=drafted.some(p=>p.draft?.holdFire)?'Tirer à volonté : désactivé / mixte':'Tirer à volonté : activé';
  const excluded=pawns.length-eligible.length,scope=excluded?`${excluded} membre(s) indisponible(s) ou hors colonie exclus. `:'';
  parent.querySelector('#draft-help')!.textContent=scope+(all?`Clic droit sur le sol : déplacement. Clic droit sur une cible : options d’attaque. Maj : file de déplacements. ${drafted.reduce((n,p)=>n+p.draft!.queue.length,0)} déplacement(s) en attente.`:drafted.length?'Sélection mixte : R mobilise les autres colons disponibles. Les ordres tactiques concernent seulement les mobilisés.':!eligible.length?'Aucun colon libre capable d’être mobilisé.':'R mobilise les colons disponibles.');
}
