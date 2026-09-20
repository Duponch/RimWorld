import { climateDate,TEMPERATE_CLIMATE } from '../sim/site-climate';
import { TICKS_PER_DAY,type Command,type World } from '../sim/types';
import { calendarTick } from '../sim/calendar';

const quadrums=['avrimai','juillêt','septobre','décembary'];
export function climateDateLabel(world:World):string {
  if(!world.climate)return `Jour ${1+Math.floor(calendarTick(world)/TICKS_PER_DAY)}`;
  const date=climateDate(world);
  return `${date.day} ${quadrums[date.quadrum]} ${date.year} · ${date.season}`;
}

/** Rebuilt alongside ordinary inspection. Sends an ordered command; never
 * mutates the snapshot or pretends to add unobserved age to existing plants. */
export function climateControls(world:World,send:(command:Command)=>void):HTMLElement {
  const section=document.createElement('section');section.className='storage-settings';section.id='climate-controls';
  const title=document.createElement('strong');title.textContent='Climat du site';section.append(title);
  const description=document.createElement('p');
  if(world.climate) {
    description.textContent=`${climateDateLabel(world)}. Forêt tempérée : ${TEMPERATE_CLIMATE.meanTemperature.toLocaleString('fr-FR')} °C de moyenne annuelle. Les journées et les températures suivent les saisons ; protégez les cultures du gel et préparez les réserves d’hiver.`;
  } else {
    description.textContent='Cette partie conserve son climat historique. Activer les saisons commence une période douce à l’heure actuelle ; les cultures gardent leur croissance et leur vieillissement sera suivi à partir de cette activation.';
    const button=document.createElement('button');button.id='climate-adopt';button.textContent='Activer les saisons';
    button.onclick=()=>{button.disabled=true;send({type:'climate-adopt'});};section.append(button);
  }
  section.append(description);return section;
}
