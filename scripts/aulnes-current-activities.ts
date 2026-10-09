import assert from 'node:assert/strict';
import {isColonist} from '../src/sim/affiliation.ts';
import {installWoodenPart} from '../src/sim/artificial-parts.ts';
import {canTameSpecies,TAMENESS_DECAY} from '../src/sim/animal-handling.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {PEN_ANIMALS,penRegion,invalidateAnimalPens} from '../src/sim/animal-pens.ts';
import {animalBodyModel,modelHasPart} from '../src/sim/body-model.ts';
import {backgroundWorkRefusal} from '../src/sim/colonist-backgrounds.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {adoptDeepResources} from '../src/sim/deep-resources.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {HP_UNIT} from '../src/sim/injury-rules.ts';
import {addResolvedInjury,createMedicalRecord,medicalStatus} from '../src/sim/injury-state.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {productionWorkerQualified} from '../src/sim/machining.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {pasteHoppers} from '../src/sim/nutrient-paste.ts';
import {adoptOrbital} from '../src/sim/orbital.ts';
import {adoptPrisonBreaks} from '../src/sim/prison-break.ts';
import {stationRecipes,type ProductionRecipe} from '../src/sim/production-recipes.ts';
import {projectProgress,researchCost,researchPrerequisite,type ResearchProject} from '../src/sim/research.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {MAX_WILDLIFE,type WildAnimal} from '../src/sim/wildlife-state.ts';
import type {Cell,StockpileCell,StorageFilters,Structure,World} from '../src/sim/types.ts';
import type {AulnesActivitySites} from './aulnes-current-layout.ts';

export const AULNES_CURRENT_RESEARCH:readonly ResearchProject[]=[
  'hydroponics','drug-production','medicine-production','sterile-materials','vitals-monitor',
  'deep-drilling','ground-scanner','nutrient-paste','biofuel-refining',
];

function currentAulnes(world:World):void {
  assert.equal(world.schemaVersion,218,'The current Aulnes preparation uses schema218.');
  assert.equal(world.width,250);assert.equal(world.height,250);
  assert.ok(world.research,'The established Aulnes research owner is required.');
}

/** Creation-only declared knowledge. Call before constructing the new layout;
 * existing achievements, clocks, XP and the incomplete Recon project survive. */
export function unlockAulnesCurrentResearch(world:World):ResearchProject[] {
  currentAulnes(world);
  const acquired:ResearchProject[]=[];
  for(const project of AULNES_CURRENT_RESEARCH){
    assert.equal(researchPrerequisite(world,project),undefined,`Missing initial prerequisite for ${project}.`);
    const progress=projectProgress(world.research!,project);
    if(progress.completedAt!==undefined)continue;
    progress.points=researchCost(project);progress.completedAt=world.tick;acquired.push(project);
    if(world.research!.project===project)world.research!.project=null;
  }
  return acquired;
}

export interface AulnesActivitiesSummary {
  preparedAt:number;
  bills:{stationId:number;billId:number;recipe:ProductionRecipe;mode:string;target:number;suspended:boolean}[];
  supplies:{item:ItemId;quantity:number;pileIds:number[]}[];
  newAnimalIds:number[];
  veterinaryPatientId:number;
  patientId:number;
  prosthesis:{pawnId:number;part:'left-foot';kind:'wooden-foot'};
  foodPolicyId:number;
  pharmacists:number[];
  defenders:number[];
  researchProject:ResearchProject|null;
}

const preparedWorlds=new WeakSet<World>();
const key=(world:World,cell:Cell)=>cell.z*world.width+cell.x;

function station(world:World,id:number,kind:Structure['kind']):Structure {
  const found=world.structures.find(s=>s.id===id&&s.kind===kind);
  assert.ok(found,`Missing prepared ${kind} ${id}.`);return found;
}

function stock(world:World,cells:readonly Cell[],filters:StorageFilters,priority:number,items?:ItemId[]):void {
  for(const cell of cells){
    const existing=world.stockpiles.find(s=>s.x===cell.x&&s.z===cell.z);
    const zone:StockpileCell=existing??{id:world.nextId++,...cell,filters:{wood:false,food:false},priority,capacity:75};
    zone.filters={...filters};zone.priority=priority;
    if(items)zone.items=Object.fromEntries(items.map(item=>[item,true]));else delete zone.items;
    if(!existing)world.stockpiles.push(zone);
  }
}

/** Supplies are actual finite ground piles, never recipe results, purchases or
 * cargo replicas. Every exact cell must fit before this declaration commits. */
