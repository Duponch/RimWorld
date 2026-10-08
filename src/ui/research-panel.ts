import { researchPrerequisite,researchStationUsable,intellectualSkill, RESEARCH_SCALE, DRUG_PRODUCTION_RESEARCH_COST, MEDICINE_PRODUCTION_RESEARCH_COST, HYDROPONICS_RESEARCH_COST, TUBE_TELEVISION_RESEARCH_COST, HOSPITAL_BED_RESEARCH_COST, PACKAGED_SURVIVAL_MEALS_RESEARCH_COST, researchUnlocked, type ResearchProject, type ResearchProgress } from '../sim/research';
import type { Command, World } from '../sim/types';
import './world-panels.css';
import './management-reference-v199.css';
import {setTooltip} from './tooltip';

type ProjectNode = { id: ResearchProject; prefix: string; title: string; cost: number; detail: string; progress: (w: World) => ResearchProgress | undefined; x: number; y: number };
export const researchProjects: readonly ProjectNode[] = [
  {id:'drug-production',prefix:'drug-production',title:'Production de drogues',cost:DRUG_PRODUCTION_RESEARCH_COST/RESEARCH_SCALE,detail:'Débloque le laboratoire de chimie manuel : 50 bois ou acier, 75 acier et 6 composants ; Construction 4. Aucune alimentation électrique requise.',progress:w=>w.research?.drugProduction,x:24,y:700},
  {id:'medicine-production',prefix:'medicine-production',title:'Production de médicaments',cost:MEDICINE_PRODUCTION_RESEARCH_COST/RESEARCH_SCALE,detail:'1 plante médicinale + 1 neutroamine achetée + 3 tissus → 1 médicament industriel. Artisanat 4 et Intellectuel 4 ; travail Artisanat, apprentissage Intellectuel à la fin. Recherche au bureau avancé alimenté.',progress:w=>w.research?.medicineProduction,x:224,y:700},
  {id:'hydroponics',prefix:'hydroponics',title:'Hydroponie',cost:HYDROPONICS_RESEARCH_COST/RESEARCH_SCALE,detail:'Bac 1 × 4 : 100 acier + 1 composant, Construction 4, 70 W continus. Fertilité 280 % sur terrain porteur ; lumière et température restent nécessaires. Sans courant, nouveaux semis suspendus et plantes endommagées progressivement. Maïs exclu.',progress:w=>w.research?.hydroponics,x:24,y:566},
  {id:'gun-turrets',prefix:'gun-turrets',title:'Tourelles automatiques',cost:500,detail:'Mini-tourelle acier : 100 acier + 3 composants, Construction 5, 80 W. Canon 60 coups, réarmement physique en acier. Adaptation locale : Armurerie est le préalable ; le projet Core Blowback et ses armes sont différés.',progress:w=>w.research?.gunTurrets,x:824,y:298},
  {id:'complex-furniture',prefix:'furniture',title:'Mobilier complexe',cost:300,detail:'Débloque chaise, fauteuil, table de chevet et commode.',progress:w=>w.research?.complexFurniture,x:24,y:20},
  {id:'tube-television',prefix:'tube-television',title:'Télévision cathodique',cost:TUBE_TELEVISION_RESEARCH_COST/RESEARCH_SCALE,detail:'Débloque un loisir électrique : 80 acier + 4 composants, Construction 7, 200 W. Chaque spectateur rejoint une place visible devant l’écran ; le trajet et les coupures ne procurent aucun plaisir.',progress:w=>w.research?.tubeTelevision,x:24,y:432},
  {id:'stonecutting',prefix:'stonecutting',title:'Taille de pierre',cost:300,detail:'Débloque les dallages en pierre. Quatre blocs par case ; Construction 3.',progress:w=>w.research?.stonecutting,x:224,y:20},
  {id:'smithing',prefix:'smithing',title:'Forge',cost:700,detail:'Débloque le dallage en acier. Sept aciers par case ; Construction 3.',progress:w=>w.research?.smithing,x:424,y:20},
  {id:'machining',prefix:'machining',title:'Usinage',cost:1000,detail:'Atelier d’usinage électrique, 150 acier + 5 composants. Construction 4.',progress:w=>w.research?.machining,x:624,y:20},
  {id:'gunsmithing',prefix:'gunsmithing',title:'Armurerie',cost:500,detail:'Revolver (Artisanat 3) et fusil à verrou (Artisanat 5).',progress:w=>w.research?.gunsmithing,x:824,y:20},
  {id:'complex-clothing',prefix:'research',title:'Vêtements complexes',cost:600,detail:'Débloque l’établi manuel de tailleur et la chemise en tissu.',progress:w=>w.research,x:224,y:154},
  {id:'packaged-survival-meals',prefix:'packaged-survival-meals',title:'Repas de survie',cost:PACKAGED_SURVIVAL_MEALS_RESEARCH_COST/RESEARCH_SCALE,detail:'Débloque la préparation d’un repas de survie à la cuisinière : 6 protéines (viande ou lait) + 6 végétaux, Cuisine 8. Ces rations ne pourrissent pas et servent aux voyages. Adaptation locale : le préalable Core Pâte nutritive est différé.',progress:w=>w.research?.packagedSurvivalMeals,x:24,y:154},
  {id:'autodoors',prefix:'autodoors',title:'Portes automatiques',cost:600,detail:'Porte à ouverture rapide sous courant : 25 matériaux, 40 acier, 2 composants ; Construction 6 et 50 W. Sans courant, elle fonctionne comme une porte ordinaire.',progress:w=>w.research?.autodoors,x:424,y:154},
  {id:'plate-armor',prefix:'plate-armor',title:'Armure de plaques',cost:600,detail:'Préalable du gilet pare-balles. La fabrication de plaques reste hors périmètre.',progress:w=>w.research?.plateArmor,x:624,y:154},
  {id:'flak-armor',prefix:'flak-armor',title:'Armure pare-balles',cost:1200,detail:'Gilet et casque pare-balles à l’atelier d’usinage, Artisanat 4 et 5.',progress:w=>w.research?.flakArmor,x:824,y:154},
  {id:'batteries',prefix:'battery',title:'Batteries',cost:400,detail:'Stocker le surplus du réseau. Batterie : 70 acier + 2 composants.',progress:w=>w.research?.batteries,x:24,y:298},
  {id:'solar-power',prefix:'solar',title:'Panneaux solaires',cost:600,detail:'Produire jusqu’à 1 700 W à découvert. Panneau : 100 acier + 3 composants ; Construction 6.',progress:w=>w.research?.solarPower,x:224,y:298},
  {id:'air-conditioning',prefix:'air',title:'Climatisation',cost:500,detail:'Débloque le climatiseur (90 acier + 3 composants).',progress:w=>w.research?.airConditioning,x:424,y:298},
  {id:'microelectronics',prefix:'microelectronics',title:'Microélectronique',cost:3000,detail:'Débloque le bureau de recherche avancé. Électricité connue au départ.',progress:w=>w.research?.microelectronics,x:224,y:432},
  {id:'multi-analyzer',prefix:'multi-analyzer',title:'Multi-analyseur',cost:4000,detail:'Débloque le multi-analyseur. Recherche au bureau avancé alimenté ; Usinage est aussi requis.',progress:w=>w.research?.multiAnalyzer,x:624,y:432},
  {id:'fabrication',prefix:'fabrication',title:'Fabrication',cost:4000,detail:'Débloque l’établi de fabrication. Exige un bureau avancé alimenté et un multi-analyseur alimenté à proximité.',progress:w=>w.research?.fabrication,x:824,y:432},
  {id:'advanced-fabrication',prefix:'advanced-fabrication',title:'Fabrication avancée',cost:4000,detail:'Débloque la fabrication du composant avancé à l’établi alimenté : 1 composant, 20 acier, 10 plastacier et 3 or ; Artisanat 8.',progress:w=>w.research?.advancedFabrication,x:824,y:566},
  {id:'recon-armor',prefix:'recon-armor',title:'Armure de reconnaissance',cost:6000,detail:'Casque de reconnaissance à l’établi de fabrication alimenté : 30 plastaciers, 1 composant avancé ; Artisanat 6.',progress:w=>w.research?.reconArmor,x:624,y:566},
  {id:'hospital-bed',prefix:'hospital-bed',title:'Lit d’hôpital',cost:HOSPITAL_BED_RESEARCH_COST/RESEARCH_SCALE,detail:'Débloque un lit spécialisé : 120 acier + 5 composants, Construction 8. Améliore les soins, l’immunité, la guérison et la chirurgie pendant son utilisation réelle. Recherche au bureau avancé alimenté. Adaptation locale : le préalable Core Matériaux stériles et ses sols sont différés.',progress:w=>w.research?.hospitalBed,x:424,y:566},
];
export const researchLinks: readonly (readonly [ResearchProject, ResearchProject])[] = [
  ['drug-production','medicine-production'],['microelectronics','medicine-production'],
  ['gunsmithing','gun-turrets'],
  ['complex-furniture','tube-television'],
  ['smithing','machining'],['machining','gunsmithing'],
  ['smithing','plate-armor'],['complex-clothing','plate-armor'],
  ['machining','flak-armor'],['plate-armor','flak-armor'],
  ['microelectronics','multi-analyzer'],['machining','multi-analyzer'],['multi-analyzer','fabrication'],
  ['fabrication','advanced-fabrication'],
  ['fabrication','recon-armor'],
  ['complex-clothing','recon-armor'],
  ['microelectronics','hospital-bed'],['complex-furniture','hospital-bed'],
];
const projectById=new Map(researchProjects.map(project=>[project.id,project]));
const NODE_WIDTH=142,NODE_HEIGHT=66,GRAPH_WIDTH=850,GRAPH_HEIGHT=550;
const nodePosition=(project:ProjectNode)=>({x:20+(project.x-24)*.82,y:22+(project.y-20)*.66});
const prerequisites=new Map<ResearchProject,string[]>([
  ['drug-production',[]],['medicine-production',['Production de drogues','Microélectronique']],
  ['hydroponics',['Électricité (acquise au départ)']],
  ['gun-turrets',['Armurerie']],
  ['tube-television',['Mobilier complexe','Électricité (acquise au départ)']],
  ['machining',['Forge']],['gunsmithing',['Usinage']],['plate-armor',['Forge','Vêtements complexes']],['flak-armor',['Usinage','Armure de plaques']],
  ['autodoors',['Électricité (acquise au départ)']],['microelectronics',['Électricité (acquise au départ)']],['multi-analyzer',['Microélectronique','Usinage']],['fabrication',['Multi-analyseur']],['advanced-fabrication',['Fabrication']],['recon-armor',['Fabrication','Vêtements complexes']],
  ['hospital-bed',['Microélectronique','Mobilier complexe']],
]);
function stationIssue(world:World,project:ResearchProject):string|undefined {
  if(world.structures.some(s=>researchStationUsable(world,s,project)))return undefined;
  if(project==='hospital-bed'||project==='medicine-production')return 'Bureau de recherche avancé alimenté requis';
  if(project==='multi-analyzer'||project==='fabrication'||project==='advanced-fabrication'||project==='recon-armor')return project==='multi-analyzer'?'Bureau de recherche avancé alimenté requis':'Bureau avancé et multi-analyseur alimentés à proximité requis';
  return 'Bureau de recherche disponible requis';
}

