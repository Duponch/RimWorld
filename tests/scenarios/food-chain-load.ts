import { researchLoad } from './research-load.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { newCookingBill } from '../../src/sim/cooking-bills.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { PLANT_DEFINITIONS } from '../../src/sim/plants.ts';
import { reconcilePower } from '../../src/sim/power.ts';
import { enableWildlife } from '../../src/sim/wildlife.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Command, Structure, World } from '../../src/sim/types.ts';

export const FOOD_CHAIN_START_TICK = 2000;
const MEALS_PER_STOVE = 4;
const CORPSES_PER_TABLE = 2;
const STARTING_MALNUTRITION = 190_000_000;
export const FOOD_CHAIN_PROTOCOL = 'Controlled V84 load on the existing natural 250² research map. Groups of six: two researchers, one cook, one grower, one butcher, one miner. Incomplete final groups keep those roles in order. Dedicated cleared work patches, prebuilt stoves alternating wood/electric, real fueled generators, butcher tables, supplied raw potatoes/corn and two supplied fresh hare corpses per butcher; four mature plants per grower, then ordinary harvesting and resowing. Growers start with 19% malnutrition and a positive food need, so recovery is measured without accelerating crops. Butchers start hungry and allow meals only. Same number of wild hares as colonists, half hungry and one third tired. These prepared inputs and medical states are synthetic load fixtures, not naturally earned colony progress or a self-sufficient economy.';

/** Only imported by the CPU/native benchmark scripts, never by the application
 * or the food-chain integration test. Preparation is excluded from timing. */
