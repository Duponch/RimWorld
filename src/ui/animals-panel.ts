import {actualAnimalName256} from '../sim/starting-pet-state-256';
import {animalSpecies} from '../sim/animal-species';
import {MEDICAL_CARE} from '../sim/medicine-rules';
import {TICKS_PER_DAY,type World} from '../sim/types';
import {animalBody} from '../sim/wildlife-health';
import {animalPenStatus} from './pen-status';
import {penRegion} from '../sim/animal-pens';
import {ANIMAL_PRODUCTS,productFullness,productKind} from '../sim/animal-products';
import {animalLifeStage,animalNutritionMax,gestationTicks} from '../sim/animal-life';
import {setTooltip} from './tooltip';
import {slaughterRefusal} from '../sim/animal-slaughter';
import {autoSlaughterTargets} from '../sim/auto-slaughter';
import {animalActivity} from './animal-activity';
import {autoSlaughterScaffold,updateAutoSlaughterPanel,type AutoSlaughterSend} from './auto-slaughter-panel';
import './management-reference-v199.css';
import {isSchema282OrLater} from '../sim/schema-compatibility-257';
import {readAnimalTraining282,trainingRefusal282} from '../sim/animal-training-282';
import {createAnimalAreaControls287,type AnimalAreaActions287} from './animal-area-287';
import {supportsAnimalAreas287,currentAnimalAreaChoice287} from '../sim/animal-area-policy-287';

interface DomesticRow { locate:HTMLButtonElement; cells:HTMLElement[]; slaughter:HTMLInputElement;training?:HTMLInputElement;trainingStatus?:HTMLElement;area?:ReturnType<typeof createAnimalAreaControls287> }
const stageLabel={baby:'Petit',juvenile:'Jeune',adult:'Adulte'} as const;
const domesticRows=new WeakMap<HTMLElement,Map<number,DomesticRow>>();

/** Owned animals remain physical wildlife actors. The panel is a filtered view
 * of those actual identities, not a separate counter or promised training UI. */
export function animalsPanelScaffold():string {
  return autoSlaughterScaffold()+'<p class="muted" data-domestic-empty>Aucun animal domestique.</p><div class="domestic-list domestic-table-wrap" data-domestic-list></div>';
}

