import { clearingDuration } from '../sim/gathering';
import { floraDefinition } from '../sim/biome-flora';
import { choppable } from '../sim/plants';
import { workProgress } from '../sim/work-progress';
import { researchProjects } from './research-panel';
import type { Pawn, World } from '../sim/types';

/** Reports confirmed phases only. Open-ended research and scanning have no
 * invented completion timer; clearing uses its own persisted work counter. */
export function specificWorkActivity(world: World, pawn: Pawn): string | undefined {
  if (pawn.research) {
    const project = researchProjects.find(item => item.id === world.research?.project);
    return pawn.state === 'working'
      ? `Recherche · ${project?.title ?? 'au bureau'}`
      : 'Rejoint son bureau de recherche';
  }
  if (pawn.deepWork) {
    const activity = pawn.deepWork.kind === 'drill' ? 'Forage profond' : 'Recherche de gisements souterrains';
    return pawn.state === 'working' ? activity : `Rejoint son installation · ${activity.toLocaleLowerCase('fr')}`;
  }
  const group=world.group;
  if(group&&'memberIds' in group&&group.memberIds.includes(pawn.id))return group.phase==='gathering'
    ? 'Caravane · rejoint le point de rassemblement' : group.phase==='loading'
      ? 'Caravane · charge les provisions et marchandises' : group.phase==='leaving'
        ? 'Caravane · rejoint la bordure de la carte' : 'Caravane · décharge ses possessions';
  const scout=world.scout;
  if(scout&&'pawnId' in scout&&scout.pawnId===pawn.id)return scout.phase==='loading'
    ? 'Reconnaissance · charge ses provisions' : 'Reconnaissance · rejoint la bordure de la carte';
  const trip=world.commercialTrip;
  if(trip&&'pawnId' in trip&&trip.pawnId===pawn.id)return trip.phase==='loading'
    ? 'Commerce · charge les provisions et marchandises' : trip.phase==='leaving'
      ? 'Commerce · rejoint la bordure de la carte' : 'Commerce · décharge ses possessions';
  if (pawn.jobId === null) return undefined;
  const job = world.jobs.find(item => item.id === pawn.jobId);
  if (!job?.clearance || job.reservedBy !== pawn.id || job.status !== 'active') return undefined;
  const resource = world.resources.find(item => item.id === job.clearance!.resourceId);
  if (!resource) return undefined;
  const label = floraDefinition(resource)?.label ?? (resource.kind === 'tree' ? 'arbre' : 'plante');
  if (pawn.state === 'moving') return `Rejoint ${label.toLocaleLowerCase('fr')} pour dégager le chantier`;
  if (pawn.state !== 'working') return undefined;
  const percentage = Math.min(99, Math.floor(100 * workProgress(job.clearance) / clearingDuration(resource)));
  return `Dégagement · ${resource.kind === 'tree' && choppable(world, resource) ? 'abattage' : 'coupe'} de ${label.toLocaleLowerCase('fr')} (${percentage} %)`;
}
