import { apparelFamily, isApparelItem } from '../sim/apparel-rules';
import { footprintCells, STRUCTURE_DEFINITIONS } from '../sim/definitions';
import type { Cell, Job, MaterialPile, Resource, World } from '../sim/types';
import { mapObjectCells, sameMapObject, type MapObjectSelection } from './map-object-selection';

/** Installed Core 1.6 Selector.MaxNumSelected, not a world-distance radius. */
export const MAX_MAP_OBJECT_SELECTION = 200;

interface Identity { definition:string; faction:'colony'|null }
interface Candidate { selected:MapObjectSelection; identity:Identity; cells:Cell[] }
const playerDefinition=(definition:string):Identity=>({definition,faction:'colony'});
const naturalDefinition=(definition:string):Identity=>({definition,faction:null});
const sameIdentity=(a:Identity,b:Identity)=>a.definition===b.definition&&a.faction===b.faction;
const cellOf=(cell:Cell):Cell=>({x:cell.x,z:cell.z});

function pileIdentity(pile:MaterialPile):Identity {
  // Stuff is encoded in textile ItemIds locally, but is not part of Core's
  // ThingDef equality. Different raw leathers/blocks/chunks retain their defs.
  const family=isApparelItem(pile.item)?apparelFamily(pile.item):undefined;
  return naturalDefinition(family?`apparel:${family}`:`item:${pile.item}`);
}
function resourceIdentity(resource:Resource):Identity {
  // Untyped historical plants and rocks are not assigned invented species.
  return naturalDefinition(resource.kind==='rock'
    ? `loose-rock:${resource.stone??'legacy'}`
    : `plant:${resource.species??`legacy-${resource.kind}`}`);
}
function jobIdentity(job:Job):Identity {
  if(Object.hasOwn(STRUCTURE_DEFINITIONS,job.kind)) {
    return playerDefinition(`construction:${job.construction??'blueprint'}:${job.kind}`);
  }
  if(job.kind==='install')return playerDefinition(`installation:${job.furniture?.kind??'legacy'}`);
  if(job.kind==='lay-floor')return playerDefinition(`floor-construction:${job.construction??'blueprint'}:${job.floor??'legacy'}`);
  // These are map-order targets in Elsewhere, not selectable Core Things.
  return playerDefinition(`order:${job.kind}`);
}

function targetIdentity(world:World,target:MapObjectSelection):Identity|undefined {
  switch(target.kind) {
    case 'structure': {const object=world.structures.find(s=>s.id===target.id);return object?playerDefinition(`building:${object.kind}`):undefined;}
    case 'packed': {const object=world.packed.find(p=>p.building.id===target.id&&p.owner.type==='ground');return object?playerDefinition(`building:${object.building.kind}`):undefined;}
    case 'pile': {const object=world.piles.find(p=>p.id===target.id&&p.owner.type==='ground');return object?pileIdentity(object):undefined;}
    case 'resource': {const object=world.resources.find(r=>r.id===target.id);return object?resourceIdentity(object):undefined;}
    case 'rock': {const tile=world.tiles[target.id];return tile?.terrain==='rock'?naturalDefinition(`mineable:${tile.ore??tile.stone??'legacy'}`):undefined;}
    case 'job': {const object=world.jobs.find(j=>j.id===target.id);return object?jobIdentity(object):undefined;}
    // Zones keep their own editing and selection pipeline.
    case 'growing': case 'stockpile': return undefined;
  }
}

/**
 * Same physical ThingDef/faction on the current screen, up to Core's 200 cap.
 * The renderer supplies its camera/viewport test; there is no circular radius.
 * Installed and ground-minified furniture share their inner definition. Stuff,
 * quality, damage, rotation and stack size do not discriminate the group.
 * Trees, natural rocks, walls and map orders are deliberate user-requested
 * extensions of Core's neverMultiSelect exclusions.
 */
