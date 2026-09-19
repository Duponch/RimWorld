import type { Command,Pawn } from '../sim/types';

export const draftLabel=(p:Pawn):string=>p.shooting?.stance?.phase==='aim'?'Mobilisé · vise':p.shooting?.stance?.phase==='cooldown'?'Mobilisé · récupération après tir':p.shooting?.order?'Mobilisé · rejoint sa position de tir':p.need?.kind==='sleep'?'Mobilisé · effondré de fatigue':p.draft?.target&& (p.x!==p.draft.target.x||p.z!==p.draft.target.z||p.moveCooldown>0)?`Mobilisé · vers ${p.draft.target.x}, ${p.draft.target.z}`:'Mobilisé · attend les ordres';
export function toggleDraft(pawns:Pawn[],send:(c:Command)=>void):void {
  if(pawns.length)send({type:'draft',pawnIds:pawns.map(p=>p.id),enabled:!pawns.every(p=>p.draft)});
}
export function createDraftControls(parent:HTMLElement,current:()=>Pawn[],send:(c:Command)=>void):void {
  const box=document.createElement('div');box.id='draft-controls';
  box.innerHTML='<button id="toggle-draft" class="secondary-action">Mobiliser · R</button><button id="stop-draft" class="secondary-action" hidden>Arrêter l’ordre</button><button id="fire-at-will" class="secondary-action" hidden>Tirer à volonté</button><label id="inspector-hostility-label" hidden>Réaction hostile <select id="inspector-hostility"><option value="flee">Fuir</option><option value="attack">Attaquer</option><option value="ignore">Ignorer</option></select></label><p id="draft-help" class="muted"></p>';
  box.querySelector<HTMLButtonElement>('#toggle-draft')!.onclick=()=>toggleDraft(current(),send);
  box.querySelector<HTMLButtonElement>('#stop-draft')!.onclick=()=>send({type:'draft-stop',pawnIds:current().map(p=>p.id)});
  box.querySelector<HTMLButtonElement>('#fire-at-will')!.onclick=()=>send({type:'fire-at-will',pawnIds:current().map(p=>p.id),enabled:current().some(p=>p.draft?.holdFire)});
  box.querySelector<HTMLSelectElement>('#inspector-hostility')!.onchange=e=>{const p=current()[0];if(p)send({type:'hostility-response',pawnId:p.id,response:(e.target as HTMLSelectElement).value as 'flee'|'attack'|'ignore'});};
  parent.prepend(box);
}
export function updateDraftControls(parent:HTMLElement,pawns:Pawn[]):void {
  const toggle=parent.querySelector<HTMLButtonElement>('#toggle-draft');if(!toggle)return;
  parent.querySelector<HTMLElement>('#inspector-hostility-label')!.hidden=pawns.length!==1||!!pawns[0].draft;
  if(pawns.length===1)parent.querySelector<HTMLSelectElement>('#inspector-hostility')!.value=pawns[0].hostilityResponse??'flee';
  const all=pawns.length>0&&pawns.every(p=>p.draft);
  toggle.textContent=all?'Démobiliser · R':'Mobiliser · R';toggle.setAttribute('aria-pressed',String(all));toggle.disabled=!all&&pawns.some(p=>p.state==='dead'||p.state==='downed'||!!p.mental?.crisis);
  parent.querySelector<HTMLButtonElement>('#stop-draft')!.hidden=!all;
  const fire=parent.querySelector<HTMLButtonElement>('#fire-at-will')!;fire.hidden=!all;fire.setAttribute('aria-pressed',String(all&&pawns.every(p=>!p.draft!.holdFire)));fire.textContent=pawns.some(p=>p.draft?.holdFire)?'Tirer à volonté : désactivé / mixte':'Tirer à volonté : activé';
  parent.querySelector('#draft-help')!.textContent=pawns.some(p=>p.mental?.crisis)?'Errance triste : les ordres directs sont indisponibles jusqu’à récupération.':all?`Clic droit : déplacement. Maj : ajouter à la file. ${pawns.reduce((n,p)=>n+(p.draft?.queue.length??0),0)} déplacement(s) en attente. Les besoins continuent. Tir automatique à l’arrêt ; Tirer/Mêlée désignent une cible précise.`:pawns.some(p=>p.draft)?'Sélection mixte : mobiliser tout le groupe pour un déplacement commun.':'';
}
