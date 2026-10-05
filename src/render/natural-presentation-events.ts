import {readSnapshotChanges,type SnapshotChanges} from '../bridge/snapshot-changes';
import {FLORA_DEFINITIONS} from '../sim/biome-flora';
import {plantLeafless} from '../sim/plant-life';
import {harvestable,isPlant,plantFertility,PLANT_DEFINITIONS} from '../sim/plants';
import {isRoofed,roofIndex} from '../sim/roof-rules';
import {climateTick,CLIMATE_DEFINITIONS,TICKS_PER_YEAR,type ClimateProfile} from '../sim/site-climate';
import {TICKS_PER_DAY,type Resource,type World} from '../sim/types';
import {floraSize,isResidentCrop} from './flora-presentation';

// An optimization boundary, never a save/domain restriction. Below this bound
// all civil additions/subtractions and the period endpoints are exact integers.
// Unsupported clocks retain the ordinary complete presentation queries.
const CLOCK_LIMIT=2**40;
const CERTIFICATION_TICKS=32;
type Clock={tick:number;civil:number;width:number;height:number;schema:number;
  gameProfilePresent:boolean;profile:ClimateProfile|undefined;
  adoptedAt:number|undefined;calendarOrigin:number|undefined;naturalBoundary:number;artificialBoundary:number};
type Inputs=Pick<Resource,'id'|'kind'|'species'|'x'|'z'|'growth'|'growthTick'|'growthLight'|'growthThermalFactor'>
  &{leaflessAt:number|undefined;fertility:number;roofed:boolean};
type Forecast={input:Inputs;plannedAt:number;deadline:number|undefined};
export type NaturalEventRead={readonly indices:readonly number[];readonly changes:SnapshotChanges};

function captureClock(world:World):Clock|undefined {
  const {tick,width,height,schemaVersion:schema,gameProfile,climate}=world;
  if(!Number.isSafeInteger(tick)||tick<0||tick>CLOCK_LIMIT-TICKS_PER_YEAR
    ||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)return;
  if(climate&&(!Object.hasOwn(CLIMATE_DEFINITIONS,climate.profile)
    ||climate.revision!==1||!Number.isSafeInteger(climate.adoptedAt)||climate.adoptedAt<0||climate.adoptedAt>tick
    ||!Number.isSafeInteger(climate.calendarOrigin)||climate.calendarOrigin<0||climate.calendarOrigin>CLOCK_LIMIT))return;
  const civil=climateTick(world);
  if(!Number.isSafeInteger(civil)||civil<0||civil>CLOCK_LIMIT-TICKS_PER_YEAR)return;
  const boundary=(period:number):number|undefined=>{
    const next=tick+period-civil%period,at=climateTick(world,next);
    if(!Number.isSafeInteger(next)||next<=tick||next>CLOCK_LIMIT
      ||at!==civil+(next-tick)||at%period!==0||climateTick(world,next-1)!==at-1)return;
    return next;
  };
  const naturalBoundary=boundary(climate?TICKS_PER_YEAR:TICKS_PER_DAY),artificialBoundary=boundary(TICKS_PER_DAY);
  if(naturalBoundary===undefined||artificialBoundary===undefined)return;
  // climateTick observes only the truthiness of GameProfile. Its cloned object
  // is never retained and a fresh packet object cannot invalidate this clock.
  return {tick,civil,width,height,schema,gameProfilePresent:!!gameProfile,profile:climate?.profile,
    adoptedAt:climate?.adoptedAt,calendarOrigin:climate?.calendarOrigin,naturalBoundary,artificialBoundary};
}
function sameContext(a:Clock,b:Clock):boolean {
  return a.width===b.width&&a.height===b.height&&a.schema===b.schema&&a.gameProfilePresent===b.gameProfilePresent
    &&a.profile===b.profile&&a.adoptedAt===b.adoptedAt&&a.calendarOrigin===b.calendarOrigin;
}
function roofCells(world:World):readonly number[]|undefined {
  const cells=world.roofing?.constructed;
  if(cells===undefined)return [];
  if(!Array.isArray(cells))return;
  let prior=-1;
  for(const cell of cells){
    if(!Number.isSafeInteger(cell)||cell<=prior||cell>=world.width*world.height)return;
    prior=cell;
  }
  return cells;
}
function captureInputs(world:World,r:Resource):Inputs|undefined {
  const base=r.growth??1,anchor=r.growthTick,factor=r.growthThermalFactor,leaflessAt=r.plantLife?.leaflessAt;
  if(!Number.isSafeInteger(r.x)||!Number.isSafeInteger(r.z)||r.x<0||r.z<0||r.x>=world.width||r.z>=world.height
    ||!Number.isFinite(base)||base<0||base>1
    ||anchor!==undefined&&(!Number.isSafeInteger(anchor)||anchor<0||anchor>world.tick)
    ||factor!==undefined&&(!Number.isFinite(factor)||factor<0||factor>1)
    ||leaflessAt!==undefined&&(!Number.isSafeInteger(leaflessAt)||leaflessAt<0||leaflessAt>world.tick)
    ||r.growthLight!==undefined&&r.growthLight!=='dark'&&r.growthLight!=='artificial-full')return;
  if(anchor!==undefined){const civil=climateTick(world,anchor);if(!Number.isSafeInteger(civil)||Math.abs(civil)>CLOCK_LIMIT)return;}
  const plant=isPlant(r),def=plant?(r.species?FLORA_DEFINITIONS[r.species]:PLANT_DEFINITIONS[r.kind as keyof typeof PLANT_DEFINITIONS]):undefined;
  if(plant&&(!def||!Number.isFinite(def.growDays)||def.growDays<=0
    ||!Number.isFinite(def.minFertility)||def.minFertility<0
    ||!Number.isFinite(def.sensitivity)||def.sensitivity<0||def.sensitivity>1))return;
  const fertility=plant?plantFertility(world,r):0;
  if(!Number.isFinite(fertility)||fertility<0)return;
  return {id:r.id,kind:r.kind,species:r.species,x:r.x,z:r.z,growth:r.growth,growthTick:anchor,
    growthLight:r.growthLight,growthThermalFactor:factor,leaflessAt,fertility,roofed:isRoofed(world,roofIndex(world,r))};
}
function sameInputs(a:Inputs,b:Inputs):boolean {
  return a.id===b.id&&a.kind===b.kind&&a.species===b.species&&a.x===b.x&&a.z===b.z
    &&Object.is(a.growth,b.growth)&&Object.is(a.growthTick,b.growthTick)&&a.growthLight===b.growthLight
    &&Object.is(a.growthThermalFactor,b.growthThermalFactor)&&Object.is(a.leaflessAt,b.leaflessAt)
    &&Object.is(a.fertility,b.fertility)&&a.roofed===b.roofed;
}
const tracked=(r:Resource):boolean=>r.plantLife?.leaflessAt!==undefined||isPlant(r)&&(r.growth??1)!==1;

