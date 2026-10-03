import { MALNUTRITION_UNIT,MALNUTRITION_LABELS,malnutritionStage } from '../sim/malnutrition';
import { HEAT_UNIT,HEAT_LABELS,heatStage } from '../sim/heat-rules';
import { BODY_PARTS,HUMAN_BODY } from '../sim/body-definition';
import { BLOOD_UNIT,HP_UNIT,INJURY_RULES } from '../sim/injury-rules';
import { medicalBleed,medicalPain } from '../sim/injury-state';
import { pawnBody } from '../sim/health-rules';
import type { Pawn,Command,World } from '../sim/types';
import { MEDICAL_CARE,medicalCare,type MedicalCare } from '../sim/medicine-rules';
import { createInfectionInspection,updateInfectionInspection } from './infection-inspection';
import { createFluInspection,updateFluInspection } from './flu-inspection';
import { foodPoisoningStage,FOOD_POISON_UNIT } from '../sim/food-poisoning';
import { bodyDescription } from './burial-controls';
import { isCarePatient } from '../sim/affiliation';
import { SURGERY_PARTS,surgeryRequestReason } from '../sim/surgery-rules';
import type { SurgicalLimb } from '../sim/surgery-anatomy';
import { ANESTHETIC_UNIT,anestheticStage } from '../sim/anesthetic';

export interface SurgeryInspectionActions {
  request:(pawnId:number,part:SurgicalLimb)=>void;
  cancel:(pawnId:number)=>void;
}

/** Request projection only: the clinical command owns admission, cancellation,
 * reservations and anatomy. The inspector never invents an operation result. */
export function healthSurgeryView(pawn:Pawn,world?:World) {
  const request=pawn.surgeryRequest,doctor=world?.pawns.find(p=>p.surgery?.patientId===pawn.id);
  const phase=doctor?.surgery?.phase;
  const status=request
    ?`Amputation demandée : ${BODY_PARTS[request.part].label.toLocaleLowerCase('fr-FR')} · ${phase==='work'?'opération en cours':phase==='pickup'?'collecte du médicament':phase==='approach'?'approche du chevet':'en attente du lit, du médecin et du médicament'}.`
    :'Aucune amputation demandée.';
  return {status,canCancel:!!request&&pawn.state!=='dead'&&!pawn.health?.death,
    choices:SURGERY_PARTS.map(part=>({part,label:BODY_PARTS[part].label,
      reason:request?'Une opération est déjà demandée pour ce colon.':surgeryRequestReason(pawn,part)}))};
}

/** Re-read the selected snapshot at click time; stale controls never send a
 * replacement request or make a missing member. Worker validation still owns
 * races between this display and the command's actual acknowledgement. */
export function requestInspectedAmputation(pawn:Pawn|undefined,part:SurgicalLimb,actions:SurgeryInspectionActions):string|undefined {
  const reason=!pawn?'Aucun colon sélectionné.':pawn.surgeryRequest?'Une opération est déjà demandée pour ce colon.':surgeryRequestReason(pawn,part);
  if(reason)return reason;
  actions.request(pawn!.id,part);return undefined;
}
export function cancelInspectedAmputation(pawn:Pawn|undefined,actions:SurgeryInspectionActions):boolean {
  if(!pawn?.surgeryRequest||pawn.state==='dead'||pawn.health?.death)return false;
  actions.cancel(pawn.id);return true;
}
export function healthAnestheticText(pawn:Pawn):string {
  const state=pawn.health?.anesthetic;if(!state)return '';
  const stage=anestheticStage(state.severity),label=stage==='sedated'?'sédation':stage==='woozy'?'réveil progressif':'dissipation';
  return `Anesthésie · ${label} · ${(state.severity/ANESTHETIC_UNIT*100).toFixed(1)} %.${pawn.state==='dead'?' Dossier arrêté au décès.':''}`;
}

const CAPACITY_LABELS = [
  ['consciousness','Conscience'],['moving','Mouvement'],['manipulation','Manipulation'],
  ['talking','Parole'],['eating','Alimentation'],['sight','Vue'],['hearing','Ouïe'],
  ['breathing','Respiration'],['bloodFiltration','Filtrage du sang'],
  ['bloodPumping','Pompage du sang'],['digestion','Digestion'],
] as const;

export function healthCapacityRows(pawn:Pawn):ReadonlyArray<{label:string;value:string}> {
  if(pawn.state==='dead')return [];
  const c=pawnBody(pawn).capacities;
  return [
    {label:'Douleur',value:pawn.health&&medicalPain(pawn.health)>0?`${Math.round(medicalPain(pawn.health)*100)} %`:'Aucune'},
    ...CAPACITY_LABELS.map(([key,label])=>({label,value:`${Math.round(c[key]*100)} %`})),
  ];
}

