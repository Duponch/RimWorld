import { cookingSpot } from './cooking-bills.ts';
import { footprintCells } from './definitions.ts';
import { isPowerActive } from './power-rules.ts';
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
export const MICROELECTRONICS_RESEARCH_COST=3000*RESEARCH_SCALE,MULTI_ANALYZER_RESEARCH_COST=4000*RESEARCH_SCALE,FABRICATION_RESEARCH_COST=4000*RESEARCH_SCALE;
export const ADVANCED_FABRICATION_RESEARCH_COST=4000*RESEARCH_SCALE;
export const PLATE_ARMOR_RESEARCH_COST=600*RESEARCH_SCALE,FLAK_ARMOR_RESEARCH_COST=1200*RESEARCH_SCALE;
export const machiningUnlocked=(w:World):boolean=>w.research?.machining?.completedAt!==undefined;
export const gunsmithingUnlocked=(w:World):boolean=>w.research?.gunsmithing?.completedAt!==undefined;
export const plateArmorUnlocked=(w:World):boolean=>w.research?.plateArmor?.completedAt!==undefined;
export const flakArmorUnlocked=(w:World):boolean=>w.research?.flakArmor?.completedAt!==undefined;
export const microelectronicsUnlocked=(w:World):boolean=>w.research?.microelectronics?.completedAt!==undefined;
export const multiAnalyzerUnlocked=(w:World):boolean=>w.research?.multiAnalyzer?.completedAt!==undefined;
export const fabricationUnlocked=(w:World):boolean=>w.research?.fabrication?.completedAt!==undefined;
export const advancedFabricationUnlocked=(w:World):boolean=>w.research?.advancedFabrication?.completedAt!==undefined;
export const researchPrerequisite=(w:World,project:ResearchProject):string|undefined=>project==='machining'&&!smithingUnlocked(w)?'Forge':project==='gunsmithing'&&!machiningUnlocked(w)?'Usinage':project==='plate-armor'&&!smithingUnlocked(w)?'Forge':project==='plate-armor'&&!clothingUnlocked(w)?'Vêtements complexes':project==='flak-armor'&&!machiningUnlocked(w)?'Usinage':project==='flak-armor'&&!plateArmorUnlocked(w)?'Armure de plaques':project==='multi-analyzer'&&!microelectronicsUnlocked(w)?'Microélectronique':project==='multi-analyzer'&&!machiningUnlocked(w)?'Usinage':project==='fabrication'&&!multiAnalyzerUnlocked(w)?'Multi-analyseur':project==='advanced-fabrication'&&!fabricationUnlocked(w)?'Fabrication':undefined;
export type ResearchProject='machining'|'gunsmithing'|'plate-armor'|'flak-armor'|'complex-clothing'|'complex-furniture'|'air-conditioning'|'batteries'|'solar-power'|'stonecutting'|'smithing'|'microelectronics'|'multi-analyzer'|'fabrication'|'advanced-fabrication';
export interface ResearchProgress {points:number;completedAt?:number}
export interface ResearchState extends ResearchProgress {machining?:ResearchProgress;gunsmithing?:ResearchProgress;plateArmor?:ResearchProgress;flakArmor?:ResearchProgress;microelectronics?:ResearchProgress;multiAnalyzer?:ResearchProgress;fabrication?:ResearchProgress;advancedFabrication?:ResearchProgress;project:ResearchProject|null;complexFurniture?:ResearchProgress;airConditioning?:ResearchProgress;batteries?:ResearchProgress;solarPower?:ResearchProgress;stonecutting?:ResearchProgress;smithing?:ResearchProgress}
export const AIR_CONDITIONING_COST=500*RESEARCH_SCALE;
export const BATTERIES_RESEARCH_COST=400*RESEARCH_SCALE;
export const SOLAR_POWER_RESEARCH_COST=600*RESEARCH_SCALE;
export const airConditioningUnlocked=(w:World):boolean=>w.research?.airConditioning?.completedAt!==undefined;
export const batteriesUnlocked=(w:World):boolean=>w.research?.batteries?.completedAt!==undefined;
export const solarPowerUnlocked=(w:World):boolean=>w.research?.solarPower?.completedAt!==undefined;
export const projectProgress=(s:ResearchState,project:ResearchProject):ResearchProgress=>project==='microelectronics'?(s.microelectronics??={points:0}):project==='multi-analyzer'?(s.multiAnalyzer??={points:0}):project==='fabrication'?(s.fabrication??={points:0}):project==='advanced-fabrication'?(s.advancedFabrication??={points:0}):project==='machining'?(s.machining??={points:0}):project==='gunsmithing'?(s.gunsmithing??={points:0}):project==='plate-armor'?(s.plateArmor??={points:0}):project==='flak-armor'?(s.flakArmor??={points:0}):project==='stonecutting'?(s.stonecutting??={points:0}):project==='smithing'?(s.smithing??={points:0}):project==='complex-furniture'?(s.complexFurniture??={points:0}):project==='complex-clothing'?s:project==='air-conditioning'?(s.airConditioning??={points:0}):project==='batteries'?(s.batteries??={points:0}):(s.solarPower??={points:0});
export const researchCost=(project:ResearchProject):number=>project==='microelectronics'?MICROELECTRONICS_RESEARCH_COST:project==='multi-analyzer'?MULTI_ANALYZER_RESEARCH_COST:project==='fabrication'?FABRICATION_RESEARCH_COST:project==='advanced-fabrication'?ADVANCED_FABRICATION_RESEARCH_COST:project==='machining'?MACHINING_RESEARCH_COST:project==='gunsmithing'?GUNSMITHING_RESEARCH_COST:project==='plate-armor'?PLATE_ARMOR_RESEARCH_COST:project==='flak-armor'?FLAK_ARMOR_RESEARCH_COST:project==='stonecutting'?STONECUTTING_RESEARCH_COST:project==='smithing'?SMITHING_RESEARCH_COST:project==='complex-furniture'?COMPLEX_FURNITURE_RESEARCH_COST:project==='complex-clothing'?CLOTHING_RESEARCH_COST:project==='air-conditioning'?AIR_CONDITIONING_COST:project==='batteries'?BATTERIES_RESEARCH_COST:SOLAR_POWER_RESEARCH_COST;
export const researchUnlocked=(w:World,project:ResearchProject):boolean=>project==='microelectronics'?microelectronicsUnlocked(w):project==='multi-analyzer'?multiAnalyzerUnlocked(w):project==='fabrication'?fabricationUnlocked(w):project==='advanced-fabrication'?advancedFabricationUnlocked(w):project==='machining'?machiningUnlocked(w):project==='gunsmithing'?gunsmithingUnlocked(w):project==='plate-armor'?plateArmorUnlocked(w):project==='flak-armor'?flakArmorUnlocked(w):project==='stonecutting'?stonecuttingUnlocked(w):project==='smithing'?smithingUnlocked(w):project==='complex-furniture'?complexFurnitureUnlocked(w):project==='complex-clothing'?clothingUnlocked(w):project==='air-conditioning'?airConditioningUnlocked(w):project==='batteries'?batteriesUnlocked(w):solarPowerUnlocked(w);
export interface ResearchTask {stationId:number;spot:Cell;worked:number;facilityId?:number}
export const clothingUnlocked=(world:World):boolean=>world.research?.completedAt!==undefined;
export const intellectualSkill=(pawn:Pawn):SkillRecord=>pawn.skills.intellectual??{level:0,xp:0,dailyXp:0,passion:0};
export const researchWanted=(world:World,pawn:Pawn):boolean=>!!world.research?.project&&pawn.priorities.research>0;
export const needsHighTechBench=(project:ResearchProject):boolean=>project==='multi-analyzer'||project==='fabrication'||project==='advanced-fabrication';
/** A facility may serve a desk at most nine cells away, measured between
 * occupied cells. Only decisions and assigned work call this bounded query. */
