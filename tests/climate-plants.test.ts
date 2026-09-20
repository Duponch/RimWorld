import { expect,test } from 'vitest';
import { generateWorld } from '../src/sim/generation';
import { annualGrowingLightIntegral,annualNaturalLight,growingLightIntegral,naturalLight,seasonalNaturalLight } from '../src/sim/environment';
import { adoptSiteClimate,automaticStartDay,climateOriginAtAdoption,climateDate,climateTick,seasonalAmplitude,seasonalOutdoorTemperature,seasonTemperature,TEMPERATE_CLIMATE,TICKS_PER_YEAR } from '../src/sim/site-climate';
import { validSiteClimate } from '../src/sim/site-climate-save';
import { advancePlantLife,applyPlantFrost,createPlantLife,plantFrostThreshold,plantLeafless } from '../src/sim/plant-life';
import { validPlantLife } from '../src/sim/plant-life-save';
import { harvestable,plantGrowth } from '../src/sim/plants';
import { finishSowing } from '../src/sim/farming';
import { reconcileTemperature } from '../src/sim/temperature';
import { updatePlantTemperatures } from '../src/sim/thermal-plants';
import { solarPowerOutput } from '../src/sim/solar-rules';
import { animalFoods,animalMealTarget } from '../src/sim/wildlife-food';
import type { WildAnimal } from '../src/sim/wildlife-state';
import { sampleSeasonalDaylight,type DaylightSample } from '../src/render/daylight';
import type { Resource,World } from '../src/sim/types';

function fixture(kinds:Array<Resource['kind']>=['rice','potato','corn','cotton','berries']):World {
  const w=generateWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.piles=[];w.packed=[];
  w.resources=kinds.map((kind,i)=>({id:w.nextId++,kind,x:2+i,z:3,amount:10,growth:.5,growthTick:0}));
  delete w.roofing;delete w.thermal;adoptSiteClimate(w);return w;
}
function advanceTo(w:World,tick:number):void {
  const layout=reconcileTemperature(w);
  while(w.tick<tick){w.tick++;advancePlantLife(w,layout);}
}

test('calendrier : profil témoin, Auto conditionnel, adoption sans âge inventé et ancien climat inchangé',()=>{
  const w=generateWorld(72,16,16);w.tick=17234;
  const old=JSON.stringify(w),r=w.resources.find(p=>p.kind==='berries')!;
  r.growth=.2;r.growthTick=0;const growth=plantGrowth(w,r),rng=w.rng;
  expect(annualNaturalLight(w)).toBe(naturalLight(w.tick));expect(annualGrowingLightIntegral(w)).toBe(growingLightIntegral(w.tick));
  expect(seasonalAmplitude(0)).toBe(3);expect(seasonalAmplitude(90)).toBe(28);expect(seasonalAmplitude(-90)).toBe(28);
  expect(TEMPERATE_CLIMATE).toMatchObject({latitude:22.21,longitude:-18.23,meanTemperature:16.2,rainfall:900});
  expect(seasonTemperature(TEMPERATE_CLIMATE.latitude,16.2,50*6000)).toBeCloseTo(16.2-TEMPERATE_CLIMATE.amplitude,12);
  expect(seasonTemperature(TEMPERATE_CLIMATE.latitude,16.2,20*6000)).toBeCloseTo(16.2+TEMPERATE_CLIMATE.amplitude,12);
  expect(automaticStartDay(0,30)).toBe(0);expect(automaticStartDay(60,-90)).toBe(15);expect(automaticStartDay(-60,-90)).toBe(45);
  expect(adoptSiteClimate(w)).toBe(true);expect(plantGrowth(w,r)).toBe(growth);expect(w.rng).toBe(rng);
  expect(climateTick(w)%6000).toBe(w.tick%6000);expect(w.climate!.calendarOrigin).toBe(climateOriginAtAdoption(w,w.tick));
  expect(r.plantLife).toMatchObject({since:w.tick,age:0,darkTicks:0});expect(r.plantLife?.bornAt).toBeUndefined();
  expect(adoptSiteClimate(w)).toBe(false);expect(validSiteClimate(w.climate,87,w)).toBe(true);expect(validSiteClimate(w.climate,86,w)).toBe(false);
  expect(validSiteClimate({...w.climate,calendarOrigin:w.climate!.calendarOrigin+1},87,w)).toBe(false);
  expect(JSON.parse(old).climate).toBeUndefined();
  const temperature=seasonalOutdoorTemperature(w);w.tick+=5;expect(seasonalOutdoorTemperature(w)).toBe(temperature);
  w.tick++;expect(seasonalOutdoorTemperature(w)).not.toBe(temperature);
});

