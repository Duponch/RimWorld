import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Specific creation-only composition boundary for750/950. It does not
 * certify a save, clone a World or authorize a played campaign transaction.
 * Every affected cell/source still has its own real-owner preflight. */
import type {World,Cell,Structure} from './types.ts';
import {carrierOf} from './rescue-state.ts';
import {animalCarrier} from './animal-rest-state.ts';
import {footprintCells} from './definitions.ts';
type Header256=Pick<World,'schemaVersion'|'seed'|'tick'|'width'|'height'|'site'|'planet'|'worldMaps'|'worldGroups'|'exploration'|'snow'|'geysers'>;
export function unpublishedAncientGeneration256(w:Header256,mapInitializing:boolean):boolean {
 return mapInitializing===true&&isSchema256Or257(w.schemaVersion)&&w.site?.revision===3&&w.planet?.revision===3&&w.seed===(w.site.mapSeed>>>0)&&Number.isSafeInteger(w.tick)&&w.tick>=0&&Number.isInteger(w.width)&&w.width>=8&&w.width<=400&&Number.isInteger(w.height)&&w.height>=8&&w.height<=400&&!('worldMaps'in w)&&!('worldGroups'in w)&&w.exploration===undefined&&w.snow===undefined&&w.geysers===undefined;
}
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const occupies=(a:Cell&{motion?:{end:number;from:Cell}|null},c:Cell,tick:number)=>same(a,c)||!!a.motion&&a.motion.end>tick&&same(a.motion.from,c);
/** Unsupported physical wipe is a named refusal, never removal of the
 * selected owner or a favourable retry. Called only for cells ACTUALLY changed. */
export function ancientGenerationCellConflict256(w:World,cell:number):string|undefined {
 const c={x:cell%w.width,z:Math.floor(cell/w.width)};
 if(w.pawns.some(p=>!carrierOf(w,p.id)&&!(p.state==='dead'&&(p.body?.pileId!==undefined||p.body?.lostAt!==undefined))&&occupies(p,c,w.tick)))return 'actual local human/held-edge owner';
 if(w.wildlife?.animals.some(a=>!animalCarrier(w,a.id)&&occupies(a,c,w.tick)))return 'actual local animal/held-edge owner';
 if(w.mechanoids?.some(m=>occupies(m,c,w.tick)))return 'actual local mechanoid owner';
 if(w.resources.some(r=>same(r,c)))return 'actual resource owner requires a real wipe';
 if(w.piles.some(p=>p.owner.type==='ground'&&same(p.owner,c)))return 'actual ground item owner requires a real move/wipe';
 if(w.packed.some(p=>p.owner.type==='ground'&&same(p.owner,c)))return 'actual minified owner requires a real move/wipe';
 if(w.jobs.some(j=>footprintCells(j).some(p=>same(p,c))))return 'actual job/reservation footprint';
 const arrival=w.startingArrival;if(arrival&&arrival.phase!=='opened'&&arrival.pods.some(p=>same(p.cell,c)))return 'actual starting capsule owner';
 if(w.wildlife?.flyers?.some(f=>same(f.cell,c)))return 'actual suspended flyer owner';
 if(w.fires?.items.some(f=>same(f,c)))return 'actual fire owner requires its true destruction transaction';
 return;
}
type RemovalMap256=Pick<World,'pawns'|'jobs'|'piles'|'packed'|'wildlife'|'mechanoids'|'fires'>;
/** Vanish of ONE existing prop does not edit terrain/roof or move occupants.
 * Unrelated capsule/cargo/AI/job owners are left intact. Real target references
 * or a fire on its footprint require their terminal cleanup and refuse here. */
export function ancientGenerationRemovalConflict256(w:RemovalMap256,s:Structure):string|undefined {
 const id=s.id,cells=footprintCells(s);
 if(w.jobs.some(j=>j.id===id||j.furniture?.structureId===id||j.deconstruction?.structureId===id||j.repair?.structureId===id||j.flick?.structureId===id||j.fixBreakdown?.structureId===id))return 'actual job/reservation targets this prop';
 if(w.piles.some(p=>p.id===id)||w.packed.some(p=>p.building.id===id))return 'actual prop identity has another physical owner';
 if(w.pawns.some(p=>p.haul?.whole&&p.haul.sourcePileId===id||p.melee?.order?.structure&&p.melee.order.targetId===id||p.melee?.strike?.structure&&p.melee.strike.targetId===id))return 'actual human cargo/combat references this prop';
 if(w.mechanoids?.some(p=>p.melee?.order?.structure&&p.melee.order.targetId===id||p.melee?.strike?.structure&&p.melee.strike.targetId===id))return 'actual mechanoid combat references this prop';
 if(w.wildlife?.animals.some(a=>a.strike?.structure&&a.strike.targetId===id||a.hiveJob?.kind==='attack'&&a.hiveJob.structure&&a.hiveJob.targetId===id))return 'actual animal combat references this prop';
 if(w.fires?.items.some(f=>cells.some(c=>same(c,f))))return 'actual fire owner on this prop';
 return;
}
