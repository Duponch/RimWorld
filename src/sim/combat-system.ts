import { advanceMechanoidCombat } from './mechanoid-combat.ts';
import { advanceMechanoidRaid } from './mechanoid-raids.ts';
import { advanceAnimalMelee } from './wildlife-melee.ts';
import { isAnimalTarget,isMechanoidTarget,isPawnTarget } from './combat-target.ts';
import { disturbanceEvents } from './disturbance.ts';
import { advanceMelee } from './melee.ts';
import { blockedCells } from './pathfinding.ts';
import { advanceWorldProjectiles } from './projectile-system.ts';
import { advanceShooter,shootingQueries } from './shooting.ts';
import { combatShotBatch } from './combat-shot-batch.ts';
import type { World } from './types.ts';
import { advanceBombWick } from './bomb-system.ts';
import { advanceTurretOwner,captureTurretTargets,turretOperational,turretHashDue,type TurretAcquisitionBudget } from './mini-turret.ts';

/** Emissions first, then flight/impacts, ordered by persistent ID at each Core
 * substep. Movable targets/standability expire at impact; fixed cover is checked by the
 * transaction owner. All captures expire at the end of this tick. */
export function advanceWorldCombat(world:World):void {
  const disturbance=disturbanceEvents(world);
  const people=world.pawns.filter(p=>p.shooting||p.melee),targets=new Set(people.map(p=>p.melee?.order?.targetId));
  const animalTargets=new Set(world.wildlife?.animals.flatMap(a=>a.predation?[a.predation.targetId]:[])??[]);
  const shooters=[...people,...(world.mechanoids?.filter(m=>m.melee||m.stun||m.stagger)??[]),...(world.wildlife?.animals.filter(a=>a.predation||a.manhunter||a.threat||a.strike||a.retaliation||a.stun||targets.has(a.id)||animalTargets.has(a.id))??[])].sort((a,b)=>a.id-b.id);
  const turrets=world.structures.filter(s=>s.kind==='mini-turret'&&s.turret);
  if(!shooters.length&&!turrets.length){advanceWorldProjectiles(world,world.raids?.mechActive?core=>{advanceMechanoidRaid(world,core);return false;}:undefined,undefined,disturbance);return;}
  const owners=[...shooters.map(pawn=>({id:pawn.id,pawn})),...turrets.map(structure=>({id:structure.id,structure}))].sort((a,b)=>a.id-b.id);
  const batch=combatShotBatch(world);
  const capture=()=>{let index:ReturnType<typeof captureTurretTargets>|undefined;return {...shootingQueries(world,batch.read),turretTargets:()=>index??=captureTurretTargets(world)};};
  let queries=capture();
  let physical:Uint8Array|undefined;const contactGrid=()=>physical??=blockedCells(world,true);
  const invalidated=()=>{physical=undefined;batch.afterImpact();queries=capture();};
  advanceWorldProjectiles(world,core=>{
    advanceMechanoidRaid(world,core);
    const due=turrets.filter(s=>{const t=s.turret!;return turretOperational(world,s)&&!t.holdFire&&!t.warmup&&!t.burst&&t.cooldownCore<=1&&t.ammoQ>=4&&turretHashDue(s,core);}).sort((a,b)=>a.id-b.id);
    // Clip the rotating window at the final ID. With a depleted pair budget,
    // every owner eventually becomes the first admitted consultation, including
    // the last one alone; wrapping while executing by ID would starve that tail.
    const admitted=new Set<number>(),offset=due.length?Math.floor(core/15)%due.length:0;
    for(let n=offset;n<Math.min(offset+8,due.length);n++)admitted.add(due[n]!.id);
    const budget:TurretAcquisitionBudget={remaining:8,pairs:32768};
    let changed=false;for(const owner of owners){
    if('structure' in owner){const s=owner.structure;
      if(advanceBombWick(world,s,core)){changed=true;invalidated();continue;}
      advanceTurretOwner(world,s,core,queries,admitted.has(s.id)?budget:{remaining:0,pairs:0});continue;
    }
    const pawn=owner.pawn;
    if(isMechanoidTarget(pawn)?advanceMechanoidCombat(world,pawn,core,{blocked:contactGrid,grid:queries.grid}):isAnimalTarget(pawn)?advanceAnimalMelee(world,pawn,core,contactGrid,queries.grid,disturbance):advanceMelee(world,pawn,core,contactGrid,queries,disturbance)){changed=true;invalidated();}
    if(isPawnTarget(pawn))advanceShooter(world,pawn,core,queries);
  }return changed;},invalidated,disturbance);
}
