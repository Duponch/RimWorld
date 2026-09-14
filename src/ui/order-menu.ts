import type { SimulationClient } from '../bridge/SimulationClient';
import type { Cell, World } from '../sim/types';

export class OrderMenu {
  private readonly menu=document.createElement('div');
  private revision=0;
  constructor(private readonly client:SimulationClient,private readonly report:(message:string,error?:boolean)=>void) {
    this.menu.className='order-menu panel';this.menu.id='order-menu';this.menu.hidden=true;
    this.menu.setAttribute('role','menu');this.menu.setAttribute('aria-label','Ordres du colon');this.menu.tabIndex=-1;
    document.body.append(this.menu);
    document.addEventListener('pointerdown',event=>{if(!this.menu.contains(event.target as Node))this.close();},true);
    window.addEventListener('blur',()=>this.close());window.addEventListener('resize',()=>this.close());
    this.menu.addEventListener('keydown',event=>{
      const buttons=[...this.menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if(event.key==='Escape'){this.close();document.querySelector<HTMLCanvasElement>('[data-testid="world-canvas"]')?.focus();}
      else if(event.key==='ArrowDown'||event.key==='ArrowUp') {
        const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index+(event.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus();
      } else if(event.key==='Tab'){this.close();return;} else return;
      event.stopPropagation();event.preventDefault();
    });
  }
  close():boolean {this.revision++;const open=!this.menu.hidden;this.menu.hidden=true;return open;}
  async open(world:World,ids:ReadonlySet<number>,cell:Cell,x:number,y:number,queue:boolean):Promise<void> {
    this.close();const revision=this.revision;this.menu.replaceChildren();this.menu.hidden=false;
    const header=document.createElement('strong'),content=document.createElement('div');
    const pawn=ids.size===1?world.pawns.find(p=>ids.has(p.id)):undefined;
    header.textContent=pawn?`${pawn.name} · case ${cell.x}, ${cell.z}`:'Ordres de travail';
    content.textContent=pawn?'Vérification des accès…':'Sélectionnez un seul colon pour lui donner un travail.';
    this.menu.append(header,content);this.position(x,y);this.menu.focus();
    if(!pawn)return;
    try {
      const options=await this.client.orderOptions(pawn.id,cell.x,cell.z,queue);
      if(revision!==this.revision)return;
      content.replaceChildren();
      for(const option of options) {
        const button=document.createElement('button');button.setAttribute('role','menuitem');button.dataset.orderJob=String(option.jobId);
        if(option.haulTarget)button.dataset.orderHaul=option.haulTarget.type;
        if(option.cookStationId!==undefined)button.dataset.orderCook=String(option.cookStationId);
        button.textContent=option.enabled?`${queue?'Mettre en file :':'Prioriser :'} ${option.label}`:`${option.label} — ${option.reason}`;
        button.disabled=!option.enabled;
        button.onclick=event=>{
          this.close();void this.client.command(option.cookStationId!==undefined
            ? {type:'order-cook',pawnId:pawn.id,structureId:option.cookStationId,queue:queue||event.shiftKey}
            : option.haulTarget
            ? {type:'order-haul',pawnId:pawn.id,target:option.haulTarget,queue:queue||event.shiftKey}
            : {type:'order-job',pawnId:pawn.id,jobId:option.jobId,queue:queue||event.shiftKey})
            .then(()=>this.report('Ordre accepté.')).catch(error=>this.report(String(error instanceof Error?error.message:error),true));
        };
        content.append(button);
      }
      if(!options.length)content.textContent='Aucun travail ni pile à transporter ici. Utilisez les ordres d’Architecte.';
      const hint=document.createElement('p');hint.className='muted';hint.textContent='Maj : ajouter à la file. Construction et cuisine peuvent se poursuivre sur cette case.';content.append(hint);
      this.position(x,y);content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    } catch(error) {if(revision===this.revision){content.textContent=String(error instanceof Error?error.message:error);this.position(x,y);}}
  }
  private position(x:number,y:number):void {
    this.menu.style.left=`${Math.max(8,Math.min(x,window.innerWidth-this.menu.offsetWidth-8))}px`;
    this.menu.style.top=`${Math.max(8,Math.min(y,window.innerHeight-this.menu.offsetHeight-8))}px`;
  }
}
