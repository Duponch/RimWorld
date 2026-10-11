import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { reservedSource } from '../../src/sim/materials.ts';

export const SMELTING_AULNES_SOURCE='public/test-saves/v284/les-aulnes-integrees.json';
export const SMELTING_AULNES_SHA='6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1';
const BUILT_CHECKPOINT_SHA='4de7f87d257d9a66c19fd3b71eaaa8211c3a7451e379a62aa4e0d88d6f4a4fd2';
const WORK_CHECKPOINT_SHA='9904e4183e57e9d24a50945cd7e161d496f01ac7d7073b0c42415628ae2902ef';

/** An unchanged historical village migrated by the ordinary save reader.
 * No job, cargo, clock, RNG, actor or material is prepared for this journey. */
export async function smeltingAulnes(){
  const stored=await readFile(new URL('../../public/test-saves/v284/les-aulnes-integrees.json',import.meta.url),'utf8');
  const sourceSha=createHash('sha256').update(stored).digest('hex');
  if(sourceSha!==SMELTING_AULNES_SHA)throw Error('The historical Aulnes payload changed.');
  const world=deserializeWorld(await decodeStoredSave(stored)),errors=validateWorld(world);
  if(errors.length)throw Error(`Aulnes baseline is invalid: ${errors.join('; ')}`);
  if(world.tick!==8434||world.width!==250||world.height!==250||world.pawns.length!==15)throw Error('Unexpected integrated village baseline.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Aulnes baseline does not roundtrip exactly.');
  const weaponId=22499,witnessIds=[22498,25898] as const;
  for(const id of [weaponId,...witnessIds]){
    const pile=world.piles.find(p=>p.id===id);
    if(!pile||pile.kind!=='weapon'||pile.owner.type!=='ground'||pile.quantity!==1||pile.weapon?.quality!=='normal'||pile.weapon.hitPoints!==100||pile.weapon.forbidden||reservedSource(world,id))throw Error(`Historical ground weapon ${id} is unavailable.`);
  }
  const available=(item:'steel'|'component')=>world.piles.filter(p=>p.item===item&&p.owner.type==='ground').reduce((n,p)=>n+Math.max(0,p.quantity-reservedSource(world,p.id)),0);
  if(available('steel')<170||available('component')<2)throw Error('Existing unreserved construction materials do not cover the smelter; no extra dotation is permitted by this fixture.');
  const scanner=world.structures.find(s=>s.kind==='ground-scanner'&&s.x===112&&s.z===166);
  if(!scanner?.power?.on)throw Error('The historical 700 W scanner is not powered.');
  const builderId=20343,assistantBuilderId=19869,crafterId=20325;
  if(![builderId,assistantBuilderId].every(id=>world.pawns.some(p=>p.id===id&&p.skills.construction.level>=4))||!world.pawns.some(p=>p.id===crafterId))throw Error('Historical industrial actors are missing.');
  return {world,source:SMELTING_AULNES_SOURCE,sourceSha,declaredDotation:[],weaponId,witnessIds,builderId,assistantBuilderId,crafterId,scannerId:scanner.id,
    station:{x:125,z:175},storage:{x:125,z:177},reuse:{x:125,z:178},available:{steel:available('steel'),component:available('component')}};
}

/** Read only the exact built checkpoint acquired before the native UI failure.
 * The hash identifies that evidence; no clock, need, stock or task is prepared. */
export async function smeltingBuildResume(file:string|undefined,fixture:Awaited<ReturnType<typeof smeltingAulnes>>){
  if(!file)return undefined;
  const path=resolve(file),bytes=await readFile(path),sha=createHash('sha256').update(bytes).digest('hex');
  if(sha!==BUILT_CHECKPOINT_SHA)throw Error('Smelting resume must be the immutable native-builders built checkpoint.');
  const world=deserializeWorld(await decodeStoredSave(bytes.toString('utf8'))),errors=validateWorld(world);
  if(errors.length)throw Error(`Built Aulnes checkpoint is invalid: ${errors.join('; ')}`);
  if(world.tick!==14160||world.seed!==fixture.world.seed||world.width!==250||world.height!==250
    ||JSON.stringify(world.pawns.map(p=>p.id))!==JSON.stringify(fixture.world.pawns.map(p=>p.id)))throw Error('Unexpected built Aulnes checkpoint identity.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Built Aulnes checkpoint does not roundtrip exactly.');
  const station=world.structures.find(s=>s.id===32066&&s.kind==='electric-smelter'&&s.x===fixture.station.x&&s.z===fixture.station.z);
  if(!station?.power?.on||station.bills?.length!==0||world.jobs.some(j=>j.kind==='electric-smelter'))throw Error('Built checkpoint does not retain the powered, unused original smelter.');
  for(const id of [fixture.weaponId,...fixture.witnessIds]){
    if(!isDeepStrictEqual(world.piles.find(p=>p.id===id),fixture.world.piles.find(p=>p.id===id)))throw Error(`Built checkpoint changed historical weapon ${id}.`);
  }
  return {world,stationId:station.id,provenance:{mode:'continuation-of-acquired-native-construction',path,sha,tick:world.tick,stationId:station.id,
    constructionAcquiredInRed:{artifactDirectory:'tmp/smelting-v311/native-builders',sourceFreeze:'freeze-4Vv73L',completedGateTick:14144,exactSaveReloadTick:14160,steelDelivered:170,componentsDelivered:2}}};
}

