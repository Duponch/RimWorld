import {isArtMaterial,isArtRecipe} from './art-rules.ts';
import {isFurnitureQuality} from './furniture-stats.ts';
import type {World} from './types.ts';

/** Attribution is factual provenance, not a generated Core narrative. */
export function validateArtObjects(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const s of [...world.structures,...(world.packed??[]).map(p=>p.building)]) {
    if(!isArtRecipe(s.kind)){if(s.art!==undefined)errors.push('Art provenance on a non-sculpture.');continue;}
    const a=s.art;
    if(version<104||!isArtMaterial(s.material)||!isFurnitureQuality(s.quality)||s.orientation!==0||s.footprint!=='standard'
      ||!a||Object.keys(a).some(k=>!['authorId','createdAt'].includes(k))||!Number.isSafeInteger(a.authorId)
      ||!world.pawns.some(p=>p.id===a.authorId)||!Number.isSafeInteger(a.createdAt)||a.createdAt<0||a.createdAt>world.tick)
      errors.push('Invalid sculpture provenance, material or quality.');
  }
  for(const job of world.jobs)if((job as unknown as {art?:unknown}).art!==undefined)errors.push('Art provenance on a job.');
  return errors;
}
