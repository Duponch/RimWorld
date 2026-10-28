import type {World} from '../sim/types';
import type {PresentationSegment} from '../sim/travel-timing';

const ownedWorlds=new WeakSet<World>();
/** Called only by the closed MAIN factory's adoption boundary. Merely frozen
 * objects and public/mutable renderer inputs do not acquire this authority. */
export function ownActorPlaybackWorld435(world:World,owned:boolean):void{if(owned)ownedWorlds.add(world);else ownedWorlds.delete(world);}
export function isActorPlaybackWorld435(world:World|undefined):boolean{return!!world&&ownedWorlds.has(world);}

type Cursor={segments:readonly PresentationSegment[];index:number;tick:number};
/** Confirmed track selection is shared with endpoint publication, not a new
 * movement simulation. Replacing/trimming/correcting a track revokes its old
 * cursor. Public mutable callers retain the original linear read. */
export class ConfirmedTrackCursor435 {
 private readonly cursors=new Map<number,Cursor>();
 enabled=false;generation=0;
 readonly stats={reads:0,steps:0,restarts:0,configurations:0};
 configure(enabled:boolean,reset:boolean):void{if(reset||enabled!==this.enabled){this.cursors.clear();this.generation++;}this.enabled=enabled;this.stats.configurations++;}
 segment(tracks:ReadonlyMap<number,readonly PresentationSegment[]>,id:number,tick:number):PresentationSegment|undefined{
  this.stats.reads++;const segments=tracks.get(id);if(!segments?.length){this.cursors.delete(id);return;}
  if(!this.enabled){let current:PresentationSegment|undefined;for(const segment of segments){if(segment.start>tick)break;current=segment;}return current;}
  let cursor=this.cursors.get(id);if(!cursor||cursor.segments!==segments||tick<cursor.tick){cursor={segments,index:-1,tick};this.cursors.set(id,cursor);this.stats.restarts++;}
  while(cursor.index+1<segments.length&&segments[cursor.index+1]!.start<=tick){cursor.index++;this.stats.steps++;}cursor.tick=tick;
  return cursor.index<0?undefined:segments[cursor.index];
 }
}

export interface ActorTimeline435 {
 readonly playbackEnabled435:boolean;
 readonly playbackGeneration435:number;
 playbackSegment435(id:number):PresentationSegment|undefined;
}
type ActorSource={id:number;motion?:PresentationSegment|null};
export interface PreparedActor435 {
 id:number;fallback:PresentationSegment|undefined;dependent:boolean;dirty:boolean;
 edge:PresentationSegment|undefined;phase:number;origin:number;generation:number;timeline:ActorTimeline435|undefined;
 committedEdge:PresentationSegment|undefined;committedPhase:number;committedOrigin:number;committedGeneration:number;committedTimeline:ActorTimeline435|undefined;
}

/** One resident slot per adopted actor. World-derived state/keys are evaluated
 * only on adoption or actual confirmed edge/phase/origin changes. Continuous
 * translation, turn/approach/recoil curves and existing animation sampling stay
 * on their original clocks and GPU streams. Carrier-dependent records remain
 * native on every frame; no unproved dependency equality is inferred. */
export class ActorPlayback435<A extends ActorSource> {
 private world:World|undefined;
 private source:readonly A[]|undefined;
 private slots:PreparedActor435[]=[];
 private pending:PreparedActor435[]=[];
 private owned=false;
 retrying=false;
 readonly stats={adoptions:0,preparedActors:0,frames:0,visits:0,skips:0,dependentVisits:0,commits:0,retries:0};
 constructor(private readonly dependent:(actor:A,index:number)=>boolean=()=>false,private readonly fallbackMotion=true){}
 prepare(world:World,actors:readonly A[],reset=false):void{
  const owned=isActorPlaybackWorld435(world);if(!reset&&this.world===world&&this.source===actors&&this.owned===owned)return;
  this.world=world;this.source=actors;this.owned=owned;this.pending.length=0;this.retrying=false;
  if(!owned){this.slots=[];return;}
  const previous=new Map(this.slots.map(slot=>[slot.id,slot]));
  this.slots=actors.map((actor,index)=>{const row=previous.get(actor.id)??{id:actor.id,fallback:undefined,dependent:false,dirty:true,edge:undefined,phase:-1,origin:NaN,generation:-1,timeline:undefined,committedEdge:undefined,committedPhase:-1,committedOrigin:NaN,committedGeneration:-1,committedTimeline:undefined};row.fallback=this.fallbackMotion?actor.motion??undefined:undefined;row.dependent=this.dependent(actor,index);row.dirty=true;return row;});
  this.stats.adoptions++;this.stats.preparedActors+=actors.length;
 }
 /** Anchored membership is unchanged; only listed slots become dirty. This is
  * called after the private Native projection has reached its playhead. */
 adoptPhase297(world:World,actors:readonly A[],indices:readonly number[]):void{
  if(!actors.length&&!this.slots.length){this.world=world;this.source=actors;return;}
  if(!this.owned||!isActorPlaybackWorld435(world)||this.slots.length!==actors.length)throw Error('Phase actor layout is not resident');
  for(const index of indices){const row=this.slots[index],actor=actors[index];if(!row||!actor||row.id!==actor.id)throw Error('Phase actor slot changed membership');}
  this.world=world;this.source=actors;
  for(const index of indices){const row=this.slots[index]!,actor=actors[index]!;row.fallback=this.fallbackMotion?actor.motion??undefined:undefined;row.dependent=this.dependent(actor,index);row.dirty=true;}
  this.stats.adoptions++;this.stats.preparedActors+=indices.length;
 }
 beginFrame(timeline:ActorTimeline435|undefined):boolean{
  this.retrying=this.pending.length>0;if(this.retrying){for(const row of this.pending)row.dirty=true;this.pending.length=0;this.stats.retries++;}
  const enabled=this.owned&&(!timeline||timeline.playbackEnabled435);if(enabled)this.stats.frames++;return enabled;
 }
 select(index:number,timeline:ActorTimeline435|undefined,tick:number,origin:number):PreparedActor435|undefined{
  const row=this.slots[index];if(!row)throw new Error('Actor playback slot was not prepared at adoption.');
  const edge=timeline?.playbackSegment435(row.id)??row.fallback,phase=edge?(tick<edge.start?0:tick<edge.end?1:2):-1,generation=timeline?.playbackGeneration435??0;
  if(!row.dirty&&!row.dependent&&row.committedEdge===edge&&row.committedPhase===phase&&row.committedOrigin===origin&&row.committedGeneration===generation&&row.committedTimeline===timeline){this.stats.skips++;return;}
  row.edge=edge;row.phase=phase;row.origin=origin;row.generation=generation;row.timeline=timeline;this.pending.push(row);this.stats.visits++;if(row.dependent)this.stats.dependentVisits++;return row;
 }
 /** Called after normal endpoint writes, upload flags and rescue copies. A
  * failed batch never commits; the next caller revokes its native key caches. */
 commit():void{for(const row of this.pending){row.committedEdge=row.edge;row.committedPhase=row.phase;row.committedOrigin=row.origin;row.committedGeneration=row.generation;row.committedTimeline=row.timeline;row.dirty=false;this.stats.commits++;}this.pending.length=0;}
 snapshot(){return{enabled:this.owned,actors:this.slots.length,pending:this.pending.length,...this.stats};}
 clear():void{this.world=undefined;this.source=undefined;this.slots=[];this.pending=[];this.owned=false;this.retrying=false;}
}