/** Only the future tick in this local shadow is changed. No shadow, Resource,
 * tile, roof array or callback survives this synchronous planning read. */
function nextDeadline(world:World,probe:World,r:Resource,input:Inputs,clock:Clock):number|undefined {
  let next:number|undefined;
  if(plantLeafless(world,r)){
    const leaflessAt=input.leaflessAt!,expiry=leaflessAt+TICKS_PER_DAY;
    if(!Number.isSafeInteger(expiry)||expiry<=world.tick||expiry>CLOCK_LIMIT
      ||expiry-leaflessAt!==TICKS_PER_DAY||expiry-1-leaflessAt>=TICKS_PER_DAY)throw new Error('Unproved leaf deadline.');
    next=expiry;
  }
  const def=r.species?FLORA_DEFINITIONS[r.species]:PLANT_DEFINITIONS[r.kind as keyof typeof PLANT_DEFINITIONS];
  // These are constant-query proofs, not a second growth equation. In
  // particular a missing anchor follows the queried tick: I(t)-I(t) stays zero.
  const grows=isPlant(r)&&(input.growth??1)<1&&input.growthTick!==undefined
    &&input.growthLight!=='dark'&&(input.growthLight==='artificial-full'||!input.roofed)
    &&input.fertility>=def!.minFertility&&(input.growthThermalFactor??1)>0;
  if(!grows)return next;
  const boundary=input.growthLight==='artificial-full'?clock.artificialBoundary:clock.naturalBoundary;
  // Multiplication at a natural day/year boundary can round differently from
  // the preceding sum. Every growing curve keeps that boundary in its agenda,
  // including curves already displayed at size1 with a stored base below1.
  // Re-certify early instead of searching a whole annual interval for every
  // checkpointed curve. This private refresh changes no presentation cadence:
  // all queries through the certified endpoint still have the exact same form.
  // Certified positive integer IDs spread private refreshes over32 phases.
  // The endpoint remains at most63 ticks away, inside the same exact bracket.
  const refresh=world.tick+CERTIFICATION_TICKS+input.id%CERTIFICATION_TICKS;
  next=next===undefined?Math.min(boundary,refresh):Math.min(next,boundary,refresh);
  const size=floraSize(world,r),ripe=r.kind==='berries'&&harvestable(world,r);
  if(!Number.isFinite(size))throw new Error('Unproved current shape.');
  const changedAt=(tick:number):boolean=>{
    probe.tick=tick;
    const value=floraSize(probe,r);
    if(!Number.isFinite(value))throw new Error('Unproved future shape.');
    return value!==size||(r.kind==='berries'&&harvestable(probe,r))!==ripe;
  };
  // The cycle number is fixed throughout this short bracket. An equal endpoint
  // certifies every intervening projection by monotonicity; a differing one is
  // searched using the original queries, never an inverse or approximation.
  const last=Math.min(refresh,boundary-1);
  if(last>world.tick&&changedAt(last)){
    let low=world.tick,high=last;
    while(high-low>1){const middle=low+Math.floor((high-low)/2);if(changedAt(middle))high=middle;else low=middle;}
    if(changedAt(high-1)||!changedAt(high))throw new Error('Unproved growth deadline.');
    next=Math.min(next,high);
  }
  return next;
}

