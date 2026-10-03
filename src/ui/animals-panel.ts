import {animalSpecies} from '../sim/animal-species';
import {MEDICAL_CARE} from '../sim/medicine-rules';
import {TICKS_PER_DAY,type World} from '../sim/types';
import {animalBody} from '../sim/wildlife-health';
import {animalPenStatus} from './pen-status';
import {penRegion} from '../sim/animal-pens';
import {ANIMAL_PRODUCTS,productFullness,productKind} from '../sim/animal-products';
import {animalLifeStage,animalNutritionMax,gestationTicks} from '../sim/animal-life';
import {setTooltip} from './tooltip';
import './management-reference-v199.css';

interface DomesticRow { locate:HTMLButtonElement; cells:HTMLElement[] }
const stageLabel={baby:'Petit',juvenile:'Jeune',adult:'Adulte'} as const;
const domesticRows=new WeakMap<HTMLElement,Map<number,DomesticRow>>();

/** Owned animals remain physical wildlife actors. The panel is a filtered view
 * of those actual identities, not a separate counter or promised training UI. */
export function animalsPanelScaffold():string {
  return '<p class="muted" data-domestic-empty>Aucun animal domestique.</p><div class="domestic-list domestic-table-wrap" data-domestic-list></div>';
}

export function updateAnimalsPanel(root:HTMLElement,world:World,focus:(id:number)=>void):void {
  if(!root.querySelector('[data-domestic-list]'))root.innerHTML=animalsPanelScaffold();
  const animals=world.wildlife?.animals.filter(a=>!!a.domestic&&a.state!=='dead')??[];
  root.querySelector<HTMLElement>('[data-domestic-empty]')!.hidden=animals.length>0;
  const list=root.querySelector<HTMLElement>('[data-domestic-list]')!;
  const ids=animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==ids){
    list.dataset.ids=ids;
    const rows=new Map<number,DomesticRow>();
    const table=document.createElement('table');table.className='domestic-table';
    table.innerHTML='<thead><tr><th scope="col">Nom</th><th scope="col">Sexe</th><th scope="col">Âge</th><th scope="col">Maturité</th><th scope="col">Soins</th><th scope="col">Enclos</th><th scope="col">Production</th><th scope="col">État</th></tr></thead><tbody></tbody>';
    const body=table.querySelector('tbody')!;
    body.append(...animals.map(a=>{
      const row=document.createElement('tr');row.className='domestic-row';row.dataset.domesticAnimal=String(a.id);row.dataset.domesticDetails=String(a.id);
      const name=document.createElement('th');name.scope='row';
      const locate=document.createElement('button');locate.type='button';locate.dataset.domesticFocus=String(a.id);
      locate.onclick=()=>focus(a.id);
      name.append(locate);
      const cells=Array.from({length:7},()=>document.createElement('td'));
      rows.set(a.id,{locate,cells});
      row.append(name,...cells);return row;
    }));
    list.replaceChildren(table);
    const labels=table.querySelectorAll<HTMLElement>('thead th');
    setTooltip(labels[4]!,{title:'Soins',body:'La politique médicale se règle dans le dossier Santé de l’animal. Un médecin apporte les médicaments autorisés et soigne au contact.'});
    setTooltip(labels[5]!,{title:'Enclos',body:'Le marqueur attribué et le périmètre physique déterminent cet état. Un dresseur conduit les herbivores ; le lièvre reste libre.'});
    setTooltip(labels[6]!,{title:'Production',body:'Un adulte possédé produit selon son espèce et son sexe. Animaux actif : un colon rejoint la bête pour traire ou tondre une jauge pleine.'});
    domesticRows.set(list,rows);
  }
  const rows=domesticRows.get(list);
  const regions=new Map<number,ReturnType<typeof penRegion>>();
  const productTasks=new Map(world.pawns.filter(pawn=>pawn.animalHandling?.kind==='milk'||pawn.animalHandling?.kind==='shear')
    .map(pawn=>[pawn.animalHandling!.animalId,pawn.animalHandling!] as const));
  for(const a of animals){
    const species=animalSpecies(a.species);
    const row=rows?.get(a.id);if(!row)continue;
    row.locate.textContent=`${species.label} ${a.id}`;
    row.locate.setAttribute('aria-label',`Repérer ${species.label} ${a.id}`);
    const condition=a.state==='downed'?'À terre':a.state==='sleeping'?'Dort':a.flee?'Fuit':a.burning?'Brûle':a.state==='eating'?'Mange':a.state==='moving'?'Se déplace':'Libre';
    const mobility=Math.round(animalBody(a).capacities.moving*100);
    const pen=animalPenStatus(world,a,regions);
    const product=productKind(a);
    const active=productTasks.get(a.id);
    const productTask=product&&active?.kind===product?active:undefined;
    const productText=product?`${product==='milk'?'Lait':'Laine'} ${Math.round(100*Math.max(0,Math.min(1,productFullness(a))))} %${productFullness(a)>=1?' (prêt)':''}`:'—';
    const gestation=a.pregnancy?`Gestation ${Math.round(100*Math.min(1,a.pregnancy.progress/gestationTicks(a.species)))} %`:'';
    const values=[a.sex==='female'?'♀':'♂',`${(a.ageTicks/(TICKS_PER_DAY*60)).toLocaleString('fr-FR',{maximumFractionDigits:2})} an`,stageLabel[animalLifeStage(a)],MEDICAL_CARE[a.domestic!.care],pen??'Libre',productText,[condition,gestation].filter(Boolean).join(' · ')];
    values.forEach((value,index)=>{row.cells[index]!.textContent=value;});
    row.cells[0]!.setAttribute('aria-label',a.sex==='female'?'Femelle':'Mâle');
    setTooltip(row.locate,{title:`${species.label} ${a.id}`,body:'Cliquer pour repérer l’animal et ouvrir son dossier.',rows:[{label:'Position',value:`${a.x}, ${a.z}`},{label:'Nourriture',value:`${Math.round(100*a.food/animalNutritionMax(a))} %`},{label:'Mobilité',value:`${mobility} %`},{label:'Familiarité',value:`${a.domestic!.tameness}/5`}]});
    setTooltip(row.cells[1]!,{title:'Âge biologique',body:`${(a.ageTicks/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:1})} jours. L’âge progresse pendant la famine ; le stade détermine la taille et les besoins.`});
    setTooltip(row.cells[4]!,{title:'Enclos',body:pen??'Cet animal reste libre.'});
    setTooltip(row.cells[5]!,{title:productText,body:productTask?`${product==='milk'?'Traite':'Tonte'} ${productTask.phase==='interact'?`${Math.round(100*Math.max(0,Math.min(1,productTask.progress/ANIMAL_PRODUCTS[product!].work)))} %`:'en approche'}. Le produit est déposé physiquement à la fin.`:product?'La croissance du produit dépend de la réserve alimentaire. Une collecte attend une jauge pleine et un animal disponible.':'Aucun produit corporel collectable pour cet animal.'});
    setTooltip(row.cells[6]!,{title:condition,body:gestation||'État courant de l’animal physique.',rows:[{label:'Nourriture',value:`${Math.round(100*a.food/animalNutritionMax(a))} %`},{label:'Mobilité',value:`${mobility} %`}]});
  }
}
