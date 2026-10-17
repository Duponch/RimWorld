import type {GroupAnimalOwners256} from './group-animal-state-256.ts';
import type {GroupSegment} from './group-state.ts';
import type {GroupTravelRevision} from './group-reorganization-state.ts';
export type GroupDrawPoint=readonly [number,number,number];
export interface GroupMotionOwner {
 id:number;tile:number;destination:number;moving:boolean;
 segment:GroupSegment|null;nextPassable:boolean;
 /** Only prospective256 owners have this real persisted accumulator. */
 travel?:GroupTravelRevision;
 animalInterval?:GroupAnimalOwners256['interval'];
}
/** Geometry is immutable and independently versioned. Neither radius, tile
 * count nor civilian/home markers belong in this group runtime. */
export interface GroupMotionGeometry {
 center(tile:number):GroupDrawPoint;
 averageTileSize:number;
 tangent(center:GroupDrawPoint,point:readonly [number,number]):GroupDrawPoint;
 regularPolygonVertex(count:number,index:number):readonly [number,number];
 /** Isolated Core seed(ID) float in [0,360); never the shared World RNG. */
 collisionAngle(id:number):number;
}
export interface GroupMotionIntervals {
 /** Actual owner order, with no ID sort or all-planet traversal. */
 owners():readonly GroupMotionOwner[];
 /** Interleaved interval: pather first, then this runtime, then needs. */
 beforeTween(id:number,deltaCore:number):void;
 afterTween(id:number,deltaCore:number):void;
 afterAnimalTween?(id:number,deltaCore:number):void;
}
const f=Math.fround;
const add=(a:GroupDrawPoint,b:GroupDrawPoint):GroupDrawPoint=>[f(a[0]+b[0]),f(a[1]+b[1]),f(a[2]+b[2])];
const distanceSquared=(a:GroupDrawPoint,b:GroupDrawPoint)=>{const x=f(a[0]-b[0]),y=f(a[1]-b[1]),z=f(a[2]-b[2]);return f(f(f(x*x)+f(y*y))+f(z*z));};
function hashOffset(id:number):number {return (id^((169495093+2654435769+(id<<6)+(id>>2))|0))|0;}
function patherRoot(owner:GroupMotionOwner,g:GroupMotionGeometry):GroupDrawPoint {
 const a=g.center(owner.tile),segment=owner.moving?owner.segment:null;
 if(!segment)return a;
 const t=owner.nextPassable?f(1-f(segment.remainingCore/segment.totalCore)):0,b=g.center(segment.to),left=f(1-t);
 return [f(f(b[0]*t)+f(a[0]*left)),f(f(b[1]*t)+f(a[1]*left)),f(f(b[2]*t)+f(a[2]*left))];
}
function tweenerRoot(owner:GroupMotionOwner,owners:readonly GroupMotionOwner[],g:GroupMotionGeometry):GroupDrawPoint {
 const root=patherRoot(owner,g),radius=f(f(.15)*g.averageTileSize);let point:readonly [number,number]|undefined,center=root;
 if(!owner.moving||owner.segment?.to===owner.destination){
  const tile=owner.moving?owner.segment!.to:owner.tile;
  const standing=owners.filter(o=>!o.moving?o.tile===tile:o.segment?.to===o.destination&&o.destination===tile);
  if(standing.length){const vertex=g.regularPolygonVertex(standing.length,standing.filter(o=>o.id<owner.id).length);point=[f(vertex[0]*radius),f(vertex[1]*radius)];center=g.center(tile);}
 }else{
  const threshold=f(g.averageTileSize*f(.2));
  if(owners.some(o=>o.id!==owner.id&&f(Math.sqrt(distanceSquared(root,patherRoot(o,g))))<threshold)){
   const angle=g.collisionAngle(owner.id);point=[f(f(Math.cos(angle))*radius),f(f(Math.sin(angle))*radius)];
  }
 }
 return point?add(root,g.tangent(center,point)):root;
}
/** Worker-owned, no module singleton. Draw positions are reset at load exactly
 * as Core; the interval accumulator remains the original owner scalar. */
