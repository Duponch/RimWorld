import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { carrierOf } from './rescue-state.ts';
import { partMissing } from './injury-state.ts';
import { chooseMeleeTool,rankMeleeTools,type MeleeTool } from './melee-statistics.ts';
import { meleeContact } from './melee-space.ts';
import { strikeLivingTarget } from './living-melee.ts';
import { healthRandom } from './health.ts';
import { animalBody } from './wildlife-health.ts';
import { moveAnimal,type animalNavigation } from './wildlife-navigation.ts';
import { furnitureDelay } from './furniture-travel.ts';
import type { disturbanceEvents } from './disturbance.ts';
import type { WildAnimal } from './wildlife-state.ts';
import type { Cell,World } from './types.ts';
import { animalSpecies } from './animal-species.ts';
import { combatTarget,isAnimalTarget } from './combat-target.ts';
import { animalPredationTarget,cancelAnimalPredation,reconcileAnimalPredation } from './wildlife-predation.ts';
import { animalManhunterTarget } from './animal-manhunter.ts';
import { isRoomDoor } from './door-rules.ts';
import { damageBarrier } from './barriers.ts';

export function animalMeleeTools(a:WildAnimal):MeleeTool[]{
  const tools:MeleeTool[]=[];
  for(const tool of animalSpecies(a.species).melee)
    if(!a.health||!partMissing(a.health,tool.sourcePart))tools.push({id:tool.id,damage:tool.damage,penetration:tool.penetration,kind:tool.kind,cooldownCore:tool.cooldownCore,weight:tool.damage*(1+tool.penetration)/(tool.cooldownCore/60)*tool.chanceFactor});
  return rankMeleeTools(tools);
}
/** Threat memory is not a manhunter state. Exact distance/expiry boundaries,
 * no leaning through walls, no attack on a disabled/carried/sleeping person. */
export function animalMeleeTarget(w:World,a:WildAnimal,core:number,grid?:ShotGrid){
  const threat=a.threat;if(!threat||core>threat.harmedAtCore+400)return;
  const p=combatTarget(w,threat.targetId);
  if(!p||p.id===a.id||['dead','downed','sleeping'].includes(p.state)||!isAnimalTarget(p)&&(p.medicalSleep||carrierOf(w,p.id))||(p.x-a.x)**2+(p.z-a.z)**2>9)return;
  return clearShotSegment(grid??captureWorldShotGrid(w),a,p)?p:undefined;
}
/** Bounded Dijkstra in the threat's 3-cell neighbourhood. It uses the same
 * physical step/cost rules, without allocating a map-sized flood per animal. */
