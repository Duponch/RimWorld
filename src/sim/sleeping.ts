import { allowedAreaServicesAllowed } from './allowed-area-services.ts';
import { captureAllowedArea } from './allowed-area-state.ts';
import { isBedKind } from './bed-kinds.ts';
import { bedAssignmentReason,bedSlotCell,bedSlotClaimed,civilBedShareAllowed,pawnBedSlot,type BedSlot } from './bed-slots.ts';
import { patientWork,patientProposal,startPatientRest,processPatientRest } from './patient-rest.ts';
import { advanceRoomRest,finishRoomRest } from './room-experience.ts';
import { capturePrisonTopology,prisonBedValid,prisonerAllowedCell } from './prison-space.ts';
import { deconstructionReserved } from './deconstruction-rules.ts';
import { BUILDING_MATERIALS } from './building-materials.ts';
import { bedRestEffectiveness } from './furniture-stats.ts';
import { canStandAt } from './furniture-travel.ts';
import { routeCost, routeToCell, type Reachability } from './pathfinding.ts';
import { footprintCells } from './definitions.ts';
import { BED_REST_PER_TICK, GROUND_REST_PER_TICK } from './rest.ts';
import { scheduleWakes, wantsSleep } from './schedule.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { NeedContext } from './needs.ts';
import type { Cell, Pawn, World } from './types.ts';

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const NEED_INTERVAL = 20;

