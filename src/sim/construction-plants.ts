import { conduitKeepsPlant } from './power-construction.ts';
import type { Job, Resource } from './types.ts';

/** The four zero-product small plants correspond to Core's low harvest-work plants.
 * Other flora retains its existing clearance and yield contract. */
export const isFloorLightPlant=(resource:Resource):boolean=>resource.kind==='wild-plant'&&(resource.species==='grass'||resource.species==='tall-grass'||resource.species==='brambles'||resource.species==='moss');
export function constructionPlantBlocks(job:Job,resource:Resource):boolean {
  // A saved or already accepted clearance keeps its real work and duration.
  if(job.clearance?.resourceId===resource.id)return true;
  return !conduitKeepsPlant(job.kind,resource.kind)&&!(job.kind==='lay-floor'&&isFloorLightPlant(resource));
}