/** A private bounded agenda for decoder-confirmed immutable presentation.
 * A handle owns at most one heap entry per source. Captures contain primitives,
 * never resources/Worlds or borrowed arrays. No public flag grants provenance. */
export class NaturalPresentationEvents {
  private clock:Clock|undefined;
  private forecastClock:Clock|undefined;
  private forecasts=new Map<number,Forecast>();
  private rebuildForecasts=false;
  private natural:boolean[]=[];
  private inputs:Array<Inputs|undefined>=[];
  private roofs:number[]=[];
  private readonly cells=new Map<number,Set<number>>();
  private heap:number[]=[];
  private positions=new Int32Array(0);
  private deadlines=new Float64Array(0);

  clear():void {
    if(!this.clock&&!this.forecastClock&&!this.inputs.length&&!this.heap.length)return;
    this.clock=undefined;this.natural=[];this.inputs=[];this.roofs=[];this.cells.clear();
    this.heap=[];this.positions=new Int32Array(0);this.deadlines=new Float64Array(0);
    this.forecastClock=undefined;this.forecasts.clear();this.rebuildForecasts=false;
  }
  private before(a:number,b:number):boolean {
    return this.deadlines[a]!<this.deadlines[b]!||this.deadlines[a]===this.deadlines[b]&&a<b;
  }
  private swap(a:number,b:number):void {
    const left=this.heap[a]!,right=this.heap[b]!;
    this.heap[a]=right;this.heap[b]=left;this.positions[left]=b;this.positions[right]=a;
  }
  private up(position:number):number {
    while(position>0){const parent=Math.floor((position-1)/2);if(!this.before(this.heap[position]!,this.heap[parent]!))break;this.swap(position,parent);position=parent;}
    return position;
  }
  private down(position:number):void {
    for(;;){let best=position;const left=position*2+1,right=left+1;
      if(left<this.heap.length&&this.before(this.heap[left]!,this.heap[best]!))best=left;
      if(right<this.heap.length&&this.before(this.heap[right]!,this.heap[best]!))best=right;
      if(best===position)return;this.swap(position,best);position=best;
    }
  }
  private remove(source:number):void {
    const position=this.positions[source]!;if(position<0)return;
    const tail=this.heap.pop()!;this.positions[source]=-1;
    if(position<this.heap.length){this.heap[position]=tail;this.positions[tail]=position;this.down(this.up(position));}
  }
  private schedule(source:number,tick:number|undefined):void {
    this.remove(source);if(tick===undefined)return;
    this.deadlines[source]=tick;const position=this.heap.length;
    this.heap.push(source);this.positions[source]=position;this.up(position);
  }
  private unlink(source:number,input:Inputs|undefined):void {
    if(!input)return;const cell=input.z*this.clock!.width+input.x,occupants=this.cells.get(cell);
    occupants?.delete(source);if(!occupants?.size)this.cells.delete(cell);
  }
  private link(source:number,input:Inputs):void {
    const cell=input.z*this.clock!.width+input.x;
    let occupants=this.cells.get(cell);if(!occupants){occupants=new Set();this.cells.set(cell,occupants);}occupants.add(source);
  }
  initialize(world:World,sourceShapes:readonly number[],immutableSnapshot:boolean):void {
    if(!immutableSnapshot||!readSnapshotChanges(world,world)){this.clear();return;}
    const clock=captureClock(world),roofs=roofCells(world);
    if(!clock||!roofs||sourceShapes.length!==world.resources.length){this.clear();return;}
    const previous=this.forecastClock;
    // Only an explicitly invalidated index can offer its old primitive memo.
    // Direct initialization/checkpoint restoration cannot renew that witness.
    const reusable=this.rebuildForecasts&&previous&&sameContext(previous,clock)&&clock.tick>=previous.tick
      &&clock.civil===previous.civil+(clock.tick-previous.tick)?this.forecasts:undefined;
    this.rebuildForecasts=false;
    const forecasts=new Map<number,Forecast>(),ids=new Set<number>();
    this.clock=clock;this.natural=sourceShapes.map(shape=>shape>=0);this.roofs=[...roofs];
    this.cells.clear();this.heap=[];
    this.inputs=new Array(world.resources.length);this.positions=new Int32Array(world.resources.length);this.positions.fill(-1);
    this.deadlines=new Float64Array(world.resources.length);
    const probe={...world};
    try {
      for(let source=0;source<world.resources.length;source++){
        const r=world.resources[source]!;
        if(!Number.isSafeInteger(r.id)||r.id<=0||ids.has(r.id))throw new Error('Ambiguous forecast identity.');
        ids.add(r.id);
        if(!this.natural[source]||!tracked(r))continue;
        const input=captureInputs(world,r);if(!input)throw new Error('Unproved plant inputs.');
        // This is a new complete capture, even after a lost journal or source
        // reorder. A prior forecast lends only its primitive deadline, never
        // permission to skip the preceding historical presentation traversal.
        const old=reusable?.get(input.id);
        const retained=old&&old.plannedAt<=clock.tick&&(old.deadline===undefined||clock.tick<old.deadline)
          &&sameInputs(old.input,input)?old:undefined;
        const deadline=retained?retained.deadline:nextDeadline(world,probe,r,input,clock);
        forecasts.set(input.id,{input,plannedAt:retained?retained.plannedAt:clock.tick,deadline});
        this.inputs[source]=input;this.link(source,input);
        if(deadline!==undefined){
          this.deadlines[source]=deadline;this.positions[source]=this.heap.length;this.heap.push(source);
        }
      }
      // Current source order owns every handle. Linear heap construction avoids
      // N independent insertion walks when membership requires a full reindex.
      for(let position=Math.floor(this.heap.length/2)-1;position>=0;position--)this.down(position);
      this.forecasts=forecasts;this.forecastClock=clock;
    }catch{this.clear();}
  }
  read(from:World,world:World):NaturalEventRead|undefined {
    const previous=this.clock;if(!previous)return;
    const changes=readSnapshotChanges(from,world),clock=captureClock(world),roofs=roofCells(world);
    if(!clock||!roofs||clock.tick<previous.tick||!sameContext(previous,clock)){this.clear();return;}
    if(!changes||world.resources.length!==this.natural.length
      ||changes.resourceIndices.some(source=>this.natural[source]===isResidentCrop(world.resources[source]!))){
      // No index may survive this edge. Keep only primitive predictions when
      // both publications still have their own current decoder witness; a
      // checkpoint revokes the old generation and consequently clears them.
      if(readSnapshotChanges(from,from)&&readSnapshotChanges(world,world)){
        this.clock=undefined;this.rebuildForecasts=true;
      }
      else this.clear();
      return;
    }
    const affected=new Set(changes.resourceIndices),due=new Set<number>();
    const atCell=(cell:number):void=>{for(const source of this.cells.get(cell)??[])affected.add(source);};
    for(const cell of changes.tileIndices)atCell(cell);
    let a=0,b=0,roofChanged=false;
    while(a<this.roofs.length||b<roofs.length){
      const old=this.roofs[a]??Infinity,next=roofs[b]??Infinity;
      if(old===next){a++;b++;}else if(old<next){atCell(old);a++;roofChanged=true;}else{atCell(next);b++;roofChanged=true;}
    }
    if(roofChanged)this.roofs=[...roofs];
    while(this.heap.length&&this.deadlines[this.heap[0]!]!<=world.tick){
      const source=this.heap[0]!;this.remove(source);affected.add(source);due.add(source);
    }
    const indices=[...affected].sort((left,right)=>left-right),probe={...world};
    try {
      for(const source of indices){
        if(!this.natural[source])continue;
        const r=world.resources[source]!,old=this.inputs[source];
        if(!tracked(r)){this.unlink(source,old);this.inputs[source]=undefined;this.schedule(source,undefined);this.forecasts.delete(r.id);continue;}
        const input=captureInputs(world,r);if(!input)throw new Error('Unproved plant inputs.');
        if(old&&sameInputs(old,input)&&!due.has(source))continue;
        this.unlink(source,old);this.inputs[source]=input;this.link(source,input);
        const deadline=nextDeadline(world,probe,r,input,clock);
        this.schedule(source,deadline);this.forecasts.set(input.id,{input,plannedAt:clock.tick,deadline});
      }
      this.clock=clock;this.forecastClock=clock;
      return {indices,changes};
    }catch{this.clear();return;}
  }
}
