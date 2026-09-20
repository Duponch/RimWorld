import type { Command,Pawn,World } from '../sim/types';
import { createHealthInspection,updateHealthInspection } from './health-inspection';
import { createEquipmentInspection,updateEquipmentInspection } from './equipment-inspection';
import { createSkillsInspection,updateSkillsInspection } from './skills-inspection';
import { createSocialInspection,updateSocialInspection } from './social-inspection';
import { createMoodInspection,updateMoodInspection } from './mood-inspection';

const MODES={maintain:'Soins et nourriture',reduce:'Réduire la résistance',recruit:'Recruter'} as const;

/** A captive is inspectable and receives care policies, never colonist orders. */
export function createPrisonerInspection(panel:HTMLElement,current:()=>{world:World;pawn:Pawn}|undefined,send:(command:Command)=>void,onOpen:()=>void):void {
  const box=document.createElement('section');box.id='prisoner-inspection';box.setAttribute('aria-label','Prisonnier');
  const status=document.createElement('p');status.id='prisoner-status';
  const resistance=document.createElement('p');resistance.id='prisoner-resistance';
  const progress=document.createElement('progress');progress.id='prisoner-resistance-progress';progress.setAttribute('aria-label','Résistance restante');
  const modeLabel=document.createElement('label'),mode=document.createElement('select');mode.id='prisoner-mode';mode.setAttribute('aria-label','Interaction avec le prisonnier');
  for(const [id,label] of Object.entries(MODES))mode.append(new Option(label,id));
  mode.onchange=()=>{const s=current();if(s?.pawn.prisoner)send({type:'prisoner-mode',patientId:s.pawn.id,mode:mode.value as keyof typeof MODES});};
  modeLabel.append('Interaction ',mode);
  const hint=document.createElement('p');hint.id='prisoner-mode-hint';hint.className='muted';
  const needs=document.createElement('p');needs.id='prisoner-needs';
  const foodLabel=document.createElement('label'),food=document.createElement('select');food.id='prisoner-food-policy';food.setAttribute('aria-label','Régime alimentaire du prisonnier');
  food.onchange=()=>{const s=current();if(s?.pawn.prisoner)send({type:'food-policy-assign',pawnId:s.pawn.id,policyId:Number(food.value)});};
  foodLabel.append('Régime alimentaire ',food);
  const care=document.createElement('p');care.className='muted';care.textContent='Geôlier apporte la nourriture et mène les conversations. Médecin assure les soins. Les régimes partagés se modifient dans Affectations.';
  box.append(status,resistance,progress,modeLabel,hint,needs,foodLabel,care);panel.append(box);
  createHealthInspection(panel,()=>current()?.pawn,send,false);
  createEquipmentInspection(panel,current,()=>{});
  createSkillsInspection(panel);createSocialInspection(panel,onOpen);createMoodInspection(panel);
}

export function updatePrisonerInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  const box=panel.querySelector<HTMLElement>('#prisoner-inspection'),p=pawn.prisoner;if(!box||!p)return;
  box.dataset.prisonerId=String(pawn.id);
  const bedId=pawn.need?.kind==='sleep'&&pawn.need.bedId!==null?pawn.need.bedId:pawn.bedId;
  const bed=world.structures.find(s=>s.id===bedId&&s.prisoner);
  box.querySelector('#prisoner-status')!.textContent=pawn.state==='dead'?'Prisonnier décédé':p.escape?'Évasion : cherche à quitter la carte par une ouverture.':`Prisonnier de la colonie · ${bed?`lit${bed.medical?' médical':''} en ${bed.x}, ${bed.z}`:'aucun lit de prison attribué'}`;
  box.querySelector('#prisoner-resistance')!.textContent=`Résistance : ${p.resistance.toFixed(1)} / ${p.initialResistance.toFixed(1)}`;
  const progress=box.querySelector<HTMLProgressElement>('#prisoner-resistance-progress')!;progress.max=Math.max(1,p.initialResistance);progress.value=p.resistance;
  const mode=box.querySelector<HTMLSelectElement>('#prisoner-mode')!;mode.value=p.mode;mode.disabled=pawn.state==='dead';
  box.querySelector('#prisoner-mode-hint')!.textContent=p.mode==='maintain'?'Le geôlier assure la nourriture, sans chercher à recruter.':p.resistance>0?'Les conversations réduisent progressivement la résistance. Aucun délai de recrutement n’est garanti.':p.mode==='recruit'?'Résistance épuisée : une prochaine conversation de recrutement peut faire rejoindre la colonie.':'Résistance épuisée. Choisissez Recruter pour demander son adhésion lors d’une prochaine conversation.';
  box.querySelector('#prisoner-needs')!.textContent=pawn.state==='dead'?'':`Nourriture ${Math.round(pawn.hunger)} % · Repos ${Math.round(pawn.rest)} % · Humeur ${Math.round(pawn.mood)} %`;
  const food=box.querySelector<HTMLSelectElement>('#prisoner-food-policy')!,signature=JSON.stringify(world.foodPolicies.map(f=>[f.id,f.name]));
  if(food.dataset.signature!==signature){food.dataset.signature=signature;food.replaceChildren(...world.foodPolicies.map(f=>new Option(f.name,String(f.id))));}
  food.value=String(pawn.foodPolicyId);food.disabled=pawn.state==='dead';
  updateHealthInspection(panel,pawn,world);updateEquipmentInspection(panel,world,pawn);updateSkillsInspection(panel,pawn);updateSocialInspection(panel,world,pawn);updateMoodInspection(panel,world,pawn);
}