export function updateAnimalsPanel(root:HTMLElement,world:World,focus:(id:number)=>void,slaughter?:(id:number,enabled:boolean)=>void,autoSlaughter?:AutoSlaughterSend,training?:(id:number,skill:'obedience'|'haul',wanted:boolean)=>void,animalAreas?:AnimalAreaActions287):void {
  if(!root.querySelector('[data-domestic-list]'))root.innerHTML=animalsPanelScaffold();
  updateAutoSlaughterPanel(root,world,autoSlaughter);
  const animals=world.wildlife?.animals.filter(a=>!!a.domestic&&a.state!=='dead')??[];
  root.querySelector<HTMLElement>('[data-domestic-empty]')!.hidden=animals.length>0;
  const list=root.querySelector<HTMLElement>('[data-domestic-list]')!;
  const areaAvailable=Number(world.schemaVersion)===287,trainingAvailable=isSchema282OrLater(world.schemaVersion),ids=`${areaAvailable}:${!!animalAreas}:${trainingAvailable}:`+animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==ids){
    for(const row of domesticRows.get(list)?.values()??[])row.area?.dispose();
    list.dataset.ids=ids;
    const rows=new Map<number,DomesticRow>();
    const table=document.createElement('table');table.className='domestic-table';
    table.innerHTML='<thead><tr><th scope="col">Nom</th><th scope="col">Sexe</th><th scope="col">Âge</th><th scope="col">Maturité</th><th scope="col">Soins</th><th scope="col">'+(areaAvailable?'Zone / Enclos':'Enclos')+'</th><th scope="col">Production</th><th scope="col">État</th>'+(trainingAvailable?'<th scope="col">Entraîner au transport</th>':'')+'<th scope="col">Abattre</th></tr></thead><tbody></tbody>';
    const body=table.querySelector('tbody')!;
    body.append(...animals.map(a=>{
      const row=document.createElement('tr');row.className='domestic-row';row.dataset.domesticAnimal=String(a.id);row.dataset.domesticDetails=String(a.id);
      const name=document.createElement('th');name.scope='row';
      const locate=document.createElement('button');locate.type='button';locate.dataset.domesticFocus=String(a.id);
      locate.onclick=()=>focus(a.id);
      name.append(locate);
      const cells=Array.from({length:7},()=>document.createElement('td'));
      const slaughterCell=document.createElement('td'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.domesticSlaughter=String(a.id);
      checkbox.setAttribute('aria-label',`Abattre ${animalSpecies(a.species).label} ${a.id}`);slaughterCell.append(checkbox);
      const trainingCell=trainingAvailable?document.createElement('td'):undefined,train=trainingCell?document.createElement('input'):undefined,trainingStatus=trainingCell?document.createElement('small'):undefined;
      if(train&&trainingCell&&trainingStatus){train.type='checkbox';train.dataset.domesticTrain=String(a.id);train.setAttribute('aria-label',`Entraîner au transport ${actualAnimalName256(a)??animalSpecies(a.species).label} ${a.id}`);trainingCell.append(train,trainingStatus);}
      const area=areaAvailable&&animalAreas&&supportsAnimalAreas287(a.species)?createAnimalAreaControls287(a.id,animalAreas,{compact:true}):undefined;if(area)cells[4]!.append(area.element);
      rows.set(a.id,{locate,cells,slaughter:checkbox,training:train,trainingStatus,area});
      row.append(name,...cells,...(trainingCell?[trainingCell]:[]),slaughterCell);return row;
    }));
    list.replaceChildren(table);
    const labels=table.querySelectorAll<HTMLElement>('thead th');
    setTooltip(labels[4]!,{title:'Soins',body:'La politique médicale se règle dans le dossier Santé de l’animal. Un médecin apporte les médicaments autorisés et soigne au contact.'});
    setTooltip(labels[5]!,{title:areaAvailable?'Zone / Enclos':'Enclos',body:areaAvailable?'Les animaux concernés choisissent leurs activités dans leur zone autorisée ; les trajets peuvent passer dehors. Les animaux d’enclos gardent leur marqueur et leur conduite physique.':'Le marqueur attribué et le périmètre physique déterminent cet état. Un dresseur conduit les herbivores ; le lièvre reste libre.'});
    setTooltip(labels[6]!,{title:'Production',body:'Un adulte possédé produit selon son espèce et son sexe. Animaux actif : un colon rejoint la bête pour traire ou tondre une jauge pleine.'});
    setTooltip(labels[labels.length-1]!,{title:'Abattre manuellement',body:'Cette case désigne un animal individuellement. Les quotas du troupeau restent indépendants : décocher ici ne retire pas une cible automatique.'});
    if(trainingAvailable)setTooltip(labels[8]!,{title:'Demander le dressage au transport',body:'Demande les leçons et leurs prérequis. Décocher conserve les aptitudes apprises ; le transport est ensuite automatique. Le dossier de l’animal détaille progression et refus.'});
    domesticRows.set(list,rows);
  }
  const rows=domesticRows.get(list);
  const regions=new Map<number,ReturnType<typeof penRegion>>();
  const quotaTargets=autoSlaughterTargets(world);
  const productTasks=new Map(world.pawns.filter(pawn=>pawn.animalHandling?.kind==='milk'||pawn.animalHandling?.kind==='shear')
    .map(pawn=>[pawn.animalHandling!.animalId,pawn.animalHandling!] as const));
  for(const a of animals){
    const species=animalSpecies(a.species);
    const row=rows?.get(a.id);if(!row)continue;
    row.locate.textContent=actualAnimalName256(a)??`${species.label} ${a.id}`;
    row.locate.setAttribute('aria-label',`Repérer ${species.label} ${a.id}`);
    const condition=animalActivity(world,a,quotaTargets);
    const mobility=Math.round(animalBody(a).capacities.moving*100);
    const usesArea=areaAvailable&&supportsAnimalAreas287(a.species),pen=usesArea?undefined:animalPenStatus(world,a,regions),choice=usesArea?currentAnimalAreaChoice287(world,a):null;
    const areaLabel=choice===null?'Sans restriction':choice.kind==='home'?'Zone de foyer':world.allowedAreas?.find(area=>area.id===choice.areaId)?.label??'Zone indisponible';
    const product=productKind(a);
    const active=productTasks.get(a.id);
    const productTask=product&&active?.kind===product?active:undefined;
    const productText=product?`${product==='milk'?'Lait':'Laine'} ${Math.round(100*Math.max(0,Math.min(1,productFullness(a))))} %${productFullness(a)>=1?' (prêt)':''}`:'—';
    const gestation=a.pregnancy?`Gestation ${Math.round(100*Math.min(1,a.pregnancy.progress/gestationTicks(a.species)))} %`:'';
    const values=[a.sex==='female'?'♀':'♂',`${(a.ageTicks/(TICKS_PER_DAY*60)).toLocaleString('fr-FR',{maximumFractionDigits:2})} an`,stageLabel[animalLifeStage(a)],MEDICAL_CARE[a.domestic!.care],usesArea?areaLabel:pen??'Libre',productText,[condition,gestation].filter(Boolean).join(' · ')];
    values.forEach((value,index)=>{if(index!==4||!row.area)row.cells[index]!.textContent=value;});row.area?.update();
    row.slaughter.checked=a.domestic!.slaughter===true;
    const refusal=slaughterRefusal(world,a);
    row.slaughter.disabled=!slaughter||!!refusal&&!row.slaughter.checked;
    row.slaughter.onchange=()=>slaughter?.(a.id,row.slaughter.checked);
    if(row.training&&row.trainingStatus){
      const state=readAnimalTraining282(a,'haul'),reason=trainingRefusal282(world,a,'haul');
      row.training.checked=state.wanted;row.training.disabled=!training||!!reason;
      row.training.onchange=()=>{const wanted=row.training!.checked;row.training!.checked=state.wanted;training?.(a.id,'haul',wanted);};
      row.trainingStatus.textContent=reason??`${state.steps}/${state.maxSteps}${state.learned?' · acquis':''}`;
      setTooltip(row.training,{title:'Entraîner au transport',body:reason??'Les leçons demandées attendent un dresseur habilité, la nourriture et les prérequis. Une aptitude acquise reste utilisable si cette case est décochée.'});
    }
    setTooltip(row.slaughter,{title:row.slaughter.checked?'Annuler la désignation manuelle':'Abattre manuellement',body:refusal??'Un dresseur rejoint cet animal et l’abat au contact. Cette case règle seulement la désignation manuelle ; un quota automatique peut aussi cibler l’animal.'});
    row.cells[0]!.setAttribute('aria-label',a.sex==='female'?'Femelle':'Mâle');
    setTooltip(row.locate,{title:`${species.label} ${a.id}`,body:'Cliquer pour repérer l’animal et ouvrir son dossier.',rows:[{label:'Position',value:`${a.x}, ${a.z}`},{label:'Nourriture',value:`${Math.round(100*a.food/animalNutritionMax(a))} %`},{label:'Mobilité',value:`${mobility} %`},{label:'Familiarité',value:`${a.domestic!.tameness}/5`}]});
    setTooltip(row.cells[1]!,{title:'Âge biologique',body:`${(a.ageTicks/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:1})} jours. L’âge progresse pendant la famine ; le stade détermine la taille et les besoins.`});
    if(!row.area)setTooltip(row.cells[4]!,{title:usesArea?'Zone autorisée':'Enclos',body:usesArea?areaLabel:pen??'Cet animal reste libre.'});
    setTooltip(row.cells[5]!,{title:productText,body:productTask?`${product==='milk'?'Traite':'Tonte'} ${productTask.phase==='interact'?`${Math.round(100*Math.max(0,Math.min(1,productTask.progress/ANIMAL_PRODUCTS[product!].work)))} %`:'en approche'}. Le produit est déposé physiquement à la fin.`:product?'La croissance du produit dépend de la réserve alimentaire. Une collecte attend une jauge pleine et un animal disponible.':'Aucun produit corporel collectable pour cet animal.'});
    setTooltip(row.cells[6]!,{title:condition,body:gestation||'État courant de l’animal physique.',rows:[{label:'Nourriture',value:`${Math.round(100*a.food/animalNutritionMax(a))} %`},{label:'Mobilité',value:`${mobility} %`}]});
  }
}
