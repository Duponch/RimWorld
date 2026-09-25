import { createTraitsInspection,updateTraitsInspection,traitSummary } from './traits-inspection';
import { intellectualSkill } from '../sim/research';
import { craftingSkill } from '../sim/crafting-quality';
import { artisticSkill } from '../sim/art-rules';
import { cookingSkill,cookingSpeed,butcherySpeed,butcheryEfficiency } from '../sim/cooking-statistics';
import { constructionSpeed, learningFactor, XP_SCALE, xpRequired } from '../sim/skills.ts';
import { medicalTendSpeed,medicalTendQuality } from '../sim/care-rules.ts';
import type { Pawn } from '../sim/types.ts';
import { SKILL_PASSION_LABELS,setCompactSkillPassion,setSkillPassion } from './skill-passion';

type SkillEntry = {
  skill: 'construction'|'medicine'|'intellectual'|'crafting'|'artistic'|'cooking'|'shooting'|'melee';
  progress?: string;
  description?: string;
};
const SKILL_ENTRIES: readonly SkillEntry[] = [
  {skill:'construction',progress:'data-skill-xp',description:'data-skill-description'},
  {skill:'medicine',progress:'data-medicine-xp',description:'data-medicine-description'},
  {skill:'intellectual'},
  {skill:'crafting',progress:'data-crafting-xp'},
  {skill:'artistic',progress:'data-artistic-xp'},
  {skill:'cooking',progress:'data-cooking-xp',description:'data-cooking-description'},
  {skill:'shooting',progress:'data-shooting-xp'},
  {skill:'melee',progress:'data-melee-xp'},
];

function createSkillEntry(entry:SkillEntry):HTMLDetailsElement {
  const details=document.createElement('details');details.className='skill-entry';details.dataset.skillEntry=entry.skill;
  const summary=document.createElement('summary'),label=document.createElement('span');label.dataset.skill=entry.skill;summary.append(label);
  if(entry.progress){const progress=document.createElement('progress');progress.max=1;progress.setAttribute(entry.progress,'');summary.append(progress);}
  const description=document.createElement('p');description.className='skill-entry-details muted';description.dataset.skillDetail=entry.skill;
  if(entry.description)description.setAttribute(entry.description,'');
  details.append(summary,description);return details;
}

