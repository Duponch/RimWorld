import { MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,MULTI_ANALYZER_RESEARCH_COST,FABRICATION_RESEARCH_COST,ADVANCED_FABRICATION_RESEARCH_COST,AUTODOORS_RESEARCH_COST,microelectronicsUnlocked,multiAnalyzerUnlocked,fabricationUnlocked,advancedFabricationUnlocked,autodoorsUnlocked,machiningUnlocked,researchPrerequisite,STONECUTTING_RESEARCH_COST,SMITHING_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST,CLOTHING_RESEARCH_COST,AIR_CONDITIONING_COST,BATTERIES_RESEARCH_COST,SOLAR_POWER_RESEARCH_COST,airConditioningUnlocked,clothingUnlocked,batteriesUnlocked,solarPowerUnlocked,complexFurnitureUnlocked,flakArmorUnlocked } from './research.ts';
import { cookingSpot } from './cooking-bills.ts';
import { footprintCells } from './definitions.ts';
import { canStandAt } from './furniture-travel.ts';
import type { World } from './types.ts';
import { gunsmithingUnlocked } from './research.ts';
import { isGunRecipe,isFlakRecipe } from './production-recipes.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validateResearch(world:World,version:number):string[]{
  const errors:string[]=[],state=world.research;
  if(state!==undefined){
    const progress=(p:unknown,cost:number,active:boolean,root=false)=>record(p)&&Object.keys(p).every(k=>['points','completedAt',...(root?['project',...(version>=75?['airConditioning']:[]),...(version>=85?['batteries','solarPower']:[]),...(version>=89?['stonecutting','smithing']:[]),...(version>=90?['complexFurniture']:[]),...(version>=101?['machining','gunsmithing']:[]),...(version>=109?['plateArmor','flakArmor']:[]),...(version>=123?['microelectronics','multiAnalyzer','fabrication']:[]),...(version>=139?['advancedFabrication']:[]),...(version>=143?['autodoors']:[])]:[])].includes(k))&&int(p.points,0,cost)
      &&(p.completedAt===undefined?p.points<cost:int(p.completedAt,0,world.tick)&&p.points===cost&&!active);
    if(version<73||!record(state)||state.project!==null&&state.project!=='complex-clothing'&&(version<75||state.project!=='air-conditioning')&&(version<85||state.project!=='batteries'&&state.project!=='solar-power')&&(version<89||state.project!=='stonecutting'&&state.project!=='smithing')&&(version<90||state.project!=='complex-furniture')&&(version<101||state.project!=='machining'&&state.project!=='gunsmithing')&&(version<109||state.project!=='plate-armor'&&state.project!=='flak-armor')&&(version<123||state.project!=='microelectronics'&&state.project!=='multi-analyzer'&&state.project!=='fabrication')&&(version<139||state.project!=='advanced-fabrication')&&(version<143||state.project!=='autodoors')
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
      ||state.plateArmor!==undefined&&(version<109||!progress(state.plateArmor,PLATE_ARMOR_RESEARCH_COST,state.project==='plate-armor')||!!researchPrerequisite(world,'plate-armor'))
      ||state.flakArmor!==undefined&&(version<109||!progress(state.flakArmor,FLAK_ARMOR_RESEARCH_COST,state.project==='flak-armor')||!!researchPrerequisite(world,'flak-armor'))
      ||state.microelectronics!==undefined&&(version<123||!progress(state.microelectronics,MICROELECTRONICS_RESEARCH_COST,state.project==='microelectronics'))
      ||state.multiAnalyzer!==undefined&&(version<123||!progress(state.multiAnalyzer,MULTI_ANALYZER_RESEARCH_COST,state.project==='multi-analyzer')||!!researchPrerequisite(world,'multi-analyzer'))
      ||state.fabrication!==undefined&&(version<123||!progress(state.fabrication,FABRICATION_RESEARCH_COST,state.project==='fabrication')||!!researchPrerequisite(world,'fabrication'))
      ||state.advancedFabrication!==undefined&&(version<139||!progress(state.advancedFabrication,ADVANCED_FABRICATION_RESEARCH_COST,state.project==='advanced-fabrication')||!!researchPrerequisite(world,'advanced-fabrication'))
      ||state.autodoors!==undefined&&(version<143||!progress(state.autodoors,AUTODOORS_RESEARCH_COST,state.project==='autodoors'))
      ||state.project==='machining'&&!state.machining||state.project==='gunsmithing'&&!state.gunsmithing
      ||state.project==='plate-armor'&&!state.plateArmor||state.project==='flak-armor'&&!state.flakArmor
      ||state.project==='microelectronics'&&!state.microelectronics||state.project==='multi-analyzer'&&!state.multiAnalyzer||state.project==='fabrication'&&!state.fabrication||state.project==='advanced-fabrication'&&!state.advancedFabrication||state.project==='autodoors'&&!state.autodoors
      ||state.project==='stonecutting'&&!state.stonecutting||state.project==='smithing'&&!state.smithing
      ||state.project==='complex-furniture'&&!state.complexFurniture
      ||state.project==='batteries'&&!state.batteries||state.project==='solar-power'&&!state.solarPower)errors.push('Invalid research project.');
  }
  if(!airConditioningUnlocked(world)&&[...world.structures,...world.jobs].some(s=>s.kind==='cooler'))errors.push('Locked cooler.');
  const electricalContent=[...world.structures,...world.jobs,...(world.packed??[]).map(p=>p.building)];
  if(!batteriesUnlocked(world)&&electricalContent.some(s=>s.kind==='battery'))errors.push('Locked battery.');
  if(!solarPowerUnlocked(world)&&electricalContent.some(s=>s.kind==='solar-generator'))errors.push('Locked solar generator.');
  if(version>=90&&!complexFurnitureUnlocked(world)&&electricalContent.some(s=>['dining-chair','armchair','end-table','dresser',...(version>=122?['chess-table']:[])].includes(s.kind)))errors.push('Locked complex furniture.');
  if(!machiningUnlocked(world)&&electricalContent.some(s=>s.kind==='machining-table'))errors.push('Locked machining table.');
  if(version>=123&&!microelectronicsUnlocked(world)&&electricalContent.some(s=>s.kind==='hi-tech-research-bench'))errors.push('Locked hi-tech research bench.');
  if(version>=123&&!multiAnalyzerUnlocked(world)&&electricalContent.some(s=>s.kind==='multi-analyzer'))errors.push('Locked multi-analyzer.');
  if(version>=123&&!fabricationUnlocked(world)&&electricalContent.some(s=>s.kind==='fabrication-bench'))errors.push('Locked fabrication bench.');
  if(version>=143&&!autodoorsUnlocked(world)&&electricalContent.some(s=>s.kind==='autodoor'))errors.push('Locked autodoor.');
  // Obtained weapons need no research; only the local fabrication chain does.
  if(version>=101&&!gunsmithingUnlocked(world)&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>isGunRecipe(b.recipe)))
    ||world.piles.some(p=>p.gunWork)||world.pawns.some(p=>p.cooking&&isGunRecipe(p.cooking.recipe))))errors.push('Locked gunsmithing production.');
  if(version>=109&&!flakArmorUnlocked(world)&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>isFlakRecipe(b.recipe)))
    ||world.piles.some(p=>p.flakWork)||world.pawns.some(p=>p.cooking&&isFlakRecipe(p.cooking.recipe))))errors.push('Locked flak armor production.');
  if(version<141&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>b.recipe==='make-flak-helmet'))
    ||world.piles.some(p=>p.item==='unfinished-flak-helmet'||p.flakWork?.recipe==='make-flak-helmet')
    ||world.pawns.some(p=>p.cooking?.recipe==='make-flak-helmet'||p.orders?.queue?.some(o=>typeof o!=='number'&&'cooking' in o&&o.cooking.recipe==='make-flak-helmet'))))errors.push('Future flak helmet production.');
  if(version>=123&&!fabricationUnlocked(world)&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>b.recipe==='make-component'))
    ||world.piles.some(p=>p.componentWork)||world.pawns.some(p=>p.cooking?.recipe==='make-component'||p.orders.queue.some(order=>typeof order!=='number'&&'cooking' in order&&order.cooking.recipe==='make-component'))))errors.push('Locked component production.');
  if(version>=139&&!advancedFabricationUnlocked(world)&&(electricalContent.some(s=>'bills' in s&&s.bills?.some(b=>b.recipe==='make-advanced-component'))
    ||world.piles.some(p=>p.componentWork?.recipe==='make-advanced-component')||world.pawns.some(p=>p.cooking?.recipe==='make-advanced-component'||p.orders.queue.some(order=>typeof order!=='number'&&'cooking' in order&&order.cooking.recipe==='make-advanced-component'))))errors.push('Locked advanced component production.');
  const stations=new Set<number>(),facilities=new Set<number>();
  for(const pawn of world.pawns){
    if(version<73?pawn.priorities.research!==undefined:!int(pawn.priorities.research,0,4))errors.push('Invalid or future research priority.');
    const task=pawn.research;if(task===undefined)continue;
    if(version<73||!record(task)||Object.keys(task).some(k=>!['stationId','spot','worked',...(version>=123?['facilityId']:[])].includes(k))||!int(task.stationId,1)||!record(task.spot)||!int(task.spot.x,0,world.width-1)||!int(task.spot.z,0,world.height-1)||!int(task.worked,0,399)||task.facilityId!==undefined&&!int(task.facilityId,1)){errors.push('Invalid research task.');continue;}
    const station=world.structures.find(s=>s.id===task.stationId&&(s.kind==='research-bench'||version>=123&&s.kind==='hi-tech-research-bench')),spot=station&&cookingSpot(station);
    const project=state?.project,facility=task.facilityId===undefined?undefined:world.structures.find(s=>s.id===task.facilityId&&s.kind==='multi-analyzer');
    const facilityNear=!!station&&!!facility&&footprintCells(station).some(a=>footprintCells(facility).some(b=>{const dx=a.x-b.x,dz=a.z-b.z;return dx*dx+dz*dz<=81;}));
    if(!station||!spot||spot.x!==task.spot.x||spot.z!==task.spot.z||!canStandAt(world,task.spot)||stations.has(task.stationId)||!state?.project||pawn.priorities.research===0
      ||(project==='multi-analyzer'||project==='fabrication'||project==='advanced-fabrication')&&station.kind!=='hi-tech-research-bench'||(project==='fabrication'||project==='advanced-fabrication')&&!facilityNear||task.facilityId!==undefined&&(station.kind!=='hi-tech-research-bench'||!facilityNear||facilities.has(task.facilityId))
      ||pawn.heatRefuge||pawn.jobId!==null||pawn.haul||pawn.cooking||pawn.need||pawn.recreation.task||pawn.tend||pawn.ward||pawn.feed||pawn.rescue||pawn.equipmentTask||pawn.draft||pawn.shooting||pawn.flee||pawn.tactics||pawn.melee||pawn.raid||pawn.mental?.crisis||!['moving','working'].includes(pawn.state)||pawn.orders.active!==null)errors.push('Invalid research ownership.');
    if(pawn.state==='working'&&(pawn.x!==task.spot.x||pawn.z!==task.spot.z||pawn.path.length))errors.push('Research working away from its station.');
    stations.add(task.stationId);if(task.facilityId!==undefined)facilities.add(task.facilityId);
  }
  if(version>=73&&!clothingUnlocked(world)&&[...world.structures,...world.jobs,...world.packed.map(p=>p.building)].some(s=>s.kind==='tailor-bench'))errors.push('Locked tailoring bench.');
  if(version>=90&&!clothingUnlocked(world)&&[...world.structures,...world.jobs,...world.packed.map(p=>p.building)].some(s=>s.kind==='electric-tailor-bench'))errors.push('Locked electric tailoring bench.');
  return errors;
}
