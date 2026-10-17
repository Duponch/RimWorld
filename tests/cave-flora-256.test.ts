import {validPlantLife} from '../src/sim/plant-life-save';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {attachInitialPlantAge256,effectivePlantAgeCore256} from '../src/sim/initial-plant-age-256';
import {resumeTreeLife} from '../src/sim/tree-transfer-atomic';
import {describe,it,expect} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {createWildPlantResource256} from '../src/sim/wild-plant-acquisition-v256';
import {CAVE_PLANT_SPECIES_256,caveLightDamage256,caveLightSources256} from '../src/sim/cave-flora-256';
import {isPlantSpeciesInVersion,LEGACY_PLANT_SPECIES,BIOME_FLORA} from '../src/sim/biome-flora';
import {LightEnvironmentCache} from '../src/sim/light-environment';
import {newBuildingFuel} from '../src/sim/fuel';
import {plantGrowth,harvestable} from '../src/sim/plants';
import {gatherResource} from '../src/sim/gathering';
import {commercialItemMassGrams} from '../src/sim/commercial-mass';
import {rawFoodPoisonChance} from '../src/sim/food-poisoning';
import {rawFoodThought} from '../src/sim/items';
import {ROT_DAYS} from '../src/sim/food-preservation';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills';
import {initialFoodPolicies} from '../src/sim/food-policy';
import {validStorageItems} from '../src/sim/storage-filters';
import {legacyAnimalFungus256} from '../src/sim/animal-diet-v256';
import {plantInspection} from '../src/ui/plant-inspection';
function prepared(){const w=deconstructionCamp();w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[10*32+10],thick:[]}};return w;}
function plant(w:ReturnType<typeof prepared>,species:typeof CAVE_PLANT_SPECIES_256[number],growth=.2){const r=createWildPlantResource256(w,w.nextId++,10,10,species,growth,false);if(!r)throw Error('Missing real cave species');w.resources=[r];return r;}
describe('cave flora256 real adapters',()=>{
 it('admits new cave IDs only prospectively without changing old profiles',()=>{
  expect(LEGACY_PLANT_SPECIES).toHaveLength(13);expect(Object.keys(BIOME_FLORA)).toHaveLength(4);
  for(const id of CAVE_PLANT_SPECIES_256){expect(isPlantSpeciesInVersion(id,255)).toBe(false);expect(isPlantSpeciesInVersion(id,256)).toBe(true);}
 });
 it('separates real cave glow from phototoxic ordinary light under natural roof',()=>{
  const w=prepared(),r=plant(w,'glowstool'),cache=new LightEnvironmentCache();
  const before=cache.read(w);expect(before.lightAt(r)).toBeGreaterThan(0);expect(before.lightAtIgnoringCavePlants(r)).toBe(0);expect(caveLightDamage256(0)).toBe(0);
  const sources=caveLightSources256(w);expect(caveLightSources256(w)).toBe(sources);
  w.structures=[{id:w.nextId++,kind:'torch-lamp',x:11,z:10,orientation:0,footprint:'standard',fuel:newBuildingFuel('torch-lamp')}];
  const exposed=cache.read(w);expect(exposed.lightAtIgnoringCavePlants(r)).toBeGreaterThan(0);expect(caveLightDamage256(exposed.lightAtIgnoringCavePlants(r))).toBeGreaterThan(0);
  w.structures=[];w.resources=[];expect(caveLightSources256(w)).toEqual([]);
 });
 it('grows in darkness using the existing diurnal resting window and gives honest inspection',()=>{
  const w=prepared(),r=plant(w,'agarilux');r.growthLight='dark';const before=plantGrowth(w,r);w.tick+=3000;
  expect(plantGrowth(w,r)).toBeGreaterThan(before);expect(plantInspection(w,r)).toContain('pousse dans l’obscurité');expect(plantInspection(w,r)).not.toContain('Lumière insuffisante');
 });
 it('uses the existing conservative output transaction with the true fungus identity and count',()=>{
  const w=prepared(),r=plant(w,'glowstool',1);expect(harvestable(w,r)).toBe(true);
  expect(gatherResource(w,r,'harvest')).toBe(20);expect(w.resources.some(p=>p.id===r.id)).toBe(false);
  const output=w.piles.filter(p=>p.item==='raw-fungus');expect(output.reduce((n,p)=>n+p.quantity,0)).toBe(20);expect(output.every(p=>p.owner.type==='ground'&&p.rot)).toBe(true);
  const barren=plant(w,'bryolux',1);expect(harvestable(w,barren)).toBe(false);expect(gatherResource(w,barren,'harvest')).toBeNull();
 });
 it('retains mass/rot/raw ingestion and explicit old-save policy/filter boundaries',()=>{
  expect(commercialItemMassGrams('raw-fungus',255)).toBeUndefined();expect(commercialItemMassGrams('raw-fungus',256)).toBe(30);
  expect(ROT_DAYS['raw-fungus']).toBe(30);expect(rawFoodThought('raw-fungus')).toBe(true);expect(rawFoodPoisonChance('raw-fungus')).toBe(.02);
  expect(initialFoodPolicies().some(p=>p.allowed.includes('raw-fungus'))).toBe(false);
  expect(initialFoodPolicies(true,true,true,true,true,true,true,true,true,true)[0]!.allowed).toContain('raw-fungus');
  const old=newCookingBill(1,'simple-meal',255),current=newCookingBill(1,'simple-meal',256);expect(old.filters['raw-fungus']).toBeUndefined();expect(current.filters['raw-fungus']).toBe(true);
  expect(validBillSettings({...old,filters:{...old.filters,'raw-fungus':true}},'simple-meal',255)).toBe(false);
  expect(validStorageItems({'raw-fungus':true},255)).toBe(false);expect(validStorageItems({'raw-fungus':true},256)).toBe(true);
  expect(legacyAnimalFungus256('hare',256)).toBe(true);expect(legacyAnimalFungus256('red-fox',256)).toBe(false);expect(legacyAnimalFungus256('hare',255)).toBe(false);
 });
});

it('keeps pre-existing observed age and Core remainder across a later destination climate',()=>{
 const w=deconstructionCamp();adoptSiteClimate(w);const tree=createWildPlantResource256(w,w.nextId++,10,10,'pine',.7,false);if(!tree||!w.climate)throw Error('Missing actual tree/climate fixture');
 attachInitialPlantAge256(tree,256,12347,w.tick);const phase=tree.plantLife!.nextCheck;
 tree.plantLife!.age=phase;tree.plantLife!.nextCheck=phase+200;
 const packedAt=phase+5,replantedAt=packedAt+100;resumeTreeLife(tree,packedAt,replantedAt);
 const destination={tick:replantedAt,climate:{...w.climate,adoptedAt:packedAt+50}};
 expect(validPlantLife(tree,256,destination)).toBe(true);expect(effectivePlantAgeCore256(tree.plantLife!)).toBe(12347+phase*10);expect(tree.plantLife!.initialAgeCore!%10).toBe(7);
 expect(validPlantLife(tree,255,destination)).toBe(false);const old=structuredClone(tree);delete old.plantLife!.initialAgeCore;expect(validPlantLife(old,256,destination)).toBe(false);
});
