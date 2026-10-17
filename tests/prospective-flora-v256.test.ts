import {expect,test} from 'vitest';
import {isCavePlant256} from '../src/sim/cave-flora-256';
import {generateWorld} from '../src/sim/generation';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {FLORA_DEFINITIONS,LEGACY_PLANT_SPECIES,PROSPECTIVE_PLANT_SPECIES_256,isPlantSpeciesInVersion} from '../src/sim/biome-flora';
import {createWildPlantResource256,acquireWildPlant256} from '../src/sim/wild-plant-acquisition-v256';
import {validPlantLife} from '../src/sim/plant-life-save';
import {validTreeJobShape} from '../src/sim/tree-transfer-save';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save';
import {plantGrowth,plantTemperatureFactorFor,harvestable} from '../src/sim/plants';
import {applyPlantFrost} from '../src/sim/plant-life';
import {gatherResource} from '../src/sim/gathering';
import {extractTreeDefinition} from '../src/sim/tree-transfer-rules';
import {plantHarvestWorkCore,isConstructionLightPlant} from '../src/sim/construction-plants';
import {resourceMaxHp,resourceFlammability} from '../src/sim/thing-damage-rules';
import {resourceShotFill} from '../src/sim/combat-content';
import {mapResourceSelectable} from '../src/ui/map-object-selection';


function fixture(){
  const w=generateWorld(412,16,16);Object.assign(w,{schemaVersion:256});
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];w.growingZones=[];
  delete w.roofing;adoptSiteClimate(w);return w;
}

test('prospective catalogue: sixteen surface plants and three cave plants materialize real records and reject historical versions without changing old species',()=>{
  const w=fixture();
  expect(LEGACY_PLANT_SPECIES).toHaveLength(13);expect(PROSPECTIVE_PLANT_SPECIES_256).toHaveLength(19);expect(PROSPECTIVE_PLANT_SPECIES_256.filter(species=>!isCavePlant256(species))).toHaveLength(16);
  for(const species of PROSPECTIVE_PLANT_SPECIES_256){
    const r=createWildPlantResource256(w,w.nextId++,3,3,species,.5,false)!,d=FLORA_DEFINITIONS[species];
    expect(r).toMatchObject({species,kind:d.kind,amount:d.yield,growth:.5,growthTick:w.tick});
    expect(r.plantLife?.bornAt).toBeUndefined();
    expect(validPlantLife(r,255,w)).toBe(false);expect(validPlantLife(r,256,w)).toBe(true);
    expect(isPlantSpeciesInVersion(species,255)).toBe(false);expect(isPlantSpeciesInVersion(species,256)).toBe(true);
    expect(resourceMaxHp(r)).toBe(d.hitPoints);expect(resourceFlammability(r)).toBe(d.flammability);
  }
  for(const species of LEGACY_PLANT_SPECIES)expect(isPlantSpeciesInVersion(species,255)).toBe(true);
  expect(isPlantSpeciesInVersion('healroot-wild',166)).toBe(false);expect(isPlantSpeciesInVersion('not-a-plant',256)).toBe(false);
});

test('acquisition is physical and atomic: fertility, roof, occupied and old-version refusals consume nothing',()=>{
  const w=fixture(),index=3*w.width+3,before={id:w.nextId,rng:w.rng};
  w.tiles[index]={terrain:'water'};
  expect(acquireWildPlant256(w,index,'alocasia')).toBeUndefined();expect(w.nextId).toBe(before.id);
  w.tiles[index]={terrain:'grass'};w.roofing={constructed:[index],build:[],remove:[],cursor:0};
  expect(acquireWildPlant256(w,index,'alocasia')).toBeUndefined();delete w.roofing;
  Object.assign(w,{schemaVersion:255});expect(acquireWildPlant256(w,index,'bamboo')).toBeUndefined();Object.assign(w,{schemaVersion:256});
  const plant=acquireWildPlant256(w,index,'bamboo')!;
  expect(w.resources).toEqual([plant]);expect(w.nextId).toBe(before.id+1);expect(w.rng).toBe(before.rng);expect(plant.plantLife?.bornAt).toBe(w.tick);
  expect(acquireWildPlant256(w,index,'maple')).toBeUndefined();expect(w.nextId).toBe(before.id+1);expect(w.rng).toBe(before.rng);
});

