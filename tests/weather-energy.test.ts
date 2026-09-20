import { expect,test } from 'vitest';
import { miningCamp } from './scenarios/mining';
import { fixturePower } from './scenarios/power';
import { deserializeWorld,serializeWorld } from '../src/sim/serialization';
import { footprintCells } from '../src/sim/definitions';
import { WEATHER,WEATHER_KINDS,rainfallWeight } from '../src/sim/weather-definitions';
import { advanceWeather,adoptWeather,newWeatherState,weatherRainRate,weatherSnowRate,weatherWeights } from '../src/sim/weather';
import { validateWeather } from '../src/sim/weather-save';
import { weatherMoveFactor,weatherShotFactor } from '../src/sim/weather-exposure';
import { startTravel } from '../src/sim/movement';
import { advanceWind,adoptWind,newWindTurbineState,setWindAutoCut,validateWind } from '../src/sim/wind';
import { windClearance,windObstructions,windPowerOutput,windIntensity,baseWindIntensity } from '../src/sim/wind-rules';
import { newHeaterState,adjustHeaterTarget,applyHeaterHeat,validateHeaters } from '../src/sim/heater';
import { thermalLayout,reconcileTemperature } from '../src/sim/temperature';
import { advancePower,reconcilePower } from '../src/sim/power';
import { newPowerState,powerDemand } from '../src/sim/power-rules';
import { BATTERY_CAPACITY,BATTERY_ENERGY_SCALE,batteryQuanta,batteryWattDays,chargeBatteries,dischargeBatteries,drainBatteryWattDays,leakBattery,type BatteryState } from '../src/sim/power-battery';
import { validatePower } from '../src/sim/power-save';
import type { Cell,Orientation,Structure,World } from '../src/sim/types';
import { WindLayer } from '../src/render/WindLayer';
import type { InstancedBufferAttribute } from 'three/webgpu';

function world():World {const w=miningCamp(0);w.structures=[];w.jobs=[];delete w.arrivals;delete w.raids;delete w.heatwaves;delete w.thermal;w.roofing={constructed:[],build:[],remove:[],cursor:0};return w;}
function building(w:World,kind:Structure['kind'],x:number,z:number,orientation:Orientation=0):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:newPowerState(kind)};
  if(kind==='wind-turbine'){adoptWind(w);s.wind=newWindTurbineState();}
  if(kind==='heater')s.heater=newHeaterState();
  if(kind==='battery')s.battery={stored:100*BATTERY_ENERGY_SCALE};
  w.structures.push(s);return s;
}
const dryInputs={outsideTemperature:16,rainfall:1950,fireDanger:()=>0,lightning:(_cell:Cell,_core:number)=>{}};

test('eight Core weathers retain conditional weights, transition rain/snow, protected initial days and exact future continuation',()=>{
  const w=world();w.tick=0;adoptWeather(w);expect(w.weather).toEqual(newWeatherState(w.seed));
  const summer=Object.fromEntries(weatherWeights(w,16,1950).map(v=>[v.kind,v.weight]));
  expect(Object.keys(summer)).toEqual([...WEATHER_KINDS]);expect(summer.clear).toBe(18);expect(summer.rain).toBeCloseTo(2*(1+650*2/2700));expect(summer['dry-thunderstorm']).toBe(0);expect(summer['snow-hard']).toBe(0);
  w.tick=48000;expect(weatherWeights(w,16,1950).find(v=>v.kind==='dry-thunderstorm')!.weight).toBe(1);
  const snow=Object.fromEntries(weatherWeights(w,-4,1950).map(v=>[v.kind,v.weight]));expect(snow['snow-gentle']).toBe(4);expect(snow['snow-hard']).toBe(4);expect(snow.rain).toBe(0);
  expect(rainfallWeight('snow-hard',300)).toBe(.5);expect(rainfallWeight('fog',0)).toBe(0);expect(rainfallWeight('rain',9999)).toBe(3);
  w.weather=newWeatherState(w.seed,w.tick);w.weather.previous='clear';w.weather.current='snow-hard';w.weather.ageCore=2000;w.weather.durationCore=16000;
  expect(weatherRainRate(w)).toBe(.5);expect(weatherSnowRate(w)).toBe(.6);
  w.weather.current='dry-thunderstorm';w.weather.previous='dry-thunderstorm';w.weather.durationCore=40000;w.weather.ageCore=3999;
  const peer=structuredClone(w),events:unknown[][]=[[],[]];
  for(let i=0;i<1800;i++)for(const [n,target] of [w,peer].entries()){target.tick++;advanceWeather(target,{...dryInputs,fireDanger:()=>i>=100?91:0,lightning:(cell,core)=>events[n]!.push({cell,core})});}
  expect(peer).toEqual(w);expect(events[1]).toEqual(events[0]);expect(events[0]!.length).toBeGreaterThan(0);expect(validateWeather(w,87)).toEqual([]);expect(validateWeather(w,86)).not.toEqual([]);
  const bad=structuredClone(w);bad.weather!.rng=0;expect(validateWeather(bad,87)).not.toEqual([]);
  const original=JSON.stringify(w.weather);adoptWeather(w);expect(JSON.stringify(w.weather)).toBe(original);
});

