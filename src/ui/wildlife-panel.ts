import { foodPoisoningStage } from '../sim/food-poisoning';
import type { World } from '../sim/types';
import { medicalPain,medicalBleed } from '../sim/injury-state';
import { animalBody } from '../sim/wildlife-health';
import { animalBodyModel } from '../sim/body-model';
import { animalSpecies } from '../sim/animal-species';
const labels={idle:'Se repose',moving:'Se déplace',eating:'Mange',sleeping:'Dort',hungry:'Cherche à manger',downed:'À terre',dead:'Mort'};
export function wildlifePanelScaffold():string {
  return '<div class="fauna-intro"><p>Faune sauvage · herbivores. Les portes fermées les arrêtent. Les blessures affectent leurs capacités ; les impacts peuvent les faire fuir.</p><p class="muted">Mobilisez un colon, puis choisissez Tirer (avec une arme à feu) ou Attaquer au contact. Cochez Chasser pour un colon civil affecté à Chasse et muni d’une arme à feu. Le lièvre peut être désigné pour Apprivoiser avec un dresseur Animaux 8, de la nourriture physique et du temps. Cerf, gazelle, mufalo et dromadaire attendent de vrais enclos.</p></div><button class="fauna-enable" data-fauna-enable>Introduire la faune dans cette ancienne partie</button><div class="fauna-list" data-fauna-list></div>';
}
export function updateWildlifePanel(root:HTMLElement,world:World,focus:(id:number)=>void,enable:()=>void,selected:readonly number[]=[],shoot?:(id:number)=>void,melee?:(id:number)=>void,hunt?:(id:number,enabled:boolean)=>void,tame?:(id:number,enabled:boolean)=>void):void {
  if(!root.querySelector('[data-fauna-list]')) {
    root.innerHTML=wildlifePanelScaffold();
    root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.onclick=enable;
  }
  root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.hidden=world.wildlife!==undefined;
  const list=root.querySelector<HTMLElement>('[data-fauna-list]')!,animals=world.wildlife?.animals.filter(a=>!a.domestic)??[];
  const signature=animals.map(a=>`${a.id}:${a.species}`).join(',');
  if(list.dataset.ids!==signature){
    const head=document.createElement('div');head.className='fauna-list-head';head.setAttribute('aria-hidden','true');
    for(const text of ['Chasse','Animal','Sexe','Activité','Position','Actions']){const label=document.createElement('span');label.textContent=text;head.append(label);}
    list.dataset.ids=signature;list.replaceChildren(head,...animals.map(a=>{
      const row=document.createElement('article');row.className='fauna-row';row.dataset.animal=String(a.id);
      const button=document.createElement('button');button.className='fauna-focus';button.textContent=`Repérer ${animalSpecies(a.species).label} ${a.id}`;button.onclick=()=>focus(a.id);
      const attack=document.createElement('button');attack.dataset.animalShoot=String(a.id);attack.textContent='Tirer';
      attack.className='fauna-attack';
      const health=document.createElement('small');health.dataset.animalHealth=String(a.id);health.className='fauna-health';
      const contact=document.createElement('button');contact.dataset.animalMelee=String(a.id);contact.textContent='Attaquer au contact';
      contact.className='fauna-contact';
      const designation=document.createElement('label'),check=document.createElement('input');designation.className='fauna-hunt';check.type='checkbox';check.dataset.animalHunt=String(a.id);designation.append(check,document.createTextNode(' Chasser'));
      const sex=document.createElement('span');sex.className='fauna-sex';sex.textContent=a.sex==='female'?'Femelle':'Mâle';
      const activity=document.createElement('span');activity.className='fauna-activity';activity.dataset.animalActivity=String(a.id);
      const position=document.createElement('span');position.className='fauna-position';position.dataset.animalPosition=String(a.id);
      const actions=document.createElement('div');actions.className='fauna-actions';actions.append(attack,contact);
      if(a.species==='hare'){
        const tameLabel=document.createElement('label'),tameCheck=document.createElement('input');
        tameLabel.className='fauna-tame';tameCheck.type='checkbox';tameCheck.dataset.animalTame=String(a.id);
        tameLabel.append(tameCheck,document.createTextNode(' Apprivoiser · Animaux 8'));actions.append(tameLabel);
      }
      row.append(designation,button,sex,activity,position,actions,health);return row;
    }));
  }
  for(const a of animals){
    const checkbox=list.querySelector<HTMLInputElement>(`[data-animal-hunt="${a.id}"]`)!;checkbox.checked=world.hunting?.targets.includes(a.id)??false;checkbox.disabled=a.state==='dead'||!hunt;checkbox.onchange=()=>hunt?.(a.id,checkbox.checked);
    const tameCheck=list.querySelector<HTMLInputElement>(`[data-animal-tame="${a.id}"]`);
    if(tameCheck){tameCheck.checked=!!a.taming?.designated;tameCheck.disabled=a.state==='dead'||!tame;tameCheck.onchange=()=>tame?.(a.id,tameCheck.checked);}
    const state=a.state==='moving'&&!a.path.length&&!a.meal&&(!a.motion||a.motion.end<=world.tick)?'idle':a.state;
    list.querySelector(`[data-animal-activity="${a.id}"]`)!.textContent=`${a.strike?'Riposte':a.threat?'Se défend':a.flee?'Fuit':labels[state]}${a.meal&&state==='moving'?' vers sa nourriture':''}`;
    list.querySelector(`[data-animal-position="${a.id}"]`)!.textContent=`${a.x}, ${a.z}`;
    const button=list.querySelector<HTMLButtonElement>(`[data-animal-shoot="${a.id}"]`)!;
    button.onclick=()=>shoot?.(a.id);button.disabled=a.state==='dead'||!shoot||!selected.length||!selected.every(id=>world.pawns.some(p=>p.id===id&&p.draft&&p.state!=='downed'&&p.state!=='dead'));
    const contact=list.querySelector<HTMLButtonElement>(`[data-animal-melee="${a.id}"]`)!;contact.disabled=button.disabled||!melee;contact.onclick=()=>melee?.(a.id);
    const health=a.health;
    const injuries=health?[...health.injuries.map(i=>`${animalBodyModel(a.species).byId[i.part].label} : blessure ${(i.severity/1000).toFixed(1)} PV${i.scar?.pain!==undefined?' (cicatrice)':''}`),...health.missing.map(m=>`${animalBodyModel(a.species).byId[m.part].label} : perdu`)].join(' ; '):'';
    const summary=!health?'Aucune blessure.':health.death?'Mort · lésions conservées':`Mobilité ${Math.round(animalBody(a).capacities.moving*100)} % · Douleur ${Math.round(medicalPain(health)*100)} % · Saignement ${(medicalBleed(health)*100).toFixed(1)} %/jour`;
    list.querySelector(`[data-animal-health="${a.id}"]`)!.textContent=summary+(health?.foodPoisoning?` · Intoxication alimentaire : ${{none:'fin de récupération',initial:'phase initiale',major:'phase majeure',recovering:'récupération'}[foodPoisoningStage(health.foodPoisoning)]}${health.foodPoisoning.vomit?' · Vomit':''}`:'')+(injuries?` · ${injuries}`:'');
  }
}
