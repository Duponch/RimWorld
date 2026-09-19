import { disturbanceEvents,isLying } from './disturbance.ts';
import { BODY_COVERAGE,BODY_PARTS,HUMAN_BODY } from './body-definition.ts';
import { HP_UNIT,PART_INJURY_RULES } from './injury-rules.ts';
import { createMedicalRecord,partMissing,remainingPartHealth } from './injury-state.ts';
import { healthRandom,injurePawn } from './health.ts';
import type { World } from './types.ts';

/** Constructed roof only. Thin-roof Crush targets top/outside parts; it is not
 * Blunt's internal-hit worker and not mountain-roof destruction. */
export function damageFromRoofCollapse(world:World,cells:ReadonlySet<number>):void {
  const disturbance=disturbanceEvents(world);
  for(const pawn of world.pawns) {
    if(pawn.state==='dead'||!cells.has(pawn.z*world.width+pawn.x))continue;
    const health=pawn.health??createMedicalRecord(world.tick);
    const parts=HUMAN_BODY.flatMap((part,index)=>part.height==='top'&&part.depth==='outside'&&!part.conceptual&&!partMissing(health,part.id)&&BODY_COVERAGE[index]!>0?[{part,weight:BODY_COVERAGE[index]!}]:[]);
    if(!parts.length)continue;
    let amount=(15+Math.floor(healthRandom(world)*16))*HP_UNIT;
    let roll=healthRandom(world)*parts.reduce((n,p)=>n+p.weight,0),part=parts.at(-1)!.part;
    for(const candidate of parts){roll-=candidate.weight;if(roll<0){part=candidate.part;break;}}
    const hp=remainingPartHealth(health,part.id);
    if(amount>=hp) {
      const excess=(amount-hp)/(BODY_PARTS[part.id].hp*HP_UNIT),chance=Math.max(0,Math.min(1,(excess-.4)/.6));
      if(healthRandom(world)>=chance)amount=Math.max(0,hp-HP_UNIT);
    }
    const traits=PART_INJURY_RULES[part.id];
    const wasLying=isLying(pawn);
    injurePawn(world,pawn,part.id,traits.solid?'crack':traits.skin?'cut':'crush',amount);
    if(amount>0)disturbance.damage(pawn,world.tick*10,wasLying);
  }
}
