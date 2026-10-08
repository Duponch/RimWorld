import { isColonist,distanceSquared } from './affiliation.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { CORPSE_ROT_TICKS,corpseStage } from './corpses.ts';
import { DEATH_OBSERVATION_INTERVAL,UNBURIED_COLONIST_AFTER } from './death-thoughts-rules.ts';
import { deathObserverAwake,deathThoughtObserver,rememberDeathThought } from './death-thoughts.ts';
import type { MoodThought } from './mood.ts';
import type { Cell,Pawn,World } from './types.ts';

interface ObservedBody {pawn:Pawn;cell:Cell;fresh:boolean}
/** Ground bodies only: carried/grave contents are not spawned corpses in Core.
 * A retained human body waiting for a floor slot remains physical at its Pawn
 * cell in Lisière; it is counted once, never again beside its materialized pile. */
function looseBodies(world:World):ObservedBody[] {
  const bodies:ObservedBody[]=[];
  for(const pawn of world.pawns){
    if(pawn.state!=='dead'||!pawn.health?.death||pawn.body?.lostAt!==undefined)continue;
    if(pawn.body?.pileId!==undefined){
      const pile=world.piles.find(p=>p.id===pawn.body!.pileId);if(pile?.item!=='human-corpse'||pile.humanCorpse?.pawnId!==pawn.id||pile.owner.type!=='ground')continue;
      bodies.push({pawn,cell:pile.owner,fresh:corpseStage(pile,world.tick)==='fresh'});
    }else if((pawn.motion?.end??0)<=world.tick&&pawn.moveCooldown===0){
      const rot=pawn.body?.rot,age=rot?rot.progress+(world.tick-rot.atTick)*(rot.rate??1):0;
      bodies.push({pawn,cell:pawn,fresh:age<CORPSE_ROT_TICKS});
    }
  }
  return bodies;
}
/** Prospective played-tick sampling. No load/inspection scan creates memory and
 * no world RNG is consumed. LOS reuses the game's closed-door/wall semantics. */
export function advanceDeathThoughts(world:World):void {
  if(world.schemaVersion<209)return;
  const observers=world.pawns.filter(p=>deathThoughtObserver(p)&&!p.traits?.includes('bloodlust')&&(world.tick+p.id)%DEATH_OBSERVATION_INTERVAL===0&&deathObserverAwake(p));
  if(!observers.length)return;
  const bodies=looseBodies(world);if(!bodies.length)return;
  let grid:ShotGrid|undefined;
  for(const p of observers)for(const body of bodies){
    if(body.pawn===p||distanceSquared(p,body.cell)>=5**2)continue;
    grid??=captureWorldShotGrid(world);
    if(clearShotSegment(grid,body.cell,p))rememberDeathThought(p,body.fresh?'observed-corpse':'observed-rotting-corpse',body.pawn.id,world.tick,true);
  }
}
export function colonistUnburiedThought(world:World,pawn:Pawn):MoodThought|undefined {
  if(world.schemaVersion<209||!deathThoughtObserver(pawn))return;
  if(!world.pawns.some(p=>p.state==='dead'&&isColonist(p)&&!p.visitor&&p.body?.lostAt===undefined&&p.health?.death&&world.tick-p.health.death.tick>UNBURIED_COLONIST_AFTER))return;
  if(!looseBodies(world).some(b=>isColonist(b.pawn)&&!b.pawn.visitor&&world.tick-b.pawn.health!.death!.tick>UNBURIED_COLONIST_AFTER))return;
  return {id:'death-colonist-unburied',label:'Colon laissé sans sépulture',offset:-10,kind:'situation',description:'Un cadavre de colon reste au sol depuis plus d’un jour et demi. Le portage, l’inhumation ou sa destruction met fin à cette situation.'};
}