export function nearbyResearchFacility(world:World,station:Structure,reserved?:ReadonlySet<number>):Structure|undefined {
  const cells=footprintCells(station);
  return world.structures.find(s=>s.kind==='multi-analyzer'&&!reserved?.has(s.id)&&isPowerActive(s)&&footprintCells(s).some(a=>cells.some(b=>{const dx=a.x-b.x,dz=a.z-b.z;return dx*dx+dz*dz<=81;})));
}
export function researchStationUsable(world:World,station:Structure,project:ResearchProject,facilityId?:number):boolean {
  if(station.kind!=='research-bench'&&station.kind!=='hi-tech-research-bench')return false;
  if(needsHighTechBench(project)&&(station.kind!=='hi-tech-research-bench'||!isPowerActive(station)))return false;
  if(station.kind==='hi-tech-research-bench'&&!isPowerActive(station))return false;
  if(project==='fabrication'||project==='advanced-fabrication'){
    const facility=facilityId===undefined?nearbyResearchFacility(world,station):world.structures.find(s=>s.id===facilityId);
    if(!facility||facility.kind!=='multi-analyzer'||!isPowerActive(facility))return false;
    const desk=footprintCells(station),analyzer=footprintCells(facility);
    if(!analyzer.some(a=>desk.some(b=>{const dx=a.x-b.x,dz=a.z-b.z;return dx*dx+dz*dz<=81;})))return false;
  }
  return true;
}
export function selectResearch(world:World,project:unknown):CommandResult {
  if(project!==null&&project!=='microelectronics'&&project!=='multi-analyzer'&&project!=='fabrication'&&project!=='advanced-fabrication'&&project!=='machining'&&project!=='gunsmithing'&&project!=='plate-armor'&&project!=='flak-armor'&&project!=='complex-clothing'&&project!=='complex-furniture'&&project!=='air-conditioning'&&project!=='batteries'&&project!=='solar-power'&&project!=='stonecutting'&&project!=='smithing')return {ok:false,code:'invalid-command',reason:'Projet inconnu.'};
  if(project&&researchUnlocked(world,project))return {ok:false,code:'invalid-command',reason:'Cette recherche est déjà terminée.'};
  if(project&&researchPrerequisite(world,project))return {ok:false,code:'invalid-command',reason:`Recherchez ${researchPrerequisite(world,project)} d’abord.`};
  world.research??={project:null,points:0};world.research.project=project;if(project)projectProgress(world.research,project);
  for(const pawn of world.pawns){if(pawn.research)releaseAssignments(world,pawn);pawn.planCooldown=0;}
  return {ok:true};
}
export function researchProposal(world:World,pawn:Pawn,reach:Reachability):{task:ResearchTask;path:Cell[]}|null {
  if(!researchWanted(world,pawn))return null;
  const project=world.research!.project!;
  const reserved=reservedServiceCells(world,pawn.id);
  const reservedFacilities=new Set(world.pawns.filter(p=>p!==pawn&&p.research?.facilityId!==undefined).map(p=>p.research!.facilityId!));
  const stations=world.structures.filter(s=>(s.kind==='research-bench'||s.kind==='hi-tech-research-bench')&&researchStationUsable(world,s,project)&&!deconstructionReserved(world,s.id,pawn.id)&&!world.pawns.some(p=>p!==pawn&&p.research?.stationId===s.id))
    .sort((a,b)=>Math.abs(a.x-pawn.x)+Math.abs(a.z-pawn.z)-Math.abs(b.x-pawn.x)-Math.abs(b.z-pawn.z)||a.id-b.id);
  for(const s of stations){const spot=cookingSpot(s);if(reserved.has(spot.z*world.width+spot.x)||!canStandAt(world,spot))continue;
    const facility=s.kind==='hi-tech-research-bench'?nearbyResearchFacility(world,s,reservedFacilities):undefined;
    if((project==='fabrication'||project==='advanced-fabrication')&&!facility)continue;
    const path=routeToJob(world,spot,reach,true);if(path)return {task:{stationId:s.id,spot,worked:0,...(facility?{facilityId:facility.id}:{})},path};
  }return null;
}
/** Integer micro-points persist the work done. Absent filth/floors use the
 * documented neutral indoor cleanliness; outdoors retains its own penalty. */