function supply(world:World,item:ItemId,quantity:number,cells:readonly Cell[]):number[] {
  assert.ok(Number.isSafeInteger(quantity)&&quantity>0,`Invalid initial amount for ${item}.`);
  const definition=ITEM_DEFINITIONS[item],seen=new Set<number>();
  const planned:{cell:Cell;quantity:number}[]=[];let remaining=quantity;
  for(const cell of cells){
    const index=key(world,cell);assert.ok(!seen.has(index),'Duplicate supply cell.');seen.add(index);
    const part=Math.min(remaining,groundCapacity(world,cell,item));
    if(part>0){planned.push({cell,quantity:part});remaining-=part;}
    if(!remaining)break;
  }
  assert.equal(remaining,0,`No physical initial shelf for ${quantity} ${item}.`);
  const before=new Set(world.piles.map(p=>p.id));
  for(const part of planned)addMaterial(world,definition.kind,part.quantity,{type:'ground',...part.cell},item);
  return world.piles.filter(p=>!before.has(p.id)).map(p=>p.id);
}

function prepareAnimals(world:World):{ids:number[];patientId:number} {
  const wildlife=world.wildlife;assert.ok(wildlife,'The original wildlife owner is required.');
  assert.ok(wildlife.animals.length+3<=MAX_WILDLIFE,'The authored small herd exceeds the fauna limit.');
  const marker=world.structures.find(s=>s.kind==='pen-marker'&&s.pen?.accepted.includes('muffalo'));
  assert.ok(marker?.pen,'The original pasture marker is required.');
  for(const species of ['deer','gazelle'] as const)if(!marker.pen.accepted.includes(species))marker.pen.accepted.push(species);
  invalidateAnimalPens(world);
  const region=penRegion(world,marker.id);assert.ok(region?.closed&&region.accessible,'The existing pasture must be closed and accessible.');
  const occupied=new Set([...wildlife.animals,...world.pawns].map(c=>key(world,c)));
  const available=[...region.cells].sort((a,b)=>a-b).map(index=>({x:index%world.width,z:Math.floor(index/world.width)}))
    .filter(cell=>canStandAt(world,cell)&&!occupied.has(key(world,cell))&&cell.x>70&&cell.x<96&&cell.z>79&&cell.z<105);
  assert.ok(available.length>=3,'The existing pasture has no initial animal positions.');
  const ids:number[]=[];
  for(const [index,species] of (['deer','gazelle','hare'] as const).entries()){
    assert.ok(canTameSpecies(species),'The dotation must use a domestically supported species.');
    const animal:WildAnimal={id:world.nextId++,species,sex:index===1?'male':'female',
      ageTicks:adultAgeTicks(species)+6000,...available[index]!,food:0,rest:.85,state:'idle',path:[],nextDecision:world.tick+1,
      domestic:{since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+TAMENESS_DECAY,
        ...(PEN_ANIMALS.includes(species)?{penMarkerId:marker.id}:{})}};
    animal.food=animalNutritionMax(animal)*.8;
    if(index===0){
      const body=animalBodyModel(species);assert.ok(modelHasPart(body,'left-front-leg'));
      animal.health={...createMedicalRecord(world.tick),body:species};
      assert.ok(addResolvedInjury(animal.health,'left-front-leg','bruise',6*HP_UNIT,()=>.99));
      assert.equal(medicalStatus(animal.health),'mobile');animal.state='sleeping';
    }
    wildlife.animals.push(animal);ids.push(animal.id);
  }
  return {ids,patientId:ids[0]!};
}

/** Initial conditions for the refreshed reference only. ROOT first releases
 * any original work through ordinary ownership tools, then owns maturation.
 * This helper does not simulate ticks or erase existing bills, tasks or events. */
