import { energyLoad,energyLoadSummary,energyLoadOutcomeErrors,ENERGY_PROTOCOL,ENERGY_START_TICK } from './energy-load.ts';
import { adoptSiteClimate,climateDate } from '../../src/sim/site-climate.ts';
import { adoptWeather,weatherRainRate } from '../../src/sim/weather.ts';
import { adoptWind,newWindTurbineState } from '../../src/sim/wind.ts';
import { windIntensity,windObstructions } from '../../src/sim/wind-rules.ts';
import { newHeaterState } from '../../src/sim/heater.ts';
import { newPowerState } from '../../src/sim/power-rules.ts';
import { BATTERY_ENERGY_SCALE } from '../../src/sim/power-battery.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { builtDoorState } from '../../src/sim/door-rules.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { startFire } from '../../src/sim/fire.ts';
import { fireDanger } from '../../src/sim/fire-rules.ts';
import { reconcilePower } from '../../src/sim/power.ts';
import { reconcileTemperature,TemperatureView } from '../../src/sim/temperature.ts';
import { updateFoodTemperatures } from '../../src/sim/thermal-food.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Cell,Structure,StructureKind,World } from '../../src/sim/types.ts';

export const ENVIRONMENT_START_TICK=ENERGY_START_TICK;
// A short mixed workload, not a seasonal journey: retain the ENERGY duration.
export const ENVIRONMENT_MEASURED_TICKS=650;
export const ENVIRONMENT_PROTOCOL=ENERGY_PROTOCOL.replace('No wind, fire or weather fidelity is implied.','')+' V87 environment extension: explicit observed-site climate, initial clear weather with its natural subsequent transitions, and shared seeded wind are adopted at tick 2000. 1/1/4 separate prepared wind/heater patches for 3/30/100 colonists contain an unobstructed turbine, 120 Wd battery and enclosed 3x3 room with a 30 C heater. Each 23x23 thermal plot uses its preferred anchor if free, otherwise a deterministic nearest free rectangle; buildings, jobs, colonists, wildlife, stores, crops and prior plots are preserved, and actual origins are reported. No preheated air or seasonal time acceleration. Every initial ENERGY building must survive. Each supplied heater must remain powered and its room must finish at least 0.1 C above both its initial temperature and the current outdoor temperature; this is a benchmark evidence threshold, not a simulation rule. One researcher in six can fight fires at priority 1; all food-production roles and mining remain. Up to three such firefighters have three prepared 20-wood piles set alight at size 1.2 within five cells. Home covers the bounded original work envelope (building/job footprints, workers, floor stores and stockpiles) plus these fires, with a three-cell fringe for access and the verified maximum two-cell ember offset. It therefore protects adjacent workshops and spread, not only initial flame cells; the bounds are reported. Extinction evidence requires all initial fire IDs to disappear, at least that many recorded physical extinctions, and every original wood pile to retain its identity, cell and 20 units. Partial hit-point damage is allowed and reported; the global extinction count is not attributed to individual fires. Existing structures, jobs and stocks are never removed for these patches. All supplied objects and controlled fires are benchmark inputs. The 650-tick interval includes the initial fire response and subsequent ordinary work; no sustained fire rate, natural fire incidence or seasonal survival is inferred. ENERGY and PRISONERS without ENVIRONMENT keep their existing protocols.';
const MIN_HEATING_EVIDENCE_C=0.1;

export interface EnvironmentLoadInitial {
  energyStructureIds:number[];heaterIds:number[];windIds:number[];firefighterIds:number[];fireIds:number[];
  firePiles:{id:number;fireId:number;quantity:number;cell:Cell}[];
  heaters:{id:number;temperature:number}[];suppliedBurnWood:number;
  fireHomeBounds:{minX:number;maxX:number;minZ:number;maxZ:number};
  thermalPatches:{preferred:Cell;origin:Cell;size:number}[];
}
const preparation=new WeakMap<World,EnvironmentLoadInitial>();
const key=(w:World,c:Cell)=>c.z*w.width+c.x;
/** Prefer the original anchor, then the nearest free rectangle in Manhattan
 * distance (north to south, left before right). Never relocate an occupant. */
function freeThermalPatch(w:World,occupied:ReadonlySet<number>,preferred:Cell,size:number):Cell {
  const free=(x:number,z:number)=>{
    if(x<0||z<0||x+size>w.width||z+size>w.height)return false;
    for(let dz=0;dz<size;dz++)for(let dx=0;dx<size;dx++)if(occupied.has((z+dz)*w.width+x+dx))return false;
    return true;
  };
  for(let radius=0;radius<=w.width+w.height;radius++)for(let dz=-radius;dz<=radius;dz++){
    const dx=radius-Math.abs(dz),z=preferred.z+dz,left=preferred.x-dx;
    if(free(left,z))return {x:left,z};
    if(dx&&free(preferred.x+dx,z))return {x:preferred.x+dx,z};
  }
  throw Error('Environment fixture has no free thermal rectangle');
}