export function researchRate(pawn:Pawn,station:Structure,environment:WorkEnvironment,temperature:number):number {
  const c=pawnBody(pawn).capacities,skill=intellectualSkill(pawn);
  const personal=Math.max(.1,(.08+.115*skill.level)*(.5+.5*Math.min(1.1,c.manipulation))*(.5+.5*Math.min(1.1,c.sight))*environment.speedAt(pawn));
  const room=environment.room(station),outdoor=room?.psychologicallyOutdoors??true;
  const bench=Math.max(.25,(station.kind==='hi-tech-research-bench'?1.5:.75)*(outdoor?.9:1)*(outdoor?.75:1)*(room&&!outdoor&&room.role!=='laboratory'?.8:1)*tailoringTemperatureFactor(temperature));
  return Math.round(.0825*personal*bench*RESEARCH_SCALE);
}
export function processResearch(world:World,pawn:Pawn,move:(target:Cell,exact:boolean)=>unknown,rate:(s:Structure)=>number,event:(text:string)=>void):void {
  const task=pawn.research!,station=world.structures.find(s=>s.id===task.stationId);
  if(medicalWorkRefusal(pawn)||!station||!researchWanted(world,pawn)||(world.research!.project==='fabrication'||world.research!.project==='advanced-fabrication')&&task.facilityId===undefined||task.facilityId!==undefined&&world.pawns.some(p=>p!==pawn&&p.research?.facilityId===task.facilityId)||!researchStationUsable(world,station,world.research!.project!,task.facilityId)||deconstructionReserved(world,station.id,pawn.id)||!canStandAt(world,task.spot)){releaseAssignments(world,pawn);return;}
  if(pawn.x!==task.spot.x||pawn.z!==task.spot.z){move(task.spot,true);return;}
  pawn.path=[];pawn.state='working';
  const state=world.research!,project=state.project!,progress=projectProgress(state,project),cost=researchCost(project);
  const analyzerBonus=task.facilityId!==undefined&&(project==='fabrication'||project==='advanced-fabrication'||researchStationUsable(world,station,'fabrication',task.facilityId))?1.1:1;
  progress.points=Math.min(cost,progress.points+Math.round(rate(station)*analyzerBonus));
  pawn.skills.intellectual??={...intellectualSkill(pawn)};learnSkill(pawn.skills.intellectual,1000,pawn);task.worked++;
  if(progress.points===cost){state.project=null;progress.completedAt=world.tick;
    for(const p of world.pawns)if(p.research)releaseAssignments(world,p);
    event(project==='microelectronics'?'Recherche achevée : Microélectronique. Bureau de recherche avancé débloqué.':project==='multi-analyzer'?'Recherche achevée : Multi-analyseur. Équipement de recherche débloqué.':project==='fabrication'?'Recherche achevée : Fabrication. Établi de fabrication débloqué.':project==='advanced-fabrication'?'Recherche achevée : Fabrication avancée. Composants avancés fabricables.':project==='machining'?'Recherche achevée : Usinage. Atelier d’usinage débloqué.':project==='gunsmithing'?'Recherche achevée : Armurerie. Revolver et fusil à verrou fabricables.':project==='plate-armor'?'Recherche achevée : Armure de plaques. Préparation du gilet pare-balles.':project==='flak-armor'?'Recherche achevée : Gilet pare-balles. Facture disponible à l’atelier d’usinage.':project==='stonecutting'?'Recherche achevée : Taille de pierre. Dalles de pierre débloquées.':project==='smithing'?'Recherche achevée : Forge. Dalles en acier débloquées.':project==='complex-furniture'?'Recherche achevée : Mobilier complexe. Chaises, fauteuils, mobilier de chambre et table d’échecs débloqués.':project==='complex-clothing'?'Recherche achevée : Vêtements complexes. Établis de tailleur et vêtements avancés débloqués.':project==='air-conditioning'?'Recherche achevée : Climatisation. Climatiseur électrique débloqué.':project==='batteries'?'Recherche achevée : Batteries. Stockage électrique débloqué.':'Recherche achevée : Panneaux solaires. Production solaire débloquée.');
  }else if(task.worked>=400)releaseAssignments(world,pawn);
}
