import { cookingSpot } from './cooking-bills.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { deconstructionReserved } from './deconstruction-rules.ts';
import { canStandAt } from './furniture-travel.ts';
import { routeToJob,type Reachability } from './pathfinding.ts';
import { releaseAssignments } from './work-release.ts';
import { learnSkill,type SkillRecord } from './skills.ts';
import { medicalWorkRefusal,pawnBody } from './health-rules.ts';
import { tailoringTemperatureFactor } from './crafting-quality.ts';
import type { WorkEnvironment } from './work-environment.ts';
import type { Cell,CommandResult,Pawn,Structure,World } from './types.ts';

export const RESEARCH_SCALE=1_000_000;
export const STONECUTTING_RESEARCH_COST=300*RESEARCH_SCALE,SMITHING_RESEARCH_COST=700*RESEARCH_SCALE,COMPLEX_FURNITURE_RESEARCH_COST=300*RESEARCH_SCALE;
export const stonecuttingUnlocked=(w:World):boolean=>w.research?.stonecutting?.completedAt!==undefined;
export const smithingUnlocked=(w:World):boolean=>w.research?.smithing?.completedAt!==undefined;
export const complexFurnitureUnlocked=(w:World):boolean=>w.research?.complexFurniture?.completedAt!==undefined;
export const CLOTHING_RESEARCH_COST=600*RESEARCH_SCALE;
export const MACHINING_RESEARCH_COST=1000*RESEARCH_SCALE,GUNSMITHING_RESEARCH_COST=500*RESEARCH_SCALE;
export const machiningUnlocked=(w:World):boolean=>w.research?.machining?.completedAt!==undefined;
export const gunsmithingUnlocked=(w:World):boolean=>w.research?.gunsmithing?.completedAt!==undefined;
export const researchPrerequisite=(w:World,project:ResearchProject):string|undefined=>project==='machining'&&!smithingUnlocked(w)?'Forge':project==='gunsmithing'&&!machiningUnlocked(w)?'Usinage':undefined;
export type ResearchProject='machining'|'gunsmithing'|'complex-clothing'|'complex-furniture'|'air-conditioning'|'batteries'|'solar-power'|'stonecutting'|'smithing';
export interface ResearchProgress {points:number;completedAt?:number}
export interface ResearchState extends ResearchProgress {machining?:ResearchProgress;gunsmithing?:ResearchProgress;project:ResearchProject|null;complexFurniture?:ResearchProgress;airConditioning?:ResearchProgress;batteries?:ResearchProgress;solarPower?:ResearchProgress;stonecutting?:ResearchProgress;smithing?:ResearchProgress}
export const AIR_CONDITIONING_COST=500*RESEARCH_SCALE;
export const BATTERIES_RESEARCH_COST=400*RESEARCH_SCALE;
export const SOLAR_POWER_RESEARCH_COST=600*RESEARCH_SCALE;
export const airConditioningUnlocked=(w:World):boolean=>w.research?.airConditioning?.completedAt!==undefined;
export const batteriesUnlocked=(w:World):boolean=>w.research?.batteries?.completedAt!==undefined;
export const solarPowerUnlocked=(w:World):boolean=>w.research?.solarPower?.completedAt!==undefined;
export const projectProgress=(s:ResearchState,project:ResearchProject):ResearchProgress=>project==='machining'?(s.machining??={points:0}):project==='gunsmithing'?(s.gunsmithing??={points:0}):project==='stonecutting'?(s.stonecutting??={points:0}):project==='smithing'?(s.smithing??={points:0}):project==='complex-furniture'?(s.complexFurniture??={points:0}):project==='complex-clothing'?s:project==='air-conditioning'?(s.airConditioning??={points:0}):project==='batteries'?(s.batteries??={points:0}):(s.solarPower??={points:0});
export const researchCost=(project:ResearchProject):number=>project==='machining'?MACHINING_RESEARCH_COST:project==='gunsmithing'?GUNSMITHING_RESEARCH_COST:project==='stonecutting'?STONECUTTING_RESEARCH_COST:project==='smithing'?SMITHING_RESEARCH_COST:project==='complex-furniture'?COMPLEX_FURNITURE_RESEARCH_COST:project==='complex-clothing'?CLOTHING_RESEARCH_COST:project==='air-conditioning'?AIR_CONDITIONING_COST:project==='batteries'?BATTERIES_RESEARCH_COST:SOLAR_POWER_RESEARCH_COST;
export const researchUnlocked=(w:World,project:ResearchProject):boolean=>project==='machining'?machiningUnlocked(w):project==='gunsmithing'?gunsmithingUnlocked(w):project==='stonecutting'?stonecuttingUnlocked(w):project==='smithing'?smithingUnlocked(w):project==='complex-furniture'?complexFurnitureUnlocked(w):project==='complex-clothing'?clothingUnlocked(w):project==='air-conditioning'?airConditioningUnlocked(w):project==='batteries'?batteriesUnlocked(w):solarPowerUnlocked(w);
export interface ResearchTask {stationId:number;spot:Cell;worked:number}
export const clothingUnlocked=(world:World):boolean=>world.research?.completedAt!==undefined;
export const intellectualSkill=(pawn:Pawn):SkillRecord=>pawn.skills.intellectual??{level:0,xp:0,dailyXp:0,passion:0};
export const researchWanted=(world:World,pawn:Pawn):boolean=>!!world.research?.project&&pawn.priorities.research>0;
export function selectResearch(world:World,project:unknown):CommandResult {
  if(project!==null&&project!=='machining'&&project!=='gunsmithing'&&project!=='complex-clothing'&&project!=='complex-furniture'&&project!=='air-conditioning'&&project!=='batteries'&&project!=='solar-power'&&project!=='stonecutting'&&project!=='smithing')return {ok:false,code:'invalid-command',reason:'Projet inconnu.'};
  if(project&&researchUnlocked(world,project))return {ok:false,code:'invalid-command',reason:'Cette recherche est déjà terminée.'};
  if(project&&researchPrerequisite(world,project))return {ok:false,code:'invalid-command',reason:`Recherchez ${researchPrerequisite(world,project)} d’abord.`};
  world.research??={project:null,points:0};world.research.project=project;if(project)projectProgress(world.research,project);
  for(const pawn of world.pawns){if(pawn.research)releaseAssignments(world,pawn);pawn.planCooldown=0;}
  return {ok:true};
}
export function researchProposal(world:World,pawn:Pawn,reach:Reachability):{task:ResearchTask;path:Cell[]}|null {
  if(!researchWanted(world,pawn))return null;
  const reserved=reservedServiceCells(world,pawn.id);
  const stations=world.structures.filter(s=>s.kind==='research-bench'&&!deconstructionReserved(world,s.id,pawn.id)&&!world.pawns.some(p=>p!==pawn&&p.research?.stationId===s.id))
    .sort((a,b)=>Math.abs(a.x-pawn.x)+Math.abs(a.z-pawn.z)-Math.abs(b.x-pawn.x)-Math.abs(b.z-pawn.z)||a.id-b.id);
  for(const s of stations){const spot=cookingSpot(s);if(reserved.has(spot.z*world.width+spot.x)||!canStandAt(world,spot))continue;
    const path=routeToJob(world,spot,reach,true);if(path)return {task:{stationId:s.id,spot,worked:0},path};
  }return null;
}
/** Integer micro-points persist the work done. Absent filth/floors use the
 * documented neutral indoor cleanliness; outdoors retains its own penalty. */