/** Preparation only. Once returned, the normal engine/worker owns every action. */
export function environmentLoad(count:number):World {
  const w=energyLoad(count),energyStructureIds=w.structures.map(s=>s.id),roofs=new Set(w.roofing?.constructed);
  const workCells=[...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns,...w.stockpiles,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])];
  adoptSiteClimate(w);adoptWeather(w);adoptWind(w);
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.pawns,...w.wildlife?.animals??[],...w.stockpiles,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>key(w,c)));
  for(const zone of w.growingZones)for(const i of zone.cells)occupied.add(i);
  const add=(kind:StructureKind,x:number,z:number):Structure=>{const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='wall'||kind==='door'?'wood':'steel'};
    if(['heater','battery','wind-turbine','power-conduit'].includes(kind))s.power=newPowerState(kind);
    if(kind==='heater'){s.heater=newHeaterState();s.heater.target=30;}
    if(kind==='battery')s.battery={stored:120*BATTERY_ENERGY_SCALE};
    if(kind==='wind-turbine')s.wind=newWindTurbineState();
    if(kind==='door')s.door=builtDoorState(w,s);
    w.structures.push(s);for(const c of footprintCells(s))occupied.add(key(w,c));return s;
  };
  const heaterIds:number[]=[],windIds:number[]=[],thermalPatches:EnvironmentLoadInitial['thermalPatches']=[];
  for(let group=0;group<Math.ceil(count/30);group++){
    const preferred={x:24+group%2*30,z:100+Math.floor(group/2)*30},size=23;
    const origin=freeThermalPatch(w,occupied,preferred,size),{x,z}=origin,cells=new Set<number>();
    for(let dz=0;dz<size;dz++)for(let dx=0;dx<size;dx++)cells.add((z+dz)*w.width+x+dx);
    thermalPatches.push({preferred,origin,size});
    // Reserve the complete plot, including its wind clearance, for later groups.
    for(const i of cells)occupied.add(i);
    for(const i of cells)w.tiles[i]={terrain:'grass'};
    w.resources=w.resources.filter(r=>!cells.has(key(w,r)));
    windIds.push(add('wind-turbine',x+6,z+9).id);add('battery',x+10,z+10);
    for(let dx=11;dx<=15;dx++)add('power-conduit',x+dx,z+10);
    for(let dz=8;dz<=12;dz++)for(let dx=14;dx<=18;dx++){
      roofs.add((z+dz)*w.width+x+dx);
      if(dx===14||dx===18||dz===8||dz===12)add(dx===18&&dz===10?'door':'wall',x+dx,z+dz);
    }
    heaterIds.push(add('heater',x+16,z+10).id);
  }
  w.roofing={constructed:[...roofs].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const firefighters=w.pawns.filter((_,i)=>i%6===0),firefighterIds=firefighters.map(p=>p.id),home=new Set(w.home),fireIds:number[]=[],firePiles:EnvironmentLoadInitial['firePiles']=[];
  for(const p of firefighters)p.priorities.firefight=1;
  for(const p of firefighters.slice(0,3)){
    const candidates:Cell[]=[];
    for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++)if(Math.abs(dx)+Math.abs(dz)>=2&&Math.abs(dx)+Math.abs(dz)<=5)candidates.push({x:p.x+dx,z:p.z+dz});
    candidates.sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.z-p.z)-Math.abs(b.x-p.x)-Math.abs(b.z-p.z)||a.z-b.z||a.x-b.x);
    let fires=0;
    for(const c of candidates){const i=key(w,c);if(occupied.has(i)||w.resources.some(r=>r.x===c.x&&r.z===c.z)||w.tiles[i]?.terrain!=='grass')continue;
      addGroundMaterial(w,'wood',20,c,'wood');if(!startFire(w,c,1.2))throw Error('Environment fixture could not ignite prepared wood');
      const pile=w.piles.find(p=>p.item==='wood'&&p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z);
      if(!pile||pile.quantity!==20)throw Error('Environment fixture lacks its exact prepared wood pile');
      const fireId=w.fires!.items.at(-1)!.id;firePiles.push({id:pile.id,fireId,quantity:pile.quantity,cell:{...c}});
      occupied.add(i);home.add(i);fireIds.push(fireId);if(++fires===3)break;
    }
    if(fires!==3)throw Error('Environment fixture lacks three unobstructed nearby fire cells');
  }
  // Home is a prepared protection policy, not a rule that disables propagation.
  // Include real workshop access and one extra cell beyond the two-cell ember
  // offset; no building, resource, job or existing stock is removed to make room.
  const protectedCells=[...workCells,...firePiles.map(p=>p.cell)],fringe=3;
  const fireHomeBounds={minX:Math.max(0,Math.min(...protectedCells.map(c=>c.x))-fringe),maxX:Math.min(w.width-1,Math.max(...protectedCells.map(c=>c.x))+fringe),minZ:Math.max(0,Math.min(...protectedCells.map(c=>c.z))-fringe),maxZ:Math.min(w.height-1,Math.max(...protectedCells.map(c=>c.z))+fringe)};
  for(let z=fireHomeBounds.minZ;z<=fireHomeBounds.maxZ;z++)for(let x=fireHomeBounds.minX;x<=fireHomeBounds.maxX;x++)home.add(z*w.width+x);
  w.home=[...home].sort((a,b)=>a-b);reconcilePower(w);const layout=reconcileTemperature(w);updateFoodTemperatures(w,layout);refreshStock(w);
  const temperatures=new TemperatureView(w),initial:EnvironmentLoadInitial={energyStructureIds,heaterIds,windIds,thermalPatches,firefighterIds,fireIds,firePiles,fireHomeBounds,heaters:heaterIds.map(id=>{const h=w.structures.find(s=>s.id===id)!;return {id,temperature:temperatures.at(w,h)};}),suppliedBurnWood:firePiles.reduce((n,p)=>n+p.quantity,0)};
  preparation.set(w,initial);
  const errors=validateWorld(w);if(errors.length)throw Error(`Invalid environment load: ${errors.join('; ')}`);return w;
}
export function environmentLoadInitial(w:World):EnvironmentLoadInitial {
  const initial=preparation.get(w);if(!initial)throw Error('Environment initial report must be captured from its prepared world');return structuredClone(initial);
}
function energyView(w:World,initial:EnvironmentLoadInitial):World {
  const ids=new Set(initial.energyStructureIds);return {...w,structures:w.structures.filter(s=>ids.has(s.id))};
}
export function environmentLoadSummary(w:World,initialCropIds:readonly number[],initial:EnvironmentLoadInitial){
  const temperatures=new TemperatureView(w),presentStructures=new Set(w.structures.map(s=>s.id));
  return {energy:energyLoadSummary(energyView(w,initial),initialCropIds),missingEnergyStructureIds:initial.energyStructureIds.filter(id=>!presentStructures.has(id)),thermalPatches:initial.thermalPatches,climate:climateDate(w),outsideTemperature:temperatures.outside,weather:w.weather?.current,rainRate:weatherRainRate(w),wind:windIntensity(w),
    turbines:initial.windIds.map(id=>{const s=w.structures.find(s=>s.id===id);return {id,present:!!s,powered:s?.power?.on??false,watts:s?.wind?.cachedWatts??0,obstructions:s?windObstructions(w,s).length:null};}),
    heaters:initial.heaters.map(h=>{const s=w.structures.find(s=>s.id===h.id),temperature=s?temperatures.at(w,s):null;return {...h,initialTemperature:h.temperature,temperature,gain:temperature===null?null:temperature-h.temperature,aboveOutside:temperature===null?null:temperature-temperatures.outside,powered:s?.power?.on??false,high:s?.heater?.high??false};}),
    fire:{initial:initial.fireIds.length,remainingInitial:w.fires?.items.filter(f=>initial.fireIds.includes(f.id)).length??0,active:w.fires?.items.length??0,danger:fireDanger(w),ledger:w.fires?.ledger,suppliedWood:initial.suppliedBurnWood,homeBounds:initial.fireHomeBounds,
      preparedPiles:initial.firePiles.map(expected=>{const pile=w.piles.find(p=>p.id===expected.id);return {id:expected.id,fireId:expected.fireId,present:!!pile&&pile.item==='wood',initialQuantity:expected.quantity,quantity:pile?.quantity??0,damage:pile?.damage??0,atInitialCell:pile?.owner.type==='ground'&&pile.owner.x===expected.cell.x&&pile.owner.z===expected.cell.z};})},
    firefighters:initial.firefighterIds.map(id=>{const p=w.pawns.find(p=>p.id===id);return {id,state:p?.state,burning:!!p?.burning,task:p?.firefighting?.fireId??null,research:!!p?.research};})};
}
export function environmentLoadOutcomeErrors(w:World,initialCropIds:readonly number[],initial:EnvironmentLoadInitial):string[]{
  const summary=environmentLoadSummary(w,initialCropIds,initial),errors=energyLoadOutcomeErrors(energyView(w,initial),initialCropIds);
  if(summary.missingEnergyStructureIds.length)errors.push(`Initial ENERGY structures disappeared: ${summary.missingEnergyStructureIds.join(', ')}`);
  if(!w.climate||!w.weather||!w.wind)errors.push('Explicit climate/weather/wind state disappeared');
  if(summary.turbines.some(t=>!t.present||!t.powered||t.watts<=0||t.obstructions!==0))errors.push('A prepared unobstructed turbine produced no power');
  if(summary.heaters.some(h=>!h.powered||h.gain===null||h.aboveOutside===null||h.gain<MIN_HEATING_EVIDENCE_C||h.aboveOutside<MIN_HEATING_EVIDENCE_C))errors.push('A supplied heater failed to warm its physical room at least 0.1 C above its initial and current outdoor temperatures');
  if((w.fires?.ledger.extinguished??0)<initial.fireIds.length||summary.fire.remainingInitial)errors.push('Prepared home fires were not physically extinguished');
  if(summary.fire.preparedPiles.some(p=>!p.present||!p.atInitialCell||p.quantity!==p.initialQuantity))errors.push('A prepared fire wood pile lost its identity, cell or original quantity');
  if(w.pawns.some(p=>p.state==='dead'||p.state==='downed'))errors.push('A mixed-load colonist died or became incapacitated');
  return errors;
}