function approach(w:World,a:WildAnimal,target:Cell,nav:ReturnType<typeof animalNavigation>,blocked:Uint8Array):Cell[]|undefined {
  const moving=animalBody(a).capacities.moving;
  const key=(c:Cell)=>c.z*w.width+c.x,queue=[{cell:{x:a.x,z:a.z},cost:0,path:[] as Cell[]}],costs=new Map([[key(a),0]]);
  while(queue.length){queue.sort((a,b)=>a.cost-b.cost||key(a.cell)-key(b.cell));const n=queue.shift()!;
    if(n.cost!==costs.get(key(n.cell)))continue;
    if(meleeContact(w,n.cell,target,blocked)&&nav.free(n.cell))return n.path;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dz)continue;const c={x:n.cell.x+dx,z:n.cell.z+dz};
      if((c.x-target.x)**2+(c.z-target.z)**2>9||!nav.step(n.cell,c))continue;
      const cost=n.cost+Math.hypot(dx,dz)/moving+furnitureDelay(w,n.cell,c),id=key(c);
      if(cost>=(costs.get(id)??Infinity))continue;costs.set(id,cost);queue.push({cell:c,cost,path:[...n.path,c]});
    }
  }
}
export function moveAnimalMelee(w:World,a:WildAnimal,nav:()=>ReturnType<typeof animalNavigation>,blocked:()=>Uint8Array,grid:()=>ShotGrid):boolean {
  // Global pursuit belongs to the wildlife decision's shared navigation budget.
  // Only an already committed recovery/stun owns the actor here.
  if(a.predation){
    if(a.strike||a.stun){a.path=[];a.state='idle';return true;}
    const prey=animalPredationTarget(w,a);
    if(prey&&(prey.motion?.end??0)<=w.tick&&meleeContact(w,a,prey,blocked())){a.path=[];a.state='idle';return true;}
    return false;
  }
  if(!a.threat&&!a.retaliation&&!a.strike)return false;
  const target=a.threat?animalMeleeTarget(w,a,w.tick*10,grid()):undefined;
  if(!target){delete a.threat;delete a.retaliation;a.path=[];}
  if(a.strike||a.stun){a.path=[];if(a.state!=='sleeping')a.state='idle';return true;}
  if(!target)return false;
  if(!a.retaliation||a.retaliation.untilCore<=w.tick*10)a.retaliation={targetId:target.id,untilCore:w.tick*10+200};
  if(meleeContact(w,a,target,blocked())){a.path=[];a.state='idle';return true;}
  const n=nav();a.path=approach(w,a,target,n,blocked())??[];
  if(a.path.length)moveAnimal(w,a,n.step,animalBody(a).capacities.moving);else a.state='idle';
  return true;
}
export function advanceAnimalMelee(w:World,a:WildAnimal,core:number,blocked:()=>Uint8Array,grid:()=>ShotGrid,disturbance:ReturnType<typeof disturbanceEvents>):boolean {
  if(a.stun&&core>=a.stun.untilCore)delete a.stun;
  if(a.state==='dead'||a.state==='downed')return false;
  if(a.strike&&core>=a.strike.untilCore)delete a.strike;
  if(a.burning||a.health?.foodPoisoning?.vomit)return false;
  const m=a.manhunter;
  if(m?.exhausted)return false;
  if(m?.door){
    const bash=m.door;
    const door=w.structures.find(s=>s.id===m.door!.targetId&&isRoomDoor(s.kind)&&s.door);
    if(!door||core>=m.door.untilCore||m.door.remaining<=0){delete m.door;return false;}
    if(a.strike||a.stun||(a.motion?.end??0)>core/10||!meleeContact(w,a,door,blocked()))return false;
    const state={rng:w.rng},tool=chooseMeleeTool(animalMeleeTools(a),()=>healthRandom(state));if(!tool)return false;
    const raw=Math.max(1,tool.damage*(.8+healthRandom(state)*.4)),damage=Math.floor(raw)+Number(healthRandom(state)<raw%1);
    a.strike={targetId:door.id,structure:{x:door.x,z:door.z},atCore:core,untilCore:core+tool.cooldownCore,tool:tool.id,outcome:'hit'};
    if(!damageBarrier(w,door,damage,state.rng)){delete a.strike;return false;}
    a.path=[];a.state='idle';bash.remaining--;
    if(!w.structures.includes(door)||bash.remaining===0)delete m.door;
    return true;
  }
  reconcileAnimalPredation(w,a,core);
  // The job may expire mid-edge. Release its intent without discarding the
  // captured physical movement; a later decision may start a fresh response.
  if(a.retaliation&&core>=a.retaliation.untilCore){delete a.retaliation;a.path=[];}
  const hunt=a.predation,target=m?animalManhunterTarget(w,a):hunt?animalPredationTarget(w,a,core):a.threat?animalMeleeTarget(w,a,core,grid()):undefined;
  if(!target){
    if(!hunt){if(a.threat||a.retaliation)a.path=[];delete a.threat;delete a.retaliation;}
    return false;
  }
  if(a.strike||a.stun&&a.stun.untilCore>core||(a.motion?.end??0)>core/10)return false;
  if((hunt||m)&&(target.motion?.end??0)>core/10)return false;
  if(!hunt&&!m&&(!a.retaliation||core>=a.retaliation.untilCore))a.retaliation={targetId:target.id,untilCore:core+200};
  if(!meleeContact(w,a,target,blocked()))return false;
  const state={rng:w.rng},tool=chooseMeleeTool(animalMeleeTools(a),()=>healthRandom(state));
  if(!tool){if(hunt)cancelAnimalPredation(w,a);return false;}
  const surprise=!!hunt?.firstHit;
  const surpriseStun=surprise?animalSpecies(a.species).melee.find(t=>t.id===tool.id)?.surpriseStun:undefined;
  strikeLivingTarget(w,a,target,tool,core,state,disturbance,{surprise,surpriseStun});
  if(hunt)hunt.firstHit=false;
  return true;
}
