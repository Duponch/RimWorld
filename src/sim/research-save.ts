import { MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,machiningUnlocked,researchPrerequisite,STONECUTTING_RESEARCH_COST,SMITHING_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST,CLOTHING_RESEARCH_COST,AIR_CONDITIONING_COST,BATTERIES_RESEARCH_COST,SOLAR_POWER_RESEARCH_COST,airConditioningUnlocked,clothingUnlocked,batteriesUnlocked,solarPowerUnlocked,complexFurnitureUnlocked } from './research.ts';
import { cookingSpot } from './cooking-bills.ts';
import { canStandAt } from './furniture-travel.ts';
import type { World } from './types.ts';
import { gunsmithingUnlocked } from './research.ts';
import { isGunRecipe } from './production-recipes.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validateResearch(world:World,version:number):string[]{
  const errors:string[]=[],state=world.research;
  if(state!==undefined){
    const progress=(p:unknown,cost:number,active:boolean,root=false)=>record(p)&&Object.keys(p).every(k=>['points','completedAt',...(root?['project',...(version>=75?['airConditioning']:[]),...(version>=85?['batteries','solarPower']:[]),...(version>=89?['stonecutting','smithing']:[]),...(version>=90?['complexFurniture']:[]),...(version>=101?['machining','gunsmithing']:[])]:[])].includes(k))&&int(p.points,0,cost)
      &&(p.completedAt===undefined?p.points<cost:int(p.completedAt,0,world.tick)&&p.points===cost&&!active);
    if(version<73||!record(state)||state.project!==null&&state.project!=='complex-clothing'&&(version<75||state.project!=='air-conditioning')&&(version<85||state.project!=='batteries'&&state.project!=='solar-power')&&(version<89||state.project!=='stonecutting'&&state.project!=='smithing')&&(version<90||state.project!=='complex-furniture')&&(version<101||state.project!=='machining'&&state.project!=='gunsmithing')
      ||!progress(state,CLOTHING_RESEARCH_COST,state.project==='complex-clothing'||version<75&&state.project!==null,true)
      ||state.airConditioning!==undefined&&(version<75||!progress(state.airConditioning,AIR_CONDITIONING_COST,state.project==='air-conditioning'))
      ||state.project==='air-conditioning'&&!state.airConditioning
      ||state.batteries!==undefined&&(version<85||!progress(state.batteries,BATTERIES_RESEARCH_COST,state.project==='batteries'))
      ||state.solarPower!==undefined&&(version<85||!progress(state.solarPower,SOLAR_POWER_RESEARCH_COST,state.project==='solar-power'))
      ||state.stonecutting!==undefined&&(version<89||!progress(state.stonecutting,STONECUTTING_RESEARCH_COST,state.project==='stonecutting'))
      ||state.smithing!==undefined&&(version<89||!progress(state.smithing,SMITHING_RESEARCH_COST,state.project==='smithing'))
      ||state.complexFurniture!==undefined&&(version<90||!progress(state.complexFurniture,COMPLEX_FURNITURE_RESEARCH_COST,state.project==='complex-furniture'))
      ||state.machining!==undefined&&(version<101||!progress(state.machining,MACHINING_RESEARCH_COST,state.project==='machining')||!!researchPrerequisite(world,'machining'))
      ||state.gunsmithing!==undefined&&(version<101||!progress(state.gunsmithing,GUNSMITHING_RESEARCH_COST,state.project==='gunsmithing')||!!researchPrerequisite(world,'gunsmithing'))
      ||state.project==='machining'&&!state.machining||state.project==='gunsmithing'&&!state.gunsmithing
      ||state.project==='stonecutting'&&!state.stonecutting||state.project==='smithing'&&!state.smithing
      ||state.project==='complex-furniture'&&!state.complexFurniture
      ||state.project==='batteries'&&!state.batteries||state.project==='solar-power'&&!state.solarPower)errors.push('Invalid research project.');
  }
  if(!airConditioningUnlocked(world)&&[...world.structures,...world.jobs].some(s=>s.kind==='cooler'))errors.push('Locked cooler.');
  const electricalContent=[...world.structures,...world.jobs,...(world.packed??[]).map(p=>p.building)];
  if(!batteriesUnlocked(world)&&electricalContent.some(s=>s.kind==='battery'))errors.push('Locked battery.');
  if(!solarPowerUnlocked(world)&&electricalContent.some(s=>s.kind==='solar-generator'))errors.push('Locked solar generator.');
  if(version>=90&&!complexFurnitureUnlocked(world)&&electricalContent.some(s=>['dining-chair','armchair','end-table','dresser'].includes(s.kind)))errors.push('Locked complex furniture.');
  if(!machiningUnlocked(world)&&electricalContent.some(s=>s.kind==='machining-table'))errors.push('Locked machining table.');
  // Obtained weapons need no research; only the local fabrication chain does.
  if(version>=101&&!gunsmithingUnlocked(world)&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>isGunRecipe(b.recipe)))
    ||world.piles.some(p=>p.gunWork)||world.pawns.some(p=>p.cooking&&isGunRecipe(p.cooking.recipe))))errors.push('Locked gunsmithing production.');
  const stations=new Set<number>();
  for(const pawn of world.pawns){
    if(version<73?pawn.priorities.research!==undefined:!int(pawn.priorities.research,0,4))errors.push('Invalid or future research priority.');
    const task=pawn.research;if(task===undefined)continue;
    if(version<73||!record(task)||Object.keys(task).some(k=>!['stationId','spot','worked'].includes(k))||!int(task.stationId,1)||!record(task.spot)||!int(task.spot.x,0,world.width-1)||!int(task.spot.z,0,world.height-1)||!int(task.worked,0,399)){errors.push('Invalid research task.');continue;}
    const station=world.structures.find(s=>s.id===task.stationId&&s.kind==='research-bench'),spot=station&&cookingSpot(station);
    if(!station||!spot||spot.x!==task.spot.x||spot.z!==task.spot.z||!canStandAt(world,task.spot)||stations.has(task.stationId)||!state?.project||pawn.priorities.research===0
      ||pawn.heatRefuge||pawn.jobId!==null||pawn.haul||pawn.cooking||pawn.need||pawn.recreation.task||pawn.tend||pawn.ward||pawn.feed||pawn.rescue||pawn.equipmentTask||pawn.draft||pawn.shooting||pawn.flee||pawn.tactics||pawn.melee||pawn.raid||pawn.mental?.crisis||!['moving','working'].includes(pawn.state)||pawn.orders.active!==null)errors.push('Invalid research ownership.');
    if(pawn.state==='working'&&(pawn.x!==task.spot.x||pawn.z!==task.spot.z||pawn.path.length))errors.push('Research working away from its station.');
    stations.add(task.stationId);
  }
  if(version>=73&&!clothingUnlocked(world)&&[...world.structures,...world.jobs,...world.packed.map(p=>p.building)].some(s=>s.kind==='tailor-bench'))errors.push('Locked tailoring bench.');
  if(version>=90&&!clothingUnlocked(world)&&[...world.structures,...world.jobs,...world.packed.map(p=>p.building)].some(s=>s.kind==='electric-tailor-bench'))errors.push('Locked electric tailoring bench.');
  return errors;
}