export function applyAulnesCurrentActivities(world:World,sites:AulnesActivitySites):AulnesActivitiesSummary {
  currentAulnes(world);assert.ok(!preparedWorlds.has(world),'The finite Aulnes dotation can only be applied once.');
  for(const project of AULNES_CURRENT_RESEARCH)assert.ok(projectProgress(world.research!,project).completedAt!==undefined,`Acquire ${project} before layout.`);
  const refinery=station(world,sites.refineryId,'biofuel-refinery'),lab=station(world,sites.drugLabId,'drug-lab');
  const generator=station(world,sites.chemfuelGeneratorId,'chemfuel-generator');
  assert.equal(generator.fuel?.ticks,0,'The new generator starts empty and must receive real fuel.');
  assert.equal(generator.fuel?.burnRemainder,0);
  const dispenser=station(world,sites.pasteDispenserId,'nutrient-paste-dispenser');
  const hoppers=pasteHoppers(world,dispenser);
  assert.ok(sites.hopperIds.length>0&&sites.hopperIds.every(id=>hoppers.some(s=>s.id===id)),'Every prepared hopper must physically touch the dispenser.');
  assert.equal((refinery.bills??[]).length,0);assert.equal((lab.bills??[]).length,0);
  const cells=sites.stockCells;
  stock(world,cells.chemfuel,{wood:false,food:false,chemfuel:true},3,['chemfuel']);
  stock(world,cells.neutroamine,{wood:false,food:false,neutroamine:true},3,['neutroamine']);
  stock(world,cells.industrial,{wood:true,food:false,textile:true,medicine:true,steel:true,component:true},2);
  stock(world,cells.hospital,{wood:false,food:false,medicine:true},3);
  stock(world,cells.rawFood,{wood:false,food:true},2,['rice','potato','corn','berries','agave-fruit']);
  stock(world,cells.weaponReserve,{wood:false,food:false,weapon:true},3);
  const summary:AulnesActivitiesSummary={preparedAt:world.tick,bills:[],supplies:[],newAnimalIds:[],veterinaryPatientId:0,
    patientId:0,prosthesis:{pawnId:0,part:'left-foot',kind:'wooden-foot'},foodPolicyId:0,pharmacists:[],defenders:[],researchProject:world.research!.project};
  for(const offered of sites.recommendedSupplies)summary.supplies.push({item:offered.item,quantity:offered.quantity,pileIds:supply(world,offered.item,offered.quantity,offered.cells)});
  const bill=(bench:Structure,recipe:ProductionRecipe,mode:'until'|'times',target:number,suspended=false):void=>{
    assert.ok(stationRecipes(bench).includes(recipe));
    const made=newCookingBill(world.nextId++,recipe,world.schemaVersion);
    Object.assign(made,{mode,target,suspended,radius:99,destination:'stockpile'});
    if(recipe==='chemfuel-from-organics')for(const item of Object.keys(made.filters))made.filters[item as keyof typeof made.filters]=item==='rice';
    assert.ok(validBillSettings(made,recipe,world.schemaVersion));(bench.bills??=[]).push(made);
    summary.bills.push({stationId:bench.id,billId:made.id,recipe,mode,target,suspended});
  };
  bill(refinery,'chemfuel-from-wood','until',70);
  bill(refinery,'chemfuel-from-organics','times',1,true);
  bill(lab,'make-medicine','until',30);
  const daily=world.foodPolicies.find(p=>p.id===5);assert.ok(daily,'The authored daily policy is required.');
  if(!daily.allowed.includes('nutrient-paste-meal'))daily.allowed.push('nutrient-paste-meal');summary.foodPolicyId=daily.id;
  const colonists=world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead');
  for(const pawn of colonists){
    if(pawn.priorities.craft>0&&productionWorkerQualified(pawn,'make-medicine')&&!backgroundWorkRefusal(pawn,'craft'))summary.pharmacists.push(pawn.id);
    if(world.piles.some(p=>p.owner.type==='equipment'&&p.owner.pawnId===pawn.id&&p.kind==='weapon'))summary.defenders.push(pawn.id);
  }
  assert.ok(summary.pharmacists.length>0,'The colony needs an actually qualified pharmacist.');
  assert.ok(colonists.some(p=>p.priorities.doctor>0&&!backgroundWorkRefusal(p,'doctor')),'The colony needs an eligible doctor.');
  const patient=['Alma','Noé','Marin'].map(name=>colonists.find(p=>p.name===name&&!p.health&&!p.interruptedCargo))
    .find(p=>p&&p.orders.active===null&&p.jobId===null&&!p.cooking&&!p.haul&&!p.need);
  assert.ok(patient,'Release the initial patient’s physical activity before clinical preparation.');
  patient.health=createMedicalRecord(world.tick);
  // Declared old loss and fitted substitute, with real natural-child markers;
  // no surgery task, material debit, anesthesia or success record is invented.
  patient.health.missing.push({part:'left-foot',bornAt:world.tick,nonFresh:true});
  assert.ok(installWoodenPart(patient.health,'left-foot','wooden-foot'));
  assert.ok(addResolvedInjury(patient.health,'right-leg','bruise',6*HP_UNIT,()=>.99));
  assert.equal(medicalStatus(patient.health),'mobile');
  summary.patientId=patient.id;summary.prosthesis.pawnId=patient.id;
  const animals=prepareAnimals(world);summary.newAnimalIds=animals.ids;summary.veterinaryPatientId=animals.patientId;
  // Producers adopt only missing prospective owners. Existing schedules, RNG,
  // ships, geology and prisoner history remain authoritative and unchanged.
  adoptDeepResources(world);adoptOrbital(world);adoptPrisonBreaks(world);
  refreshStock(world);preparedWorlds.add(world);return summary;
}
