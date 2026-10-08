import type { Command,Pawn,World } from '../sim/types';
import { prisonBreakActive } from '../sim/prison-break-state.ts';
import { prisonBreakMtbDays } from '../sim/prison-break.ts';

const MODES={maintain:'Soins et nourriture',reduce:'Réduire la résistance',recruit:'Recruter',release:'Libérer'} as const;

type ReleasePatient=Pick<Pawn,'id'|'state'|'prisoner'>;
type ReleaseWarden=Pick<Pawn,'id'|'name'|'rescue'>;

/** Describe the physical release without promising recovery or a departure date. */
export function prisonerReleaseInspection(world:{pawns:readonly ReleaseWarden[]},pawn:ReleasePatient):{status:string;hint:string;modeDisabled:boolean}|undefined {
  const p=pawn.prisoner;if(!p||pawn.state==='dead'||p.mode!=='release')return;
  if(p.releasedAt!==undefined)return {
    status:pawn.state==='downed'?'Prisonnier libéré · À terre, ne peut pas encore quitter la carte.':'Prisonnier libéré · Quitte la carte par ses propres moyens.',
    hint:'La libération est effective et ne peut plus être annulée. Les blessures et besoins restent réels ; le départ attend un trajet praticable.',modeDisabled:true,
  };
  const actor=world.pawns.find(a=>a.rescue?.release&&a.rescue.patientId===pawn.id);
  if(actor)return {
    status:actor.rescue!.phase==='carry'?`Libération · ${actor.name} porte le prisonnier vers la sortie.`:`Libération · Prise en charge par ${actor.name}, geôlier en route.`,
    hint:'Le geôlier porte la personne jusqu’à une zone reliée au bord, puis elle repart seule. Les blessures ne sont pas guéries par la libération.',modeDisabled:false,
  };
  return {
    status:pawn.state==='downed'?'Libération demandée · Attend de pouvoir se relever.':'Libération demandée · Attend la prise en charge par un geôlier.',
    hint:'Un geôlier disponible doit pouvoir atteindre le prisonnier et une sortie. Les soins et la nourriture restent nécessaires ; vous pouvez encore changer la consigne avant la libération effective.',modeDisabled:false,
  };
}

/** A captive is inspectable and receives care policies, never colonist orders. */
export function createPrisonerInspection(panel:HTMLElement,current:()=>{world:World;pawn:Pawn}|undefined,send:(command:Command)=>void):void {
  const box=document.createElement('section');box.id='prisoner-inspection';box.setAttribute('aria-label','Prisonnier');
  const status=document.createElement('p');status.id='prisoner-status';
  const risk=document.createElement('p');risk.id='prisoner-break-risk';risk.className='muted';
  const resistance=document.createElement('p');resistance.id='prisoner-resistance';
  const progress=document.createElement('progress');progress.id='prisoner-resistance-progress';progress.setAttribute('aria-label','Résistance restante');
  const modeLabel=document.createElement('label'),mode=document.createElement('select');mode.id='prisoner-mode';mode.setAttribute('aria-label','Interaction avec le prisonnier');
  for(const [id,label] of Object.entries(MODES))mode.append(new Option(label,id));
  mode.onchange=()=>{const s=current();if(s?.pawn.prisoner&&!prisonBreakActive(s.pawn)&&s.pawn.state!=='dead'&&s.pawn.prisoner.releasedAt===undefined)send({type:'prisoner-mode',patientId:s.pawn.id,mode:mode.value as keyof typeof MODES});};
  modeLabel.append('Interaction ',mode);
  const hint=document.createElement('p');hint.id='prisoner-mode-hint';hint.className='muted';
  const needs=document.createElement('p');needs.id='prisoner-needs';
  const foodLabel=document.createElement('label'),food=document.createElement('select');food.id='prisoner-food-policy';food.setAttribute('aria-label','Régime alimentaire du prisonnier');
  food.onchange=()=>{const s=current();if(s?.pawn.prisoner)send({type:'food-policy-assign',pawnId:s.pawn.id,policyId:Number(food.value)});};
  foodLabel.append('Régime alimentaire ',food);
  const care=document.createElement('p');care.className='muted';care.textContent='Geôlier apporte la nourriture et mène les conversations. Médecin assure les soins. Les régimes partagés se modifient dans Assignations.';
  box.append(status,risk,resistance,progress,modeLabel,hint,needs,foodLabel,care);panel.append(box);
}

