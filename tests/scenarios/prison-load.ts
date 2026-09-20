import { energyLoad,energyLoadOutcomeErrors,energyLoadSummary,ENERGY_PROTOCOL,ENERGY_START_TICK } from './energy-load.ts';
import { isColonist } from '../../src/sim/affiliation.ts';
import { footprintCells } from '../../src/sim/definitions.ts';
import { builtDoorState } from '../../src/sim/door-rules.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { createPrisonerState } from '../../src/sim/prisoner-state.ts';
import { reconcileTemperature } from '../../src/sim/temperature.ts';
import { updateFoodTemperatures } from '../../src/sim/thermal-food.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Cell,Structure,World } from '../../src/sim/types.ts';

export const PRISON_START_TICK=ENERGY_START_TICK;
// Include an ordinary 400-tick research session between food delivery and the
// complete conversation. ENERGY alone keeps its historical 650-tick window.
export const PRISON_MEASURED_TICKS=1200;
export const PRISON_PROTOCOL=ENERGY_PROTOCOL+' V86 prisoner extension: 1/3/10 healthy captives added to 3/30/100 free colonists, with unchanged hare count. Separate prebuilt 3×3 prison interiors, closed ordinary doors, beds and twenty survival rations per captive are prepared inputs. One existing researcher per captive also performs Warden work; original food production roles remain. Captives start hungry at20% and request resistance reduction. Survival-only delivery policies distinguish dedicated provisions from cooking ingredients; free colonists keep their original allowed foods except the previously absent survival ration. The 1200-tick window includes the normal research session that can start while the captive eats, and must show physical food ingestion, at least one completed conversation and captive movement; it does not promise recruitment or all visits. This is synthetic workload, not naturally earned colony growth.';

export interface PrisonLoadInitial {
  colonistIds:number[];
  prisoners:{id:number;position:Cell;hunger:number;resistance:number}[];
  wardenIds:number[];
  suppliedRations:number;
}
const countCaptives=(count:number)=>Math.max(1,Math.ceil(count/10));

/** Benchmark-only prepared rooms. The unmodified simulation performs all work
 * after return; no resource, resistance or need is injected during timing. */
