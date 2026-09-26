import { researchPrerequisite,intellectualSkill, RESEARCH_SCALE, researchUnlocked, type ResearchProject, type ResearchProgress } from '../sim/research';
import type { Command, World } from '../sim/types';
import './world-panels.css';

type ProjectNode = { id: ResearchProject; prefix: string; title: string; cost: number; detail: string; progress: (w: World) => ResearchProgress | undefined; x: number; y: number };
export const researchProjects: readonly ProjectNode[] = [
  {id:'complex-furniture',prefix:'furniture',title:'Mobilier complexe',cost:300,detail:'Débloque chaise, fauteuil, table de chevet et commode.',progress:w=>w.research?.complexFurniture,x:24,y:20},
  {id:'stonecutting',prefix:'stonecutting',title:'Taille de pierre',cost:300,detail:'Débloque les dallages en pierre. Quatre blocs par case ; Construction 3.',progress:w=>w.research?.stonecutting,x:224,y:20},
  {id:'smithing',prefix:'smithing',title:'Forge',cost:700,detail:'Débloque le dallage en acier. Sept aciers par case ; Construction 3.',progress:w=>w.research?.smithing,x:424,y:20},
  {id:'machining',prefix:'machining',title:'Usinage',cost:1000,detail:'Atelier d’usinage électrique, 150 acier + 5 composants. Construction 4.',progress:w=>w.research?.machining,x:624,y:20},
  {id:'gunsmithing',prefix:'gunsmithing',title:'Armurerie',cost:500,detail:'Revolver (Artisanat 3) et fusil à verrou (Artisanat 5).',progress:w=>w.research?.gunsmithing,x:824,y:20},
  {id:'complex-clothing',prefix:'research',title:'Vêtements complexes',cost:600,detail:'Débloque l’établi manuel de tailleur et la chemise en tissu.',progress:w=>w.research,x:224,y:154},
  {id:'plate-armor',prefix:'plate-armor',title:'Armure de plaques',cost:600,detail:'Préalable du gilet pare-balles. La fabrication de plaques reste hors périmètre.',progress:w=>w.research?.plateArmor,x:624,y:154},
  {id:'flak-armor',prefix:'flak-armor',title:'Armure pare-balles',cost:1200,detail:'Gilet à l’atelier d’usinage, Artisanat 4.',progress:w=>w.research?.flakArmor,x:824,y:154},
  {id:'batteries',prefix:'battery',title:'Batteries',cost:400,detail:'Stocker le surplus du réseau. Batterie : 70 acier + 2 composants.',progress:w=>w.research?.batteries,x:24,y:298},
  {id:'solar-power',prefix:'solar',title:'Panneaux solaires',cost:600,detail:'Produire jusqu’à 1 700 W à découvert. Panneau : 100 acier + 3 composants ; Construction 6.',progress:w=>w.research?.solarPower,x:224,y:298},
  {id:'air-conditioning',prefix:'air',title:'Climatisation',cost:500,detail:'Débloque le climatiseur (90 acier + 3 composants).',progress:w=>w.research?.airConditioning,x:424,y:298},
];
export const researchLinks: readonly (readonly [ResearchProject, ResearchProject])[] = [
  ['smithing','machining'],['machining','gunsmithing'],
  ['smithing','plate-armor'],['complex-clothing','plate-armor'],
  ['machining','flak-armor'],['plate-armor','flak-armor'],
];
const projectById=new Map(researchProjects.map(project=>[project.id,project]));
const prerequisites=new Map<ResearchProject,string[]>([
  ['machining',['Forge']],['gunsmithing',['Usinage']],['plate-armor',['Forge','Vêtements complexes']],['flak-armor',['Usinage','Armure de plaques']],
]);

function paintSelected(root:HTMLElement,world:World,send:(command:Command)=>void):void {
  const selected=projectById.get(root.dataset.selectedResearch as ResearchProject)??researchProjects[0]!;
  root.querySelector('[data-research-selection-title]')!.textContent=selected.title;
  root.querySelector('[data-research-selection-detail]')!.textContent=selected.detail;
  const done=researchUnlocked(world,selected.id),active=world.research?.project===selected.id,missing=researchPrerequisite(world,selected.id);
  root.querySelector('[data-research-selection-status]')!.textContent=done?'Terminée':active?'En cours':missing?'Verrouillée':'Disponible';
  root.querySelector('[data-research-selection-prerequisites]')!.textContent=(prerequisites.get(selected.id)??[]).join(' + ')||'Aucun';
  const progress=root.querySelector<HTMLProgressElement>('[data-research-selection-progress]')!;
  progress.max=selected.cost;progress.value=(selected.progress(world)?.points??0)/RESEARCH_SCALE;
  root.querySelector('[data-research-selection-points]')!.textContent=`${progress.value.toFixed(1)} / ${selected.cost} points`;
  const start=root.querySelector<HTMLButtonElement>('[data-research-selected-start]')!;
  start.disabled=done||active||!!missing;start.title=missing?`Nécessite ${missing}`:'';
  start.onclick=()=>send({type:'research-project',project:selected.id});
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-research-select]')){
    button.setAttribute('aria-pressed',String(button.dataset.researchSelect===selected.id));
  }
}