/** Anatomical order follows the visible health tree, rather than injury time. */
export function healthInjuryRows(pawn:Pawn):ReadonlyArray<{part:string;description:string}> {
  const health=pawn.health;if(!health)return [];
  const order=new Map(HUMAN_BODY.map((part,index)=>[part.id,index]));
  return [
    ...health.injuries.map(i=>({partId:i.part,part:BODY_PARTS[i.part].label,description:`${i.scar?.pain!==undefined?'Cicatrice':INJURY_RULES[i.kind].label} · −${(i.severity/HP_UNIT).toFixed(2)} PV${i.tended!==undefined?` · soignée (${Math.round(i.tended/10)} %)` :''}`})),
    ...health.missing.map(m=>({partId:m.part,part:BODY_PARTS[m.part].label,description:`Partie perdue${m.tended?' · plaie soignée':''}`})),
    ...(health.ageAilments??[]).map(kind=>kind==='bad-back'
      ?{partId:'spine' as const,part:'Colonne vertébrale',description:'Lumbago'}
      :{partId:'torso' as const,part:'Torse',description:'Frêle'}),
  ].sort((a,b)=>(order.get(a.partId)??Infinity)-(order.get(b.partId)??Infinity)).map(({part,description})=>({part,description}));
}

export function createHealthInspection(panel:HTMLElement,selected?:()=>Pawn|undefined,send?:(c:Command)=>void,allowSelfTend=true,surgery?:SurgeryInspectionActions):void {
  const details=document.createElement('details');details.id='health-inspection';details.open=true;
  const summary=document.createElement('summary');summary.textContent='Santé';details.append(summary);
  const layout=document.createElement('div');layout.className='health-dossier';
  const overview=document.createElement('section');overview.className='health-overview';
  const overviewTitle=document.createElement('h4');overviewTitle.textContent='Vue d’ensemble';overview.append(overviewTitle);
  if(selected&&send){
    const label=document.createElement('label'),input=document.createElement('select');input.id='medical-policy';
    for(const [value,name] of Object.entries(MEDICAL_CARE)){const o=document.createElement('option');o.value=value;o.textContent=name;input.append(o);}
    input.onchange=()=>{const p=selected();if(p)send({type:'medical-care',pawnId:p.id,care:input.value as MedicalCare});};
    label.append('Médecine ',input);overview.append(label);
    if(allowSelfTend){const selfLabel=document.createElement('label'),selfInput=document.createElement('input');selfInput.type='checkbox';selfInput.id='self-tend-policy';
      selfInput.onchange=()=>{const p=selected();if(p)send({type:'self-tend-policy',pawnId:p.id,enabled:selfInput.checked});};
      selfLabel.append('Auto-soin ',selfInput);selfLabel.title='Requiert le travail Médecin. La qualité de soin suit les règles de la simulation.';overview.append(selfLabel);
      const hint=document.createElement('small');hint.dataset.health='self-tend-hint';overview.append(hint);
    }
  }
  const status=document.createElement('p');status.dataset.health='status';status.className='health-status';overview.append(status);
  const capacities=document.createElement('dl');capacities.dataset.health='capacities';capacities.className='health-capacities';overview.append(capacities);
  const conditions=document.createElement('section');conditions.className='health-conditions';
  const conditionsTitle=document.createElement('h4');conditionsTitle.textContent='Affections';conditions.append(conditionsTitle);
  const injuries=document.createElement('div');injuries.dataset.health='injuries';injuries.className='health-injury-list';conditions.append(injuries);
  createInfectionInspection(conditions);createFluInspection(conditions);
  for(const name of ['food-poisoning','malnutrition','thermal','stagger','anesthetic']){
    const p=document.createElement('p');p.dataset.health=name;conditions.append(p);
  }
  layout.append(overview,conditions);details.append(layout);
  if(selected&&surgery){
    const operations=document.createElement('section');operations.dataset.health='surgery';operations.className='health-conditions';
    const title=document.createElement('h4');title.textContent='Amputation thérapeutique';operations.append(title);
    const warning=document.createElement('p');warning.textContent='Continuer les soins et attendre l’immunité reste possible. Une amputation est définitive ; l’opération peut échouer et causer des lésions.';operations.append(warning);
    const request=document.createElement('p');request.dataset.health='surgery-request';operations.append(request);
    for(const part of SURGERY_PARTS){
      const row=document.createElement('p'),button=document.createElement('button');button.type='button';button.dataset.surgeryPart=part;
      button.textContent=`Demander : ${BODY_PARTS[part].label.toLocaleLowerCase('fr-FR')}`;button.disabled=true;
      const reason=document.createElement('small');reason.dataset.surgeryReason=part;
      button.onclick=()=>{const refusal=requestInspectedAmputation(selected(),part,surgery);if(refusal)request.textContent=refusal;};
      row.append(button,document.createTextNode(' '),reason);operations.append(row);
    }
    const cancel=document.createElement('button');cancel.type='button';cancel.dataset.surgeryCancel='true';cancel.textContent='Annuler la demande';cancel.disabled=true;
    cancel.onclick=()=>{cancelInspectedAmputation(selected(),surgery);};operations.append(cancel);
    const hint=document.createElement('p');hint.textContent='La demande prépare un vrai lit, un médecin et un médicament autorisé. Annuler après administration ne rembourse pas la dose et ne retire pas l’anesthésie.';operations.append(hint);
    details.append(operations);
  }
  panel.append(details);
}

