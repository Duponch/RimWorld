import { breakThresholds } from '../sim/traits';
import { moodTarget,moodThoughts } from '../sim/mood';
import { TICKS_PER_DAY,type Pawn,type World } from '../sim/types';
import { setTooltip } from './tooltip';

export interface MoodInspectionView {
  current:number;
  target:number;
  thresholds:readonly number[];
  thoughts:ReadonlyArray<{id:string;label:string;offset:number;display:string;tooltip:string}>;
}

const displayOffset=(value:number):string=>`${value>0?'+':''}${Number(value.toFixed(1))}`;

/** The base mood participates in the target, but Core lists the thoughts
 * themselves below the gauge, ordered from strongest positive to negative. */
export function moodInspectionView(world:World,pawn:Pawn):MoodInspectionView {
  const thoughts=moodThoughts(world,pawn);
  return {
    current:pawn.mood,
    target:moodTarget(thoughts),
    thresholds:pawn.state==='dead'?[]:breakThresholds(pawn),
    thoughts:thoughts.filter(thought=>thought.offset!==0)
      .map(thought=>({id:thought.id,label:thought.label,offset:thought.offset,display:displayOffset(thought.offset),tooltip:`${thought.description}${thought.expiresAt!==undefined?` · encore ${Math.ceil((thought.expiresAt-world.tick)/(TICKS_PER_DAY/24))} h`:''}`}))
      .sort((a,b)=>b.offset-a.offset),
  };
}

export function createMoodInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.id='mood-inspection';
  const heading=document.createElement('summary');heading.textContent='Humeur';
  const caption=document.createElement('div');caption.className='mood-caption';caption.innerHTML='<strong>Humeur</strong><span data-mood-current></span>';
  const gauge=document.createElement('div');gauge.id='mood-gauge';gauge.setAttribute('role','meter');gauge.setAttribute('aria-label','Humeur actuelle');gauge.setAttribute('aria-valuemin','0');gauge.setAttribute('aria-valuemax','100');
  const fill=document.createElement('span');fill.id='mood-gauge-fill';gauge.append(fill);
  for(let i=0;i<3;i++){const marker=document.createElement('span');marker.className='mood-gauge-marker';marker.dataset.moodThreshold=String(i);gauge.append(marker);}
  const target=document.createElement('p');target.id='mood-target';
  const risks=document.createElement('p');risks.id='mood-break-thresholds';
  const list=document.createElement('ul');list.id='mood-thoughts';
  gauge.tabIndex=0;details.append(heading,caption,gauge,target,risks,list);const anchor=panel.querySelector('#manage-work');if(anchor)anchor.before(details);else panel.append(details);
}

export function updateMoodInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  const text=panel.querySelector<HTMLElement>('#mood-target'),list=panel.querySelector<HTMLElement>('#mood-thoughts');if(!text||!list)return;
  const view=moodInspectionView(world,pawn),dead=pawn.state==='dead';
  const crisis=pawn.mental?.crisis?.kind==='food-binge'?'Frénésie alimentaire':pawn.mental?.crisis?'Errance triste':'';
  text.textContent=dead?'Décédé':`${crisis?`${crisis} · `:''}Humeur ${view.current.toFixed(1)} % · cible ${Number(view.target.toFixed(1))} %`;
  panel.querySelector('[data-mood-current]')!.textContent=dead?'—':`${Math.round(view.current)} %`;
  const gauge=panel.querySelector<HTMLElement>('#mood-gauge')!,level=panel.querySelector<HTMLElement>('#mood-gauge-fill')!;
  gauge.hidden=dead;gauge.setAttribute('aria-valuenow',String(view.current));
  gauge.setAttribute('aria-valuetext',`${view.current.toFixed(1)} %`);
  level.style.width=`${Math.max(0,Math.min(100,view.current))}%`;
  for(const marker of gauge.querySelectorAll<HTMLElement>('[data-mood-threshold]')){
    marker.style.left=`${Math.max(0,Math.min(100,view.thresholds[Number(marker.dataset.moodThreshold)]??0))}%`;
  }
  panel.querySelector('#mood-break-thresholds')!.textContent=dead?'':`Seuils : ${view.thresholds.map(n=>Number(n.toFixed(2))).join(' / ')} %`;
  setTooltip(gauge,{title:'Humeur',body:dead?'Décédé':'L’humeur évolue progressivement vers la somme des pensées. Les repères indiquent les seuils de risque de crise mentale.',rows:[{label:'Actuelle',value:`${view.current.toFixed(1)} %`},{label:'Cible',value:`${Number(view.target.toFixed(1))} %`},...view.thresholds.map((n,i)=>({label:['Risque mineur','Risque majeur','Risque extrême'][i]!,value:`${Number(n.toFixed(2))} %`}))]});
  const signature=JSON.stringify(view.thoughts);if(list.dataset.signature===signature)return;list.dataset.signature=signature;
  list.replaceChildren(...view.thoughts.map(thought=>{
    const li=document.createElement('li');li.dataset.thought=thought.id;
    li.tabIndex=0;setTooltip(li,{title:thought.label,body:thought.tooltip,rows:[{label:'Effet sur l’humeur',value:thought.display}]});
    const label=document.createElement('span');label.textContent=thought.label;
    const value=document.createElement('strong');value.textContent=thought.display;value.dataset.sign=thought.offset>0?'positive':'negative';
    li.append(label,value);return li;
  }));
}