export function updateResearchPanel(root: HTMLElement, world: World, send: (command: Command) => void): void {
  if(!root.querySelector('[data-research-map]')){
    const viewport=document.createElement('div');viewport.className='research-viewport';viewport.dataset.researchMap='';
    viewport.setAttribute('role','group');viewport.setAttribute('aria-label','Projets de recherche et prérequis');
    const graph=document.createElement('div');graph.className='research-graph';
    const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.setAttribute('class','research-links');lines.setAttribute('viewBox','0 0 1010 430');lines.setAttribute('aria-hidden','true');
    for(const [fromId,toId] of researchLinks){
      const from=projectById.get(fromId)!,to=projectById.get(toId)!;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      const x1=from.x+174,y1=from.y+57,x2=to.x,y2=to.y+57;
      path.setAttribute('d',`M${x1} ${y1} C${x1+Math.max(18,(x2-x1)/2)} ${y1},${x2-Math.max(18,(x2-x1)/2)} ${y2},${x2} ${y2}`);
      lines.append(path);
    }
    graph.append(lines);
    for(const project of researchProjects){
      const node=document.createElement('div');node.className='research-node';node.dataset.researchNode=project.id;
      node.style.left=`${project.x}px`;node.style.top=`${project.y}px`;
      const select=document.createElement('button');select.className='research-node-select';select.dataset.researchSelect=project.id;select.textContent=project.title;select.setAttribute('aria-label',`Détails : ${project.title}`);
      const progress=document.createElement('progress');progress.max=project.cost;progress.setAttribute(`data-${project.prefix}-progress`,'');progress.setAttribute('aria-label',`Progression ${project.title}`);
      const status=document.createElement('span');status.className='research-node-status';status.setAttribute(`data-${project.prefix}-status`,'');
      const start=document.createElement('button');start.className='research-node-start';start.setAttribute(`data-${project.prefix}-start`,'');start.textContent='Lancer';
      node.append(select,progress,status,start);graph.append(node);
    }
    viewport.append(graph);
    const detail=document.createElement('section');detail.className='research-detail';detail.setAttribute('aria-label','Projet sélectionné');
    detail.innerHTML='<div class="research-detail-header"><h3 data-research-selection-title></h3><span data-research-selection-status></span></div><p data-research-selection-detail></p><p class="research-prerequisites">Prérequis : <strong data-research-selection-prerequisites></strong></p><progress data-research-selection-progress aria-label="Progression du projet sélectionné"></progress><div class="research-detail-footer"><span data-research-selection-points></span><button data-research-selected-start>Lancer la recherche</button></div>';
    const footer=document.createElement('div');footer.className='research-footer';
    footer.innerHTML='<button data-research-pause>Suspendre la recherche</button><p data-research-workers></p><details class="research-help"><summary>Aide à la recherche</summary><p data-research-help></p></details>';
    footer.querySelector<HTMLButtonElement>('[data-research-pause]')!.onclick=()=>send({type:'research-project',project:null});
    root.replaceChildren(viewport,detail,footer);
  }
  for(const project of researchProjects){
    const done=researchUnlocked(world,project.id),active=world.research?.project===project.id,progress=project.progress(world),points=(progress?.points??0)/RESEARCH_SCALE,missing=researchPrerequisite(world,project.id);
    root.querySelector<HTMLProgressElement>(`[data-${project.prefix}-progress]`)!.value=points;
    const initial=done&&progress?.completedAt===0&&(world.scenario?.id==='survivors'||world.scenario?.id==='crashlanded');
    root.querySelector(`[data-${project.prefix}-status]`)!.textContent=done?initial?'Acquise au départ':'Terminée':active?'En cours':missing?'Verrouillée':'Disponible';
    const start=root.querySelector<HTMLButtonElement>(`[data-${project.prefix}-start]`)!;
    start.disabled=done||active||!!missing;start.title=missing?`Nécessite ${missing}`:'';
    start.onclick=()=>{root.dataset.selectedResearch=project.id;send({type:'research-project',project:project.id});};
    root.querySelector<HTMLButtonElement>(`[data-research-select="${project.id}"]`)!.onclick=()=>{root.dataset.selectedResearch=project.id;paintSelected(root,world,send);};
    root.querySelector<HTMLElement>(`[data-research-node="${project.id}"]`)!.dataset.state=done?'done':active?'active':missing?'locked':'available';
  }
  if(!projectById.has(root.dataset.selectedResearch as ResearchProject))root.dataset.selectedResearch=world.research?.project??'complex-clothing';
  paintSelected(root,world,send);
  root.querySelector<HTMLButtonElement>('[data-research-pause]')!.disabled=!world.research?.project;
  root.querySelector('[data-research-help]')!.textContent=researchProjects.every(p=>researchUnlocked(world,p.id))
    ? 'Les onze projets disponibles sont acquis. Les autres technologies restent à développer.'
    : 'Construisez un bureau de recherche simple dans Architecte → Production, puis affectez un colon dans Travail. Plusieurs bureaux contribuent au même projet. Batteries et panneaux solaires sont deux recherches indépendantes ; les bases de l’électricité sont disponibles dans ce scénario.';
  const workers=world.pawns.filter(p=>p.research).map(p=>`${p.name} · Intellectuel ${intellectualSkill(p).level} · ${p.state==='working'?'au bureau':'en chemin'}`);
  root.querySelector('[data-research-workers]')!.textContent=workers.join(' ; ')||`${world.structures.filter(s=>s.kind==='research-bench').length} bureau(x) construit(s) · aucun chercheur au travail.`;
}
