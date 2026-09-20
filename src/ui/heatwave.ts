import { heatwaveOffset } from '../sim/heatwave';
import { HEAT_UNIT,heatStage } from '../sim/heat-rules';
import type { Command,World } from '../sim/types';
export function createHeatwaveUI(send:(c:Command)=>Promise<unknown>):{update:(w:World)=>void} {
  const button=document.createElement('button');button.id='heatwave-letter';button.className='arrival-letter';
  const dialog=document.createElement('dialog');dialog.id='heatwave-dialog';dialog.className='help-dialog';
  const title=document.createElement('h2'),body=document.createElement('p'),close=document.createElement('button');title.textContent='Canicule';close.textContent='Fermer';close.onclick=()=>dialog.close();dialog.append(title,body,close);document.body.append(dialog);
  button.onclick=()=>dialog.showModal();const enable=document.getElementById('enable-heatwaves') as HTMLButtonElement;
  enable.title='Calendrier de scénario : première canicule dans 6 à 7 jours ; aucune exposition passée ajoutée.';
  let busy=false;enable.onclick=()=>{if(busy)return;busy=true;enable.disabled=true;void send({type:'enable-heatwaves'}).catch(e=>enable.title=String(e)).finally(()=>{busy=false;enable.disabled=false;});};
  return {update(w){enable.hidden=!!w.gameProfile||!!w.heatwaves;enable.disabled=busy;
    const suffering=w.pawns.filter(p=>p.state!=='dead'&&heatStage(p.health?.heatstroke)>0),active=w.heatwaves?.active;
    if(!active&&!suffering.length){button.remove();return;}
    button.textContent=active?`Canicule · +${heatwaveOffset(w.tick,w.heatwaves).toFixed(1)} °C`:`Coup de chaleur : ${suffering.length} personne(s)`;
    body.textContent='La chaleur pénètre progressivement dans les pièces. Fermez et couvrez un refuge, construisez un refroidisseur passif et approvisionnez-le en bois. Une tenue tribale en tissu protège mieux de la chaleur qu’une chemise. Les coups de chaleur graves poussent les civils libres à chercher un lieu confortable ; un colon mobilisé reste sous vos ordres. Un patient à terre doit être porté dans un lit situé au frais. Les pansements ne remplacent pas le refroidissement.'+(suffering.length?' Exposition : '+suffering.map(p=>`${p.name} ${(100*p.health!.heatstroke!/HEAT_UNIT).toFixed(1)} %`).join(', '):'');
    const alerts=document.getElementById('alerts')!;if(button.parentElement!==alerts)alerts.append(button);
  }};
}