export function matchingMapObjects(world:World,target:MapObjectSelection,visibleCell:(cell:Cell)=>boolean):MapObjectSelection[] {
  const identity=targetIdentity(world,target);if(!identity)return [];
  const candidates:Candidate[]=[];
  const add=(selected:MapObjectSelection,value:Identity,cells:Cell[])=>{
    if(sameIdentity(identity,value))candidates.push({selected,identity:value,cells});
  };
  switch(target.kind) {
    case 'structure': case 'packed':
      for(const object of world.structures)add({kind:'structure',id:object.id},playerDefinition(`building:${object.kind}`),footprintCells(object));
      for(const object of world.packed)if(object.owner.type==='ground')add({kind:'packed',id:object.building.id},playerDefinition(`building:${object.building.kind}`),[cellOf(object.owner)]);
      break;
    case 'pile':
      for(const object of world.piles)if(object.owner.type==='ground')add({kind:'pile',id:object.id},pileIdentity(object),[cellOf(object.owner)]);
      break;
    case 'resource':
      for(const object of world.resources)add({kind:'resource',id:object.id},resourceIdentity(object),[cellOf(object)]);
      break;
    case 'rock':
      for(let id=0;id<world.tiles.length;id++) {
        const tile=world.tiles[id]!;
        if(tile.terrain==='rock')add({kind:'rock',id},naturalDefinition(`mineable:${tile.ore??tile.stone??'legacy'}`),[{x:id%world.width,z:Math.floor(id/world.width)}]);
      }
      break;
    case 'job':
      for(const object of world.jobs)add({kind:'job',id:object.id},jobIdentity(object),footprintCells(object));
      break;
  }
  const visible=candidates.flatMap(candidate=>{
    let firstCell=Infinity;
    for(const cell of candidate.cells)if(cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height&&visibleCell(cell)) {
      firstCell=Math.min(firstCell,cell.z*world.width+cell.x);
    }
    return Number.isFinite(firstCell)?[{selected:candidate.selected,firstCell}]:[];
  });
  // Core's first click already retained the clicked target. Preserve it even
  // when the on-screen population reaches the cap; then traverse z/x cells.
  if(!visible.some(candidate=>sameMapObject(candidate.selected,target)))return [];
  visible.sort((a,b)=>Number(sameMapObject(b.selected,target))-Number(sameMapObject(a.selected,target))||a.firstCell-b.firstCell);
  const result:MapObjectSelection[]=[],seen=new Set<string>();
  for(const candidate of visible) {
    const key=`${candidate.selected.kind}:${candidate.selected.id}`;
    if(seen.has(key))continue;
    seen.add(key);result.push(candidate.selected);
    if(result.length===MAX_MAP_OBJECT_SELECTION)break;
  }
  return result;
}

/** One adoption-local scan per requested family, avoiding N repeated finds. */
export function mapObjectGroupCells(world:World,selections:readonly MapObjectSelection[]):Cell[][] {
  const indexes=new Map<MapObjectSelection['kind'],Map<number,Cell[]>>();
  for(const selected of selections) {
    let index=indexes.get(selected.kind);if(!index)indexes.set(selected.kind,index=new Map());
    index.set(selected.id,[]);
  }
  const structures=indexes.get('structure');
  if(structures)for(const object of world.structures)if(structures.has(object.id))structures.set(object.id,footprintCells(object));
  const jobs=indexes.get('job');
  if(jobs)for(const object of world.jobs)if(jobs.has(object.id))jobs.set(object.id,footprintCells(object));
  const resources=indexes.get('resource');
  if(resources)for(const object of world.resources)if(resources.has(object.id))resources.set(object.id,[cellOf(object)]);
  const piles=indexes.get('pile');
  if(piles)for(const object of world.piles)if(piles.has(object.id)&&object.owner.type==='ground')piles.set(object.id,[cellOf(object.owner)]);
  const packed=indexes.get('packed');
  if(packed)for(const object of world.packed)if(packed.has(object.building.id)&&object.owner.type==='ground')packed.set(object.building.id,[cellOf(object.owner)]);
  const rocks=indexes.get('rock');
  if(rocks)for(const id of rocks.keys())if(world.tiles[id]?.terrain==='rock')rocks.set(id,[{x:id%world.width,z:Math.floor(id/world.width)}]);
  for(const selected of selections)if(selected.kind==='growing'||selected.kind==='stockpile')indexes.get(selected.kind)!.set(selected.id,mapObjectCells(world,selected));
  return selections.map(selected=>indexes.get(selected.kind)!.get(selected.id)!.map(cellOf));
}
