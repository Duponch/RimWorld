import { comfortableTemperature,HEAT_SERIOUS } from './heat-rules.ts';
import { TemperatureView } from './temperature.ts';
import { canStandAt } from './furniture-travel.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { routeToCell } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { ThermalLayout } from './thermal-topology.ts';
import type { Cell,Pawn,World } from './types.ts';

export interface HeatRefuge {target:Cell;until:number}
/** Serious heat injury overrides ordinary work. Direct orders, combat and mental
 * states are handled first by the caller. Civil transit remains shared. */
export function processHeatRefuge(w:World,p:Pawn,context:NeedContext,layout:ThermalLayout):boolean {
  const active=p.heatRefuge;
  if(!active&&(p.health?.heatstroke??0)<HEAT_SERIOUS||p.orders.active!==null)return false;
  const view=new TemperatureView(w,layout),range=comfortableTemperature(w,p);
  const comfortable=(c:Cell)=>{const t=view.at(w,c);return t>=range.min&&t<=range.max;};
  if(active){
    if(w.tick>=active.until||!canStandAt(w,active.target)||!comfortable(active.target)){context.release();return false;}
    if(p.x!==active.target.x||p.z!==active.target.z){context.move(active.target,true);return true;}
    p.state='idle';p.path=[];
    // Recheck after 500 Core ticks as in Wait_SafeTemperature. No rest gain.
    active.until=Math.min(active.until,w.tick+50);return true;
  }
  if(p.planCooldown>0)return false;
  const reserved=reservedServiceCells(w,p.id),candidates:Cell[]=[];
  if(comfortable(p)&&canStandAt(w,p)&&!reserved.has(p.z*w.width+p.x)){if(!context.release())return false;p.heatRefuge={target:{x:p.x,z:p.z},until:w.tick+50};return true;}
  for(const region of w.thermal?.regions??[])if(region.temperature>=range.min&&region.temperature<=range.max)for(const index of region.cells){
    const c={x:index%w.width,z:Math.floor(index/w.width)};if(!reserved.has(index)&&canStandAt(w,c))candidates.push(c);
  }
  if(view.outside>=range.min&&view.outside<=range.max)for(let i=0;i<w.tiles.length;i++)if(layout.indices[i]===-1&&!reserved.has(i))candidates.push({x:i%w.width,z:Math.floor(i/w.width)});
  candidates.sort((a,b)=>(a.x-p.x)**2+(a.z-p.z)**2-(b.x-p.x)**2-(b.z-p.z)**2||a.z-b.z||a.x-b.x);
  if(!candidates.length){p.planCooldown=20;return false;}
  const reach=context.search();if(!reach)return true;
  for(const target of candidates){if(!canStandAt(w,target))continue;const path=routeToCell(w,target,reach);if(!path)continue;
    if(!context.release())return false;
    p.heatRefuge={target,until:w.tick+(path.length?500:50)};p.path=path;p.state=path.length?'moving':'idle';return true;
  }
  p.planCooldown=20;return false;
}