function paintSelected(root:HTMLElement,world:World,send:(command:Command)=>void):void {
  const selected=projectById.get(root.dataset.selectedResearch as ResearchProject)??researchProjects[0]!;
  root.querySelector('[data-research-selection-title]')!.textContent=selected.title;
  root.querySelector('[data-research-selection-detail]')!.textContent=selected.detail;
  const done=researchUnlocked(world,selected.id),active=world.research?.project===selected.id,missing=researchPrerequisite(world,selected.id);
  const issue=stationIssue(world,selected.id);
  root.querySelector('[data-research-selection-status]')!.textContent=done?'Terminée':missing?'Verrouillée':issue?active?`En attente : ${issue}`:issue:active?'En cours':'Disponible';
  root.querySelector('[data-research-selection-prerequisites]')!.textContent=(prerequisites.get(selected.id)??[]).join(' + ')||'Aucun';
  const progress=root.querySelector<HTMLProgressElement>('[data-research-selection-progress]')!;
  progress.max=selected.cost;progress.value=(selected.progress(world)?.points??0)/RESEARCH_SCALE;
  root.querySelector('[data-research-selection-points]')!.textContent=`${progress.value.toFixed(1)} / ${selected.cost} points`;
  const start=root.querySelector<HTMLButtonElement>('[data-research-selected-start]')!;
  start.disabled=done||active||!!missing;
  start.textContent=done?'Recherche terminée':active?'Recherche en cours':'Lancer la recherche';
  setTooltip(start,{title:selected.title,body:missing?`Nécessite ${missing}.`:done?'Ce projet est acquis.':active?'Ce projet est déjà sélectionné.':issue?`${issue}. Le projet peut être choisi maintenant ; la progression attend le travail réel au bureau.`:'Affecter ce projet aux chercheurs. Changer de projet conserve les progrès.'});
  start.onclick=()=>send({type:'research-project',project:selected.id});
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-research-select]')){
    button.setAttribute('aria-pressed',String(button.dataset.researchSelect===selected.id));
  }
}

