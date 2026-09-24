import type { Pawn } from '../sim/types';

/** Explicit attack targeting keeps a friendly click from becoming an accidental
 * attack during normal selection. The worker still decides admissibility. */
export class ShootingControls {
  mode:'shoot'|'melee'|null=null;
  get active():boolean{return this.mode!==null;}
  create(parent:HTMLElement,pawns:()=>Pawn[],changed:()=>void):void {
    const button=document.createElement('button');button.id='target-shot';button.className='secondary-action';button.textContent='Tirer sur une cible';
    button.onclick=()=>{this.mode=this.mode==='shoot'?null:'shoot';this.update(parent,pawns());changed();};
    const melee=document.createElement('button');melee.id='target-melee';melee.className='secondary-action';melee.textContent='Attaquer au corps à corps';
    melee.onclick=()=>{this.mode=this.mode==='melee'?null:'melee';this.update(parent,pawns());changed();};
    const hint=document.createElement('p');hint.id='shoot-help';hint.className='muted';parent.querySelector('#draft-controls')?.append(button,melee,hint);
  }
  cancel():void {this.mode=null;}
  update(parent:HTMLElement,pawns:Pawn[]):void {
    const button=parent.querySelector<HTMLButtonElement>('#target-shot');if(!button)return;
    const enabled=!!pawns.length&&pawns.every(p=>p.draft&&p.state!=='dead'&&p.state!=='downed');
    if(!enabled)this.cancel();button.hidden=!enabled;button.setAttribute('aria-pressed',String(this.mode==='shoot'));
    button.textContent=this.mode==='shoot'?'Annuler le ciblage':'Tirer sur une cible';
    const melee=parent.querySelector<HTMLButtonElement>('#target-melee')!;melee.hidden=!enabled;melee.setAttribute('aria-pressed',String(this.mode==='melee'));melee.textContent=this.mode==='melee'?'Annuler le ciblage':'Attaquer au corps à corps';
    parent.querySelector('#shoot-help')!.textContent=this.active?`Cliquez un animal ou un personnage, allié compris${this.mode==='melee'?', ou un mur / une porte':''}. ${this.mode==='melee'?'Le colon approche puis frappe au contact. ':''}Échap ou clic droit : annuler.`:enabled?'Tir ou mêlée dirigés. Les coups de mêlée emploient les outils naturels et l’arme équipée. Arrêter conserve la récupération obligatoire.':'';
  }
}
