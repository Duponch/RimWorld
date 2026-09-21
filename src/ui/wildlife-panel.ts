import { foodPoisoningStage } from '../sim/food-poisoning';
import type { World } from '../sim/types';
import { medicalPain,medicalBleed } from '../sim/injury-state';
import { animalBody } from '../sim/wildlife-health';
import { animalBodyModel } from '../sim/body-model';
import { animalSpecies } from '../sim/animal-species';
const labels={idle:'Se repose',moving:'Se déplace',eating:'Mange',sleeping:'Dort',hungry:'Cherche à manger',downed:'À terre',dead:'Mort'};
export function updateWildlifePanel(root:HTMLElement,world:World,focus:(id:number)=>void,enable:()=>void,selected:readonly number[]=[],shoot?:(id:number)=>void,melee?:(id:number)=>void,hunt?:(id:number,enabled:boolean)=>void):void {
  if(!root.querySelector('[data-fauna-list]')) {
    root.innerHTML='<p>Faune sauvage · herbivores. Les portes fermées les arrêtent. Les blessures affectent leurs capacités ; les impacts peuvent les faire fuir.</p><p class="muted">Mobilisez un colon, puis choisissez Tirer (avec une arme à feu) ou Attaquer au contact. Un animal agressé au contact peut riposter brièvement. Cochez Chasser pour un colon civil affecté à Chasse et muni d’une arme à feu. Une réserve acceptant les dépouilles permet leur rangement ; un emplacement de boucherie et sa facture produisent viande et cuir.</p><button data-fauna-enable>Introduire la faune dans cette ancienne partie</button><div data-fauna-list></div>';
    root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.onclick=enable;
  }
  root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.hidden=world.wildlife!==undefined;
  const list=root.querySelector<HTMLElement>('[data-fauna-list]')!,animals=world.wildlife?.animals??[];
  const signature=animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==signature){
    list.dataset.ids=signature;list.replaceChildren(...animals.map(a=>{
      const row=document.createElement('p');row.dataset.animal=String(a.id);
      const button=document.createElement('button');button.textContent=`Repérer ${animalSpecies(a.species).label} ${a.id}`;button.onclick=()=>focus(a.id);
      const attack=document.createElement('button');attack.dataset.animalShoot=String(a.id);attack.textContent='Tirer';
      const health=document.createElement('small');health.dataset.animalHealth=String(a.id);health.style.display='block';
      const contact=document.createElement('button');contact.dataset.animalMelee=String(a.id);contact.textContent='Attaquer au contact';
      const designation=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.animalHunt=String(a.id);designation.append(check,document.createTextNode(' Chasser'));
      row.append(designation,button,document.createElement('span'),attack,contact,health);return row;
    }));
  }
  for(const a of animals){
    const checkbox=list.querySelector<HTMLInputElement>(`[data-animal-hunt="${a.id}"]`)!;checkbox.checked=world.hunting?.targets.includes(a.id)??false;checkbox.disabled=a.state==='dead'||!hunt;checkbox.onchange=()=>hunt?.(a.id,checkbox.checked);
    const state=a.state==='moving'&&!a.path.length&&!a.meal&&(!a.motion||a.motion.end<=world.tick)?'idle':a.state;
    list.querySelector(`[data-animal="${a.id}"] span`)!.textContent=` · ${a.sex==='female'?'Femelle':'Mâle'} · ${a.strike?'Riposte':a.threat?'Se défend':a.flee?'Fuit':labels[state]}${a.meal&&state==='moving'?' vers sa nourriture':''} · ${a.x}, ${a.z} `;
    const button=list.querySelector<HTMLButtonElement>(`[data-animal-shoot="${a.id}"]`)!;
    button.onclick=()=>shoot?.(a.id);button.disabled=a.state==='dead'||!shoot||!selected.length||!selected.every(id=>world.pawns.some(p=>p.id===id&&p.draft&&p.state!=='downed'&&p.state!=='dead'));
    const contact=list.querySelector<HTMLButtonElement>(`[data-animal-melee="${a.id}"]`)!;contact.disabled=button.disabled||!melee;contact.onclick=()=>melee?.(a.id);
    const health=a.health;
    const injuries=health?[...health.injuries.map(i=>`${animalBodyModel(a.species).byId[i.part].label} : blessure ${(i.severity/1000).toFixed(1)} PV${i.scar?.pain!==undefined?' (cicatrice)':''}`),...health.missing.map(m=>`${animalBodyModel(a.species).byId[m.part].label} : perdu`)].join(' ; '):'';
    const summary=!health?'Aucune blessure.':health.death?'Mort · lésions conservées':`Mobilité ${Math.round(animalBody(a).capacities.moving*100)} % · Douleur ${Math.round(medicalPain(health)*100)} % · Saignement ${(medicalBleed(health)*100).toFixed(1)} %/jour`;
    list.querySelector(`[data-animal-health="${a.id}"]`)!.textContent=summary+(health?.foodPoisoning?` · Intoxication alimentaire : ${{none:'fin de récupération',initial:'phase initiale',major:'phase majeure',recovering:'récupération'}[foodPoisoningStage(health.foodPoisoning)]}${health.foodPoisoning.vomit?' · Vomit':''}`:'')+(injuries?` · ${injuries}`:'');
  }
}