export function updateResearchPanel(root: HTMLElement, world: World, send: (command: Command) => void): void {
  root.classList.add('research-reference');
  root.closest('#research-panel')?.classList.add('research-reference');
  if(!root.querySelector('[data-research-map]')){
    const viewport=document.createElement('div');viewport.className='research-viewport';viewport.dataset.researchMap='';
    viewport.setAttribute('role','group');viewport.setAttribute('aria-label','Projets de recherche et prérequis');
    const graph=document.createElement('div');graph.className='research-graph';
    const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.setAttribute('class','research-links');lines.setAttribute('viewBox',`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`);lines.setAttribute('aria-hidden','true');
    for(const [fromId,toId] of researchLinks){
      const from=nodePosition(projectById.get(fromId)!),to=nodePosition(projectById.get(toId)!);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      if(toId==='tube-television'){
        const x1=from.x,y1=from.y+NODE_HEIGHT/2,y2=to.y+NODE_HEIGHT/2;
        path.setAttribute('d',`M${x1} ${y1} L6 ${y1} L6 ${y2} L${to.x} ${y2}`);
      } else if(from.x===to.x){
        const x=from.x+NODE_WIDTH/2,y1=from.y+NODE_HEIGHT,y2=to.y;
        path.setAttribute('d',`M${x} ${y1} L${x} ${y2}`);
      } else if(to.y>from.y&&to.x<from.x){
        const x1=from.x+NODE_WIDTH/2,y1=from.y+NODE_HEIGHT,x2=to.x+NODE_WIDTH/2,y2=to.y,mid=(y1+y2)/2;
        path.setAttribute('d',`M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}`);
      } else {
        const x1=from.x+NODE_WIDTH,y1=from.y+NODE_HEIGHT/2,x2=to.x,y2=to.y+NODE_HEIGHT/2;
        path.setAttribute('d',`M${x1} ${y1} C${x1+Math.max(18,(x2-x1)/2)} ${y1},${x2-Math.max(18,(x2-x1)/2)} ${y2},${x2} ${y2}`);
      }
      lines.append(path);
    }
    graph.append(lines);
    for(const project of researchProjects){
      const node=document.createElement('div');node.className='research-node';node.dataset.researchNode=project.id;
      const position=nodePosition(project);node.style.left=`${position.x}px`;node.style.top=`${position.y}px`;
      const select=document.createElement('button');select.className='research-node-select';select.dataset.researchSelect=project.id;select.textContent=project.title;select.setAttribute('aria-label',`Détails : ${project.title}`);
      const progress=document.createElement('progress');progress.max=project.cost;progress.setAttribute(`data-${project.prefix}-progress`,'');progress.setAttribute('aria-label',`Progression ${project.title}`);
      const status=document.createElement('span');status.className='research-node-status';status.setAttribute(`data-${project.prefix}-status`,'');
      const cost=document.createElement('span');cost.className='research-node-cost';cost.textContent=String(project.cost);
      const start=document.createElement('button');start.type='button';start.className='research-node-start';start.setAttribute(`data-${project.prefix}-start`,'');start.textContent='▶';start.setAttribute('aria-label',`Lancer ${project.title}`);
      node.append(select,cost,progress,status,start);graph.append(node);
    }
    viewport.append(graph);
    const detail=document.createElement('section');detail.className='research-detail';detail.setAttribute('aria-label','Projet sélectionné');
    detail.innerHTML='<div class="research-detail-header"><h3 data-research-selection-title></h3><span data-research-selection-status></span></div><p data-research-selection-detail></p><p class="research-prerequisites">Prérequis<br><strong data-research-selection-prerequisites></strong></p><progress data-research-selection-progress aria-label="Progression du projet sélectionné"></progress><div class="research-detail-footer"><span data-research-selection-points></span><button type="button" data-research-selected-start>Lancer la recherche</button></div>';
    const footer=document.createElement('div');footer.className='research-footer';
    footer.innerHTML='<section class="research-active"><h4>Projet actif</h4><button type="button" data-research-active-project>Aucun</button><progress data-research-active-progress aria-label="Progression du projet actif"></progress><span data-research-active-points></span></section><button type="button" data-research-pause>Suspendre la recherche</button><p data-research-workers></p><details class="research-help"><summary>Aide à la recherche</summary><p data-research-help></p></details>';
    footer.querySelector<HTMLButtonElement>('[data-research-pause]')!.onclick=()=>send({type:'research-project',project:null});
    const sidebar=document.createElement('div');sidebar.className='research-sidebar';sidebar.append(detail,footer);
    const map=document.createElement('section');map.className='research-map-section';map.innerHTML='<h3 class="research-map-title">Principal</h3>';map.append(viewport);
    const layout=document.createElement('div');layout.className='research-core-layout';layout.append(sidebar,map);
    root.replaceChildren(layout);
  }
  for(const project of researchProjects){
    const done=researchUnlocked(world,project.id),active=world.research?.project===project.id,progress=project.progress(world),points=(progress?.points??0)/RESEARCH_SCALE,missing=researchPrerequisite(world,project.id);
    root.querySelector<HTMLProgressElement>(`[data-${project.prefix}-progress]`)!.value=points;
    const initial=done&&progress?.completedAt===0&&(world.scenario?.id==='survivors'||world.scenario?.id==='crashlanded');
    const issue=stationIssue(world,project.id);
    root.querySelector(`[data-${project.prefix}-status]`)!.textContent=done?initial?'Acquise au départ':'Terminée':missing?'Verrouillée':issue?'En attente du poste':active?'En cours':'Disponible';
    const start=root.querySelector<HTMLButtonElement>(`[data-${project.prefix}-start]`)!;
    start.disabled=done||active||!!missing;
    setTooltip(start,{title:`Lancer ${project.title}`,body:missing?`Nécessite ${missing}.`:done?'Recherche acquise.':active?'Recherche active.':'Choisir ce projet ; les progrès antérieurs sont conservés.'});
    start.onclick=()=>{root.dataset.selectedResearch=project.id;send({type:'research-project',project:project.id});};
    const select=root.querySelector<HTMLButtonElement>(`[data-research-select="${project.id}"]`)!;
    select.onclick=()=>{root.dataset.selectedResearch=project.id;paintSelected(root,world,send);};
    setTooltip(select,{title:project.title,body:project.detail,rows:[{label:'Progression',value:`${points.toFixed(1)} / ${project.cost}`},{label:'Prérequis',value:(prerequisites.get(project.id)??[]).join(' + ')||'Aucun'},{label:'État',value:done?'Acquise':missing?`Nécessite ${missing}`:active?'En cours':issue??'Disponible'}]});
    root.querySelector<HTMLElement>(`[data-research-node="${project.id}"]`)!.dataset.state=done?'done':active?'active':missing?'locked':'available';
  }
  if(!projectById.has(root.dataset.selectedResearch as ResearchProject))root.dataset.selectedResearch=world.research?.project??'complex-clothing';
  paintSelected(root,world,send);
  const active=world.research?.project?projectById.get(world.research.project):undefined;
  const activeButton=root.querySelector<HTMLButtonElement>('[data-research-active-project]')!;
  activeButton.textContent=active?.title??'Aucun projet';activeButton.disabled=!active;
  activeButton.onclick=()=>{if(active){root.dataset.selectedResearch=active.id;paintSelected(root,world,send);}};
  const activeProgress=root.querySelector<HTMLProgressElement>('[data-research-active-progress]')!;
  activeProgress.hidden=!active;activeProgress.max=active?.cost??1;activeProgress.value=active?(active.progress(world)?.points??0)/RESEARCH_SCALE:0;
  root.querySelector('[data-research-active-points]')!.textContent=active?`${activeProgress.value.toFixed(1)} / ${active.cost}`:'';
  root.querySelector<HTMLButtonElement>('[data-research-pause]')!.disabled=!world.research?.project;
  root.querySelector('[data-research-help]')!.textContent=researchProjects.every(p=>researchUnlocked(world,p.id))
    ? `Les ${researchProjects.length} projets disponibles sont acquis.`
    : 'Construisez un bureau de recherche dans Architecte → Production, puis affectez un colon dans Travail. Les recherches avancées exigent un bureau alimenté ; Fabrication exige aussi un multi-analyseur alimenté à proximité. L’électricité est disponible au départ.';
  const workers=world.pawns.filter(p=>p.research).map(p=>`${p.name} · Intellectuel ${intellectualSkill(p).level} · ${p.state==='working'?'au bureau':'en chemin'}`);
  root.querySelector('[data-research-workers]')!.textContent=workers.join(' ; ')||`${world.structures.filter(s=>s.kind==='research-bench'||s.kind==='hi-tech-research-bench').length} bureau(x) construit(s) · aucun chercheur au travail.`;
}
