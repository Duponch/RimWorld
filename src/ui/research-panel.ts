import { intellectualSkill, RESEARCH_SCALE, researchUnlocked, type ResearchProject, type ResearchProgress } from '../sim/research';
import type { Command, World } from '../sim/types';

type ProjectCard = { id: ResearchProject; prefix: string; title: string; cost: number; detail: string; progress: (w: World) => ResearchProgress | undefined };
const projects: readonly ProjectCard[] = [
  {id:'complex-furniture',prefix:'furniture',title:'Mobilier complexe',cost:300,detail:'Débloque chaise, fauteuil, table de chevet et commode.',progress:w=>w.research?.complexFurniture},
  {id:'stonecutting',prefix:'stonecutting',title:'Taille de pierre',cost:300,detail:'Débloque les dallages en pierre. Quatre blocs par case ; Construction 3.',progress:w=>w.research?.stonecutting},
  {id:'smithing',prefix:'smithing',title:'Forge',cost:700,detail:'Débloque le dallage en acier. Sept aciers par case ; Construction 3.',progress:w=>w.research?.smithing},
  {id:'batteries', prefix:'battery', title:'Batteries', cost:400, detail:'Stocker le surplus du réseau pour alimenter les appareils après le coucher du soleil. Batterie : 70 acier + 2 composants.', progress:w=>w.research?.batteries},
  {id:'solar-power', prefix:'solar', title:'Panneaux solaires', cost:600, detail:'Produire jusqu’à 1 700 W selon la lumière naturelle et la surface sans toit. Panneau : 100 acier + 3 composants ; Construction 6.', progress:w=>w.research?.solarPower},
  {id:'air-conditioning', prefix:'air', title:'Climatisation', cost:500, detail:'Débloque le climatiseur (90 acier + 3 composants).', progress:w=>w.research?.airConditioning},
  {id:'complex-clothing', prefix:'research', title:'Vêtements complexes', cost:600, detail:'Débloque l’établi manuel de tailleur et la chemise en tissu.', progress:w=>w.research},
];

export function updateResearchPanel(root: HTMLElement, world: World, send: (command: Command) => void): void {
  if (!root.querySelector('[data-research-status]')) {
    const cards = document.createElement('div'); cards.className='research-cards';
    for (const project of projects) {
      const card=document.createElement('section'); card.className='research-card';
      card.innerHTML=`<h3>${project.title}</h3><p>${project.cost} points · ${project.detail}</p><progress data-${project.prefix}-progress max="${project.cost}" aria-label="Progression ${project.title}"></progress><p data-${project.prefix}-status></p><button data-${project.prefix}-start>Rechercher ${project.title}</button>`;
      card.querySelector('button')!.onclick=()=>send({type:'research-project', project:project.id}); cards.append(card);
    }
    root.append(cards);
    const pause=document.createElement('button'); pause.dataset.researchPause=''; pause.textContent='Suspendre la recherche'; pause.onclick=()=>send({type:'research-project',project:null});
    const workers=document.createElement('p'); workers.dataset.researchWorkers='';
    const help=document.createElement('p'); help.dataset.researchHelp=''; help.className='muted';
    root.append(pause,workers,help);
  }
  for (const project of projects) {
    const done=researchUnlocked(world,project.id),active=world.research?.project===project.id,progress=project.progress(world),points=(progress?.points??0)/RESEARCH_SCALE;
    root.querySelector<HTMLProgressElement>(`[data-${project.prefix}-progress]`)!.value=points;
    const initial=done && progress?.completedAt===0 && (world.scenario?.id==='survivors'||world.scenario?.id==='crashlanded');
    root.querySelector(`[data-${project.prefix}-status]`)!.textContent=`${done?initial?'Acquise au départ':'Terminée':active?'En cours':'En attente'} · ${points.toFixed(1)} / ${project.cost} points`;
    root.querySelector<HTMLButtonElement>(`[data-${project.prefix}-start]`)!.disabled=done||active;
  }
  root.querySelector<HTMLButtonElement>('[data-research-pause]')!.disabled=!world.research?.project;
  root.querySelector('[data-research-help]')!.textContent=projects.every(p=>researchUnlocked(world,p.id))
    ? 'Les sept projets disponibles sont acquis. Les autres technologies restent à développer.'
    : 'Construisez un bureau de recherche simple dans Architecte → Production, puis affectez un colon dans Travail. Plusieurs bureaux contribuent au même projet. Batteries et panneaux solaires sont deux recherches indépendantes ; les bases de l’électricité sont disponibles dans ce scénario.';
  const workers=world.pawns.filter(p=>p.research).map(p=>`${p.name} · Intellect ${intellectualSkill(p).level} · ${p.state==='working'?'au bureau':'en chemin'}`);
  root.querySelector('[data-research-workers]')!.textContent=workers.join(' ; ')||`${world.structures.filter(s=>s.kind==='research-bench').length} bureau(x) construit(s) · aucun chercheur au travail.`;
}