export function researchRate(pawn:Pawn,station:Structure,environment:WorkEnvironment,temperature:number):number {
  const c=pawnBody(pawn).capacities,skill=intellectualSkill(pawn);
  const personal=Math.max(.1,(.08+.115*skill.level)*(.5+.5*Math.min(1.1,c.manipulation))*(.5+.5*Math.min(1.1,c.sight))*environment.speedAt(pawn));
  const room=environment.room(station),outdoor=room?.psychologicallyOutdoors??true;
  const bench=Math.max(.25,.75*(outdoor?.9:1)*(outdoor?.75:1)*(room&&!outdoor&&room.role!=='laboratory'?.8:1)*tailoringTemperatureFactor(temperature));
  return Math.round(.0825*personal*bench*RESEARCH_SCALE);
}
export function processResearch(world:World,pawn:Pawn,move:(target:Cell,exact:boolean)=>unknown,rate:(s:Structure)=>number,event:(text:string)=>void):void {
  const task=pawn.research!,station=world.structures.find(s=>s.id===task.stationId&&s.kind==='research-bench');
  if(medicalWorkRefusal(pawn)||!station||!researchWanted(world,pawn)||deconstructionReserved(world,station.id,pawn.id)||!canStandAt(world,task.spot)){releaseAssignments(world,pawn);return;}
  if(pawn.x!==task.spot.x||pawn.z!==task.spot.z){move(task.spot,true);return;}
  pawn.path=[];pawn.state='working';
  const state=world.research!,project=state.project!,progress=projectProgress(state,project),cost=researchCost(project);progress.points=Math.min(cost,progress.points+rate(station));
  pawn.skills.intellectual??={...intellectualSkill(pawn)};learnSkill(pawn.skills.intellectual,1000,pawn);task.worked++;
  if(progress.points===cost){state.project=null;progress.completedAt=world.tick;
    for(const p of world.pawns)if(p.research)releaseAssignments(world,p);
    event(project==='machining'?'Recherche achevée : Usinage. Atelier d’usinage débloqué.':project==='gunsmithing'?'Recherche achevée : Armurerie. Revolver et fusil à verrou fabricables.':project==='stonecutting'?'Recherche achevée : Taille de pierre. Dalles de pierre débloquées.':project==='smithing'?'Recherche achevée : Forge. Dalles en acier débloquées.':project==='complex-furniture'?'Recherche achevée : Mobilier complexe. Chaises, fauteuils et mobilier de chambre débloqués.':project==='complex-clothing'?'Recherche achevée : Vêtements complexes. Établis de tailleur et vêtements avancés débloqués.':project==='air-conditioning'?'Recherche achevée : Climatisation. Climatiseur électrique débloqué.':project==='batteries'?'Recherche achevée : Batteries. Stockage électrique débloqué.':'Recherche achevée : Panneaux solaires. Production solaire débloquée.');
  }else if(task.worked>=400)releaseAssignments(world,pawn);
}