/** Continue the original placed weapon and counter, with no prepared work. */
export async function smeltingWorkResume(file:string|undefined,fixture:Awaited<ReturnType<typeof smeltingAulnes>>){
  if(!file)return undefined;
  const path=resolve(file),bytes=await readFile(path),sha=createHash('sha256').update(bytes).digest('hex');
  if(sha!==WORK_CHECKPOINT_SHA)throw Error('Smelting work resume must be the immutable native-bill-red staged checkpoint.');
  const world=deserializeWorld(await decodeStoredSave(bytes.toString('utf8'))),errors=validateWorld(world);
  if(errors.length)throw Error(`Staged Aulnes checkpoint is invalid: ${errors.join('; ')}`);
  if(world.tick!==14432||world.seed!==fixture.world.seed||world.width!==250||world.height!==250
    ||!isDeepStrictEqual(world.pawns.map(p=>p.id),fixture.world.pawns.map(p=>p.id)))throw Error('Unexpected staged Aulnes checkpoint identity.');
  if(serializeWorld(deserializeWorld(serializeWorld(world)))!==serializeWorld(world))throw Error('Staged Aulnes checkpoint does not roundtrip exactly.');
  const station=world.structures.find(s=>s.id===32066&&s.kind==='electric-smelter'&&s.x===fixture.station.x&&s.z===fixture.station.z),task=world.pawns.find(p=>p.id===fixture.crafterId)?.cooking;
  if(!station?.power?.on||station.bills?.length!==1||station.bills[0]?.id!==32074
    ||task?.stationId!==station.id||task.billId!==32074||task.recipe!=='smelt-weapon'||task.phase!=='work'||task.progress!==10000
    ||task.ingredients.length!==1||task.ingredients[0]?.pileId!==fixture.weaponId||task.ingredients[0].stage!=='placed')throw Error('Staged checkpoint lost its original station, bill, weapon or counter.');
  const weapon=world.piles.find(p=>p.id===fixture.weaponId),original=fixture.world.piles.find(p=>p.id===fixture.weaponId)!;
  if(!weapon||weapon.item!==original.item||weapon.quantity!==1||!isDeepStrictEqual(weapon.weapon,original.weapon)
    ||!isDeepStrictEqual(weapon.owner,{type:'ground',...task.ingredients[0].cell}))throw Error('Staged weapon identity, metadata or physical owner changed.');
  for(const id of fixture.witnessIds)if(!isDeepStrictEqual(world.piles.find(p=>p.id===id),fixture.world.piles.find(p=>p.id===id)))throw Error(`Staged checkpoint changed historical witness ${id}.`);
  return {world,stationId:station.id,billId:task.billId,provenance:{mode:'continuation-of-acquired-native-staged-work',path,sha,tick:world.tick,stationId:station.id,billId:task.billId,
    constructionAcquiredInRed:{artifactDirectory:'tmp/smelting-v311/native-builders',sourceFreeze:'freeze-4Vv73L',completedGateTick:14144,exactSaveReloadTick:14160,steelDelivered:170,componentsDelivered:2},
    filtersCargoStageAcquiredInRed:{artifactDirectory:'tmp/smelting-v311/native-bill-red',sourceFreeze:'freeze-im3HwA',hpAndQualityRefusals:true,exactCarrySaveReloadTick:14322,exactPlacedWorkSaveReloadTick:14432,progress:10000}}};
}
