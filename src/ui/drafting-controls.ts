import type { Command,Pawn } from '../sim/types';

export const draftLabel=(p:Pawn):string=>p.shooting?.stance?.phase==='aim'?'Mobilisé · vise':p.shooting?.stance?.phase==='cooldown'?'Mobilisé · récupération après tir':p.shooting?.order?'Mobilisé · rejoint sa position de tir':p.need?.kind==='sleep'?'Mobilisé · effondré de fatigue':p.draft?.target&& (p.x!==p.draft.target.x||p.z!==p.draft.target.z||p.moveCooldown>0)?`Mobilisé · vers ${p.draft.target.x}, ${p.draft.target.z}`:'Mobilisé · attend les ordres';
export function toggleDraft(pawns:Pawn[],send:(c:Command)=>void):void {
  if(pawns.length)send({type:'draft',pawnIds:pawns.map(p=>p.id),enabled:!pawns.every(p=>p.draft)});
}
export function createDraftControls(parent:HTMLElement,current:()=>Pawn[],send:(c:Command)=>void):void {
  const box=document.createElement('div');box.id='draft-controls';
  box.innerHTML='<button id="toggle-draft" class="secondary-action">Mobiliser · R</button><button id="stop-draft" class="secondary-action" hidden>Arrêter l’ordre</button><p id="draft-help" class="muted"></p>';
  box.querySelector<HTMLButtonElement>('#toggle-draft')!.onclick=()=>toggleDraft(current(),send);
  box.querySelector<HTMLButtonElement>('#stop-draft')!.onclick=()=>send({type:'draft-stop',pawnIds:current().map(p=>p.id)});
  parent.prepend(box);
}
export function updateDraftControls(parent:HTMLElement,pawns:Pawn[]):void {
  const toggle=parent.querySelector<HTMLButtonElement>('#toggle-draft');if(!toggle)return;
  const all=pawns.length>0&&pawns.every(p=>p.draft);
  toggle.textContent=all?'Démobiliser · R':'Mobiliser · R';toggle.setAttribute('aria-pressed',String(all));toggle.disabled=!all&&pawns.some(p=>p.state==='dead'||p.state==='downed');
  parent.querySelector<HTMLButtonElement>('#stop-draft')!.hidden=!all;
  parent.querySelector('#draft-help')!.textContent=all?`Clic droit : déplacement. Maj : ajouter à la file. ${pawns.reduce((n,p)=>n+(p.draft?.queue.length??0),0)} déplacement(s) en attente. Les besoins continuent. Utilisez Tirer pour désigner un personnage.`:pawns.some(p=>p.draft)?'Sélection mixte : mobiliser tout le groupe pour un déplacement commun.':'';
}
