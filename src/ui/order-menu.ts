import { firePosition } from '../sim/fire-rules';
import type { SimulationClient } from '../bridge/SimulationClient';
import type { Cell, Pawn, World } from '../sim/types';
import { hostileTo, isColonist } from '../sim/affiliation';
import { combatTarget, isAnimalTarget } from '../sim/combat-target';
import { animalSpecies } from '../sim/animal-species';
import { shotPlan, shootingQueries } from '../sim/shooting';
import { meleeTools } from '../sim/melee-statistics';
import { meleePlaces, meleeRoute } from '../sim/melee-space';
import { blockedCells } from '../sim/pathfinding';
import { draftablePawns } from './drafting-controls';

export interface TacticalAttackOption {
  kind: 'shoot' | 'melee';
  label: string;
  pawnIds: number[];
  enabled: boolean;
  reason?: string;
}
export interface TacticalAttackPolicy {
  target: string;
  selected: number;
  drafted: number;
  reason?: string;
  options: TacticalAttackOption[];
}

/** Uses the same eligibility and route/line kernels as the committed commands.
 * The worker still rechecks every order against its current world. */
export function tacticalPawns(world: World, ids: ReadonlySet<number>): Pawn[] {
  const carried = new Set(world.pawns.filter(pawn => pawn.rescue?.phase === 'carry').map(pawn => pawn.rescue!.patientId));
  return draftablePawns(world.pawns.filter(pawn => ids.has(pawn.id))).filter(pawn => !!pawn.draft && pawn.state !== 'sleeping' && !pawn.need && !pawn.collapsePending && !carried.has(pawn.id)).sort((a, b) => a.id - b.id);
}