/** Ownership, accessibility and rest gain all depend on the actual sleeping cell. */
export function processSleeping(world: World, pawn: Pawn, context: NeedContext, canPlan: boolean): boolean {
  if(!allowedAreaServicesAllowed(world,pawn)){context.release();return false;}
  if(pawn.need?.kind==='sleep'&&pawn.need.medical)return processPatientRest(world,pawn,context);
  let reach: Reachability | null;
  if (!pawn.need && wantsSleep(world, pawn) && canPlan && (world.restRules === 'legacy' || (pawn.jobId === null && !pawn.haul && !pawn.cooking&&!pawn.ward&&!pawn.feed&&!pawn.tend&&!pawn.rescue))) {
    const policy=captureAllowedArea(world,pawn);
    const allows=(cell:Cell)=>!policy||policy.has(cell.z*world.width+cell.x);
    const services = reservedServiceCells(world,pawn.id);
    const doublePlaces:{id:number;slot:BedSlot;target:Cell;rank:number}[]=[];
    for(const bed of world.structures)if(bed.kind==='double-bed'&&civilBedShareAllowed(world,bed,pawn)&&!deconstructionReserved(world,bed.id,pawn.id)){
      const owned=pawnBedSlot(pawn,bed);
      for(const slot of [0,1] as const){
        if(owned!==undefined&&owned!==slot)continue;
        const target=bedSlotCell(bed,slot);
        if(!target||!allows(target)||services.has(target.z*world.width+target.x)||bedSlotClaimed(world,bed,slot,pawn.id))continue;
        doublePlaces.push({id:bed.id,slot,target,rank:owned===slot?0:world.pawns.some(p=>p.bedId===bed.id&&p.state!=='dead')?1:2});
      }
    }
    // Transit does not claim bed ownership; only a sleep reservation excludes another sleeper.
    const ownedBed = world.structures.find(item => item.id === pawn.bedId && isBedKind(item.kind)&&item.kind!=='double-bed'&&allows(item));
    const ownedTarget=doublePlaces.find(place=>place.rank===0)?.target??ownedBed;
    const medical=patientWork(pawn);
    reach = context.search( !medical&&ownedTarget ? new Set([ownedTarget.z * world.width + ownedTarget.x]) : undefined);
    if (!reach) return true;
    // A wounded sleeper may use a medical bed. Do not fall back to the floor
    // merely because the sleep provider runs before the ordinary work planner.
    const patient=medical?patientProposal(world,pawn,reach):undefined;
    if(patient){if(!context.release())return true;startPatientRest(world,pawn,patient);return processPatientRest(world,pawn,context);}
    const owners = new Map(world.pawns.filter(other => other.bedId !== null).map(other => [other.bedId, other.id]));
    const reserved = new Set(world.pawns.filter(other => other.id !== pawn.id && other.need?.kind === 'sleep').map(other => other.need?.kind === 'sleep' ? other.need.bedId : null));
    let best: { id: number; slot?:BedSlot; path: Cell[]; target: Cell; rank: number; cost:number } | undefined;
    for(const place of doublePlaces){
      const path=routeToCell(world,place.target,reach);if(!path)continue;
      const cost=routeCost(world,path,reach);
      if(!best||place.rank<best.rank||place.rank===best.rank&&(cost<best.cost||cost===best.cost&&(place.id<best.id||place.id===best.id&&place.slot<(best.slot??0))))best={...place,path,cost};
    }
    const topology=pawn.prisoner?capturePrisonTopology(world):undefined;
    for (const bed of world.structures) {
      if(bed.kind==='double-bed'||!allows(bed))continue;
      if (!isBedKind(bed.kind) || bed.medical || !!bed.prisoner!==!!pawn.prisoner || pawn.prisoner&&(!prisonBedValid(world,bed,topology)||!prisonerAllowedCell(world,pawn,bed,topology)) || world.pawns.some(p=>p.rescue?.bedId===bed.id) || deconstructionReserved(world,bed.id,pawn.id) || reserved.has(bed.id) || services.has(bed.z*world.width+bed.x) || (owners.has(bed.id) && owners.get(bed.id) !== pawn.id)) continue;
      const path = routeToCell(world, bed, reach);
      const rank = pawn.bedId === bed.id?0:2;
      if(path){const cost=routeCost(world,path,reach);if(!best||rank<best.rank||rank===best.rank&&(cost<best.cost||cost===best.cost&&bed.id<best.id))best={id:bed.id,path,target:{x:bed.x,z:bed.z},rank,cost};}
    }
    if (!context.release()) return true;
    if (best) {
      pawn.bedId = best.id;
      if(best.slot!==undefined)pawn.bedSlot=best.slot;else delete pawn.bedSlot;
      pawn.need = { kind: 'sleep', phase: 'travel', bedId: best.id, target: best.target };
      pawn.path = best.path; pawn.state = 'moving'; pawn.planCooldown = 0;
    } else {
      let target: Cell = { x: pawn.x, z: pawn.z }, path: Cell[] = [];
      const bedCells = new Set(world.structures.filter(item => isBedKind(item.kind)).flatMap(item => footprintCells(item).map(cell => cell.z * world.width + cell.x)));
      if (!allows(pawn)||bedCells.has(pawn.z * world.width + pawn.x)||world.schemaVersion>=22&&!canStandAt(world,pawn)) {
        const candidates = [ { x: pawn.x, z: pawn.z - 1 }, { x: pawn.x + 1, z: pawn.z }, { x: pawn.x, z: pawn.z + 1 }, { x: pawn.x - 1, z: pawn.z } ];
        const groundTopology=pawn.prisoner?capturePrisonTopology(world):undefined;
        const free = candidates.find(cell => allows(cell)&&prisonerAllowedCell(world,pawn,cell,groundTopology) && !bedCells.has(cell.z * world.width + cell.x) && canStandAt(world,cell) && !world.pawns.some(other => same(other, cell)) && routeToCell(world, cell, reach!) !== null);
        if (!free) { pawn.needCooldown = NEED_INTERVAL; return allows(pawn); }
        target = free; path = routeToCell(world, target, reach)!;
      }
      pawn.need = { kind: 'sleep', phase: path.length ? 'travel' : 'sleep', bedId: null, target };
      pawn.path = path; pawn.planCooldown = 0; pawn.state = path.length ? 'moving' : 'sleeping';
      context.event(`${pawn.name} dort au sol : aucun lit disponible et accessible.`);
    }
  }
  if (pawn.need?.kind === 'sleep') {
    const task = pawn.need;
    if (scheduleWakes(world, pawn) || (world.restRules === 'adult' && task.phase === 'travel' && pawn.hunger <= 0)) {
      // Passive emergency cargo is independent of sleep. A full floor must not
      // prevent waking or reset the bounded drop retry on every awake tick.
      if(pawn.interruptedCargo){finishRoomRest(world,pawn);pawn.need=null;pawn.state='idle';pawn.needCooldown=0;}
      else {if(!context.release())return true;pawn.needCooldown=0;pawn.planCooldown=0;}
      return false;
    }
    const bed = task.bedId === null ? null : world.structures.find(item => item.id === task.bedId && isBedKind(item.kind));
    const slot=bed?pawnBedSlot(pawn,bed):undefined;
    const head=bed&&slot!==undefined?bedSlotCell(bed,slot):undefined;
    if (task.bedId !== null && (!bed || pawn.bedId !== bed.id || !head || !same(head, task.target)||bed.kind==='double-bed'&&(bedAssignmentReason(world,bed,pawn,slot!)!==undefined||bedSlotClaimed(world,bed,slot!,pawn.id)))) { if (!context.release()) return true; return true; }
    if (!same(pawn, task.target)) { context.move(task.target, true); return true; }
    if(bed?.kind==='double-bed'&&(pawn.moveCooldown>0||pawn.motion&&pawn.motion.end>world.tick))return true;
    if (task.phase === 'travel') context.event(`${pawn.name} s’allonge ${bed ? 'dans son lit' : 'au sol'}.`);
    task.phase = 'sleep'; pawn.path = []; pawn.state = 'sleeping'; pawn.collapsePending = false; pawn.restZeroTicks = 0;
    advanceRoomRest(world,pawn);
    pawn.rest = Math.min(100, pawn.rest + (bed ? BED_REST_PER_TICK * (bed.kind==='hospital-bed'||bed.kind==='double-bed'?bedRestEffectiveness(bed):BUILDING_MATERIALS[bed.material??'wood'].restFactor) : GROUND_REST_PER_TICK));
    if (pawn.rest >= 100) { finishRoomRest(world,pawn);pawn.need = null; pawn.state = 'idle'; pawn.planCooldown = 0; pawn.needCooldown = 0; }
    return true;
  }
  return false;
}
