import { breakThresholds } from '../sim/traits';
import { MOOD_BASE,moodFrozen,moodTarget,moodThoughts } from '../sim/mood';
import { TICKS_PER_DAY,type Pawn,type World } from '../sim/types';

export function createMoodInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.id='mood-inspection';
  const heading=document.createElement('summary');heading.textContent='Pensées et humeur';
  const target=document.createElement('p');target.id='mood-target';
  const risks=document.createElement('p');risks.id='mood-break-thresholds';
  const list=document.createElement('ul');list.id='mood-thoughts';
  details.append(heading,target,risks,list);const anchor=panel.querySelector('#manage-work');if(anchor)anchor.before(details);else panel.append(details);
}
export function updateMoodInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  const text=panel.querySelector<HTMLElement>('#mood-target'),list=panel.querySelector<HTMLElement>('#mood-thoughts');if(!text||!list)return;
  const thoughts=moodThoughts(world,pawn),target=moodTarget(thoughts);
  text.textContent=pawn.state==='dead'?'Décédé':`${pawn.mental?.crisis?'Errance triste · ':''}Humeur ${pawn.mood.toFixed(1)} % → cible ${target} % · ${moodFrozen(pawn)?'stable pendant le sommeil ou l’inconscience':'évolution jusqu’à +12 / −8 points par heure'}`;
  panel.querySelector('#mood-break-thresholds')!.textContent=pawn.state==='dead'?'':`Seuils de risque mineur / majeur / extrême : ${breakThresholds(pawn).map(n=>Number(n.toFixed(2))).join(' / ')} %. Le risque dépend de la durée d’exposition et du hasard.`;
  const rows=thoughts.map(t=>[t.id,`${t.offset>0?'+':''}${t.offset} · ${t.label}${t.expiresAt!==undefined?` · encore ${Math.ceil((t.expiresAt-world.tick)/(TICKS_PER_DAY/24))} h`:''}`,t.description]);
  if(pawn.state!=='dead')rows.unshift(['base',`+${MOOD_BASE} · Base d’humeur`,'Profil de difficulté neutre.']);
  const signature=JSON.stringify(rows);
  if(list.dataset.signature===signature)return;list.dataset.signature=signature;
  list.replaceChildren(...rows.map(([id,label,description])=>{const li=document.createElement('li');li.dataset.thought=id!;li.textContent=label!;li.title=description!;return li;}));
}
