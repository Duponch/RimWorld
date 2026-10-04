import { cookingSpot } from './cooking-bills.ts';
import { researchFacilityDistance,researchFacilityLinked } from './research-facilities.ts';
import { CleanlinessCapture } from './filth-room.ts';
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
export const TUBE_TELEVISION_RESEARCH_COST=1000*RESEARCH_SCALE;
export const tubeTelevisionUnlocked=(w:World):boolean=>w.research?.tubeTelevision?.completedAt!==undefined;
export const HOSPITAL_BED_RESEARCH_COST=1200*RESEARCH_SCALE;
export const PACKAGED_SURVIVAL_MEALS_RESEARCH_COST=500*RESEARCH_SCALE;
export const packagedSurvivalMealsUnlocked=(w:World):boolean=>w.research?.packagedSurvivalMeals?.completedAt!==undefined;
export const hospitalBedUnlocked=(w:World):boolean=>w.research?.hospitalBed?.completedAt!==undefined;
export const STONECUTTING_RESEARCH_COST=300*RESEARCH_SCALE,SMITHING_RESEARCH_COST=700*RESEARCH_SCALE,COMPLEX_FURNITURE_RESEARCH_COST=300*RESEARCH_SCALE;
export const stonecuttingUnlocked=(w:World):boolean=>w.research?.stonecutting?.completedAt!==undefined;
export const smithingUnlocked=(w:World):boolean=>w.research?.smithing?.completedAt!==undefined;
export const complexFurnitureUnlocked=(w:World):boolean=>w.research?.complexFurniture?.completedAt!==undefined;
export const CLOTHING_RESEARCH_COST=600*RESEARCH_SCALE;
export const MACHINING_RESEARCH_COST=1000*RESEARCH_SCALE,GUNSMITHING_RESEARCH_COST=500*RESEARCH_SCALE;
export const MICROELECTRONICS_RESEARCH_COST=3000*RESEARCH_SCALE,MULTI_ANALYZER_RESEARCH_COST=4000*RESEARCH_SCALE,FABRICATION_RESEARCH_COST=4000*RESEARCH_SCALE;
export const ADVANCED_FABRICATION_RESEARCH_COST=4000*RESEARCH_SCALE;
export const RECON_ARMOR_RESEARCH_COST=6000*RESEARCH_SCALE;
export const AUTODOORS_RESEARCH_COST=600*RESEARCH_SCALE;
export const PLATE_ARMOR_RESEARCH_COST=600*RESEARCH_SCALE,FLAK_ARMOR_RESEARCH_COST=1200*RESEARCH_SCALE;
export const machiningUnlocked=(w:World):boolean=>w.research?.machining?.completedAt!==undefined;
export const gunsmithingUnlocked=(w:World):boolean=>w.research?.gunsmithing?.completedAt!==undefined;
export const plateArmorUnlocked=(w:World):boolean=>w.research?.plateArmor?.completedAt!==undefined;
export const flakArmorUnlocked=(w:World):boolean=>w.research?.flakArmor?.completedAt!==undefined;
export const microelectronicsUnlocked=(w:World):boolean=>w.research?.microelectronics?.completedAt!==undefined;
export const multiAnalyzerUnlocked=(w:World):boolean=>w.research?.multiAnalyzer?.completedAt!==undefined;
export const fabricationUnlocked=(w:World):boolean=>w.research?.fabrication?.completedAt!==undefined;
export const advancedFabricationUnlocked=(w:World):boolean=>w.research?.advancedFabrication?.completedAt!==undefined;
export const reconArmorUnlocked=(w:World):boolean=>w.research?.reconArmor?.completedAt!==undefined;
export const autodoorsUnlocked=(w:World):boolean=>w.research?.autodoors?.completedAt!==undefined;
export const researchPrerequisite=(w:World,project:ResearchProject):string|undefined=>project==='tube-television'&&!complexFurnitureUnlocked(w)?'Mobilier complexe':project==='hospital-bed'&&!microelectronicsUnlocked(w)?'Microélectronique':project==='hospital-bed'&&!complexFurnitureUnlocked(w)?'Mobilier complexe':project==='machining'&&!smithingUnlocked(w)?'Forge':project==='gunsmithing'&&!machiningUnlocked(w)?'Usinage':project==='plate-armor'&&!smithingUnlocked(w)?'Forge':project==='plate-armor'&&!clothingUnlocked(w)?'Vêtements complexes':project==='flak-armor'&&!machiningUnlocked(w)?'Usinage':project==='flak-armor'&&!plateArmorUnlocked(w)?'Armure de plaques':project==='multi-analyzer'&&!microelectronicsUnlocked(w)?'Microélectronique':project==='multi-analyzer'&&!machiningUnlocked(w)?'Usinage':project==='fabrication'&&!multiAnalyzerUnlocked(w)?'Multi-analyseur':project==='advanced-fabrication'&&!fabricationUnlocked(w)?'Fabrication':project==='recon-armor'&&!fabricationUnlocked(w)?'Fabrication':project==='recon-armor'&&!clothingUnlocked(w)?'Vêtements complexes':undefined;
export type ResearchProject='tube-television'|'packaged-survival-meals'|'hospital-bed'|'machining'|'gunsmithing'|'plate-armor'|'flak-armor'|'recon-armor'|'complex-clothing'|'complex-furniture'|'air-conditioning'|'batteries'|'solar-power'|'stonecutting'|'smithing'|'microelectronics'|'multi-analyzer'|'fabrication'|'advanced-fabrication'|'autodoors';
export interface ResearchProgress {points:number;completedAt?:number}
export interface ResearchState extends ResearchProgress {tubeTelevision?:ResearchProgress;packagedSurvivalMeals?:ResearchProgress;hospitalBed?:ResearchProgress;machining?:ResearchProgress;gunsmithing?:ResearchProgress;plateArmor?:ResearchProgress;flakArmor?:ResearchProgress;reconArmor?:ResearchProgress;microelectronics?:ResearchProgress;multiAnalyzer?:ResearchProgress;fabrication?:ResearchProgress;advancedFabrication?:ResearchProgress;autodoors?:ResearchProgress;project:ResearchProject|null;complexFurniture?:ResearchProgress;airConditioning?:ResearchProgress;batteries?:ResearchProgress;solarPower?:ResearchProgress;stonecutting?:ResearchProgress;smithing?:ResearchProgress}
export const AIR_CONDITIONING_COST=500*RESEARCH_SCALE;
export const BATTERIES_RESEARCH_COST=400*RESEARCH_SCALE;
export const SOLAR_POWER_RESEARCH_COST=600*RESEARCH_SCALE;
export const airConditioningUnlocked=(w:World):boolean=>w.research?.airConditioning?.completedAt!==undefined;
export const batteriesUnlocked=(w:World):boolean=>w.research?.batteries?.completedAt!==undefined;
export const solarPowerUnlocked=(w:World):boolean=>w.research?.solarPower?.completedAt!==undefined;
export const projectProgress=(s:ResearchState,project:ResearchProject):ResearchProgress=>project==='tube-television'?(s.tubeTelevision??={points:0}):project==='packaged-survival-meals'?(s.packagedSurvivalMeals??={points:0}):project==='hospital-bed'?(s.hospitalBed??={points:0}):project==='microelectronics'?(s.microelectronics??={points:0}):project==='multi-analyzer'?(s.multiAnalyzer??={points:0}):project==='fabrication'?(s.fabrication??={points:0}):project==='advanced-fabrication'?(s.advancedFabrication??={points:0}):project==='recon-armor'?(s.reconArmor??={points:0}):project==='autodoors'?(s.autodoors??={points:0}):project==='machining'?(s.machining??={points:0}):project==='gunsmithing'?(s.gunsmithing??={points:0}):project==='plate-armor'?(s.plateArmor??={points:0}):project==='flak-armor'?(s.flakArmor??={points:0}):project==='stonecutting'?(s.stonecutting??={points:0}):project==='smithing'?(s.smithing??={points:0}):project==='complex-furniture'?(s.complexFurniture??={points:0}):project==='complex-clothing'?s:project==='air-conditioning'?(s.airConditioning??={points:0}):project==='batteries'?(s.batteries??={points:0}):(s.solarPower??={points:0});
export const researchCost=(project:ResearchProject):number=>project==='tube-television'?TUBE_TELEVISION_RESEARCH_COST:project==='packaged-survival-meals'?PACKAGED_SURVIVAL_MEALS_RESEARCH_COST:project==='hospital-bed'?HOSPITAL_BED_RESEARCH_COST:project==='microelectronics'?MICROELECTRONICS_RESEARCH_COST:project==='multi-analyzer'?MULTI_ANALYZER_RESEARCH_COST:project==='fabrication'?FABRICATION_RESEARCH_COST:project==='advanced-fabrication'?ADVANCED_FABRICATION_RESEARCH_COST:project==='recon-armor'?RECON_ARMOR_RESEARCH_COST:project==='autodoors'?AUTODOORS_RESEARCH_COST:project==='machining'?MACHINING_RESEARCH_COST:project==='gunsmithing'?GUNSMITHING_RESEARCH_COST:project==='plate-armor'?PLATE_ARMOR_RESEARCH_COST:project==='flak-armor'?FLAK_ARMOR_RESEARCH_COST:project==='stonecutting'?STONECUTTING_RESEARCH_COST:project==='smithing'?SMITHING_RESEARCH_COST:project==='complex-furniture'?COMPLEX_FURNITURE_RESEARCH_COST:project==='complex-clothing'?CLOTHING_RESEARCH_COST:project==='air-conditioning'?AIR_CONDITIONING_COST:project==='batteries'?BATTERIES_RESEARCH_COST:SOLAR_POWER_RESEARCH_COST;
export const researchUnlocked=(w:World,project:ResearchProject):boolean=>project==='tube-television'?tubeTelevisionUnlocked(w):project==='packaged-survival-meals'?packagedSurvivalMealsUnlocked(w):project==='hospital-bed'?hospitalBedUnlocked(w):project==='microelectronics'?microelectronicsUnlocked(w):project==='multi-analyzer'?multiAnalyzerUnlocked(w):project==='fabrication'?fabricationUnlocked(w):project==='advanced-fabrication'?advancedFabricationUnlocked(w):project==='recon-armor'?reconArmorUnlocked(w):project==='autodoors'?autodoorsUnlocked(w):project==='machining'?machiningUnlocked(w):project==='gunsmithing'?gunsmithingUnlocked(w):project==='plate-armor'?plateArmorUnlocked(w):project==='flak-armor'?flakArmorUnlocked(w):project==='stonecutting'?stonecuttingUnlocked(w):project==='smithing'?smithingUnlocked(w):project==='complex-furniture'?complexFurnitureUnlocked(w):project==='complex-clothing'?clothingUnlocked(w):project==='air-conditioning'?airConditioningUnlocked(w):project==='batteries'?batteriesUnlocked(w):solarPowerUnlocked(w);
export interface ResearchTask {stationId:number;spot:Cell;worked:number;facilityId?:number}
export const clothingUnlocked=(world:World):boolean=>world.research?.completedAt!==undefined;
export const intellectualSkill=(pawn:Pawn):SkillRecord=>pawn.skills.intellectual??{level:0,xp:0,dailyXp:0,passion:0};
export const researchWanted=(world:World,pawn:Pawn):boolean=>!!world.research?.project&&pawn.priorities.research>0;
export const needsHighTechBench=(project:ResearchProject):boolean=>project==='hospital-bed'||project==='multi-analyzer'||project==='fabrication'||project==='advanced-fabrication'||project==='recon-armor';
/** The nearest usable analyzer supplies one link per desk, with shared use. */
export function nearbyResearchFacility(world:World,station:Structure):Structure|undefined {
  const linked=world.structures.filter(s=>s.kind==='multi-analyzer'&&researchFacilityLinked(world,station,s))
    .sort((a,b)=>researchFacilityDistance(station,a)-researchFacilityDistance(station,b)||a.x-b.x||a.z-b.z||a.id-b.id)[0];
  return linked&&isPowerActive(linked)?linked:undefined;
}
export function researchStationUsable(world:World,station:Structure,project:ResearchProject,facilityId?:number):boolean {
  if(station.kind!=='research-bench'&&station.kind!=='hi-tech-research-bench')return false;
  if(needsHighTechBench(project)&&(station.kind!=='hi-tech-research-bench'||!isPowerActive(station)))return false;
  if(station.kind==='hi-tech-research-bench'&&!isPowerActive(station))return false;
  if(project==='fabrication'||project==='advanced-fabrication'||project==='recon-armor'){
    const facility=nearbyResearchFacility(world,station);
    if(!facility||facilityId!==undefined&&facility.id!==facilityId)return false;
  }
  return true;
}
export function selectResearch(world:World,project:unknown):CommandResult {
  if(project!==null&&project!=='tube-television'&&project!=='packaged-survival-meals'&&project!=='hospital-bed'&&project!=='microelectronics'&&project!=='multi-analyzer'&&project!=='fabrication'&&project!=='advanced-fabrication'&&project!=='recon-armor'&&project!=='autodoors'&&project!=='machining'&&project!=='gunsmithing'&&project!=='plate-armor'&&project!=='flak-armor'&&project!=='complex-clothing'&&project!=='complex-furniture'&&project!=='air-conditioning'&&project!=='batteries'&&project!=='solar-power'&&project!=='stonecutting'&&project!=='smithing')return {ok:false,code:'invalid-command',reason:'Projet inconnu.'};
  if(project==='tube-television'&&world.schemaVersion<190)return {ok:false,code:'invalid-command',reason:'Projet indisponible dans ce schéma.'};
  if(project==='packaged-survival-meals'&&world.schemaVersion<188)return {ok:false,code:'invalid-command',reason:'Projet indisponible dans ce schéma.'};
  if(project==='hospital-bed'&&world.schemaVersion<187)return {ok:false,code:'invalid-command',reason:'Projet indisponible dans ce schéma.'};
  if(project==='autodoors'&&world.schemaVersion<143)return {ok:false,code:'invalid-command',reason:'Projet indisponible dans ce schéma.'};
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
  const stations=world.structures.filter(s=>(s.kind==='research-bench'||s.kind==='hi-tech-research-bench')&&researchStationUsable(world,s,project)&&!deconstructionReserved(world,s.id,pawn.id)&&!world.pawns.some(p=>p!==pawn&&p.research?.stationId===s.id))
    .sort((a,b)=>Math.abs(a.x-pawn.x)+Math.abs(a.z-pawn.z)-Math.abs(b.x-pawn.x)-Math.abs(b.z-pawn.z)||a.id-b.id);
  for(const s of stations){const spot=cookingSpot(s);if(reserved.has(spot.z*world.width+spot.x)||!canStandAt(world,spot))continue;
    const facility=s.kind==='hi-tech-research-bench'?nearbyResearchFacility(world,s):undefined;
    if((project==='fabrication'||project==='advanced-fabrication'||project==='recon-armor')&&!facility)continue;
    const path=routeToJob(world,spot,reach,true);if(path)return {task:{stationId:s.id,spot,worked:0,...(facility?{facilityId:facility.id}:{})},path};
  }return null;
}
interface ResearchCleanlinessRead {capture:CleanlinessCapture;items:NonNullable<World['filth']>['items']|undefined;count:number}
const cleanlinessCaptures=new WeakMap<WorkEnvironment,ResearchCleanlinessRead>();
function researchCleanliness(world:World,station:Structure,environment:WorkEnvironment):number|null {
  const items=world.filth?.items,count=items?.length??0;
  let read=cleanlinessCaptures.get(environment);
  // Actual deposits append traces and removals replace the array. Their
  // identity/count is an O(1) revision; thickness does not alter this score.
  // Topology/light remain immutable decision inputs, while filth is live.
  if(!read||read.items!==items||read.count!==count){read={capture:new CleanlinessCapture(world,environment.topology),items,count};cleanlinessCaptures.set(environment,read);}
  return read.capture.room(station)?.cleanliness??null;
}
export function researchCleanlinessFactor(cleanliness:number|null):number {
  if(cleanliness===null)return .75;
  if(cleanliness<=-5)return .75;if(cleanliness>=1)return 1.15;
  if(cleanliness<-2.5)return .75+(cleanliness+5)*.04;
  if(cleanliness<0)return .85+(cleanliness+2.5)*.06;
  return 1+cleanliness*.15;
}
/** Integer micro-points persist work. Room stats reuse the current environment
 * topology and one lazily computed cleanliness result per requested room. */
