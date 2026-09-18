import type { Pawn } from '../sim/types';

/** Explicit attack targeting keeps a friendly click from becoming an accidental
 * attack during normal selection. The worker still decides admissibility. */
export class ShootingControls {
  active=false;
  create(parent:HTMLElement,pawns:()=>Pawn[],changed:()=>void):void {
    const button=document.createElement('button');button.id='target-shot';button.className='secondary-action';button.textContent='Tirer sur une cible';
    button.onclick=()=>{this.active=!this.active;this.update(parent,pawns());changed();};
    const hint=document.createElement('p');hint.id='shoot-help';hint.className='muted';parent.querySelector('#draft-controls')?.append(button,hint);
  }
  cancel():void {this.active=false;}
  update(parent:HTMLElement,pawns:Pawn[]):void {
    const button=parent.querySelector<HTMLButtonElement>('#target-shot');if(!button)return;
    const enabled=!!pawns.length&&pawns.every(p=>p.draft&&p.state!=='dead'&&p.state!=='downed');
    if(!enabled)this.active=false;button.hidden=!enabled;button.setAttribute('aria-pressed',String(this.active));
    button.textContent=this.active?'Annuler le ciblage':'Tirer sur une cible';
    parent.querySelector('#shoot-help')!.textContent=this.active?'Cliquez un personnage à viser, allié compris. Échap ou clic droit : annuler.':enabled?'Tir dirigé sur un personnage. Déplacement ou arrêt interrompt la visée ; la récupération après tir reste obligatoire.':'';
  }
}