test('existing growth uses fertility, darkness and species thermal limits; leafless stays species-specific',()=>{
  const w=fixture(),plant=acquireWildPlant256(w,51,'alocasia',.25)!,start=w.tick;
  w.tick+=6000;expect(plantGrowth(w,plant)).toBeGreaterThan(.25);
  plant.growthLight='dark';expect(plantGrowth(w,plant)).toBe(.25);delete plant.growthLight;
  w.tiles[51]={terrain:'water'};expect(plantGrowth(w,plant)).toBe(.25);w.tiles[51]={terrain:'grass'};
  expect(plantTemperatureFactorFor(plant,60)).toBeGreaterThan(0);
  expect(plantTemperatureFactorFor({species:'maple'},60)).toBe(0);
  expect(plantTemperatureFactorFor(plant,75)).toBe(0);
  w.tick=start;applyPlantFrost(w,plant,true,-30);expect(plant.plantLife?.leaflessAt).toBe(start);
  const palm=createWildPlantResource256(w,w.nextId++,4,3,'palm',.25,true)!;applyPlantFrost(w,palm,true,-30);expect(palm.plantLife?.leaflessAt).toBeUndefined();
});

test('seven trees produce actual wood through existing gather and retain species work/mass in tree transfer',()=>{
  const expected=[['bamboo',10,460,75000],['cecropia',18,510,150000],['cypress',60,1800,150000],['maple',27,800,150000],['palm',18,510,150000],['teak',60,1800,150000],['willow',27,800,150000]] as const;
  for(const [species,quantity,work,mass] of expected){
    const w=fixture(),r=acquireWildPlant256(w,51,species,1)!;
    expect(plantHarvestWorkCore(r)).toBe(work);expect(extractTreeDefinition(r)).toMatchObject({workCore:work,massGrams:mass});
    expect(validOriginalTreeResource(r,w,255,w.tick)).toBe(false);expect(validOriginalTreeResource(r,w,256,w.tick)).toBe(true);
    expect(gatherResource(w,r,'chop')).toBe(quantity);expect(w.resources).not.toContain(r);
    expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(quantity);
    expect(w.piles.every(p=>p.owner.type==='ground')).toBe(true);
  }
});

test('non-yield plants cut without phantom materials; clearance, selection and logical cover resolve species',()=>{
  for(const species of PROSPECTIVE_PLANT_SPECIES_256.slice(0,9)){
    const w=fixture(),r=acquireWildPlant256(w,51,species,1)!;
    expect(harvestable(w,r)).toBe(false);expect(gatherResource(w,r,'cut')).toBe(0);expect(w.piles).toEqual([]);expect(w.resources).toEqual([]);
    expect(isConstructionLightPlant(r)).toBe(true);
    expect(mapResourceSelectable(r)).toBe(!['astragalus','chokevine','dandelion','low-shrub'].includes(species));
    expect(resourceShotFill(r)).toBe(['alocasia','bush','clivia','rafflesia'].includes(species)?.2:0);
  }
});

test('new long tree preparation permits its real bound only prospectively; legacy shape bound remains literal',()=>{
  const job={id:1,kind:'replant-tree',x:3,z:3,orientation:0,footprint:'standard',status:'active',reservedBy:4,progress:0,escrow:{wood:0,food:0},tree:{kind:'replant',sourcePileId:3,resourceId:2,phase:'prepare',carryPileId:3,workCore:0,durationCore:22500}};
  expect(validTreeJobShape(job,255,5)).toBe(false);expect(validTreeJobShape(job,256,5)).toBe(true);
  job.tree.durationCore=22501;expect(validTreeJobShape(job,256,5)).toBe(false);
});
