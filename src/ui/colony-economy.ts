import { expectationForWealth } from '../sim/expectations.ts';
import { TICKS_PER_DAY, type Command, type World } from '../sim/types.ts';

const silver = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const amount = (value:number):string => `${silver.format(value)} argent`;
const row = (label:string):{element:HTMLTableRowElement;value:HTMLTableCellElement} => {
  const element=document.createElement('tr'),name=document.createElement('th'),value=document.createElement('td');
  name.scope='row';name.textContent=label;name.style.textAlign='left';value.style.textAlign='right';
  element.append(name,value);
  return {element,value};
};

/** History reads the persisted sparse sample. Rendering never recounts a map or
 * mutates the worker snapshot, even when the panel is reopened. */
export function createColonyEconomyUI(root:HTMLElement,send:(command:Command)=>void):{update:(world:World)=>void} {
  root.classList.add('storage-settings');
  const heading=document.createElement('h3');heading.textContent='Patrimoine de la colonie';
  const introduction=document.createElement('p'),adopt=document.createElement('button');
  adopt.id='adopt-economy';adopt.textContent='Activer le suivi économique';
  const evaluated=document.createElement('p'),parts=document.createElement('table');
  evaluated.style.fontWeight='700';parts.style.width='100%';
  const objects=row('Objets'),buildings=row('Bâtiments'),floors=row('Sols');
  parts.append(objects.element,buildings.element,floors.element);
  const people=document.createElement('p'),expectation=document.createElement('p');
  const coverage=document.createElement('p'),sample=document.createElement('p');
  coverage.className='muted';sample.className='muted';
  root.append(heading,introduction,adopt,evaluated,parts,people,expectation,coverage,sample);
  let pending=false;
  adopt.onclick=()=>{
    if(pending)return;
    pending=true;adopt.disabled=true;
    try {
      void Promise.resolve(send({type:'adopt-economy'})).catch(error=>{
        pending=false;adopt.disabled=false;adopt.title=String(error);
      });
    } catch(error){pending=false;adopt.disabled=false;adopt.title=String(error);}
  };

  return {update(world){
    const state=world.economy;
    if(!state){
      introduction.textContent='Cette colonie conserve ses règles historiques. Activez le suivi pour que richesse et attentes évoluent à partir de ses biens actuels.';
      adopt.hidden=false;adopt.disabled=pending;
      evaluated.hidden=parts.hidden=people.hidden=expectation.hidden=coverage.hidden=sample.hidden=true;
      return;
    }
    pending=false;adopt.hidden=true;
    introduction.textContent='Valeurs de marché des biens présents lors du dernier relevé.';
    const wealth=state.wealth,expect=expectationForWealth(wealth.knownTotal);
    evaluated.hidden=parts.hidden=people.hidden=expectation.hidden=coverage.hidden=sample.hidden=false;
    evaluated.textContent=`Patrimoine évalué : ${amount(wealth.knownTotal)}${wealth.complete?'':' au minimum'}`;
    objects.value.textContent=amount(wealth.items);
    buildings.value.textContent=amount(wealth.structures);
    floors.value.textContent=amount(wealth.floors);
    people.textContent=wealth.unpricedPawnIds.length
      ? `Personnes : valeur inconnue pour ${wealth.unpricedPawnIds.length} colon${wealth.unpricedPawnIds.length>1?'s':''}.`
      : 'Personnes : aucune valeur manquante.';
    expectation.textContent=`Attentes actuelles : ${expect.label} (${expect.moodOffset>=0?'+':''}${expect.moodOffset} humeur)${wealth.complete?'':' · palier provisoire'}.`;
    const missing=(wealth.unpricedPileIds?.length??0)+(wealth.unpricedPackedIds?.length??0)+(wealth.unpricedStructureIds?.length??0);
    coverage.textContent=missing
      ? `${missing} autre${missing>1?'s':''} bien${missing>1?'s':''} sans valeur vérifiée. Le total et le palier peuvent augmenter après une meilleure couverture du catalogue.`
      : wealth.complete?'Toutes les valeurs de ce relevé sont couvertes.':'Les personnes et animaux domestiques ne sont pas compris dans le montant évalué.';
    sample.textContent=`Relevé au jour ${1+Math.floor(state.sampledAt/TICKS_PER_DAY)}. Le budget des incidents dépend aussi du nombre de colons et du récit.`;
  }};
}