export function healthStatusText(pawn:Pawn,world?:World):string {
  if(pawn.state==='dead')return world?bodyDescription(world,pawn):'Décédé';
  const health=pawn.health;
  if(!health)return 'Aucune lésion';
  return `${pawn.state==='downed'?'À terre · ':''}${health.flu?.severity?'Malade · ':''}Douleur ${Math.round(medicalPain(health)*100)} % · Sang perdu ${(health.bloodLoss/BLOOD_UNIT*100).toFixed(1)} % · Saignement ${(medicalBleed(health)*100).toFixed(0)} %/jour`;
}

/** Selected pawn only, at HUD cadence. Save strings never enter innerHTML. */
export function updateHealthInspection(panel:HTMLElement,pawn:Pawn,world?:World):void {
  const details=panel.querySelector('#health-inspection');if(!details)return;
  const health=pawn.health;
  const anesthetic=details.querySelector('[data-health="anesthetic"]');if(anesthetic)anesthetic.textContent=healthAnestheticText(pawn);
  const surgery=details.querySelector('[data-health="surgery"]');if(surgery){
    const view=healthSurgeryView(pawn,world);surgery.querySelector('[data-health="surgery-request"]')!.textContent=view.status;
    for(const choice of view.choices){
      const button=surgery.querySelector<HTMLButtonElement>(`[data-surgery-part="${choice.part}"]`)!;
      button.disabled=choice.reason!==undefined;button.title=choice.reason??'Demander cette amputation ; l’anatomie ne change qu’après l’opération réelle.';
      surgery.querySelector(`[data-surgery-reason="${choice.part}"]`)!.textContent=choice.reason??'Infection présente sur ce membre.';
    }
    surgery.querySelector<HTMLButtonElement>('[data-surgery-cancel]')!.disabled=!view.canCancel;
  }
  updateInfectionInspection(details,health);
  updateFluInspection(details,health);
  const poison=health?.foodPoisoning;
  details.querySelector('[data-health="food-poisoning"]')!.textContent=poison?`Intoxication alimentaire · ${{none:'récupération',initial:'phase initiale',major:'phase majeure',recovering:'récupération'}[foodPoisoningStage(poison)]} · ${(100*poison.severity/FOOD_POISON_UNIT).toFixed(1)} %${poison.vomit?' · vomissements':''}`:'';
  details.querySelector('[data-health="malnutrition"]')!.textContent=health?.malnutrition?`Malnutrition ${MALNUTRITION_LABELS[malnutritionStage(health.malnutrition)]} · ${(health.malnutrition/MALNUTRITION_UNIT*100).toFixed(1)} %`:'';
  const stage=heatStage(health?.heatstroke),coldStage=heatStage(health?.hypothermia);
  details.querySelector('[data-health="thermal"]')!.textContent=(stage?`Coup de chaleur ${HEAT_LABELS[stage]} · ${(100*health!.heatstroke!/HEAT_UNIT).toFixed(1)} %. `:'')+(coldStage?`Hypothermie ${HEAT_LABELS[coldStage]} · ${(100*health!.hypothermia!/HEAT_UNIT).toFixed(1)} %.`:'');
  details.querySelector('[data-health="stagger"]')!.textContent=pawn.stagger?'Ralenti temporairement par un impact de balle.':'';
  const policy=details.querySelector<HTMLSelectElement>('#medical-policy');if(policy){policy.value=medicalCare(pawn);policy.disabled=pawn.state==='dead'||!isCarePatient(pawn);}
  const self=details.querySelector<HTMLInputElement>('#self-tend-policy');if(self){self.checked=!!pawn.selfTend;self.disabled=pawn.state==='dead';}
  const hint=details.querySelector('[data-health="self-tend-hint"]');if(hint)hint.textContent=pawn.selfTend&&pawn.priorities.doctor===0?'Auto-soins autorisés, mais Médecin est désactivé dans Travail.':'';
  details.querySelector('[data-health="status"]')!.textContent=healthStatusText(pawn,world);
  const capacities=details.querySelector<HTMLElement>('[data-health="capacities"]')!;
  const rows=healthCapacityRows(pawn),signature=JSON.stringify(rows);
  if(capacities.dataset.signature!==signature){capacities.dataset.signature=signature;capacities.replaceChildren(...rows.flatMap(({label,value})=>{
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dd.dataset.reduced=String(value!=='100 %'&&value!=='Aucune');return [dt,dd];
  }));}
  const injuries=details.querySelector<HTMLElement>('[data-health="injuries"]')!,injuryRows=healthInjuryRows(pawn),injurySignature=JSON.stringify(injuryRows);
  if(injuries.dataset.signature!==injurySignature){injuries.dataset.signature=injurySignature;injuries.replaceChildren(...injuryRows.map(({part,description})=>{
    const row=document.createElement('p');row.className='health-injury-row';
    const name=document.createElement('strong');name.textContent=part;const detail=document.createElement('span');detail.textContent=description;
    row.append(name,detail);return row;
  }));}
}
