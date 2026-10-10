import { footprintCells } from '../sim/definitions';
import type { Cell, World } from '../sim/types';
import { stockpileZoneCells } from '../sim/stockpile-zones';

/** Terrain and constructed floors are readouts, never selection targets. */
export type MapObjectSelection = { kind:'packed'|'pile'|'structure'|'resource'|'rock'|'job'|'growing'|'stockpile'; id:number };

export function mapObjectsAt(world:World,cell:Cell):MapObjectSelection[] {
  const same=(other:Cell)=>other.x===cell.x&&other.z===cell.z;
  const inFootprint=(object:World['structures'][number]|World['jobs'][number])=>footprintCells(object).some(same);
  return [
    ...world.packed.filter(p=>p.owner.type==='ground'&&same(p.owner)).map(p=>({kind:'packed' as const,id:p.building.id})),
    ...world.piles.filter(p=>p.owner.type==='ground'&&same(p.owner)).map(p=>({kind:'pile' as const,id:p.id})),
    ...world.structures.filter(inFootprint).sort((a,b)=>Number(a.kind==='power-conduit')-Number(b.kind==='power-conduit')).map(s=>({kind:'structure' as const,id:s.id})),
    ...world.resources.filter(same).map(r=>({kind:'resource' as const,id:r.id})),
    ...(world.tiles[cell.z*world.width+cell.x]?.terrain==='rock'?[{kind:'rock' as const,id:cell.z*world.width+cell.x}]:[]),
    ...world.jobs.filter(inFootprint).map(j=>({kind:'job' as const,id:j.id})),
    ...world.growingZones.filter(z=>z.cells.includes(cell.z*world.width+cell.x)).map(z=>({kind:'growing' as const,id:z.id})),
    ...world.stockpiles.filter(same).map(s=>({kind:'stockpile' as const,id:s.id})),
  ];
}

export function mapObjectCells(world:World,selected:MapObjectSelection):Cell[] {
  switch(selected.kind) {
    case 'packed': {const packed=world.packed.find(p=>p.building.id===selected.id);return packed?.owner.type==='ground'?[packed.owner]:[];}
    case 'pile': {const pile=world.piles.find(p=>p.id===selected.id);return pile?.owner.type==='ground'?[pile.owner]:[];}
    case 'structure': {const structure=world.structures.find(s=>s.id===selected.id);return structure?footprintCells(structure):[];}
    case 'resource': {const resource=world.resources.find(r=>r.id===selected.id);return resource?[resource]:[];}
    case 'rock': {const tile=world.tiles[selected.id];return tile?.terrain==='rock'?[{x:selected.id%world.width,z:Math.floor(selected.id/world.width)}]:[];}
    case 'job': {const job=world.jobs.find(j=>j.id===selected.id);return job?footprintCells(job):[];}
    case 'growing': {const zone=world.growingZones.find(z=>z.id===selected.id);return zone?.cells.map(i=>({x:i%world.width,z:Math.floor(i/world.width)}))??[];}
    case 'stockpile': return stockpileZoneCells(world,selected.id);
  }
}

export function mapObjectExists(world:World,selected:MapObjectSelection):boolean {
  switch(selected.kind){
    case 'packed':return world.packed.some(p=>p.building.id===selected.id&&p.owner.type==='ground');
    case 'pile':return world.piles.some(p=>p.id===selected.id&&p.owner.type==='ground');
    case 'structure':return world.structures.some(s=>s.id===selected.id);
    case 'resource':return world.resources.some(r=>r.id===selected.id);
    case 'rock':return world.tiles[selected.id]?.terrain==='rock';
    case 'job':return world.jobs.some(j=>j.id===selected.id);
    case 'growing':return world.growingZones.some(z=>z.id===selected.id&&z.cells.length>0);
    case 'stockpile':return world.stockpiles.some(s=>s.id===selected.id);
  }
}

export function sameMapObject(a:MapObjectSelection|undefined,b:MapObjectSelection|undefined):boolean {
  return !!a&&!!b&&a.kind===b.kind&&a.id===b.id;
}

export function nextMapObject(world:World,cell:Cell,current:MapObjectSelection|undefined):MapObjectSelection|undefined {
  const objects=mapObjectsAt(world,cell);
  if(!objects.length)return undefined;
  const index=objects.findIndex(object=>sameMapObject(object,current));
  return objects[(index+1)%objects.length];
}