export function updatePrisonerInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  const box=panel.querySelector<HTMLElement>('#prisoner-inspection'),p=pawn.prisoner;if(!box||!p)return;
  box.dataset.prisonerId=String(pawn.id);
  const bedId=pawn.need?.kind==='sleep'&&pawn.need.bedId!==null?pawn.need.bedId:pawn.bedId;
  const bed=world.structures.find(s=>s.id===bedId&&s.prisoner);
  const release=prisonerReleaseInspection(world,pawn);
  const rebelling=prisonBreakActive(pawn),mtb=prisonBreakMtbDays(world,pawn,true);
  box.querySelector('#prisoner-status')!.textContent=pawn.state==='dead'?'Prisonnier décédé':rebelling?'Révolte : force le passage et cherche à quitter la carte.':release?.status??(p.escape?'Évasion : cherche à quitter la carte par une ouverture.':`Prisonnier de la colonie · ${bed?`lit${bed.medical?' médical':''} en ${bed.x}, ${bed.z}`:'aucun lit de prison attribué'}`);
  box.querySelector('#prisoner-break-risk')!.textContent=rebelling?'Les révoltés peuvent ouvrir les portes et combattent les défenseurs proches. La mise à terre met fin à leur participation.':mtb>0?`Révolte : intervalle moyen individuel ${mtb.toFixed(1)} jours. Le sommeil suspend le déclenchement ; une participation récente réduit le risque.`:'Aucun déclenchement de révolte possible dans cet état ou hors cellule fermée.';
  box.querySelector('#prisoner-resistance')!.textContent=`Résistance : ${p.resistance.toFixed(1)} / ${p.initialResistance.toFixed(1)}`;
  const progress=box.querySelector<HTMLProgressElement>('#prisoner-resistance-progress')!;progress.max=Math.max(1,p.initialResistance);progress.value=p.resistance;
  const mode=box.querySelector<HTMLSelectElement>('#prisoner-mode')!;mode.value=p.mode;mode.disabled=pawn.state==='dead'||p.releasedAt!==undefined||rebelling;
  box.querySelector('#prisoner-mode-hint')!.textContent=rebelling?'La consigne reste mémorisée et reprendra après la répression et les soins nécessaires.':release?.hint??(p.mode==='maintain'?'Le geôlier assure la nourriture, sans chercher à recruter.':p.resistance>0?'Les conversations réduisent progressivement la résistance. Aucun délai de recrutement n’est garanti.':p.mode==='recruit'?'Résistance épuisée : une prochaine conversation de recrutement peut faire rejoindre la colonie.':'Résistance épuisée. Choisissez Recruter pour demander son adhésion lors d’une prochaine conversation.');
  box.querySelector('#prisoner-needs')!.textContent=pawn.state==='dead'?'':`Nourriture ${Math.round(pawn.hunger)} % · Repos ${Math.round(pawn.rest)} % · Humeur ${Math.round(pawn.mood)} %`;
  const food=box.querySelector<HTMLSelectElement>('#prisoner-food-policy')!,signature=JSON.stringify(world.foodPolicies.map(f=>[f.id,f.name]));
  if(food.dataset.signature!==signature){food.dataset.signature=signature;food.replaceChildren(...world.foodPolicies.map(f=>new Option(f.name,String(f.id))));}
  food.value=String(pawn.foodPolicyId);food.disabled=pawn.state==='dead';
}
