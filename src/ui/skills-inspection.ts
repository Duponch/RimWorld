import { constructionSpeed, learningFactor, XP_SCALE, xpRequired } from '../sim/skills.ts';
import type { Pawn } from '../sim/types.ts';

const passions=['Sans passion','Passion 🔥','Passion brûlante 🔥🔥'];
export function createSkillsInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.className='skills-inspection';
  details.innerHTML='<summary>Biographie · compétences</summary><p data-skill="construction"></p><progress data-skill-xp max="1"></progress><p data-skill-description class="muted"></p><p class="muted">Les autres compétences, les traits et l’histoire personnelle restent à développer.</p>';
  panel.append(details);
}
export function updateSkillsInspection(panel:HTMLElement,pawn:Pawn):void {
  const s=pawn.skills.construction,label=panel.querySelector('[data-skill="construction"]');if(!label)return;
  label.textContent=`Construction ${s.level}/20 · ${passions[s.passion]}`;
  const progress=panel.querySelector<HTMLProgressElement>('[data-skill-xp]')!;
  progress.value=Math.max(0,s.xp/xpRequired(s.level));progress.setAttribute('aria-label','Expérience de construction');
  panel.querySelector('[data-skill-description]')!.textContent=`${(s.xp/XP_SCALE).toFixed(1)} / ${xpRequired(s.level)/XP_SCALE} XP · Vitesse ${Math.round(constructionSpeed(pawn)*100)} % · Apprentissage ${Math.round(learningFactor(s)*100)} %${s.dailyXp>4000*XP_SCALE?' (saturation quotidienne)':''}. La lumière s’applique séparément.`;
}
export function updateWorkSkills(row:HTMLElement,pawn:Pawn):void {
  const select=row.querySelector<HTMLSelectElement>('[data-work="build"]');if(!select)return;
  let label=row.querySelector<HTMLElement>('.work-skill');
  if(!label){label=document.createElement('small');label.className='work-skill';select.parentElement!.append(label);}
  const skill=pawn.skills.construction;
  label.textContent=`${skill.level} ${['','🔥','🔥🔥'][skill.passion]}`;
  select.title=`Construction ${skill.level}/20 · ${passions[skill.passion]} · vitesse ${Math.round(constructionSpeed(pawn)*100)} %`;
}
