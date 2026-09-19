import { distanceSquared,hostileTo } from './affiliation.ts';
import { shotCover } from './combat-report.ts';
import { interceptionDistanceFactor } from './combat-report.ts';
import { carrierOf } from './rescue-state.ts';
import type { ShotGrid } from './combat-space.ts';
import type { Cell,Pawn,World } from './types.ts';

/** Nine integer rays cover the current revolver's 1.5-cell miss neighbourhood.
 * Grid rasterisation is our explicit 3D adaptation, not an immunity corridor. */
function coneCells(grid:ShotGrid,from:Cell,to:Cell):Set<number> {
  const cells=new Set<number>();
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++) {
    const end={x:to.x+dx,z:to.z+dz};if(end.x<0||end.z<0||end.x>=grid.width||end.z>=grid.height)continue;
    let x=from.x,z=from.z;const sx=Math.sign(end.x-x),sz=Math.sign(end.z-z),ax=Math.abs(end.x-x),az=Math.abs(end.z-z);let error=ax-az;
    for(;;){if(grid.blocksSight(x,z))break;cells.add(z*grid.width+x);if(x===end.x&&z===end.z)break;const e=2*error;if(e>-az){error-=az;x+=sx;}if(e<ax){error+=ax;z+=sz;}}
  }
  return cells;
}
export function automaticShotScore(world:World,p:Pawn,target:Pawn,grid:ShotGrid,from:Cell=p,to:Cell=target,carried:(id:number)=>boolean=id=>!!carrierOf(world,id)):number {
  let score=60-Math.min(40,Math.sqrt(distanceSquared(p,target)))-10*shotCover(grid,p,target,`pawn:${target.id}`).blockChance;
  if(target.shooting?.order?.targetId===p.id||target.melee?.order?.targetId===p.id)score+=10;
  if(p.lastAttack?.targetId===target.id&&world.tick*10-p.lastAttack.atCore<=300)score+=40;
  const cone=coneCells(grid,from,to);
  for(const other of world.pawns)if(other!==target&&other.state!=='dead'&&cone.has(other.z*grid.width+other.x)&&!carried(other.id)) {
    const factor=interceptionDistanceFactor(distanceSquared(from,other));
    score+=(other===p?40:18)*factor*(hostileTo(p,other)?.6:-1);
  }
  return score;
}
/** No random consumption on a failed search. Canonical IDs make ordering stable. */
export function chooseAutomaticTarget<T>(candidates:{target:T;score:number}[],random:()=>number):T|undefined {
  if(!candidates.length)return;
  const best=candidates.reduce((a,b)=>b.score>a.score?b:a);
  if(best.score<1)return best.target;
  const weighted=candidates.map(c=>({...c,weight:Math.max(0,(c.score-best.score+30)/30)}));
  let roll=random()*weighted.reduce((n,c)=>n+c.weight,0);
  for(const c of weighted){roll-=c.weight;if(roll<0)return c.target;}return best.target;
}