export function foodChainLoad(count:number):World {
  const w=researchLoad(count);
  const command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(`Food load: ${r.reason}`);};
  const groups=Math.ceil(count/6),cleared=new Set<number>();
  const anchor=(group:number)=>({x:151+group%4*20,z:111+Math.floor(group/4)*15});
  for(let group=0;group<groups;group++) {
    const {x,z}=anchor(group);
    for(let dz=-3;dz<=10;dz++)for(let dx=-3;dx<=13;dx++) {
      const index=(z+dz)*w.width+x+dx;cleared.add(index);w.tiles[index]={terrain:'grass'};
    }
  }
  w.resources=w.resources.filter(r=>!cleared.has(r.z*w.width+r.x));
  // The fixture's new patches contain no original jobs or structures. Failing
  // here is preferable to deleting another workload or its physical material.
  if([...w.structures,...w.jobs].some(s=>cleared.has(s.z*w.width+s.x))||w.piles.some(p=>p.owner.type==='ground'&&cleared.has(p.owner.z*w.width+p.owner.x)))throw Error('Food load patch overlaps the existing workload');
  for(const [i,p] of w.pawns.entries()) {
    const role=i%6;if(role===0||role===3||role===5)continue;
    const group=Math.floor(i/6),{x,z}=anchor(group);
    p.schedule.fill('work');for(const key of Object.keys(p.priorities) as Array<keyof typeof p.priorities>)p.priorities[key]=0;
    p.skills.cooking={level:10,xp:0,dailyXp:0,passion:1};
    if(role===2) {
      p.name=`Cultivateur ${group}`;p.x=x+5;p.z=z+6;p.priorities.grow=1;p.priorities.haul=2;p.foodPolicyId=2;
      p.health={...createMedicalRecord(w.tick),malnutrition:STARTING_MALNUTRITION};
      for(const [kind,dz] of [['potato',5],['corn',7]] as const) {
        command({type:'area',action:'growing',from:{x:x+6,z:z+dz},to:{x:x+7,z:z+dz}});
        command({type:'growing-policy',zoneId:w.growingZones.at(-1)!.id,plant:kind,allowSow:true,allowCut:true});
        w.resources=[...w.resources,...[6,7].map(dx=>({id:w.nextId++,kind,x:x+dx,z:z+dz,amount:PLANT_DEFINITIONS[kind].yield,growth:1,growthTick:w.tick}))];
      }
      continue;
    }
    const butcher=role===4,sx=x+(butcher?10:0),kind=butcher?'butcher-table':group%2?'electric-stove':'fueled-stove';
    p.name=`${butcher?'Boucher':'Cuisinier'} ${group}`;p.x=sx;p.z=z-1;p.priorities.cook=1;
    if(butcher){p.hunger=20;p.foodPolicyId=2;}
    const bill=newCookingBill(w.nextId++,butcher?'butcher-creature':'simple-meal');bill.target=butcher?CORPSES_PER_TABLE:MEALS_PER_STOVE;bill.radius=8;bill.destination='drop';
    const station:Structure={id:w.nextId++,kind,x:sx,z,orientation:0,footprint:'standard',material:butcher?'wood':'steel',bills:[bill]};
    if(kind==='fueled-stove')station.fuel={...newBuildingFuel(kind),ticks:30000,autoRefuel:false};
    if(kind==='electric-stove') {
      station.power={on:false,parentId:null};
      w.structures.push({id:w.nextId++,kind:'wood-generator',x:x+4,z,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},fuel:{...newBuildingFuel('wood-generator'),ticks:45000,autoRefuel:false}});
    }
    w.structures.push(station);
    if(butcher)for(const dz of [-1,1]) {
      const id=w.nextId++;
      w.piles.push({id,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:sx-2,z:z+dz},corpse:{animalId:id,species:'hare',sex:'female',health:{...createMedicalRecord(w.tick),body:'hare',bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss'}}},rot:{progress:0,atTick:w.tick}});
    } else {
      addGroundMaterial(w,'food',20,{x:sx-2,z:z-1},'potato');
      addGroundMaterial(w,'food',20,{x:sx-2,z:z+1},'corn');
    }
  }
  reconcilePower(w);enableWildlife(w,count);
  for(const [i,a] of w.wildlife!.animals.entries()){a.food=i%2?.02:.16;a.rest=i%3?.8:.2;}
  refreshStock(w);
  const errors=validateWorld(w);if(errors.length)throw Error(`Invalid food load: ${errors.join('; ')}`);
  return w;
}

/** Bill decrements count finished meals even after physical ingestion; pile
 * counts alone cannot distinguish a meal already eaten from absent work. */
export const foodChainCropIds=(w:World):number[]=>w.resources.filter(r=>r.kind==='potato'||r.kind==='corn').map(r=>r.id);
export function foodChainSummary(w:World,initialCropIds:readonly number[]) {
  const stoves=w.structures.filter(s=>s.kind==='fueled-stove'||s.kind==='electric-stove');
  const growers=w.pawns.filter((_,i)=>i%6===2);
  const units=(item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
  return {
    stoves:stoves.map(s=>({kind:s.kind,id:s.id,completed:MEALS_PER_STOVE-(s.bills?.[0]?.target??MEALS_PER_STOVE),powered:s.power?.on??false,fuelBurned:s.fuel?.burned??0})),
    butcherTables:w.structures.filter(s=>s.kind==='butcher-table').length,
    butchered:w.butchery?.completed??0,meatProduced:w.butchery?.meat??0,
    food:{potato:units('potato'),corn:units('corn'),meals:units('simple-meal'),meat:units('hare-meat')},
    crops:(['potato','corn'] as const).map(kind=>({kind,originalRemaining:w.resources.filter(r=>r.kind===kind&&initialCropIds.includes(r.id)).length,resown:w.resources.filter(r=>r.kind===kind&&!initialCropIds.includes(r.id)).length})),
    growers:growers.map(p=>({id:p.id,malnutrition:p.health?.malnutrition??0,food:p.hunger})),
    butcherFood:w.pawns.filter((_,i)=>i%6===4).map(p=>p.hunger),
  };
}

export function foodChainOutcomeErrors(w:World,initialCropIds:readonly number[]):string[] {
  const result=foodChainSummary(w,initialCropIds),errors:string[]=[];
  if(result.stoves.some(s=>s.completed<1))errors.push('A supplied stove produced no meal');
  if(result.stoves.some(s=>s.kind==='electric-stove'&&!s.powered))errors.push('A supplied electric stove is not powered');
  if(result.stoves.some(s=>s.kind==='fueled-stove'&&!s.fuelBurned))errors.push('A wood stove performed no fueled work');
  if(result.butcherTables&&result.butchered<result.butcherTables)errors.push('Fewer completed butcheries than supplied tables');
  if(result.crops.some(c=>!c.resown))errors.push('No physical resowing for one of the two crop species');
  if(result.growers.some(p=>p.malnutrition>=STARTING_MALNUTRITION))errors.push('A nourished grower did not recover from malnutrition');
  return errors;
}
