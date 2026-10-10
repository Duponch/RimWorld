import type { World } from '../sim/types';

/** Only the private MAIN renderer supplies this reader. This interface is a
 * dependency injection port, not a capability inferred from a World or flag.
 * The default exported PresentationQueue continues its literal RAW read. */
export interface ClosedMainMapIntentReader {
  read(world:World):string;
  clear():void;
}

type Primitive = number|string|null;

// Keep this projection literal and ordered. It is called on a real primitive
// change or conservative fallback, never on stable eligible MAIN captures.
function historicalSignature(world:World):string {
  return JSON.stringify([
    world.jobs.map(j=>[j.id,j.kind,j.x,j.z,j.orientation,j.footprint,j.construction]),
    world.growingZones.map(zone=>[zone.id,zone.cells,zone.plant]),
    world.stockpiles.map(cell=>[cell.id,cell.zoneId,cell.x,cell.z]),world.home,world.roofing?.build,world.roofing?.remove,
    world.piles.filter(p=>p.kind==='chunk'&&p.haulRequested).map(p=>[p.id,p.owner]),
  ]);
}

/** Reusable primitive observations of precisely the V304 intent projection.
 * No World, collection or owner is retained. The closed MAIN construction
 * proves data-only records; shape tests here are conservative admission,
 * never discovery of such a mandate on a public RAW/getter/Proxy graph. */
class MainMapIntentReader implements ClosedMainMapIntentReader {
  private committed:Primitive[]=[];
  private scratch:Primitive[]=[];
  private committedLength=0;
  private cursor=0;
  private differs=false;
  private ready=false;
  private signature:string|undefined;

  clear():void {
    this.ready=false;
    this.signature=undefined;
    this.committedLength=0;
    this.cursor=0;
    this.differs=false;
    // Retain storage capacity, but never retain a World or object value.
  }

  private put(value:Primitive):void {
    const index=this.cursor++;
    this.scratch[index]=value;
    // JSON normalizes both signs of zero. Numbers admitted below are finite.
    if(value!==this.committed[index])this.differs=true;
  }
  private number(value:unknown):boolean {
    if(typeof value!=='number'||!Number.isFinite(value))return false;
    this.put(value===0?0:value);return true;
  }
  private string(value:unknown):boolean {
    if(typeof value!=='string')return false;
    this.put(value);return true;
  }
  private optionalNumber(value:unknown):boolean {
    if(value===undefined){this.put(null);return true;}
    return this.number(value);
  }
  private optionalString(value:unknown):boolean {
    if(value===undefined){this.put(null);return true;}
    return this.string(value);
  }
  private cells(cells:unknown,optional:boolean):boolean {
    if(cells===undefined&&optional){this.put(-1);return true;}
    if(!Array.isArray(cells))return false;
    this.put(cells.length);
    for(let i=0;i<cells.length;i++)if(!this.number(cells[i]))return false;
    return true;
  }

  private capture(world:World):boolean {
    if(!Array.isArray(world.jobs))return false;
    this.put(world.jobs.length);
    for(let i=0;i<world.jobs.length;i++){
      const job=world.jobs[i];
      if(!job||typeof job!=='object'
        ||!this.number(job.id)||!this.string(job.kind)||!this.number(job.x)||!this.number(job.z)
        ||!this.number(job.orientation)||!this.string(job.footprint)||!this.optionalString(job.construction))return false;
    }
    if(!Array.isArray(world.growingZones))return false;
    this.put(world.growingZones.length);
    for(let i=0;i<world.growingZones.length;i++){
      const zone=world.growingZones[i];
      if(!zone||typeof zone!=='object'||!this.number(zone.id)||!this.cells(zone.cells,false)||!this.string(zone.plant))return false;
    }
    if(!Array.isArray(world.stockpiles))return false;
    this.put(world.stockpiles.length);
    for(let i=0;i<world.stockpiles.length;i++){
      const cell=world.stockpiles[i];
      if(!cell||typeof cell!=='object'||!this.number(cell.id)||!this.optionalNumber(cell.zoneId)
        ||!this.number(cell.x)||!this.number(cell.z))return false;
    }
    if(!this.cells(world.home,true)||!this.cells(world.roofing?.build,true)||!this.cells(world.roofing?.remove,true))return false;
    if(!Array.isArray(world.piles))return false;
    // A count prefix disambiguates every group. Reserve this slot until the
    // historical filter has read the piles once, rather than scanning twice.
    const countIndex=this.cursor++;
    let count=0;
    for(let i=0;i<world.piles.length;i++){
      const pile=world.piles[i];
      if(!pile||typeof pile!=='object'||typeof pile.kind!=='string')return false;
      if(pile.kind!=='chunk')continue;
      if(pile.haulRequested!==undefined&&pile.haulRequested!==true)return false;
      if(!pile.haulRequested)continue;
      if(!this.number(pile.id))return false;
      if(!pile.owner||typeof pile.owner!=='object'||Array.isArray(pile.owner))return false;
      // Preserve owner property ordering and the exact small JSON. Owner
      // equality cannot be inferred just from type and x/z/ID membership.
      const owner=JSON.stringify(pile.owner);
      if(typeof owner!=='string')return false;
      this.put(owner);count++;
    }
    this.scratch[countIndex]=count;
    if(count!==this.committed[countIndex])this.differs=true;
    return true;
  }

  read(world:World):string {
    this.cursor=0;this.differs=false;
    const eligible=this.capture(world);
    if(eligible&&this.ready&&!this.differs&&this.cursor===this.committedLength)return this.signature!;
    // Commit only after the complete historical stringify succeeds. A throw
    // leaves the previous facts/signature intact; partial scratch is private.
    const signature=historicalSignature(world);
    if(eligible){
      const previous=this.committed;this.committed=this.scratch;this.scratch=previous;
      this.committedLength=this.cursor;this.ready=true;
    }else this.ready=false;
    this.signature=signature;
    return signature;
  }
}

/** ROOT wires this exclusively inside the unexported MainColonyRenderer.
 * Calling this function does not certify an arbitrary World as immutable. */
export function createClosedMainMapIntentReader():ClosedMainMapIntentReader {
  return new MainMapIntentReader();
}
