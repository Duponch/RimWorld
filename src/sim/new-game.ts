import { enableArrivals } from './arrivals.ts';
import { setupEncounter } from './encounter-scenario.ts';
import { generateWorld } from './generation.ts';
import { nearbyGround } from './ground-placement.ts';
import { enableHeatwaves } from './heatwave.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { validMapDimension } from './map-config.ts';
import { addMaterial } from './materials.ts';
import { blockedCells } from './pathfinding.ts';
import { enableRaids } from './raids.ts';
import { AIR_CONDITIONING_COST,CLOTHING_RESEARCH_COST } from './research.ts';
import { DEFAULT_SCENARIO,isScenarioId,SCENARIOS,SCENARIO_REVISION,type ScenarioId } from './scenario-definitions.ts';
import { startingPawn } from './starting-pawns.ts';
import { initializeCampTraits } from './traits.ts';
import type { Cell,World } from './types.ts';
import { enableWildlife } from './wildlife.ts';

/** Available contents only. Missing Crashlanded items are not replaced by
 * additional revolvers, steel, food or a wild animal claimed as a pet. */
const SUPPLIES:readonly (readonly [ItemId,number])[]=[['wood',300],['steel',450],['component',30],['survival-meal',50],['medicine',30],['revolver',1],['flak-vest',1]];
const GROUND_STACKS=SUPPLIES.reduce((sum,[item,n])=>sum+Math.ceil(n/ITEM_DEFINITIONS[item].stackLimit),0);
const point=(w:World,i:number):Cell=>({x:i%w.width,z:Math.floor(i/w.width)});

/** Cardinal connectivity proves accessibility under our stricter diagonal
 * corner rule. These buffers belong only to this new-world decision. */
function largestComponent(world:World):number[] {
  const blocked=blockedCells(world),seen=new Uint8Array(blocked.length),queue=new Int32Array(blocked.length);
  let largest:number[]=[];
  for(let start=0;start<blocked.length;start++) {
    if(blocked[start]||seen[start])continue;
    let end=1,reachesBorder=false;queue[0]=start;seen[start]=1;
    for(let cursor=0;cursor<end;cursor++) {
      const index=queue[cursor]!,x=index%world.width,z=Math.floor(index/world.width);
      if(x===0||z===0||x===world.width-1||z===world.height-1)reachesBorder=true;
      for(const next of [z>0?index-world.width:-1,x+1<world.width?index+1:-1,z+1<world.height?index+world.width:-1,x>0?index-1:-1]) {
        if(next<0||blocked[next]||seen[next])continue;
        seen[next]=1;queue[end++]=next;
      }
    }
    if(reachesBorder&&end>largest.length)largest=Array.from(queue.subarray(0,end));
  }
  return largest;
}

/** Find room in the largest border-connected component for real people and
 * every stock stack, without clearing terrain. Failure never publishes a world. */
function landingSite(world:World):{landing:Cell;cells:Cell[]} {
  const resources=new Set(world.resources.map(r=>r.z*world.width+r.x)),cx=(world.width-1)/2,cz=(world.height-1)/2;
  const distance=(i:number)=>(i%world.width-cx)**2+(Math.floor(i/world.width)-cz)**2;
  const candidates=largestComponent(world).filter(i=>!resources.has(i)).sort((a,b)=>distance(a)-distance(b)||a-b);
  for(const index of candidates) {
    const landing=point(world,index),cells=nearbyGround(world,landing).filter(c=>!resources.has(c.z*world.width+c.x));
    if(cells.length>=3+GROUND_STACKS)return {landing,cells};
  }
  throw new Error('Aucun point d’arrivée accessible ne peut accueillir les survivants et leurs réserves.');
}

function survivalStart(world:World):Cell {
  const {landing,cells}=landingSite(world);
  for(const [index,name] of ['Ada','Noé','Mina'].entries()) {
    const cell=cells[index]!,pawn=startingPawn(world.nextId++,name,cell.x,cell.z,index,55);
    world.pawns.push(pawn);
    addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'cloth-shirt');
  }
  let cursor=3;
  for(const [item,quantity] of SUPPLIES) {
    const definition=ITEM_DEFINITIONS[item];
    for(let remaining=quantity;remaining>0;) {
      const moved=Math.min(remaining,definition.stackLimit);
      addMaterial(world,definition.kind,moved,{type:'ground',...cells[cursor++]!},item);
      remaining-=moved;
    }
  }
  world.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:0}};
  return landing;
}

/** The only application factory. Loading an existing save must not call this
 * function: scenario population, supplies and technologies are creation-only. */
export function createScenarioWorld(seed:number,size:number,id:ScenarioId=DEFAULT_SCENARIO):World {
  if(!isScenarioId(id))throw new Error('Scénario inconnu.');
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('La graine doit être un entier de 0 à 4 294 967 295.');
  if(!validMapDimension(size)||size<SCENARIOS[id].minSize)throw new Error('Taille de carte incompatible avec ce scénario.');
  const world=id==='survivors'?generateWorld(seed,size,size,'temperate-survivors-v1'):generateWorld(seed,size,size);
  const landing=id==='survivors'?survivalStart(world):{x:Math.floor(size/2),z:Math.floor(size/2)};
  if(id==='sentry')setupEncounter(world);
  else {
    initializeCampTraits(world);enableArrivals(world);enableRaids(world);enableHeatwaves(world);
    if(id==='survivors')enableWildlife(world,undefined,'natural');else enableWildlife(world);
  }
  world.scenario={id,revision:SCENARIO_REVISION,landing};
  return world;
}
