import {getToxicFallout294,toxicFalloutCellsPerCore294,type ToxicFalloutActive294} from './toxic-fallout-state-294.ts';
import {isRoofed} from './roof-rules.ts';
import {isPlant} from './plants.ts';
import {damageResource} from './thing-damage.ts';
import {isPerishable,rotAge,type RotState} from './food-preservation.ts';
import {CORPSE_DESSICATION_TICKS} from './corpses.ts';
import {animalCarrier} from './animal-rest-state.ts';
import type {MaterialPile,Pawn,Resource,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';

const gcd=(a:number,b:number):number=>{while(b){const r=a%b;a=b;b=r;}return a;};
function hash(value:number):number {value=Math.imul(value^(value>>>16),0x7feb352d);value=Math.imul(value^(value>>>15),0x846ca68b);return (value^(value>>>16))>>>0;}
/** Explicit adaptation of Core's map cell permutation: a deterministic affine
 * full cycle, without an additional map-sized array or a general scheduler. */
export function toxicFalloutCellOrder294(seed:number,area:number):{offset:number;stride:number} {
  if(!Number.isSafeInteger(area)||area<1)throw Error('Invalid fallout map surface');
  let stride=hash(seed^0x79e6bc4d)%area;if(!stride)stride=1;
  while(gcd(stride,area)!==1)stride=stride+1===area?1:stride+1;
  return {offset:hash(seed^0x1ce9d437)%area,stride};
}
function random(active:ToxicFalloutActive294):number {
  let value=active.rng;value^=value<<13;value^=value>>>17;value^=value<<5;active.rng=value>>>0;return active.rng/0x100000000;
}
interface PlantIndex {source:Resource[];length:number;cells:Map<number,Resource>}
const plantIndices=new WeakMap<World,PlantIndex>();
function plants(world:World):Map<number,Resource> {
  let index=plantIndices.get(world);
  // Live plant writers replace the array; initial generation can append.
  // This producer's index is never used to validate a public mutable save.
  if(!index||index.source!==world.resources||index.length!==world.resources.length){const cells=new Map<number,Resource>();for(const plant of world.resources)if(plant.kind==='tree'||isPlant(plant))cells.set(plant.z*world.width+plant.x,plant);index={source:world.resources,length:world.resources.length,cells};plantIndices.set(world,index);}
  return index.cells;
}
/** The actual extra age remains with this same indivisible body through
 * transfer and temperature anchors. Food keeps its ordinary age only. */
export function addFalloutRotAge294(rot:RotState,tick:number,corpse:boolean):void {
  const progress=rot.progress+(tick-rot.atTick)*(rot.rate??1)+300;
  const extra=(rot.fallout294??0)+300;
  if(!Number.isFinite(progress)||corpse&&!Number.isSafeInteger(extra))throw Error('Fallout rot age exhausted');
  rot.progress=progress;rot.atTick=tick;if(corpse)rot.fallout294=extra;
}
type RetainedBody={kind:'human';actor:Pawn}|{kind:'animal';actor:WildAnimal};
export interface FalloutEnvironmentWork294 {coreTicks:number;cells:number;plantTrials:number;plantsKilled:number;itemsAged:number}

/** Called once per real local simulation step, after the condition lottery and
 * before ordinary spoilage. All ten native sub-ticks are bounded by start/end.
 * No render, read, load or camera-selection path invokes this producer. */
export function advanceToxicFalloutEnvironment294(world:World):FalloutEnvironmentWork294|undefined {
  const active=getToxicFallout294(world);if(!active)return;
  const from=Math.max((world.tick-1)*10+1,active.startCore),to=Math.min(world.tick*10,active.endCore);
  if(from>to)return;
  const area=world.width*world.height,visits=toxicFalloutCellsPerCore294(area),order=toxicFalloutCellOrder294(world.seed,area),plantCells=plants(world);
  const piles=new Map<number,MaterialPile[]>(),bodies=new Map<number,RetainedBody[]>();
  for(const pile of world.piles)if(pile.owner.type==='ground'&&pile.rot&&(isPerishable(pile.item)||pile.kind==='corpse')){
    const cell=pile.owner.z*world.width+pile.owner.x,list=piles.get(cell);if(list)list.push(pile);else piles.set(cell,[pile]);
  }
  const addBody=(cell:number,body:RetainedBody)=>{const list=bodies.get(cell);if(list)list.push(body);else bodies.set(cell,[body]);};
  for(const pawn of world.pawns)if(pawn.state==='dead'&&pawn.body?.rot&&pawn.body.pileId===undefined&&pawn.body.lostAt===undefined){const cell=pawn.motion&&pawn.motion.end>world.tick?pawn.motion.from:pawn;addBody(cell.z*world.width+cell.x,{kind:'human',actor:pawn});}
  for(const animal of world.wildlife?.animals??[])if(animal.state==='dead'&&animal.corpseRot&&!animalCarrier(world,animal.id)){const cell=animal.motion&&animal.motion.end>world.tick?animal.motion.from:animal;addBody(cell.z*world.width+cell.x,{kind:'animal',actor:animal});}
  const work:FalloutEnvironmentWork294={coreTicks:to-from+1,cells:0,plantTrials:0,plantsKilled:0,itemsAged:0};
  for(let core=from;core<=to;core++)for(let n=0;n<visits;n++){
    const cell=(order.offset+active.cursor*order.stride)%area;active.cursor=(active.cursor+1)%area;work.cells++;
    if(isRoofed(world,cell))continue;
    const plant=plantCells.get(cell);
    if(plant){
      work.plantTrials++;
      if(random(active)<Math.fround(.0065)&&damageResource(world,plant,100000,'fallout')){plantCells.delete(cell);work.plantsKilled++;}
    }
    for(const pile of piles.get(cell)??[]){
      // Ordinary food is retired by expireFood later in this same step. A
      // corpse at stage2 remains physical but receives no additional age.
      if(pile.kind==='corpse'&&rotAge(pile,world.tick)>=CORPSE_DESSICATION_TICKS)continue;
      addFalloutRotAge294(pile.rot!,world.tick,pile.kind==='corpse');work.itemsAged++;
    }
    for(const body of bodies.get(cell)??[]){
      const rot=body.kind==='human'?body.actor.body!.rot!:body.actor.corpseRot!;
      if(rot.progress+(world.tick-rot.atTick)*(rot.rate??1)>=CORPSE_DESSICATION_TICKS)continue;
      addFalloutRotAge294(rot,world.tick,true);work.itemsAged++;
    }
  }
  return work;
}