export class GroupMotionRuntime {
 #globeSelected=false;
 readonly #positions=new Map<number,GroupDrawPoint>();
 readonly #historicalDelta=new Map<number,number>();
 constructor(readonly geometry:GroupMotionGeometry){}
 setGlobeSelected(selected:boolean):void {if(typeof selected!=='boolean')throw Error('Invalid globe selection');this.#globeSelected=selected;}
 get globeSelected():boolean{return this.#globeSelected;}
 bootstrap(owners:readonly GroupMotionOwner[]):void {
  this.#globeSelected=false;this.#positions.clear();this.#historicalDelta.clear();
  for(const owner of owners){this.#positions.set(owner.id,tweenerRoot(owner,owners,this.geometry));if(!owner.travel)this.#historicalDelta.set(owner.id,0);}
 }
 /** Add child/new departure only. Source/survivor positions remain untouched. */
 prepareRegistration(owner:GroupMotionOwner,owners:readonly GroupMotionOwner[]):{id:number;position:GroupDrawPoint;historical:boolean} {
  if(this.#positions.has(owner.id))throw Error('Group motion identity already registered');
  return {id:owner.id,position:tweenerRoot(owner,owners,this.geometry),historical:!owner.travel};
 }
 commitRegistration(plan:{id:number;position:GroupDrawPoint;historical:boolean}):void {
  this.#positions.set(plan.id,plan.position);if(plan.historical)this.#historicalDelta.set(plan.id,0);
 }
 register(owner:GroupMotionOwner,owners:readonly GroupMotionOwner[]):void {this.commitRegistration(this.prepareRegistration(owner,owners));}
 remove(id:number):void {this.#positions.delete(id);this.#historicalDelta.delete(id);}
 position(id:number):GroupDrawPoint|undefined{return this.#positions.get(id);}
 closeTo(first:Pick<GroupMotionOwner,'id'|'tile'>,other:Pick<GroupMotionOwner,'id'|'tile'>):boolean {
  if(first.tile===other.tile)return true;
  const a=this.#positions.get(first.id),b=this.#positions.get(other.id);if(!a||!b)return false;
  const half=f(this.geometry.averageTileSize*f(.5));return distanceSquared(a,b)<f(half*half);
 }
 /** Call for each of the ten real Core substeps, never from RAF. */
 stepCore(coreTick:number,c:GroupMotionIntervals):void {
  if(!Number.isSafeInteger(coreTick)||coreTick<0)throw Error('Invalid confirmed Core tick');
  const order=c.owners().map(o=>o.id),rate=this.#globeSelected?1:15;
  for(const id of order){
   let owner=c.owners().find(o=>o.id===id);if(!owner)continue;
   if(!this.#positions.has(id))throw Error('Group motion owner was not bootstrapped');
   const animal=owner.animalInterval;if(animal){if(owner.travel||animal.atCore!==coreTick-1)throw Error('Actual animal interval frontier skipped');animal.atCore=coreTick;animal.tickDelta++;}
   const animalDue=!!animal&&(animal.tickDelta>rate||(((coreTick|0)+hashOffset(id))|0)%rate===0),animalDelta=animal?.tickDelta??0;
   const finishAnimal=()=>{if(!animalDue)return;c.afterAnimalTween?.(id,animalDelta);const current=c.owners().find(o=>o.id===id)?.animalInterval;if(current)current.tickDelta=0;};
   const delta=(owner.travel?.tickDelta??this.#historicalDelta.get(id)??0)+1;
   if(owner.travel)owner.travel.tickDelta=delta;else this.#historicalDelta.set(id,delta);
   if(delta<=rate&&(((coreTick|0)+hashOffset(id))|0)%rate!==0){finishAnimal();continue;}
   c.beforeTween(id,delta);
   const current=c.owners();owner=current.find(o=>o.id===id);
   if(!owner){this.remove(id);continue;}
   const root=tweenerRoot(owner,current,this.geometry),previous=this.#positions.get(id)!;
   this.#positions.set(id,[f(previous[0]+f(f(root[0]-previous[0])*f(.09))),f(previous[1]+f(f(root[1]-previous[1])*f(.09))),f(previous[2]+f(f(root[2]-previous[2])*f(.09)))]);
   c.afterTween(id,delta);finishAnimal();
   owner=c.owners().find(o=>o.id===id);if(owner?.travel)owner.travel.tickDelta=0;else if(owner)this.#historicalDelta.set(id,0);
  }
 }
}