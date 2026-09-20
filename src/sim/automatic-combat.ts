import { activeThreat,distanceSquared,hostileTo,isColonist } from './affiliation.ts';
import { automaticShotScore,chooseAutomaticTarget } from './automatic-targets.ts';
import { interruptDraftWork } from './drafting.ts';
import { equippedWeapon } from './equipment-rules.ts';
import { healthRandom } from './health.ts';
import { medicallyStopped } from './health-rules.ts';
import { meleeContact,meleePlaces,meleeRoute } from './melee-space.ts';
import { meleeTools } from './melee-statistics.ts';
import { cancelShooting } from './shooting-state.ts';
import { blockedCells } from './pathfinding.ts';
import { rangedWeaponProfile } from './ranged-statistics.ts';
import { carrierOf } from './rescue-state.ts';
import { clearShotSegment } from './combat-space.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { shootingQueries,shotPlan,advanceShooter } from './shooting.ts';
import type { SearchBudget } from './work-planner.ts';
import type { Pawn,World } from './types.ts';

/** Called by the simulation, never by rendering. Existing direct orders win.
 * Idle drafted pawns stay at their post; civilian melee may approach a threat. */
export function considerAutomaticCombat(world:World,p:Pawn,budget:SearchBudget):void {
  // A hunting aim is ordinary civilian work, not a forced combat order.
  // Its replacement is committed only after a valid human threat is found;
  // any post-shot recovery must finish before this new attack can begin.
  if(!isColonist(p)||medicallyStopped(p)||p.collapsePending||p.need?.kind==='sleep'||p.state==='sleeping'||p.stun||carrierOf(world,p.id)||p.melee||p.shooting?.stance?.phase==='cooldown'||p.shooting&&!p.hunting)return;
  const kind=p.draft?'draft':'response';
  if(kind==='draft') {
    if(p.moveCooldown||p.path.length||p.draft!.queue.length||p.draft!.target&&distanceSquared(p,p.draft!.target)>0)return;
  } else if(p.hostilityResponse!=='attack'||p.flee||p.orders.active!==null||p.orders.queue.length||p.priorityWork||p.equipmentTask)return;
  const weapon=equippedWeapon(world,p),profile=weapon?.weapon?rangedWeaponProfile(weapon.item,weapon.weapon.quality):undefined,range=profile?.range??8;
  const radius=kind==='draft'?range:profile?Math.min(20,Math.max(2,range*.66)):8;
  const candidates=world.pawns.filter(t=>hostileTo(p,t)&&activeThreat(t)&&distanceSquared(p,t)<=radius*radius&&!carrierOf(world,t.id)).sort((a,b)=>distanceSquared(p,a)-distanceSquared(p,b)||a.id-b.id);
  if(!candidates.length)return;
  // Target range plus three cells covers lean origins, cover neighbours and
  // the 1.5-cell cone. Captures never survive an interruption/mutation.
  const margin=Math.ceil(radius)+3,bounds={minX:p.x-margin,minZ:p.z-margin,maxX:p.x+margin,maxZ:p.z+margin};
  const readGrid=()=>captureWorldShotGrid(world,bounds),queries=shootingQueries(world,readGrid);
  let physical:Uint8Array|undefined;const contact=(t:Pawn)=>Math.abs(p.x-t.x)<=1&&Math.abs(p.z-t.z)<=1&&meleeContact(world,p,t,physical??=blockedCells(world,true));
  const adjacent=candidates.find(contact);
  if(adjacent||!profile) {
    if(kind==='draft'&&!adjacent||!meleeTools(world,p).length)return;
    for(const t of adjacent?[adjacent]:candidates) {
      if(!clearShotSegment(queries.grid(),p,t))continue;
      let path:Pawn['path']=[];
      if(!contact(t)) {
        if(!budget.remaining||p.planCooldown)return;budget.remaining--;
        const planned=meleeRoute(world,p,meleePlaces(world,p,t),blockedCells(world));
        if(!planned)continue;path=planned;
      }
      interruptDraftWork(world,p);cancelShooting(p);delete p.flee;
      p.melee={order:{targetId:t.id,startedDowned:false,auto:kind},strike:null};p.path=path;p.planCooldown=0;p.state=path.length||p.moveCooldown?'moving':'idle';return;
    }
    p.planCooldown=4;return;
  }
  if(p.draft?.holdFire)return;
  const valid=candidates.flatMap(target=>{
    const plan=shotPlan(world,p,target.id,queries,kind);
    return 'reason' in plan?[]:[{target,score:automaticShotScore(world,p,target,queries.grid(),plan.line.from,plan.line.to,queries.carried)}];
  });
  const rng={rng:world.rng},target=chooseAutomaticTarget(valid,()=>healthRandom(rng));if(!target)return;
  interruptDraftWork(world,p);delete p.flee;world.rng=rng.rng;
  p.shooting={order:{targetId:target.id,weaponId:weapon!.id,startedDowned:false,auto:kind==='draft'?{kind}:{kind,remaining:2,until:world.tick+200}},stance:null};p.path=[];p.state=p.moveCooldown?'moving':'idle';
  advanceShooter(world,p,world.tick*10,shootingQueries(world,readGrid));
  // Captured travel postpones the aim until the shared Core substep can begin it.
}
