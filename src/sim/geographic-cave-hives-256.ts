/** Actual1120 join; same unpublished physical map and exact step stream.
 * The caller discards its private whole-map candidate on a blocked result. */
import type {prepareGeographicPhysicalMap256} from './geographic-map-physical-256.ts';
import {footprintCells} from './definitions.ts';
import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {caveHivePlacement256} from './cave-hive-placement-256.ts';
import {spawnActualHive256,type HiveSpawnContext256} from './cave-hive-spawn-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
export function populateGeographicCaveHives256(physical:ReturnType<typeof prepareGeographicPhysicalMap256>,context:HiveSpawnContext256&{allowCaveHives:boolean},random:WorldGenerationRandom):{status:'ready';hiveIds:number[];adjacentPermutation:number[];adjacentUses:number;nextLordId:number}|{status:'blocked';reason:string} {
 const w=physical.world,n=w.width*w.height,caves=physical.composition.caves,elevation=physical.composition.elevation;
 if(w.schemaVersion!==256||w.site?.revision!==3||w.planet?.revision!==3||w.site.tileId!==physical.description.tileId||w.seed!==(physical.description.mapSeed>>>0)||elevation.length!==n||caves.length!==n||w.jobs.length||w.exploration||w.snow||typeof context.allowCaveHives!=='boolean')throw Error('CaveHives requires its true unpublished1120 physical map');
 const faction=w.worldFactions?.factions.filter(f=>f.def==='Insect');if(!w.worldFactions||faction!.length>1)return {status:'blocked',reason:'Missing actual faction registry or duplicate Insect faction'};
 const factionCells=new Set<number>();for(const s of w.structures)if(s.factionId!==undefined&&s.factionId!==null)for(const cell of footprintCells(s))factionCells.add(cell.z*w.width+cell.x);
 // Actual Pawn owners always have a faction (legacy colonist/outlander
 // aliases included); plain wild animals do not. Retained off-map owners do
 // not occupy ThingsAt. No player/outpost is invented from the map label.
 for(const p of w.pawns)factionCells.add(p.z*w.width+p.x);
 for(const a of w.wildlife?.animals??[])if(a.domestic||a.hive)factionCells.add(a.z*w.width+a.x);
 for(const m of w.mechanoids??[])factionCells.add(m.z*w.width+m.x);
 let capture=captureActualLocalDistricts256(w);
 const placement=caveHivePlacement256({width:w.width,height:w.height,elevation,caves,allowCaveHives:context.allowCaveHives,insectFactionId:faction?.[0]?.id??null,hasFactionThing:i=>factionCells.has(i),available:i=>{
  if(!capture.standable(i))return false;const x=i%w.width,z=Math.floor(i/w.width);
  return !capture.edifice(i)&&!w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)&&!w.packed.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)&&!w.pawns.some(p=>p.x===x&&p.z===z)&&!w.wildlife?.animals.some(a=>a.x===x&&a.z===z)&&!w.mechanoids?.some(a=>a.x===x&&a.z===z);
 }},random),hiveIds:number[]=[];
 let next=placement.next();while(!next.done){const made=spawnActualHive256(w,next.value,random,context);if(made.status==='blocked')return made;hiveIds.push(made.hive.id);capture=captureActualLocalDistricts256(w);next=placement.next(next.value);}
 return {status:'ready',hiveIds,adjacentPermutation:[...context.adjacentPermutation],adjacentUses:context.adjacentUses,nextLordId:context.lordIds.nextId};
}