export function researchRate(pawn:Pawn,station:Structure,environment:WorkEnvironment,temperature:number,world:World):number {
  const c=pawnBody(pawn).capacities,skill=intellectualSkill(pawn);
  const personal=Math.max(.1,(.08+.115*skill.level)*(.5+.5*Math.min(1.1,c.manipulation))*(.5+.5*Math.min(1.1,c.sight))*environment.speedAt(pawn));
  const room=environment.room(station),outdoor=room?.psychologicallyOutdoors??true;
  let cleanliness:number|null=outdoor?null:0;
  if(!outdoor)cleanliness=researchCleanliness(world,station,environment);
  const facilityOffset=nearbyResearchFacility(world,station)?.kind==='multi-analyzer'?.1:0;
  const bench=Math.max(.25,((station.kind==='hi-tech-research-bench'?1:.75)+facilityOffset)*(outdoor?.75:1)*researchCleanlinessFactor(cleanliness)*(room&&!outdoor&&room.role!=='laboratory'?.8:1)*tailoringTemperatureFactor(temperature));
  return Math.round(.0825*personal*bench*RESEARCH_SCALE);
}
export function processResearch(world:World,pawn:Pawn,move:(target:Cell,exact:boolean)=>unknown,rate:(s:Structure)=>number,event:(text:string)=>void):void {
  const task=pawn.research!,station=world.structures.find(s=>s.id===task.stationId);
  if(medicalWorkRefusal(pawn)||!station||!researchWanted(world,pawn)||(world.research!.project==='fabrication'||world.research!.project==='advanced-fabrication'||world.research!.project==='recon-armor')&&task.facilityId===undefined||!researchStationUsable(world,station,world.research!.project!,task.facilityId)||deconstructionReserved(world,station.id,pawn.id)||!canStandAt(world,task.spot)){releaseAssignments(world,pawn);return;}
  if(pawn.x!==task.spot.x||pawn.z!==task.spot.z){move(task.spot,true);return;}
  pawn.path=[];pawn.state='working';
  const state=world.research!,project=state.project!,progress=projectProgress(state,project),cost=researchCost(project);
  progress.points=Math.min(cost,progress.points+rate(station));
  pawn.skills.intellectual??={...intellectualSkill(pawn)};learnSkill(pawn.skills.intellectual,1000,pawn);task.worked++;
  if(progress.points===cost){state.project=null;progress.completedAt=world.tick;
    for(const p of world.pawns)if(p.research)releaseAssignments(world,p);
    event(project==='tube-television'?'Recherche achevée : Télévision cathodique. Loisirs télévisés débloqués.':project==='packaged-survival-meals'?'Recherche achevée : Repas de survie emballés. Fabrication sur cuisinière débloquée.':project==='hospital-bed'?'Recherche achevée : Lit d’hôpital. Construction médicale spécialisée débloquée.':project==='microelectronics'?'Recherche achevée : Microélectronique. Bureau de recherche avancé débloqué.':project==='multi-analyzer'?'Recherche achevée : Multi-analyseur. Équipement de recherche débloqué.':project==='fabrication'?'Recherche achevée : Fabrication. Établi de fabrication débloqué.':project==='advanced-fabrication'?'Recherche achevée : Fabrication avancée. Composants avancés fabricables.':project==='recon-armor'?'Recherche achevée : Armure de reconnaissance. Casque de reconnaissance fabricable.':project==='autodoors'?'Recherche achevée : Portes automatiques. Construction débloquée.':project==='machining'?'Recherche achevée : Usinage. Atelier d’usinage débloqué.':project==='gunsmithing'?'Recherche achevée : Armurerie. Revolver et fusil à verrou fabricables.':project==='plate-armor'?'Recherche achevée : Armure de plaques. Préparation du gilet pare-balles.':project==='flak-armor'?'Recherche achevée : Gilet pare-balles. Facture disponible à l’atelier d’usinage.':project==='stonecutting'?'Recherche achevée : Taille de pierre. Dalles de pierre débloquées.':project==='smithing'?'Recherche achevée : Forge. Dalles en acier débloquées.':project==='complex-furniture'?'Recherche achevée : Mobilier complexe. Chaises, fauteuils, mobilier de chambre et table d’échecs débloqués.':project==='complex-clothing'?'Recherche achevée : Vêtements complexes. Établis de tailleur et vêtements avancés débloqués.':project==='air-conditioning'?'Recherche achevée : Climatisation. Climatiseur électrique débloqué.':project==='batteries'?'Recherche achevée : Batteries. Stockage électrique débloqué.':'Recherche achevée : Panneaux solaires. Production solaire débloquée.');
  }else if(task.worked>=400)releaseAssignments(world,pawn);
}