test('lumière annuelle : oracle d’intervalle, limite d’année, solaire et présentation partagent le même jour',()=>{
  const w=fixture(['rice']),start=173123;w.tick=start;
  let sum=0;for(let i=1;i<=901;i++){
    const tick=start+i,civil=climateTick(w,tick),phase=civil%6000/6000;
    if(phase>=.25&&phase<=.8)sum+=Math.max(0,(annualNaturalLight(w,tick)-.51)/.49);
  }
  expect(annualGrowingLightIntegral(w,start+901)-annualGrowingLightIntegral(w,start)).toBeCloseTo(sum,8);
  expect(annualNaturalLight(w,start+TICKS_PER_YEAR)).toBe(annualNaturalLight(w,start));
  const before=annualGrowingLightIntegral(w,start+TICKS_PER_YEAR)-annualGrowingLightIntegral(w,start);
  expect(annualGrowingLightIntegral(w,start+2*TICKS_PER_YEAR)-annualGrowingLightIntegral(w,start+TICKS_PER_YEAR)).toBeCloseTo(before,8);
  const latitude=TEMPERATE_CLIMATE.latitude;
  expect(seasonalNaturalLight(latitude,30*6000+1500)).toBeGreaterThan(seasonalNaturalLight(latitude,1500));
  const solar={id:w.nextId++,kind:'solar-generator' as const,x:8,z:8,orientation:0 as const,footprint:'standard' as const};
  expect(solarPowerOutput(w,solar)).toBeCloseTo(1700*annualNaturalLight(w),10);
  const out:DaylightSample={x:0,y:0,z:0,daylight:0,warmth:0,sunlight:0,moonlight:0};
  const s=sampleSeasonalDaylight(climateTick(w),out);expect(Math.hypot(s.x,s.y,s.z)).toBeCloseTo(1,12);expect(s.daylight).toBe(annualNaturalLight(w));
  expect(climateDate(w).year).toBe(5500);w.tick+=TICKS_PER_YEAR;expect(climateDate(w).year).toBe(5501);
});