test('wind clearance rotates with fourteen body cells, counts each obstruction once, caches 25 ticks and requests only physical tree cuts',()=>{
  const w=world(),t=building(w,'wind-turbine',16,12);adoptWeather(w);
  for(const orientation of [0,1,2,3] as const){t.orientation=orientation;const body=new Set(footprintCells(t).map(c=>`${c.x},${c.z}`)),clear=windClearance(t);expect(body.size).toBe(14);expect(clear).toHaveLength(112);expect(new Set(clear.map(c=>`${c.x},${c.z}`)).size).toBe(112);expect(clear.some(c=>body.has(`${c.x},${c.z}`))).toBe(false);}
  t.orientation=0;const [a,b,c,d,e]=windClearance(t);
  const bare=windPowerOutput(w,t);expect(bare).toBeGreaterThan(0);expect(windIntensity(w)).toBe(windIntensity(w));
  const tree={id:w.nextId++,kind:'tree' as const,...a!,amount:12};w.resources=[tree];w.roofing!.constructed=[a!.z*w.width+a!.x];
  expect(windObstructions(w,t)).toEqual([a]);expect(windPowerOutput(w,t)).toBeCloseTo(bare*.8);
  for(const cell of [b!,c!,d!,e!])w.tiles[cell.z*w.width+cell.x]={terrain:'rock'};
  expect(windPowerOutput(w,t)).toBe(0);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.roofing!.constructed=[];
  const count=w.resources.length;expect(setWindAutoCut(w,t.id,true).ok).toBe(true);const cuts:Cell[]=[];
  for(let i=0;i<200;i++){w.tick++;advanceWind(w,c=>cuts.push(c));}
  expect(cuts).toContainEqual(a);expect(w.resources.length).toBe(count);expect(t.wind!.cachedWatts).toBe(Math.round(windPowerOutput(w,t)));
  const old=t.wind!.cachedWatts;w.resources=[];for(let i=0;i<24;i++){w.tick++;advanceWind(w,()=>{});}expect(t.wind!.cachedWatts).toBe(old);
  const peer=structuredClone(w);w.tick++;peer.tick++;advanceWind(w,()=>{});advanceWind(peer,()=>{});expect(peer).toEqual(w);expect(t.wind!.cachedWatts).toBe(Math.round(windPowerOutput(w,t)));
  expect(validateWind(w,87)).toEqual([]);expect(validateWind(w,86)).not.toEqual([]);
  const legacy=world();expect(windIntensity(legacy)).toBe(0);
  for(let i=0;i<100;i++)expect(baseWindIntensity(42,i*6000)).toBeGreaterThanOrEqual(.04);
  const layer=new WindLayer();layer.adopt(w,true);expect(layer.mesh.activeCount).toBe(3);
  const geometry=layer.mesh.geometry,matrixVersion=layer.mesh.instanceMatrix.version,currentAttribute=layer.mesh.geometry.getAttribute('windCurrent') as InstancedBufferAttribute,attributeVersion=currentAttribute.version;
  layer.present(w.tick+.5);layer.adopt(w);expect(layer.mesh.geometry).toBe(geometry);expect(layer.mesh.instanceMatrix.version).toBe(matrixVersion);expect(currentAttribute.version).toBe(attributeVersion);
  layer.adopt(legacy,true);expect(layer.mesh.activeCount).toBe(0);const restore=layer.prepareForCompile();expect(layer.mesh.activeCount).toBe(1);restore();expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.geometry).toBe(geometry);layer.dispose();
});

