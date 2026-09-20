import { coolerSalvage } from './cooler-salvage.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
import { furnitureDropCell } from './furniture-transfer.ts';
import { structureLeavesResources } from './thing-damage-rules.ts';
import type { DropPlan } from './work-release.ts';
import type { Cell,Pawn,Structure,World } from './types.ts';

/** Fatal hits only. Preview the usual cargo drops and recipe salvage together.
 * Only ownership is copied; terrain, actors, health and simulation state are
 * shared read-only. Keep existing reservations until the material commit, so
 * an unrelated or pending delivery cannot lose its promised floor capacity. */
export function planStructureDestruction(world:World,structure:Structure,actors:readonly Pawn[],origin:Cell,rng:number){
  const view:World={...world,structures:world.structures.filter(s=>s.id!==structure.id),
    packed:world.packed.filter(p=>p.building.id!==structure.id).map(p=>({...p,owner:{...p.owner}})),
    piles:world.piles.map(p=>({...p,owner:{...p.owner}}))};
  const drops:DropPlan=new Map();
  for(const actor of actors){
    const pack=view.packed.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===actor.id);
    if(pack){const cell=furnitureDropCell(view,actor,actor.id);if(cell){pack.owner={type:'ground',...cell};drops.set(pack.building.id,cell);}}
    const pile=view.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===actor.id);
    if(pile&&dropRetainingIdentity(view,pile,actor)&&pile.owner.type==='ground')drops.set(pile.id,{x:pile.owner.x,z:pile.owner.z});
  }
  const salvage=structureLeavesResources(structure)?coolerSalvage(view,{...structure,x:origin.x,z:origin.z},rng):undefined;
  return salvage===null?null:{drops,salvage};
}
