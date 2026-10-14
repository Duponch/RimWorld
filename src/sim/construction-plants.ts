import {STRUCTURE_DEFINITIONS} from './definitions.ts';
import type {PlantSpecies} from './biome-flora.ts';
import type {Job,JobKind,Resource,StructureKind,World} from './types.ts';

/** Resolved Core1.6.4871 harvestWork metadata, not the clone's timed cut work.
 * In particular Grass40Core cannot be inferred from clearingDuration60local. */
const FLORA_WORK:Readonly<Record<PlantSpecies,number>>=Object.freeze({
  grass:40,'tall-grass':60,brambles:60,moss:60,'berry-bush':250,
  oak:1400,poplar:800,pine:710,birch:800,agave:300,saguaro:210,drago:660,'healroot-wild':400,
});
const LEGACY_WORK:Readonly<Record<string,number>>=Object.freeze({
  tree:800,berries:250,rice:200,potato:200,corn:200,cotton:200,haygrass:200,healroot:400,
});
export const plantHarvestWorkCore=(resource:Pick<Resource,'kind'|'species'>):number=>
  resource.species===undefined?LEGACY_WORK[resource.kind]??Infinity:FLORA_WORK[resource.species]??Infinity;
export const isConstructionLightPlant=(resource:Pick<Resource,'kind'|'species'>):boolean=>
  resource.kind!=='rock'&&plantHarvestWorkCore(resource)<=200;
/** Existing import retained; all eight current floors have fertility0. */
export const isFloorLightPlant=isConstructionLightPlant;
export function constructionPlantBlocks(job:Job,resource:Resource):boolean {
  // Keep an accepted historical clearance's real elapsed work after migration.
  return job.clearance?.resourceId===resource.id||!isConstructionLightPlant(resource);
}

/** FINAL ENTITY policy only; not the generated Frame or its transition.
 * SpawningWipes also calls BlocksPlanting. Core's SupportsPlants exception is
 * independent of item occupancy, clearBuildingArea and the plant's weight.
 * Current ordinary clone structures derive from an edifice or positive fill;
 * these explicit no-wipe kinds have SupportsPlants or conduit fill0/non-edifice.
 * Validate this catalog before adding future structures. */
const KEEP_PLANTS:ReadonlySet<StructureKind>=new Set([
  'power-conduit','sleeping-spot','animal-sleeping-spot','crafting-spot','butcher-spot',
  'hydroponics-basin','flower-pot',
]);
export const constructionFinalWipesPlants=(kind:JobKind|StructureKind):boolean=>
  kind==='lay-floor'||kind in STRUCTURE_DEFINITIONS&&!KEEP_PLANTS.has(kind as StructureKind);

/** The generated Thing Frame has fill0.2 and no copied sowTag. Unlike the
 * final SupportsPlants entity, every physical Thing Frame blocks planting.
 * Terrain Frames have fill0 and categoryEthereal, and never wipe here. */
export const constructionFrameWipesPlants=(kind:JobKind|StructureKind):boolean=>kind in STRUCTURE_DEFINITIONS;

/** Existing strict fraction reused for a paid output refusal, not a new field.
 * An exact historical fraction may be finalized up to0.0001 local unit early. */
export const workOutputPending=(work:Pick<Job,'progress'|'workRemainder'>|undefined,duration:number):boolean=>
  Number.isSafeInteger(duration)&&duration>=1&&work?.progress===duration-1&&work.workRemainder===9999;
export const clearanceOutputPending=(job:Pick<Job,'clearance'>,duration:number):boolean=>
  workOutputPending(job.clearance,duration);

/** A reserved future order is not an executing plant claim. Queried only on
 * work admission, not per animation/render frame. The owner may replace its
 * own current work, while another actor must wait for the existing producer. */
export function plantExecutionReserved(world:World,resourceId:number,pawnId:number):boolean {
  const source=world.resources.find(r=>r.id===resourceId);
  if(!source)return false;
  return world.jobs.some(j=>{
    if(j.status!=='active'||j.reservedBy===null||j.reservedBy===pawnId)return false;
    const id=j.clearance?.resourceId??(j.tree?.kind==='extract'?j.tree.resourceId:undefined)??j.plantTarget?.resourceId;
    const matches=id===resourceId||id===undefined&&j.flowerPotId===undefined&&['cut','chop','harvest'].includes(j.kind)&&j.x===source.x&&j.z===source.z;
    return matches&&world.pawns.some(p=>p.id===j.reservedBy&&p.jobId===j.id);
  });
}