test('heater uses a real air volume, thermostat clamps heat, power costs preserve every half quantum and legacy sharing',()=>{
  const w=world(),h=building(w,'heater',12,12),store=building(w,'battery',16,12),g=fixturePower(w,'wood-generator',17,12);
  const old=chargeBatteries([{id:1,battery:{stored:0}},{id:2,battery:{stored:0}}],101,0);expect(old).toBe(101);
  const halves:Array<{id:number;battery:BatteryState}>=[{id:1,battery:{stored:0}},{id:2,battery:{stored:BATTERY_CAPACITY-1}}];
  expect(chargeBatteries(halves,1.5,0)).toBe(1.5);expect(halves.reduce((n,b)=>n+batteryQuanta(b.battery),0)).toBe(BATTERY_CAPACITY+.5);
  const almost:BatteryState={stored:0,half:true};expect(leakBattery(almost)).toBe(.5);expect(almost).toEqual({stored:0});
  expect(dischargeBatteries(halves,2.5,1)).toBe(2.5);expect(halves.reduce((n,b)=>n+batteryQuanta(b.battery),0)).toBe(BATTERY_CAPACITY-2);
  // Prepared enclosed 3x3 room. The heater occupies one real air cell.
  for(let z=10;z<=14;z++)for(let x=10;x<=14;x++)if(x===10||x===14||z===10||z===14)w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',material:'wood'});
  w.roofing!.constructed=Array.from({length:9},(_,i)=>(11+Math.floor(i/3))*w.width+11+i%3);const layout=reconcileTemperature(w,thermalLayout(w));
  const room=w.thermal!.regions.find(r=>r.cells.includes(h.z*w.width+h.x))!;room.temperature=10;reconcilePower(w);h.power!.on=true;
  applyHeaterHeat(w,h,layout);expect(room.temperature).toBeCloseTo(10+21/6/9);expect(powerDemand(h)).toBe(175);
  h.heater!.target=room.temperature+.001;applyHeaterHeat(w,h,layout);expect(room.temperature).toBe(h.heater!.target);applyHeaterHeat(w,h,layout);expect(powerDemand(h)).toBe(17.5);
  const before=batteryQuanta(store.battery!);w.tick++;advancePower(w);expect(batteryQuanta(store.battery!)-before).toBe((982.5-10)*10);
  g.fuel!.ticks=0;g.power!.on=false;const charged=batteryQuanta(store.battery!);w.tick++;advancePower(w);expect(charged-batteryQuanta(store.battery!)).toBe((35+10)*10);
  h.heater!.target=100;h.power!.on=false;const air=room.temperature;applyHeaterHeat(w,h,layout);expect(room.temperature).toBe(air);expect(h.heater!.high).toBe(false);
  expect(adjustHeaterTarget(w,h.id,null).ok).toBe(true);expect(h.heater!.target).toBe(21);expect(adjustHeaterTarget(w,h.id,2).ok).toBe(false);
  const state:BatteryState={stored:500*BATTERY_ENERGY_SCALE,half:true};expect(drainBatteryWattDays(state,400)).toBe(400);expect(batteryWattDays(state)).toBe(100+.5/BATTERY_ENERGY_SCALE);
  expect(validateHeaters(w,87)).toEqual([]);expect(validatePower(w,87)).toEqual([]);store.battery!.half=true;expect(validatePower(w,86)).not.toEqual([]);
});

test('weather affects real departure edges and endpoint shooting exposure, never rewrites an in-flight edge or a legacy save',()=>{
  const w=miningCamp(1);w.structures=[];w.jobs=[];w.tick=2000;adoptWeather(w);w.weather!.current='rainy-thunderstorm';w.weather!.previous='rainy-thunderstorm';w.weather!.ageCore=5000;w.weather!.durationCore=15000;
  const p=w.pawns[0]!,from={x:p.x,z:p.z},to={x:p.x+1,z:p.z},i=from.z*w.width+from.x;
  expect(weatherMoveFactor(w,from)).toBe(.8);expect(weatherShotFactor(w,from,to)).toBe(.8);
  w.roofing={constructed:[i],build:[],remove:[],cursor:0};expect(weatherMoveFactor(w,from)).toBe(1);expect(weatherShotFactor(w,from,to)).toBe(.8);
  w.roofing.constructed.push(to.z*w.width+to.x);expect(weatherShotFactor(w,from,to)).toBe(1);w.roofing.constructed=[];
  const clear=structuredClone(w);delete clear.weather;
  expect(startTravel(w,p,to)).toBe(true);expect(startTravel(clear,clear.pawns[0]!,to)).toBe(true);
  expect(p.motion!.speedFactor).toBeCloseTo((clear.pawns[0]!.motion!.speedFactor??1)*.8);
  const edge=structuredClone(p.motion);w.weather!.current='clear';w.weather!.previous='clear';expect(p.motion).toEqual(edge);
  expect(weatherMoveFactor(clear,from)).toBe(1);expect(weatherShotFactor(clear,from,to)).toBe(1);
  const legacy=world(),raw=serializeWorld(legacy),loaded=deserializeWorld(raw);expect(loaded.wind).toBeUndefined();expect(loaded.weather).toBeUndefined();expect(serializeWorld(loaded)).toBe(raw);
  expect(WEATHER['snow-hard'].rain).toBe(1);
});
