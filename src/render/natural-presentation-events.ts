import {readSnapshotChanges,sameSnapshotChangeDomain,type SnapshotChanges} from '../bridge/snapshot-changes';
import {readSnapshotResourceStructure} from '../bridge/snapshot-changes';
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
  adoptedAt:number|undefined;calendarOrigin:number|undefined;naturalBoundary:number;artificialBoundary:number;
  eclipseStart:number|undefined;eclipseEnd:number|undefined};
type Inputs=Pick<Resource,'id'|'kind'|'species'|'x'|'z'|'growth'|'growthTick'|'growthLight'|'growthThermalFactor'>
  &{leaflessAt:number|undefined;fertility:number;roofed:boolean;blighted:boolean};
export type NaturalObservation=Readonly<{size:number;ripe:boolean;leafless:boolean}>;
type Forecast={input:Inputs;plannedAt:number;deadline:number|undefined;observation:NaturalObservation};
export type NaturalEventRead={readonly indices:readonly number[];readonly changes:SnapshotChanges;readonly observations:ReadonlyMap<number,NaturalObservation>};

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
  let naturalBoundary=boundary(climate?TICKS_PER_YEAR:TICKS_PER_DAY);
  const artificialBoundary=boundary(TICKS_PER_DAY),eclipse=world.miscIncidents?.weather?.eclipse;
  if(naturalBoundary===undefined||artificialBoundary===undefined)return;
  // A future probe retains this publication's raw interval. Never certify its
  // curve past the producer's end checkpoint/removal, or retain an old curve
  // when an interval starts, ends or is replaced without a Resource edit.
  if(eclipse){
    if(!Number.isSafeInteger(eclipse.start)||!Number.isSafeInteger(eclipse.end)
      ||eclipse.start<0||eclipse.start>tick||eclipse.end<=tick||eclipse.end>CLOCK_LIMIT)return;
    naturalBoundary=Math.min(naturalBoundary,eclipse.end);
  }
  // climateTick observes only the truthiness of GameProfile. Its cloned object
  // is never retained and a fresh packet object cannot invalidate this clock.
  return {tick,civil,width,height,schema,gameProfilePresent:!!gameProfile,profile:climate?.profile,
    adoptedAt:climate?.adoptedAt,calendarOrigin:climate?.calendarOrigin,naturalBoundary,artificialBoundary,
    eclipseStart:eclipse?.start,eclipseEnd:eclipse?.end};
}
function sameContext(a:Clock,b:Clock):boolean {
  return a.width===b.width&&a.height===b.height&&a.schema===b.schema&&a.gameProfilePresent===b.gameProfilePresent
    &&a.profile===b.profile&&a.adoptedAt===b.adoptedAt&&a.calendarOrigin===b.calendarOrigin
    &&a.eclipseStart===b.eclipseStart&&a.eclipseEnd===b.eclipseEnd;
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
    growthLight:r.growthLight,growthThermalFactor:factor,leaflessAt,fertility,roofed:isRoofed(world,roofIndex(world,r)),blighted:!!r.blight};
}
function sameInputs(a:Inputs,b:Inputs):boolean {
  return a.id===b.id&&a.kind===b.kind&&a.species===b.species&&a.x===b.x&&a.z===b.z
    &&Object.is(a.growth,b.growth)&&Object.is(a.growthTick,b.growthTick)&&a.growthLight===b.growthLight
    &&Object.is(a.growthThermalFactor,b.growthThermalFactor)&&Object.is(a.leaflessAt,b.leaflessAt)
    &&Object.is(a.fertility,b.fertility)&&a.roofed===b.roofed&&a.blighted===b.blighted;
}
const tracked=(r:Resource):boolean=>r.plantLife?.leaflessAt!==undefined||isPlant(r)&&(r.growth??1)!==1;
const observe=(world:World,r:Resource):NaturalObservation=>Object.freeze({
  size:floraSize(world,r),ripe:r.kind==='berries'&&harvestable(world,r),leafless:plantLeafless(world,r)});