export function prisonLoad(count:number):World {
  const w=energyLoad(count),captives=countCaptives(count),roofs=new Set(w.roofing?.constructed);
  const original=[...w.pawns],researchers=original.filter((_,i)=>i%6===0);
  if(researchers.length<captives)throw Error('Prison load lacks its existing researcher/warden roles');
  const policy=w.nextFoodPolicyId++;w.foodPolicies.push({id:policy,name:'Rations des prisons témoins',allowed:['survival-meal']});
  for(const p of w.foodPolicies)if(p.id!==policy)p.allowed=p.allowed.filter(id=>id!=='survival-meal');
  const occupied=new Set([...w.structures.flatMap(footprintCells),...w.jobs.flatMap(footprintCells),...w.stockpiles,...w.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...w.pawns,...w.wildlife?.animals??[]].map(c=>c.z*w.width+c.x));
  for(const zone of w.growingZones)for(const i of zone.cells)occupied.add(i);
  const candidates:Cell[]=[];for(let z=98;z>=74;z-=8)for(let x=108;x<=153;x+=9)candidates.push({x,z});
  let created=0;
  for(const anchor of candidates){
    if(created===captives)break;
    const patch:Cell[]=[];for(let dz=-1;dz<=7;dz++)for(let dx=-1;dx<=5;dx++)patch.push({x:anchor.x+dx,z:anchor.z+dz});
    if(patch.some(c=>occupied.has(c.z*w.width+c.x)))continue;
    const cells=new Set(patch.map(c=>c.z*w.width+c.x));for(const c of patch){w.tiles[c.z*w.width+c.x]={terrain:'grass'};occupied.add(c.z*w.width+c.x);}
    w.resources=w.resources.filter(r=>!cells.has(r.z*w.width+r.x));
    const add=(kind:'wall'|'door'|'bed',dx:number,dz:number):Structure=>{const s:Structure={id:w.nextId++,kind,x:anchor.x+dx,z:anchor.z+dz,orientation:0,footprint:'standard',material:'wood'};w.structures.push(s);return s;};
    for(let dz=0;dz<=4;dz++)for(let dx=0;dx<=4;dx++){
      roofs.add((anchor.z+dz)*w.width+anchor.x+dx);
      if(dx!==0&&dx!==4&&dz!==0&&dz!==4)continue;
      const wall=add(dx===2&&dz===4?'door':'wall',dx,dz);if(wall.kind==='door')wall.door=builtDoorState(w,wall);
    }
    const bed=add('bed',1,1);bed.prisoner=true;
    const keeper=researchers[created]!;keeper.priorities.warden=1;keeper.skills.social={level:8,xp:0,dailyXp:0,passion:0};
    const p=structuredClone(original[0]!);p.id=w.nextId++;p.name=`Captif charge ${created+1}`;p.faction='outlaws';p.x=anchor.x+2;p.z=anchor.z+2;p.hunger=20;p.rest=100;p.bedId=bed.id;p.foodPolicyId=policy;
    p.path=[];p.motion=null;p.moveCooldown=0;p.planCooldown=0;p.needCooldown=0;p.need=null;p.state='idle';p.orders={active:null,queue:[]};p.jobId=null;p.haul=null;p.cooking=null;p.memories=[];
    delete p.health;delete p.research;delete p.social;delete p.mental;delete p.traits;delete p.hostilityResponse;delete p.raid;delete p.flee;delete p.draft;
    for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
    p.prisoner=createPrisonerState(w,p);p.prisoner.mode='reduce';w.pawns.push(p);
    addGroundMaterial(w,'food',20,{x:anchor.x+2,z:anchor.z+6},'survival-meal');created++;
  }
  if(created!==captives)throw Error('Prison load lacks enough unoccupied prepared room sites');
  w.roofing={constructed:[...roofs].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const thermal=reconcileTemperature(w);updateFoodTemperatures(w,thermal);refreshStock(w);
  const errors=validateWorld(w);if(errors.length)throw Error(`Invalid prison load: ${errors.join('; ')}`);return w;
}
export function prisonLoadInitial(w:World):PrisonLoadInitial {
  return {colonistIds:w.pawns.filter(isColonist).map(p=>p.id),prisoners:w.pawns.filter(p=>p.prisoner).map(p=>({id:p.id,position:{x:p.x,z:p.z},hunger:p.hunger,resistance:p.prisoner!.resistance})),wardenIds:w.pawns.filter(p=>isColonist(p)&&p.priorities.warden>0).map(p=>p.id),suppliedRations:w.piles.reduce((n,i)=>n+(i.item==='survival-meal'?i.quantity:0),0)};
}
/** Preserve ENERGY's original group-of-six indices when captives are appended. */
const freeWorld=(w:World,initial:PrisonLoadInitial):World=>({...w,pawns:w.pawns.filter(p=>initial.colonistIds.includes(p.id))});
export function prisonLoadSummary(w:World,initialCropIds:readonly number[],initial:PrisonLoadInitial){
  return {freeColonists:initial.colonistIds.length,energy:energyLoadSummary(freeWorld(w,initial),initialCropIds),prisoners:initial.prisoners.map(before=>{
    const p=w.pawns.find(p=>p.id===before.id);return {id:before.id,present:!!p,state:p?.state,hunger:p?.hunger,initialHunger:before.hunger,initialResistance:before.resistance,resistance:p?.prisoner?.resistance,completedChat:p?.prisoner?.lastChatTick!==undefined&&p.prisoner.lastChatTick>=PRISON_START_TICK,physicallyMoved:!!p&&(p.x!==before.position.x||p.z!==before.position.z||!!p.motion&&p.motion.start>=PRISON_START_TICK),position:p?{x:p.x,z:p.z}:null,escape:p?.prisoner?.escape};
  }),wardens:initial.wardenIds.map(id=>{const p=w.pawns.find(p=>p.id===id);return {id,socialDailyXp:p?.skills.social?.dailyXp??0,task:p?.ward??null};}),rations:{supplied:initial.suppliedRations,remaining:w.piles.reduce((n,i)=>n+(i.item==='survival-meal'?i.quantity:0),0)}};
}
export function prisonLoadOutcomeErrors(w:World,initialCropIds:readonly number[],initial:PrisonLoadInitial):string[]{
  const summary=prisonLoadSummary(w,initialCropIds,initial),errors=energyLoadOutcomeErrors(freeWorld(w,initial),initialCropIds);
  if(summary.prisoners.some(p=>!p.present||p.state==='dead'||p.state==='downed'||(p.hunger??0)<=0||p.escape))errors.push('A prepared captive died, collapsed, starved or escaped');
  if(!summary.prisoners.some(p=>(p.hunger??0)>p.initialHunger+10))errors.push('No captive completed physical food ingestion');
  if(!summary.prisoners.some(p=>p.completedChat&&(p.resistance??Infinity)<p.initialResistance))errors.push('No warden completed a resistance-reduction conversation');
  if(!summary.prisoners.some(p=>p.physicallyMoved))errors.push('No captive performed physical movement');
  if(summary.rations.remaining>=summary.rations.supplied)errors.push('Prepared prison rations were not consumed');
  return errors;
}
