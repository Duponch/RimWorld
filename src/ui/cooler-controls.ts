import { coolerFaces,coolerFaceBlocked } from '../sim/cooler';
import { TemperatureView } from '../sim/temperature';
import { isPowerActive } from '../sim/power-rules';
import type { Command,Structure,World } from '../sim/types';

export function updateCoolerControls(root:HTMLElement,w:World,s:Structure|undefined,send:(c:Command)=>void):void {
  let section=root.querySelector<HTMLElement>('#cooler-controls');
  if(s?.kind!=='cooler'||!s.cooler){section?.remove();return;}
  if(!section){section=document.createElement('div');section.id='cooler-controls';section.className='storage-settings';root.append(section);}
  const id=s.id,state=s.cooler;
  if(section.dataset.owner!==String(id)){
    section.dataset.owner=String(id);section.replaceChildren();
    const label=document.createElement('p');label.dataset.coolerStatus='';section.append(label);
    const buttons=document.createElement('div');buttons.className='cooler-buttons';section.append(buttons);
    for(const [text,offset] of [['−10',-10],['−1',-1],['21 °C',null],['+1',1],['+10',10]] as const){
      const b=document.createElement('button');b.textContent=text;b.dataset.coolerOffset=String(offset);
      b.onclick=()=>send({type:'cooler-adjust',structureId:id,offset});buttons.append(b);
    }
  }
  section.dataset.target=String(state.target);
  const {cold,hot}=coolerFaces(s),view=new TemperatureView(w),blocked=coolerFaceBlocked(w,cold)||coolerFaceBlocked(w,hot);
  section.querySelector('[data-cooler-status]')!.textContent=`Cible ${state.target.toFixed(1)} °C · ${blocked?'Face obstruée':!isPowerActive(s)?'Sans alimentation':state.high?'Refroidissement · 200 W':'Veille · 20 W'} · Bleu ${cold.x}, ${cold.z} : ${view.at(w,cold).toFixed(1)} °C · Rouge ${hot.x}, ${hot.z} : ${view.at(w,hot).toFixed(1)} °C`;
}