/** Only the future tick in this local shadow is changed. No shadow, Resource,
 * tile, roof array or callback survives this synchronous planning read. */
function nextDeadline(world:World,probe:World,r:Resource,input:Inputs,clock:Clock,observation:NaturalObservation):number|undefined {
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
  const grows=!input.blighted&&isPlant(r)&&(input.growth??1)<1&&input.growthTick!==undefined
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
  const {size,ripe}=observation;
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
  // A single pending synchronous edge, never an adoption history. Direct
  // initialization of a third publication cannot borrow another edge's gate.
  private reconcileEdge:{from:WeakRef<World>;to:WeakRef<World>}|undefined;
  private identities:number[]=[];
  private natural:boolean[]=[];
  private inputs:Array<Inputs|undefined>=[];
  private roofs:number[]=[];
  private readonly cells=new Map<number,Set<number>>();
  private heap:number[]=[];
  private positions=new Int32Array(0);
  private deadlines=new Float64Array(0);

  clear():void {
    if(!this.clock&&!this.forecastClock&&!this.inputs.length&&!this.heap.length&&!this.identities.length)return;
    this.clock=undefined;this.natural=[];this.inputs=[];this.roofs=[];this.cells.clear();
    this.heap=[];this.positions=new Int32Array(0);this.deadlines=new Float64Array(0);
    this.forecastClock=undefined;this.forecasts.clear();this.rebuildForecasts=false;this.reconcileEdge=undefined;this.identities=[];
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
  private growCapacity(count:number):void {
    if(this.positions.length>=count)return;
    // A full rebuild owns exactly N slots. Prefix+append never shrinks N, so
    // growth here owns at most 2N slots, independent of nextId or map dimensions.
    const capacity=Math.max(count,this.positions.length*2),positions=new Int32Array(capacity);
    positions.fill(-1);positions.set(this.positions);
    const deadlines=new Float64Array(capacity);deadlines.set(this.deadlines);
    this.positions=positions;this.deadlines=deadlines;
  }
  private reconcileFullPrefix(world:World,sourceShapes:readonly number[],clock:Clock,
    roofs:readonly number[],identities:number[]):ReadonlyMap<number,NaturalObservation>|undefined {
    this.clock=clock;this.roofs=[...roofs];
    this.natural.length=world.resources.length;this.inputs.length=world.resources.length;
    this.growCapacity(world.resources.length);
    const observations=new Map<number,NaturalObservation>(),probe={...world};
    try {
      for(let source=0;source<world.resources.length;source++){
        const r=world.resources[source]!,old=this.inputs[source],natural=sourceShapes[source]!>=0;
        this.natural[source]=natural;
        if(!natural||!tracked(r)){
          this.unlink(source,old);this.inputs[source]=undefined;this.schedule(source,undefined);this.forecasts.delete(r.id);continue;
        }
        // IDs/classes are captured for every source. Only natural tracked
        // sources can borrow a forecast/heap/cell entry, and each rereads all
        // its current growth, civil, roof, fertility and leaf dependencies.
        const input=captureInputs(world,r);if(!input)throw new Error('Unproved plant inputs.');
        const forecast=this.forecasts.get(input.id);
        const retained=old&&forecast&&forecast.plannedAt<=clock.tick
          &&(forecast.deadline===undefined||clock.tick<forecast.deadline)
          &&sameInputs(old,input)&&sameInputs(forecast.input,input)?forecast:undefined;
        if(retained){
          this.inputs[source]=retained.input;observations.set(input.id,retained.observation);continue;
        }
        this.unlink(source,old);this.inputs[source]=input;this.link(source,input);
        const observation=observe(world,r),deadline=nextDeadline(world,probe,r,input,clock,observation);
        this.schedule(source,deadline);this.forecasts.set(input.id,{input,plannedAt:clock.tick,deadline,observation});
        observations.set(input.id,observation);
      }
      this.identities=identities;this.forecastClock=clock;return observations;
    }catch{this.clear();return;}
  }
  initialize(world:World,sourceShapes:readonly number[],immutableSnapshot:boolean):ReadonlyMap<number,NaturalObservation>|undefined {
    if(!immutableSnapshot||!readSnapshotChanges(world,world)){this.clear();return;}
    const clock=captureClock(world),roofs=roofCells(world);
    if(!clock||!roofs||sourceShapes.length!==world.resources.length){this.clear();return;}
    const previous=this.forecastClock;
    // Only an explicitly invalidated index can offer its old primitive memo.
    // Direct initialization/checkpoint restoration cannot renew that witness.
    const reusable=this.rebuildForecasts&&previous&&sameContext(previous,clock)&&clock.tick>=previous.tick
      &&clock.civil===previous.civil+(clock.tick-previous.tick)?this.forecasts:undefined;
    // Full ownership/order evidence: every current ID is scanned; a prefix is
    // retained only when all old ordinals and crop/natural classes match.
    const identities:number[]=[],ids=new Set<number>();
    const edge=this.reconcileEdge,from=edge?.from.deref();
    let prefix=edge?.to.deref()===world&&!!from&&sameSnapshotChangeDomain(from,world)
      &&!!reusable&&this.identities.length<=world.resources.length;
    this.reconcileEdge=undefined;this.rebuildForecasts=false;
    for(let source=0;source<world.resources.length;source++){
      const id=world.resources[source]!.id;
      if(!Number.isSafeInteger(id)||id<=0||ids.has(id)){this.clear();return;}
      ids.add(id);identities.push(id);
      if(prefix&&source<this.identities.length&&(id!==this.identities[source]||this.natural[source]!== (sourceShapes[source]!>=0)))prefix=false;
    }
    if(prefix)return this.reconcileFullPrefix(world,sourceShapes,clock,roofs,identities);
    const forecasts=new Map<number,Forecast>(),observations=new Map<number,NaturalObservation>();
    this.clock=clock;this.natural=sourceShapes.map(shape=>shape>=0);this.roofs=[...roofs];
    this.cells.clear();this.heap=[];
    this.inputs=new Array(world.resources.length);this.positions=new Int32Array(world.resources.length);this.positions.fill(-1);
    this.deadlines=new Float64Array(world.resources.length);
    const probe={...world};
    try {
      for(let source=0;source<world.resources.length;source++){
        const r=world.resources[source]!;

        if(!this.natural[source]||!tracked(r))continue;
        const input=captureInputs(world,r);if(!input)throw new Error('Unproved plant inputs.');
        // This is a new complete capture, even after a lost journal or source
        // reorder. A prior forecast lends only its primitive deadline, never
        // permission to skip the preceding historical presentation traversal.
        const old=reusable?.get(input.id);
        const retained=old&&old.plannedAt<=clock.tick&&(old.deadline===undefined||clock.tick<old.deadline)
          &&sameInputs(old.input,input)?old:undefined;
        const observation=retained?.observation??observe(world,r);
        const deadline=retained?retained.deadline:nextDeadline(world,probe,r,input,clock,observation);
        const forecast=retained??{input,plannedAt:clock.tick,deadline,observation};
        forecasts.set(input.id,forecast);observations.set(input.id,observation);
        this.inputs[source]=forecast.input;this.link(source,forecast.input);
        if(deadline!==undefined){
          this.deadlines[source]=deadline;this.positions[source]=this.heap.length;this.heap.push(source);
        }
      }
      // Current source order owns every handle. Linear heap construction avoids
      // N independent insertion walks when membership requires a full reindex.
      for(let position=Math.floor(this.heap.length/2)-1;position>=0;position--)this.down(position);
      this.forecasts=forecasts;this.forecastClock=clock;this.identities=identities;
      return observations;
    }catch{this.clear();}
  }
  /** Numerical seed only. A new ID capture must still compare every input.
   * No World/reference or admission authority is lent by this copied Map. */
  copyIdForecasts(world:World):ReadonlyMap<number,Forecast>|undefined {
    const clock=captureClock(world),prior=this.forecastClock;
    if(!clock||!prior||clock.tick!==prior.tick||clock.civil!==prior.civil||!sameContext(clock,prior)
      ||!readSnapshotChanges(world,world))return;
    return new Map([...this.forecasts].map(([id,forecast]):[number,Forecast]=>[id,Object.freeze({
      input:Object.freeze({...forecast.input}),plannedAt:forecast.plannedAt,deadline:forecast.deadline,observation:forecast.observation})]));
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
        this.reconcileEdge=from!==world&&sameSnapshotChangeDomain(from,world)?{from:new WeakRef(from),to:new WeakRef(world)}:undefined;
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
    const indices=[...affected].sort((left,right)=>left-right),probe={...world},observations=new Map<number,NaturalObservation>();
    try {
      for(const source of indices){
        if(!this.natural[source])continue;
        const r=world.resources[source]!,old=this.inputs[source];
        if(!tracked(r)){this.unlink(source,old);this.inputs[source]=undefined;this.schedule(source,undefined);this.forecasts.delete(r.id);continue;}
        const input=captureInputs(world,r);if(!input)throw new Error('Unproved plant inputs.');
        if(old&&sameInputs(old,input)&&!due.has(source)){
          const forecast=this.forecasts.get(r.id);
          if(forecast&&forecast.plannedAt<=clock.tick&&(forecast.deadline===undefined||clock.tick<forecast.deadline))
            observations.set(r.id,forecast.observation);
          continue;
        }
        this.unlink(source,old);this.inputs[source]=input;this.link(source,input);
        const observation=observe(world,r);
        const deadline=nextDeadline(world,probe,r,input,clock,observation);
        this.schedule(source,deadline);this.forecasts.set(input.id,{input,plannedAt:clock.tick,deadline,observation});observations.set(input.id,observation);
      }
      this.clock=clock;this.forecastClock=clock;
      return {indices,changes,observations};
    }catch{this.clear();return;}
  }
}

/** Metadata only. Ordinals describe the FINAL C, even if the decoder has D.
 * Removed IDs include a remove/rebirth so its private order is renewed. */
export interface FinalResourceStructure {
  readonly removed:ReadonlySet<number>;
  readonly present:ReadonlyMap<number,number>;
  readonly added:ReadonlySet<number>;
  readonly tileIndices:readonly number[];
  readonly beforeCount:number;
  readonly afterCount:number;
}
export function composeFinalResourceStructure(from:World,to:World):FinalResourceStructure|undefined {
  const result=readSnapshotResourceStructure(from,to);if(!result)return;
  let count=from.resources.length;
  const removed=new Set<number>(),present=new Map<number,number>(),added=new Set<number>();
  for(const edge of result.edges){
    if(edge.beforeCount!==count||edge.afterCount!==count-edge.removed.length+edge.added.length)return;
    const ordinals=edge.removed.map(edit=>edit.beforeOrdinal).sort((a,b)=>a-b);
    for(let i=0;i<ordinals.length;i++)if(!Number.isSafeInteger(ordinals[i])||ordinals[i]!<0||ordinals[i]!>=count||i&&ordinals[i]===ordinals[i-1])return;
    const lower=(ordinal:number):number=>{let a=0,b=ordinals.length;while(a<b){const m=(a+b)>>>1;if(ordinals[m]!<ordinal)a=m+1;else b=m;}return a;};
    for(const edit of edge.removed){removed.add(edit.id);present.delete(edit.id);added.delete(edit.id);}
    if(ordinals.length)for(const [id,ordinal]of present)present.set(id,ordinal-lower(ordinal));
    for(const edit of edge.added){added.add(edit.id);present.set(edit.id,edit.afterOrdinal);}
    for(const edit of edge.updated)present.set(edit.id,edit.afterOrdinal);
    count=edge.afterCount;
  }
  if(count!==to.resources.length)return;
  for(const [id,ordinal]of present){if(!Number.isSafeInteger(id)||id<=0||!Number.isSafeInteger(ordinal)||ordinal<0||ordinal>=count||to.resources[ordinal]?.id!==id)return;}
  return {removed,present,added,tileIndices:result.tileIndices,beforeCount:from.resources.length,afterCount:count};
}

export interface NaturalIdSource {readonly resource:Resource;readonly order:number;readonly natural:boolean}
export interface NaturalIdEventRead {readonly affected:ReadonlySet<number>;readonly observations:ReadonlyMap<number,NaturalObservation>}
type IdForecast=Forecast&{order:number};

/** New private lane. The mathematical functions above are shared verbatim.
 * Forecast/cell/heap ownership is by ID; source order is an append rank, never
 * the numerical ID. No tombstones, Resources, Worlds or transport arrays are
 * retained by this agenda. The caller owns the current-ref ledger. */
export class NaturalIdPresentationEvents {
  private clock:Clock|undefined;
  private roofs:number[]=[];
  private readonly forecasts=new Map<number,IdForecast>();
  private readonly cells=new Map<number,Set<number>>();
  private heap:number[]=[];
  private readonly positions=new Map<number,number>();
  clear():void {this.clock=undefined;this.roofs=[];this.forecasts.clear();this.cells.clear();this.heap=[];this.positions.clear();}
  private before(a:number,b:number):boolean {
    const left=this.forecasts.get(a)!,right=this.forecasts.get(b)!;
    return left.deadline!<right.deadline!||left.deadline===right.deadline&&left.order<right.order;
  }
  private swap(a:number,b:number):void {const left=this.heap[a]!,right=this.heap[b]!;this.heap[a]=right;this.heap[b]=left;this.positions.set(left,b);this.positions.set(right,a);}
  private up(at:number):number {while(at>0){const parent=Math.floor((at-1)/2);if(!this.before(this.heap[at]!,this.heap[parent]!))break;this.swap(at,parent);at=parent;}return at;}
  private down(at:number):void {for(;;){let best=at;const a=at*2+1,b=a+1;if(a<this.heap.length&&this.before(this.heap[a]!,this.heap[best]!))best=a;if(b<this.heap.length&&this.before(this.heap[b]!,this.heap[best]!))best=b;if(best===at)return;this.swap(at,best);at=best;}}
  private removeHeap(id:number):void {const at=this.positions.get(id);if(at===undefined)return;const last=this.heap.pop()!;this.positions.delete(id);if(at<this.heap.length){this.heap[at]=last;this.positions.set(last,at);this.down(this.up(at));}}
  private drop(id:number):void {
    const old=this.forecasts.get(id);this.removeHeap(id);this.forecasts.delete(id);if(!old||!this.clock)return;
    const cell=old.input.z*this.clock.width+old.input.x,occupants=this.cells.get(cell);occupants?.delete(id);if(!occupants?.size)this.cells.delete(cell);
  }
  private put(id:number,forecast:IdForecast):void {
    this.drop(id);this.forecasts.set(id,forecast);
    const cell=forecast.input.z*this.clock!.width+forecast.input.x;let occupants=this.cells.get(cell);if(!occupants){occupants=new Set();this.cells.set(cell,occupants);}occupants.add(id);
    if(forecast.deadline!==undefined){this.positions.set(id,this.heap.length);this.heap.push(id);this.up(this.heap.length-1);}
  }
  initialize(world:World,sources:ReadonlyMap<number,NaturalIdSource>,seed?:NaturalPresentationEvents):ReadonlyMap<number,NaturalObservation>|undefined {
    this.clear();if(!readSnapshotChanges(world,world))return;
    const clock=captureClock(world),roofs=roofCells(world);if(!clock||!roofs)return;
    this.clock=clock;this.roofs=[...roofs];const observations=new Map<number,NaturalObservation>(),probe={...world},prior=seed?.copyIdForecasts(world);
    try {
      for(const [id,source]of sources){
        const r=source.resource;if(!source.natural||!tracked(r))continue;
        const input=captureInputs(world,r);if(!input||input.id!==id)throw new Error('Unproved ID inputs.');
        const old=prior?.get(id),retained=old&&old.plannedAt<=clock.tick&&(old.deadline===undefined||clock.tick<old.deadline)&&sameInputs(old.input,input)?old:undefined;
        const observation=retained?.observation??observe(world,r),deadline=retained?retained.deadline:nextDeadline(world,probe,r,input,clock,observation);
        const forecast={input,plannedAt:clock.tick,deadline,observation,order:source.order};
        this.forecasts.set(id,forecast);
        const cell=input.z*clock.width+input.x;let occupants=this.cells.get(cell);if(!occupants){occupants=new Set();this.cells.set(cell,occupants);}occupants.add(id);
        if(deadline!==undefined){this.positions.set(id,this.heap.length);this.heap.push(id);}
        observations.set(id,observation);
      }
      for(let position=Math.floor(this.heap.length/2)-1;position>=0;position--)this.down(position);
      return observations;
    }catch{this.clear();return;}
  }
  read(from:World,world:World,sources:ReadonlyMap<number,NaturalIdSource>,structure:FinalResourceStructure):NaturalIdEventRead|undefined {
    const previous=this.clock,clock=captureClock(world),roofs=roofCells(world);
    // The publication chain is read afresh; the passed metadata is no public
    // authority. This method is a numerical query, not an adoption capability.
    if(!previous||!readSnapshotResourceStructure(from,world)||!clock||!roofs||clock.tick<previous.tick||!sameContext(previous,clock)||clock.civil!==previous.civil+(clock.tick-previous.tick)){this.clear();return;}
    const affected=new Set(structure.present.keys()),due=new Set<number>();
    const atCell=(cell:number):void=>{for(const id of this.cells.get(cell)??[])affected.add(id);};
    for(const id of structure.removed)this.drop(id);
    for(const cell of structure.tileIndices)atCell(cell);
    let a=0,b=0,changedRoof=false;
    while(a<this.roofs.length||b<roofs.length){const old=this.roofs[a]??Infinity,next=roofs[b]??Infinity;if(old===next){a++;b++;}else if(old<next){atCell(old);a++;changedRoof=true;}else{atCell(next);b++;changedRoof=true;}}
    if(changedRoof)this.roofs=[...roofs];
    while(this.heap.length&&this.forecasts.get(this.heap[0]!)!.deadline!<=world.tick){const id=this.heap[0]!;this.removeHeap(id);affected.add(id);due.add(id);}
    const ids=[...affected].filter(id=>sources.has(id)).sort((a,b)=>sources.get(a)!.order-sources.get(b)!.order),probe={...world},observations=new Map<number,NaturalObservation>();
    try {
      for(const id of ids){
        const source=sources.get(id)!,r=source.resource,old=this.forecasts.get(id);
        if(!source.natural||!tracked(r)){this.drop(id);continue;}
        const input=captureInputs(world,r);if(!input||input.id!==id)throw new Error('Unproved ID inputs.');
        if(old&&sameInputs(old.input,input)&&old.order===source.order&&!due.has(id)&&old.plannedAt<=clock.tick&&(old.deadline===undefined||clock.tick<old.deadline)){observations.set(id,old.observation);continue;}
        const observation=observe(world,r),deadline=nextDeadline(world,probe,r,input,clock,observation);
        this.put(id,{input,plannedAt:clock.tick,deadline,observation,order:source.order});observations.set(id,observation);
      }
      this.clock=clock;return {affected,observations};
    }catch{this.clear();return;}
  }
}
