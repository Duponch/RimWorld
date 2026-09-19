import { clothingUnlocked,RESEARCH_SCALE,intellectualSkill } from '../sim/research';
import type { Command,World } from '../sim/types';

export function updateResearchPanel(root:HTMLElement,world:World,send:(c:Command)=>void):void {
  if(!root.querySelector('[data-research-status]')){
    root.innerHTML='<h3>Vêtements complexes</h3><p>600 points · Débloque l’établi manuel de tailleur et la chemise en tissu.</p><progress data-research-progress max="600" aria-label="Progression Vêtements complexes"></progress><p data-research-status></p><button data-research-start>Rechercher Vêtements complexes</button><button data-research-pause>Suspendre la recherche</button><p data-research-workers></p><p class="muted">Construisez un bureau de recherche simple dans Architecte → Production, puis affectez un colon dans Travail. Plusieurs bureaux permettent de contribuer au même projet. La tenue tribale reste disponible sans recherche.</p>';
    root.querySelector<HTMLButtonElement>('[data-research-start]')!.onclick=()=>send({type:'research-project',project:'complex-clothing'});
    root.querySelector<HTMLButtonElement>('[data-research-pause]')!.onclick=()=>send({type:'research-project',project:null});
  }
  const done=clothingUnlocked(world),active=!!world.research?.project,points=(world.research?.points??0)/RESEARCH_SCALE;
  root.querySelector<HTMLProgressElement>('[data-research-progress]')!.value=points;
  root.querySelector('[data-research-status]')!.textContent=`${done?'Terminée':active?'En cours':'En attente'} · ${points.toFixed(1)} / 600 points`;
  root.querySelector<HTMLButtonElement>('[data-research-start]')!.disabled=done||active;
  root.querySelector<HTMLButtonElement>('[data-research-pause]')!.disabled=!active;
  const workers=world.pawns.filter(p=>p.research).map(p=>`${p.name} · Intellect ${intellectualSkill(p).level} · ${p.state==='working'?'au bureau':'en chemin'}`);
  root.querySelector('[data-research-workers]')!.textContent=workers.join(' ; ')||`${world.structures.filter(s=>s.kind==='research-bench').length} bureau(x) construit(s) · aucun chercheur au travail.`;
}