export function tacticalAttackPolicy(world: World, ids: ReadonlySet<number>, targetId: number, queue: boolean): TacticalAttackPolicy {
  const pawns = tacticalPawns(world, ids), target = combatTarget(world, targetId);
  const base = { selected: ids.size, drafted: pawns.length, target: target ? isAnimalTarget(target) ? `${animalSpecies(target.species).label} ${target.id}` : target.name : `cible ${targetId}` };
  if (!pawns.length) return { ...base, reason: 'Mobilisez un colon libre et capable de combattre.', options: [] };
  if (!target || target.state === 'dead') return { ...base, reason: 'Cible vivante indisponible.', options: [] };
  // The ordinary context action must not turn a selected friend or neutral human
  // into a target. Explicit attack targeting elsewhere has its own controls.
  if (!isAnimalTarget(target) && !pawns.some(pawn => hostileTo(pawn, target))) return { ...base, reason: 'Aucune attaque contextuelle sur un allié ou une personne neutre.', options: [] };
  if (queue) return { ...base, options: (['shoot', 'melee'] as const).map(kind => ({
    kind, label: `${kind === 'shoot' ? 'Tirer sur' : 'Attaquer au contact'} ${base.target}`,
    pawnIds: [], enabled: false, reason: 'La file d’attaques n’est pas disponible ; relâchez Maj.',
  })) };
  const shotQueries = shootingQueries(world), shootIds: number[] = [], meleeIds: number[] = [];
  let shootReason = '', meleeReason = '';
  const blocked = blockedCells(world), claimed = new Set<number>();
  for (const pawn of pawns) {
    const shot = shotPlan(world, pawn, targetId, shotQueries);
    if ('reason' in shot) shootReason ||= shot.reason ?? 'Tir indisponible.';
    else shootIds.push(pawn.id);
    if (!meleeTools(world, pawn).length) { meleeReason ||= 'Aucune attaque de mêlée disponible.'; continue; }
    const path = meleeRoute(world, pawn, meleePlaces(world, pawn, target, claimed), blocked);
    if (!path) { meleeReason ||= 'Aucune place de mêlée accessible et libre.'; continue; }
    const end = path.at(-1) ?? pawn;
    claimed.add(end.z * world.width + end.x);
    meleeIds.push(pawn.id);
  }
  const option = (kind: TacticalAttackOption['kind'], pawnIds: number[], reason: string): TacticalAttackOption => ({
    kind,
    label: `${kind === 'shoot' ? 'Tirer sur' : 'Attaquer au contact'} ${base.target}${pawns.length > 1 ? ` · ${pawnIds.length}/${pawns.length} colon(s)` : ''}`,
    pawnIds,
    enabled: pawnIds.length > 0,
    ...!pawnIds.length ? { reason } : {},
  });
  return { ...base, options: [option('shoot', shootIds, shootReason), option('melee', meleeIds, meleeReason)] };
}

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
  /** A ground click can move immediately. A pawn or animal click always opens
   * explicit attack choices and never becomes a movement order. */
  async openTactical(world:World,ids:ReadonlySet<number>,cell:Cell,x:number,y:number,queue:boolean,targetId?:number):Promise<void> {
    this.close();
    if(targetId===undefined) {
      const pawns=tacticalPawns(world,ids);
      if(!pawns.length) {this.tacticalMessage('Ordre tactique', 'Mobilisez un colon libre et capable de se déplacer.', x, y);return;}
      try {
        await this.client.command({type:'draft-move',pawnIds:pawns.map(p=>p.id),target:cell,queue});
        this.report(`${queue?'Déplacement en file':'Déplacement'} demandé vers ${cell.x}, ${cell.z}.`);
      } catch(error) {this.report(String(error instanceof Error?error.message:error),true);}
      return;
    }
    const policy=tacticalAttackPolicy(world,ids,targetId,queue);
    this.menu.replaceChildren();this.menu.hidden=false;
    const header=document.createElement('strong');header.textContent=`${policy.target} · case ${cell.x}, ${cell.z}`;
    const content=document.createElement('div');
    if(policy.reason)content.textContent=policy.reason;
    else {
      if(policy.drafted<policy.selected){const note=document.createElement('p');note.className='muted';note.textContent=`${policy.selected-policy.drafted} membre(s) non mobilisé(s) ou indisponible(s) exclus.`;content.append(note);}
      for(const option of policy.options) {
        const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.dataset.tacticalAttack=option.kind;
        button.textContent=option.enabled?option.label:`${option.label} — ${option.reason ?? 'Indisponible'}`;
        button.disabled=!option.enabled;
        button.onclick=()=>{
          this.close();
          const command=option.kind==='shoot'
            ? {type:'shoot' as const,pawnIds:option.pawnIds,targetId}
            : {type:'melee' as const,pawnIds:option.pawnIds,targetId};
          void this.client.command(command).then(()=>this.report(`${option.kind==='shoot'?'Tir':'Mêlée'} demandé sur ${policy.target}.`)).catch(error=>this.report(String(error instanceof Error?error.message:error),true));
        };
        content.append(button);
      }
      if(queue){const hint=document.createElement('p');hint.className='muted';hint.textContent='Seuls les déplacements ont une file d’ordres tactiques.';content.append(hint);}
    }
    this.menu.append(header,content);this.position(x,y);this.menu.focus();
    content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }
  private tacticalMessage(title:string,message:string,x:number,y:number):void {
    this.menu.replaceChildren();this.menu.hidden=false;
    const header=document.createElement('strong');header.textContent=title;
    const body=document.createElement('div');body.textContent=message;
    this.menu.append(header,body);this.position(x,y);this.menu.focus();
  }
  async open(world:World,ids:ReadonlySet<number>,cell:Cell,x:number,y:number,queue:boolean):Promise<void> {
    this.close();const revision=this.revision;this.menu.replaceChildren();this.menu.hidden=false;
    const header=document.createElement('strong'),content=document.createElement('div');
    const pawn=ids.size===1?world.pawns.find(p=>ids.has(p.id)):undefined;
    header.textContent=pawn?`${pawn.name} · case ${cell.x}, ${cell.z}`:'Ordres de travail';
    content.textContent=pawn?'Vérification des accès…':'Sélectionnez un seul colon pour lui donner un travail.';
    this.menu.append(header,content);this.position(x,y);this.menu.focus();
    if(!pawn)return;
    if(!isColonist(pawn)){content.textContent=pawn.prisoner?'Les prisonniers se gèrent dans leur inspection. Ils ne reçoivent pas d’ordres de colon.':'Cette personne ne fait pas partie de la colonie.';this.position(x,y);return;}
    try {
      const options=await this.client.orderOptions(pawn.id,cell.x,cell.z,queue);
      if(revision!==this.revision)return;
      content.replaceChildren();
      for(const option of options) {
        const button=document.createElement('button');button.setAttribute('role','menuitem');button.dataset.orderJob=String(option.jobId);
        if(option.haulTarget)button.dataset.orderHaul=option.haulTarget.type;
        if(option.cookStationId!==undefined)button.dataset.orderCook=String(option.cookStationId);
        if(option.equipmentItemId!==undefined)button.dataset.orderEquipment=String(option.equipmentItemId);
        button.textContent=option.enabled?`${queue?'Mettre en file :':'Prioriser :'} ${option.label}`:`${option.label} — ${option.reason}`;
        button.disabled=!option.enabled;
        if(option.feedPatientId!==undefined)button.dataset.orderFeed=String(option.feedPatientId);
        if(option.tendPatientId!==undefined)button.dataset.orderTend=String(option.tendPatientId);
        if(option.rescuePatientId!==undefined)button.dataset.orderRescue=String(option.rescuePatientId);
        if(option.capturePatientId!==undefined)button.dataset.orderCapture=String(option.capturePatientId);
        button.onclick=event=>{
          this.close();void this.client.command(option.capturePatientId!==undefined
            ? {type:'order-capture',pawnId:pawn.id,patientId:option.capturePatientId,queue:queue||event.shiftKey}
            : option.equipmentItemId!==undefined
            ? {type:'order-equipment',pawnId:pawn.id,itemId:option.equipmentItemId,action:option.equipmentAction!,queue:queue||event.shiftKey}
            : option.feedPatientId!==undefined
            ? {type:'order-feed',pawnId:pawn.id,patientId:option.feedPatientId,queue:queue||event.shiftKey}
            : option.tendPatientId!==undefined
            ? {type:'order-tend',pawnId:pawn.id,patientId:option.tendPatientId,queue:queue||event.shiftKey}
            : option.rescuePatientId!==undefined
            ? {type:'order-rescue',pawnId:pawn.id,patientId:option.rescuePatientId,queue:queue||event.shiftKey}
            : option.cookStationId!==undefined
            ? {type:'order-cook',pawnId:pawn.id,structureId:option.cookStationId,queue:queue||event.shiftKey}
            : option.haulTarget
            ? {type:'order-haul',pawnId:pawn.id,target:option.haulTarget,queue:queue||event.shiftKey}
            : {type:'order-job',pawnId:pawn.id,jobId:option.jobId,queue:queue||event.shiftKey})
            .then(()=>this.report('Ordre accepté.')).catch(error=>this.report(String(error instanceof Error?error.message:error),true));
        };
        content.append(button);
      }
      const fire=world.fires?.items.find(f=>{const at=firePosition(world,f);return at?.x===cell.x&&at?.z===cell.z;});
      if(fire){const button=document.createElement('button');button.setAttribute('role','menuitem');button.dataset.orderFire=String(fire.id);button.textContent='Prioriser : éteindre le feu';button.onclick=()=>{this.close();void this.client.command({type:'order-extinguish',pawnId:pawn.id,fireId:fire.id}).then(()=>this.report('Extinction prioritaire demandée.')).catch(error=>this.report(String(error instanceof Error?error.message:error),true));};content.append(button);}
      if(!options.length&&!fire)content.textContent='Aucun travail ni pile à transporter ici. Utilisez les ordres d’Architecte.';
      const hint=document.createElement('p');hint.className='muted';hint.textContent=fire?'L’extinction est un ordre direct, sans mise en file.':options.some(option=>option.capturePatientId!==undefined)?'La capture est un ordre direct. Préparez un lit de prison dans une pièce fermée.':'Maj : ajouter à la file. Construction et cuisine peuvent se poursuivre sur cette case.';content.append(hint);
      this.position(x,y);content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    } catch(error) {if(revision===this.revision){content.textContent=String(error instanceof Error?error.message:error);this.position(x,y);}}
  }
  private position(x:number,y:number):void {
    this.menu.style.left=`${Math.max(8,Math.min(x,window.innerWidth-this.menu.offsetWidth-8))}px`;
    this.menu.style.top=`${Math.max(8,Math.min(y,window.innerHeight-this.menu.offsetHeight-8))}px`;
  }
}