export function createSkillsInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.className='skills-inspection';
  const summary=document.createElement('summary');summary.textContent='Biographie · compétences';details.append(summary,...SKILL_ENTRIES.map(createSkillEntry));
  const note=document.createElement('p');note.className='muted';note.textContent='Social et opinions : voir l’inspection Social. Autres compétences et histoire personnelle à développer.';details.append(note);
  createTraitsInspection(details);panel.append(details);
}
export function updateSkillsInspection(panel:HTMLElement,pawn:Pawn):void {
  updateTraitsInspection(panel,pawn);
  const s=pawn.skills.construction,label=panel.querySelector('[data-skill="construction"]');if(!label)return;
  setSkillPassion(label as HTMLElement,`Construction ${s.level}/20`,s.passion);
  const progress=panel.querySelector<HTMLProgressElement>('[data-skill-xp]')!;
  progress.value=Math.max(0,s.xp/xpRequired(s.level));progress.setAttribute('aria-label','Expérience de construction');
  panel.querySelector('[data-skill-description]')!.textContent=`${(s.xp/XP_SCALE).toFixed(1)} / ${xpRequired(s.level)/XP_SCALE} XP · Vitesse ${Math.round(constructionSpeed(pawn)*100)} % · Apprentissage ${Math.round(learningFactor(s,pawn)*100)} %${s.dailyXp>4000*XP_SCALE?' (saturation quotidienne)':''}. La lumière s’applique séparément.`;
  const intellect=intellectualSkill(pawn);setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="intellectual"]')!,`Intellect ${intellect.level}/20`,intellect.passion);panel.querySelector<HTMLElement>('[data-skill-detail="intellectual"]')!.textContent=`${(intellect.xp/XP_SCALE).toFixed(1)} XP · vitesse de recherche.`;
  const craft=craftingSkill(pawn);setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="crafting"]')!,`Artisanat ${craft.level}/20`,craft.passion);panel.querySelector<HTMLElement>('[data-skill-detail="crafting"]')!.textContent=`${(craft.xp/XP_SCALE).toFixed(1)} XP · influe sur la qualité de confection, sans accélérer la taille de pierre.`;
  const craftProgress=panel.querySelector<HTMLProgressElement>('[data-crafting-xp]')!;craftProgress.value=Math.max(0,craft.xp/xpRequired(craft.level));craftProgress.setAttribute('aria-label','Expérience d’artisanat');
  const art=artisticSkill(pawn);
  setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="artistic"]')!,`Artistique ${art.level}/20`,art.passion);
  panel.querySelector<HTMLElement>('[data-skill-detail="artistic"]')!.textContent=`${(art.xp/XP_SCALE).toFixed(1)} / ${xpRequired(art.level)/XP_SCALE} XP · détermine la qualité des sculptures, sans accélérer le travail. Apprentissage ${Math.round(learningFactor(art,pawn)*100)} %.`;
  const artProgress=panel.querySelector<HTMLProgressElement>('[data-artistic-xp]')!;artProgress.value=Math.max(0,art.xp/xpRequired(art.level));artProgress.setAttribute('aria-label','Expérience artistique');
  const cook=cookingSkill(pawn);setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="cooking"]')!,`Cuisine ${cook.level}/20`,cook.passion);
  const cp=panel.querySelector<HTMLProgressElement>('[data-cooking-xp]')!;cp.value=Math.max(0,cook.xp/xpRequired(cook.level));cp.setAttribute('aria-label','Expérience de cuisine');
  panel.querySelector('[data-cooking-description]')!.textContent=`${(cook.xp/XP_SCALE).toFixed(1)} / ${xpRequired(cook.level)/XP_SCALE} XP · Cuisson ${Math.round(cookingSpeed(pawn)*100)} % · Boucherie ${Math.round(butcherySpeed(pawn)*100)} % · Rendement ${Math.round(butcheryEfficiency(pawn)*100)} % avant poste · Apprentissage ${Math.round(learningFactor(cook,pawn)*100)} %. La lumière et la température s’appliquent séparément.`;
  const shot=pawn.skills.shooting;setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="shooting"]')!,`Tir ${shot.level}/20`,shot.passion);panel.querySelector<HTMLElement>('[data-skill-detail="shooting"]')!.textContent=`${(shot.xp/XP_SCALE).toFixed(1)} XP · Apprentissage ${Math.round(learningFactor(shot,pawn)*100)} %`;
  const sp=panel.querySelector<HTMLProgressElement>('[data-shooting-xp]')!;sp.value=Math.max(0,shot.xp/xpRequired(shot.level));sp.setAttribute('aria-label','Expérience de tir');
  const melee=pawn.skills.melee;setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="melee"]')!,`Mêlée ${melee.level}/20`,melee.passion);panel.querySelector<HTMLElement>('[data-skill-detail="melee"]')!.textContent=`${(melee.xp/XP_SCALE).toFixed(1)} XP · Apprentissage ${Math.round(learningFactor(melee,pawn)*100)} %`;
  const meleeProgress=panel.querySelector<HTMLProgressElement>('[data-melee-xp]')!;meleeProgress.value=Math.max(0,melee.xp/xpRequired(melee.level));meleeProgress.setAttribute('aria-label','Expérience de mêlée');
  const m=pawn.skills.medicine;
  setSkillPassion(panel.querySelector<HTMLElement>('[data-skill="medicine"]')!,`Médecine ${m.level}/20`,m.passion);
  const mp=panel.querySelector<HTMLProgressElement>('[data-medicine-xp]')!;mp.value=Math.max(0,m.xp/xpRequired(m.level));mp.setAttribute('aria-label','Expérience de médecine');
  panel.querySelector('[data-medicine-description]')!.textContent=`${(m.xp/XP_SCALE).toFixed(1)} / ${xpRequired(m.level)/XP_SCALE} XP · Vitesse ${Math.round(medicalTendSpeed(pawn)*100)} % avant lumière · Qualité de base ${Math.round(medicalTendQuality(pawn)*100)} % avant matériel et variation · Apprentissage ${Math.round(learningFactor(m,pawn)*100)} %.`;
}
export function updateWorkSkills(row:HTMLElement,pawn:Pawn):void {
  row.title=traitSummary(pawn);
  const warden=row.querySelector<HTMLSelectElement>('[data-work="warden"]');
  if(warden){let label=warden.parentElement!.querySelector<HTMLElement>('.work-social');if(!label){label=document.createElement('small');label.className='work-social';warden.parentElement!.append(label);}const s=pawn.skills.social??{level:0,xp:0,dailyXp:0,passion:0};setCompactSkillPassion(label,s.level,s.passion,'Social');warden.title=`Social ${s.level}/20 · ${SKILL_PASSION_LABELS[s.passion]} · nourrit les prisonniers et mène les conversations selon le mode choisi`;}
  const doctor=row.querySelector<HTMLSelectElement>('[data-work="doctor"]');
  if(doctor){let label=doctor.parentElement!.querySelector<HTMLElement>('.work-medicine');if(!label){label=document.createElement('small');label.className='work-medicine';doctor.parentElement!.append(label);}const m=pawn.skills.medicine;setCompactSkillPassion(label,m.level,m.passion,'Médecine');doctor.title=`Médecine ${m.level}/20 · ${SKILL_PASSION_LABELS[m.passion]} · apprentissage ${Math.round(learningFactor(m,pawn)*100)} %`;}
  const cook=row.querySelector<HTMLSelectElement>('[data-work="cook"]');
  if(cook){let label=cook.parentElement!.querySelector<HTMLElement>('.work-cooking');if(!label){label=document.createElement('small');label.className='work-cooking';cook.parentElement!.append(label);}const c=cookingSkill(pawn);setCompactSkillPassion(label,c.level,c.passion,'Cuisine');cook.title=`Cuisine ${c.level}/20 · ${SKILL_PASSION_LABELS[c.passion]} · cuisson ${Math.round(cookingSpeed(pawn)*100)} % · rendement de boucherie ${Math.round(butcheryEfficiency(pawn)*100)} % avant poste`;}
  const artWork=row.querySelector<HTMLSelectElement>('[data-work="art"]');
  if(artWork){let label=artWork.parentElement!.querySelector<HTMLElement>('.work-artistic');if(!label){label=document.createElement('small');label.className='work-artistic';artWork.parentElement!.append(label);}const art=artisticSkill(pawn);setCompactSkillPassion(label,art.level,art.passion,'Artistique');artWork.title=`Artistique ${art.level}/20 · ${SKILL_PASSION_LABELS[art.passion]} · qualité des sculptures, sans effet direct sur la vitesse`;}
  const select=row.querySelector<HTMLSelectElement>('[data-work="build"]');if(!select)return;
  let label=row.querySelector<HTMLElement>('.work-skill');
  if(!label){label=document.createElement('small');label.className='work-skill';select.parentElement!.append(label);}
  const skill=pawn.skills.construction;
  setCompactSkillPassion(label,skill.level,skill.passion,'Construction');
  select.title=`Construction ${skill.level}/20 · ${SKILL_PASSION_LABELS[skill.passion]} · vitesse ${Math.round(constructionSpeed(pawn)*100)} % · apprentissage ${Math.round(learningFactor(skill,pawn)*100)} %`;
}
