import { STRUCTURE_DEFINITIONS } from './definitions.ts';
import { validConstructionMaterial } from './construction-materials.ts';
import { deconstructionAvailable, deconstructionTarget } from './deconstruction-rules.ts';
import type { World } from './types.ts';

export function validateDeconstruction(world: World, version: number, shapesOnly=false): string[] {
  const errors: string[] = [], ledger = world.deconstructed;
  if (version < 24) {
    if (ledger !== undefined || world.jobs.some(j => j.deconstruction !== undefined)) errors.push('Legacy save contains deconstruction fields.');
    return errors;
  }
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)
    || ![ledger.count, ledger.lostWood, ledger.fuelTicks].every(n => Number.isSafeInteger(n) && n >= 0)
    || ledger.lostSteel!==undefined&&(version<30||!Number.isSafeInteger(ledger.lostSteel)||ledger.lostSteel<0)
    || Object.keys(ledger).some(k => !['count', 'lostWood', 'fuelTicks',...(version>=30?['lostSteel']:[])].includes(k))) errors.push('Invalid deconstruction ledger.');
  for (const j of world.jobs) {
    const d = j.deconstruction;
    if (j.kind !== 'deconstruct') { if (d !== undefined) errors.push('Unexpected deconstruction target.'); continue; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || !Number.isSafeInteger(d.structureId)
      || !Object.hasOwn(STRUCTURE_DEFINITIONS, d.kind) || !validConstructionMaterial(d.kind,d.material) || d.material!==undefined&&version<30 || Object.keys(d).some(k => !['structureId', 'kind',...(version>=30?['material']:[])].includes(k))) {
      errors.push('Invalid deconstruction target.'); continue;
    }
    const s = deconstructionTarget(world, j);
    if (!s || s.kind !== d.kind || s.material!==d.material || s.x !== j.x || s.z !== j.z || s.orientation !== j.orientation || s.footprint !== j.footprint
      || j.construction !== undefined || j.clearance !== undefined || j.growingZoneId !== undefined || j.escrow.wood || j.escrow.food) errors.push('Deconstruction does not match its building.');
    const pawn = world.pawns.find(p => p.jobId === j.id);
    if (j.progress > 0 && !pawn) errors.push('Interrupted deconstruction retained work.');
    if (!shapesOnly && j.reservedBy !== null && !deconstructionAvailable(world, j, j.reservedBy)) errors.push('Deconstruction conflicts with a building user.');
  }
  return errors;
}
