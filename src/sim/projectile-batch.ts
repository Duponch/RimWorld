import { captureWorldProjectileTargets } from './projectile-world.ts';
import { SHOT_LAYER,itemShotFill } from './combat-content.ts';
import type { ProjectileScene,ProjectileTarget } from './projectile-rules.ts';
import type { World,Cell } from './types.ts';

/** Local to a synchronous projectile batch ONLY. Medical reconciliation can
 * mutate people, piles and packages, never terrain/plants/frames/buildings.
 * Refresh the movable overlay after each impact; rebuild everything on the next
 * tick. Object damage will require an explicit static invalidation here. */
export function captureProjectileBatch(world:World) {
  const fixed=captureWorldProjectileTargets({...world,pawns:[],piles:[],packed:[]});
  const {width,height}=world;
  const neutral=fixed.scene(new Set(),1),inside=(c:Cell)=>Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<width&&c.z<height;
  return {
    refresh(current:World):(friends:ReadonlySet<number>,factor:number)=>ProjectileScene {
      if(current.width!==width||current.height!==height)throw new Error('Projectile batch belongs to another map');
      const targets=new Map<string,ProjectileTarget>(),cells=new Map<number,ProjectileTarget[]>();
      const add=(target:ProjectileTarget,layer:number)=>{
        // Current movables never cover another object; make that contract fail
        // explicitly when a new full movable definition is introduced.
        if(target.fill>.99)throw new Error('Full movable requires projectile coverage integration');
        const cell=Object.freeze({x:target.cell.x,z:target.cell.z}),entry=Object.freeze({...target,cell,covered:fixed.covers(cell,layer)}) as ProjectileTarget;
        targets.set(entry.key,entry);const index=cell.z*width+cell.x,list=cells.get(index);if(list)list.push(entry);else cells.set(index,[entry]);
      };
      for(const p of current.piles)if(p.owner.type==='ground')add({key:`pile:${p.id}`,cell:p.owner,kind:'object',fill:itemShotFill(p.item),covered:false,openDoor:false},SHOT_LAYER.item);
      for(const p of current.packed)if(p.owner.type==='ground')add({key:`packed:${p.building.id}`,cell:p.owner,kind:'object',fill:0,covered:false,openDoor:false},SHOT_LAYER.item);
      const carried=new Set(current.pawns.filter(p=>p.rescue?.phase==='carry').map(p=>p.rescue!.patientId));
      for(const p of current.pawns)if(p.state!=='dead'&&!p.health?.death&&!carried.has(p.id))add({key:`pawn:${p.id}`,cell:{x:p.x,z:p.z},kind:'pawn',fill:0,covered:false,openDoor:false,standing:!['sleeping','resting','downed'].includes(p.state),bodySize:1,friendly:false},SHOT_LAYER.pawn);
      const rank=(key:string)=>key.startsWith('pile:')?0:key.startsWith('packed:')?1:2;
      for(const list of cells.values())list.sort((a,b)=>rank(a.key)-rank(b.key)||Number(a.key.slice(a.key.indexOf(':')+1))-Number(b.key.slice(b.key.indexOf(':')+1)));
      return (friends,factor)=>{
        if(!Number.isFinite(factor)||factor<0||factor>1)throw new RangeError('Invalid friendly fire factor');
        const relation=new Set(friends),related=new Map<string,ProjectileTarget>(),cachedCells=new Map<number,readonly ProjectileTarget[]>();
        const relate=(p:ProjectileTarget)=>{if(p.kind!=='pawn'||!relation.has(Number(p.key.slice(5))))return p;let copy=related.get(p.key);if(!copy){copy=Object.freeze({...p,friendly:true});related.set(p.key,copy);}return copy;};
        return Object.freeze({width,height,friendlyFireFactor:factor,
          target(key:string){const p=targets.get(key);return p?relate(p):neutral.target(key);},
          at(cell:Cell){if(!inside(cell))return [];const index=cell.z*width+cell.x;let list=cachedCells.get(index);if(!list){list=Object.freeze([...neutral.at(cell),...(cells.get(index)??[]).map(relate)]);cachedCells.set(index,list);}return list;},
        });
      };
    },
  };
}
