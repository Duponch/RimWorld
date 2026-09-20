import { footprintCells } from './definitions.ts';
import { furnitureObject, minifiable } from './furniture-rules.ts';
import { canDesignate } from './engine.ts';
import { planCommandDrops, releaseWork } from './work-release.ts';
import { removeZonesForPlan } from './construction-zones.ts';
import type { Command, CommandResult, Job, Structure, World } from './types.ts';

export function designateUninstall(world:World,source:Structure):void {
  world.jobs.push({id:world.nextId++,kind:'uninstall',furniture:{structureId:source.id,kind:source.kind},x:source.x,z:source.z,orientation:source.orientation,footprint:source.footprint,progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}});
}
/** Same placement contract as construction, with this exact source excluded.
 * No object or cargo is mutated until placement and all zone releases pass. */
export function installCommand(world:World,command:Extract<Command,{type:'install'}>,preview=false):CommandResult {
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!Number.isSafeInteger(command.structureId))return fail('Identité de meuble invalide.');
  const source=furnitureObject(world,command.structureId);
  if(!source||!minifiable(source.kind))return fail('Ce meuble ne peut pas être installé.');
  if(world.jobs.some(j=>j.flick?.structureId===source.id||j.furniture?.structureId===source.id||j.deconstruction?.structureId===source.id))return fail('Un ordre existe déjà pour ce meuble.');
  const pack=world.packed.find(p=>p.building.id===source.id);
  if(pack?.owner.type==='pawn')return fail('Ce meuble est porté par un colon.');
  if(!Number.isInteger(command.orientation)||command.orientation<0||command.orientation>3)return fail('Orientation invalide.');
  if(source.kind==='standing-lamp'&&command.orientation!==0)return fail('Cette lampe ne pivote pas.');
  if(!Number.isSafeInteger(world.nextId+1))return fail('Limite des identités atteinte.');
  const placement={type:'designate' as const,kind:source.kind,x:command.x,z:command.z,orientation:command.orientation,footprint:source.footprint,material:source.material};
  const view={...world,structures:world.structures.filter(s=>s.id!==source.id),packed:world.packed.filter(p=>p!==pack)};
  const allowed=canDesignate(view,placement);if(!allowed.ok)return allowed;
  const drops=planCommandDrops(world,placement);if(!drops)return fail('Pas de place pour les cargaisons libérées.');
  if(preview)return {ok:true};
  for(const p of world.pawns)if(p.haul?.whole&&p.haul.sourcePileId===source.id)releaseWork(world,p,drops);
  removeZonesForPlan(world,placement,drops);
  const job:Job={id:world.nextId++,kind:'install',furniture:{structureId:source.id,kind:source.kind},x:command.x,z:command.z,orientation:command.orientation,footprint:source.footprint,construction:'blueprint',progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}};
  world.jobs.push(job);for(const p of world.pawns)p.planCooldown=0;
  return {ok:true};
}
