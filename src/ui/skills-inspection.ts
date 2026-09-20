import { createTraitsInspection,updateTraitsInspection,traitSummary } from './traits-inspection';
import { intellectualSkill } from '../sim/research';
import { craftingSkill } from '../sim/crafting-quality';
import { cookingSkill,cookingSpeed,butcherySpeed,butcheryEfficiency } from '../sim/cooking-statistics';
import { constructionSpeed, learningFactor, XP_SCALE, xpRequired } from '../sim/skills.ts';
import { medicalTendSpeed,medicalTendQuality } from '../sim/care-rules.ts';
import type { Pawn } from '../sim/types.ts';

const passions=['Sans passion','Passion 🔥','Passion brûlante 🔥🔥'];
export function createSkillsInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.className='skills-inspection';
  details.innerHTML='<summary>Biographie · compétences</summary><p data-skill="construction"></p><progress data-skill-xp max="1"></progress><p data-skill-description class="muted"></p><p data-skill="medicine"></p><progress data-medicine-xp max="1"></progress><p data-medicine-description class="muted"></p><p data-skill="intellectual"></p><p data-skill="crafting"></p><progress data-crafting-xp max="1"></progress><p data-skill="cooking"></p><progress data-cooking-xp max="1"></progress><p data-cooking-description class="muted"></p><p data-skill="shooting"></p><progress data-shooting-xp max="1"></progress><p data-skill="melee"></p><progress data-melee-xp max="1"></progress><p class="muted">Social et opinions : voir l’inspection Social. Autres compétences et histoire personnelle à développer.</p>';
  createTraitsInspection(details);panel.append(details);
}
export function updateSkillsInspection(panel:HTMLElement,pawn:Pawn):void {
  updateTraitsInspection(panel,pawn);
  const s=pawn.skills.construction,label=panel.querySelector('[data-skill="construction"]');if(!label)return;
  label.textContent=`Construction ${s.level}/20 · ${passions[s.passion]}`;
  const progress=panel.querySelector<HTMLProgressElement>('[data-skill-xp]')!;
  progress.value=Math.max(0,s.xp/xpRequired(s.level));progress.setAttribute('aria-label','Expérience de construction');
  panel.querySelector('[data-skill-description]')!.textContent=`${(s.xp/XP_SCALE).toFixed(1)} / ${xpRequired(s.level)/XP_SCALE} XP · Vitesse ${Math.round(constructionSpeed(pawn)*100)} % · Apprentissage ${Math.round(learningFactor(s,pawn)*100)} %${s.dailyXp>4000*XP_SCALE?' (saturation quotidienne)':''}. La lumière s’applique séparément.`;
  const intellect=intellectualSkill(pawn);panel.querySelector('[data-skill="intellectual"]')!.textContent=`Intellect ${intellect.level}/20 · ${passions[intellect.passion]} · ${(intellect.xp/XP_SCALE).toFixed(1)} XP · vitesse de recherche.`;
  const craft=craftingSkill(pawn);panel.querySelector('[data-skill="crafting"]')!.textContent=`Artisanat ${craft.level}/20 · ${passions[craft.passion]} · ${(craft.xp/XP_SCALE).toFixed(1)} XP · influe sur la qualité de confection, sans accélérer la taille de pierre.`;
  panel.querySelector<HTMLProgressElement>('[data-crafting-xp]')!.value=Math.max(0,craft.xp/xpRequired(craft.level));
  const cook=cookingSkill(pawn);panel.querySelector('[data-skill="cooking"]')!.textContent=`Cuisine ${cook.level}/20 · ${passions[cook.passion]}`;
  const cp=panel.querySelector<HTMLProgressElement>('[data-cooking-xp]')!;cp.value=Math.max(0,cook.xp/xpRequired(cook.level));cp.setAttribute('aria-label','Expérience de cuisine');
  panel.querySelector('[data-cooking-description]')!.textContent=`${(cook.xp/XP_SCALE).toFixed(1)} / ${xpRequired(cook.level)/XP_SCALE} XP · Cuisson ${Math.round(cookingSpeed(pawn)*100)} % · Boucherie ${Math.round(butcherySpeed(pawn)*100)} % · Rendement ${Math.round(butcheryEfficiency(pawn)*100)} % avant poste · Apprentissage ${Math.round(learningFactor(cook,pawn)*100)} %. La lumière et la température s’appliquent séparément.`;
  const shot=pawn.skills.shooting;panel.querySelector('[data-skill="shooting"]')!.textContent=`Tir ${shot.level}/20 · ${passions[shot.passion]} · ${(shot.xp/XP_SCALE).toFixed(1)} XP · Apprentissage ${Math.round(learningFactor(shot,pawn)*100)} %`;
  const sp=panel.querySelector<HTMLProgressElement>('[data-shooting-xp]')!;sp.value=Math.max(0,shot.xp/xpRequired(shot.level));sp.setAttribute('aria-label','Expérience de tir');
  const melee=pawn.skills.melee;panel.querySelector('[data-skill="melee"]')!.textContent=`Mêlée ${melee.level}/20 · ${passions[melee.passion]} · ${(melee.xp/XP_SCALE).toFixed(1)} XP · Apprentissage ${Math.round(learningFactor(melee,pawn)*100)} %`;
  panel.querySelector<HTMLProgressElement>('[data-melee-xp]')!.value=Math.max(0,melee.xp/xpRequired(melee.level));
  const m=pawn.skills.medicine;
  panel.querySelector('[data-skill="medicine"]')!.textContent=`Médecine ${m.level}/20 · ${passions[m.passion]}`;
  const mp=panel.querySelector<HTMLProgressElement>('[data-medicine-xp]')!;mp.value=Math.max(0,m.xp/xpRequired(m.level));mp.setAttribute('aria-label','Expérience de médecine');
  panel.querySelector('[data-medicine-description]')!.textContent=`${(m.xp/XP_SCALE).toFixed(1)} / ${xpRequired(m.level)/XP_SCALE} XP · Vitesse ${Math.round(medicalTendSpeed(pawn)*100)} % avant lumière · Qualité de base ${Math.round(medicalTendQuality(pawn)*100)} % avant matériel et variation · Apprentissage ${Math.round(learningFactor(m,pawn)*100)} %.`;
}
export function updateWorkSkills(row:HTMLElement,pawn:Pawn):void {
  row.title=traitSummary(pawn);
  const warden=row.querySelector<HTMLSelectElement>('[data-work="warden"]');
  if(warden){let label=warden.parentElement!.querySelector<HTMLElement>('.work-social');if(!label){label=document.createElement('small');label.className='work-social';warden.parentElement!.append(label);}const s=pawn.skills.social??{level:0,xp:0,dailyXp:0,passion:0};label.textContent=`${s.level} ${['','🔥','🔥🔥'][s.passion]}`;warden.title=`Social ${s.level}/20 · ${passions[s.passion]} · nourrit les prisonniers et mène les conversations selon le mode choisi`;}
  const doctor=row.querySelector<HTMLSelectElement>('[data-work="doctor"]');
  if(doctor){let label=doctor.parentElement!.querySelector<HTMLElement>('.work-medicine');if(!label){label=document.createElement('small');label.className='work-medicine';doctor.parentElement!.append(label);}const m=pawn.skills.medicine;label.textContent=`${m.level} ${['','🔥','🔥🔥'][m.passion]}`;doctor.title=`Médecine ${m.level}/20 · ${passions[m.passion]} · apprentissage ${Math.round(learningFactor(m,pawn)*100)} %`;}
  const cook=row.querySelector<HTMLSelectElement>('[data-work="cook"]');
  if(cook){let label=cook.parentElement!.querySelector<HTMLElement>('.work-cooking');if(!label){label=document.createElement('small');label.className='work-cooking';cook.parentElement!.append(label);}const c=cookingSkill(pawn);label.textContent=`${c.level} ${['','🔥','🔥🔥'][c.passion]}`;cook.title=`Cuisine ${c.level}/20 · ${passions[c.passion]} · cuisson ${Math.round(cookingSpeed(pawn)*100)} % · rendement de boucherie ${Math.round(butcheryEfficiency(pawn)*100)} % avant poste`;}
  const select=row.querySelector<HTMLSelectElement>('[data-work="build"]');if(!select)return;
  let label=row.querySelector<HTMLElement>('.work-skill');
  if(!label){label=document.createElement('small');label.className='work-skill';select.parentElement!.append(label);}
  const skill=pawn.skills.construction;
  label.textContent=`${skill.level} ${['','🔥','🔥🔥'][skill.passion]}`;
  select.title=`Construction ${skill.level}/20 · ${passions[skill.passion]} · vitesse ${Math.round(constructionSpeed(pawn)*100)} % · apprentissage ${Math.round(learningFactor(skill,pawn)*100)} %`;
}