test('vie végétale : frontière de gel contrôlée, cultures fragiles, buisson survivant et intérieur froid distinct',()=>{
  const w=fixture(),outside=w.resources[0]!,berry=w.resources.at(-1)!;
  w.tick=50*6000-w.climate!.calendarOrigin;
  for(const plant of w.resources)plant.plantLife=createPlantLife(w,plant,true);
  const roomPlant=w.resources[1]!;
  for(let z=1;z<=5;z++)for(let x=1;x<=7;x++)if(x===1||x===7||z===1||z===5)w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  w.roofing={constructed:[],build:[],remove:[],cursor:0};for(let z=2;z<5;z++)for(let x=2;x<7;x++)w.roofing.constructed.push(z*16+x);
  // Leave roomPlant indoors; the other two sentinels remain outside.
  outside.x=9;berry.x=10;
  let layout=reconcileTemperature(w);w.thermal!.regions[0]!.temperature=-30;
  // Controlled meteorological input to the biological boundary, not a claimed
  // event in the mild reference colony and not a modified climate coefficient.
  expect(applyPlantFrost(w,outside,true,plantFrostThreshold(outside.id))).toBe(false);
  expect(applyPlantFrost(w,outside,true,-20)).toBe(true);
  expect(applyPlantFrost(w,berry,true,-20)).toBe(false);
  expect(applyPlantFrost(w,roomPlant,false,-30)).toBe(false);
  expect(w.resources.includes(outside)).toBe(false);expect(w.resources.includes(roomPlant)).toBe(true);
  expect(w.resources.includes(berry)).toBe(true);expect(berry.plantLife!.leaflessAt).toBeDefined();
  const leaflessAt=berry.plantLife!.leaflessAt!;
  const hare:WildAnimal={id:w.nextId++,species:'hare',sex:'female',x:10,z:4,food:.01,rest:80,state:'idle',path:[],nextDecision:w.tick,meal:{id:berry.id,kind:'plant',quantity:1,progress:0}};
  expect(animalFoods(w,hare).some(f=>f.id===berry.id)).toBe(false);expect(animalMealTarget(w,hare)).toBeUndefined();
  expect(plantLeafless({tick:leaflessAt+5999},berry)).toBe(true);expect(plantLeafless({tick:leaflessAt+6000},berry)).toBe(false);
  expect(w.fires).toBeUndefined(); // frost never becomes a fire loss
  // A fresh indoor plant at the same winter instant is immune to outdoor-only
  // frost even at -30 °C; cold stops growth, darkness acts only after7.5days.
  const indoor:Resource={id:w.nextId++,kind:'corn',x:3,z:3,amount:22,growth:.5,growthTick:w.tick};indoor.plantLife=createPlantLife(w,indoor,true);w.resources=[...w.resources,indoor];
  layout=reconcileTemperature(w);updatePlantTemperatures(w,layout);advanceTo(w,w.tick+400);
  expect(w.resources.includes(indoor)).toBe(true);expect(plantGrowth(w,indoor)).toBe(.5);expect(indoor.damage).toBeUndefined();
  if(plantLeafless(w,berry))expect(harvestable(w,berry)).toBe(plantGrowth(w,berry)>.65);
});

test('obscurité et sénescence : seuils stricts, dégâts non doublés, nouveaux semis et état de continuation',()=>{
  const w=fixture(['rice','corn']);w.roofing={constructed:w.resources.map(r=>r.z*w.width+r.x),build:[],remove:[],cursor:0};
  // Birth and observation differ: sowing records the known instant, adoption
  // only the start of prospective ageing, never a fictitious original birth.
  w.growingZones=[{id:w.nextId++,cells:[8*16+8],plant:'potato',allowSow:true,allowCut:true}];
  finishSowing(w,{id:w.nextId++,kind:'sow',x:8,z:8,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},growingZoneId:w.growingZones[0]!.id});
  const born=w.resources.at(-1)!;expect(born.plantLife!.bornAt).toBe(w.tick);
  const rice=w.resources[0]!,corn=w.resources[1]!;advanceTo(w,45000);
  expect(rice.damage).toBeUndefined();expect(corn.damage).toBeUndefined();
  const copy=structuredClone(w);advanceTo(w,45200);advanceTo(copy,45200);expect(copy).toEqual(w);
  expect(rice.damage).toBe(10);expect(corn.damage).toBe(10);expect(w.rng).toBe(copy.rng);
  for(const r of w.resources)expect(validPlantLife(r,87,w)).toBe(true);
  expect(validPlantLife({...rice,plantLife:undefined},87,w)).toBe(false);expect(validPlantLife(rice,86,w)).toBe(false);
  expect(validPlantLife({...rice,plantLife:{...rice.plantLife!,nextCheck:w.tick}},87,w)).toBe(false);
  expect(validPlantLife({...rice,plantLife:{...rice.plantLife!,age:rice.plantLife!.age+1}},87,w)).toBe(false);
  const life=rice.plantLife!,since=life.since;
  // Boundary fixture keeps only one already senescent covered crop. Both
  // causes are active, but the shared injury rate is max, never their sum.
  w.resources=[rice];w.tick=24*6000+200;life.nextCheck=w.tick+(rice.id-w.tick%200+200)%200+1;life.age=life.nextCheck-200-since;life.darkTicks=life.age;
  const previous=rice.damage!;advanceTo(w,life.nextCheck);expect(rice.damage).toBe(previous+10);
});
