/** Only the three actual WorldPawns sets. No generic registry, Pawn payload,
 * history, hash buckets or event/RNG clock. All transitions return a private
 * immutable successor; the real owner commits it with its physical change. */
export interface NativeWorldPawnSlots256 {
 readonly slots:readonly (number|null)[];
 /** Native freeList chain represented bottom-to-top, final index reused next. */
 readonly free:readonly number[];
}
export interface NativeWorldPawnOrder256 {
 readonly revision:1;
 readonly birth:Readonly<{atCore:number;atAbsCore:number;firstThingId:number}>;
 readonly alive:NativeWorldPawnSlots256;
 readonly mothballed:NativeWorldPawnSlots256;
 readonly dead:NativeWorldPawnSlots256;
}
const integer=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v);
function dataObject(v:unknown,keys:readonly string[]):v is Record<string,unknown> {
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)return false;
 const own=Reflect.ownKeys(v);return own.length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return !!d&&d.enumerable===true&&Object.hasOwn(d,'value');});
}
function dense(v:unknown,max:number):v is unknown[] {
 if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length>max||Reflect.ownKeys(v).length!==v.length+1)return false;
 for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!d.enumerable||!Object.hasOwn(d,'value'))return false;}return true;
}
function freezeSlots(slots:readonly (number|null)[],free:readonly number[]):NativeWorldPawnSlots256 {
 return Object.freeze({slots:Object.freeze([...slots]),free:Object.freeze([...free])});
}
/** Invoke only at the actual new World/draft constructor. No omitted anchor,
 * missing-state initializer or load/migration fallback exists. */
export function constructNativeWorldPawnOrder256(birth:NativeWorldPawnOrder256['birth']):NativeWorldPawnOrder256 {
 if(!dataObject(birth,['atCore','atAbsCore','firstThingId'])||birth.atCore!==0||!integer(birth.atAbsCore)||birth.atAbsCore<0||!integer(birth.firstThingId)||birth.firstThingId<1)throw Error('Actual new WorldPawns birth anchors required');
 return Object.freeze({revision:1,birth:Object.freeze({...birth}),alive:freezeSlots([],[]),mothballed:freezeSlots([],[]),dead:freezeSlots([],[])});
}
/** Shape/slot guard only. The campaign guard must ALSO bind every ID to its
 * one physical WorldPawn and actual alive/mothballed/dead mode. */
export function validNativeWorldPawnOrder256(value:unknown,nextThingId:number,atCore:number):value is NativeWorldPawnOrder256 {
 if(!integer(nextThingId)||nextThingId<1||!integer(atCore)||atCore<0||!dataObject(value,['revision','birth','alive','mothballed','dead'])||value.revision!==1)return false;
 const b=value.birth;if(!dataObject(b,['atCore','atAbsCore','firstThingId'])||b.atCore!==0||!integer(b.atAbsCore)||b.atAbsCore<0||!integer(b.firstThingId)||b.firstThingId<1||b.firstThingId>nextThingId)return false;
 const seen=new Set<number>();
 for(const key of ['alive','mothballed','dead'] as const){
  const s=value[key];if(!dataObject(s,['slots','free'])||!dense(s.slots,nextThingId-b.firstThingId)||!dense(s.free,s.slots.length))return false;
  // A fully vacant nonempty prefix is impossible: Remove resets lastIndex
  // and freeList when count becomes0, independent of allocated capacity.
  if(s.slots.length>0&&s.slots.length===s.free.length)return false;
  const holes=new Set<number>();
  for(let i=0;i<s.slots.length;i++){const id=s.slots[i];if(id===null)holes.add(i);else if(!integer(id)||id<b.firstThingId||id>=nextThingId||seen.has(id))return false;else seen.add(id);}
  if(holes.size!==s.free.length)return false;
  for(const index of s.free){if(!integer(index)||index<0||index>=s.slots.length||!holes.delete(index))return false;}
  if(holes.size!==0)return false;
 }return true;
}
/** Cold RAW/full boundary only: retain the supplied slots/LIFO order exactly,
 * never reconstruct them from owners, IDs or membership after parsing. */
export function restoreNativeWorldPawnOrder256(value:unknown,nextThingId:number,atCore:number):NativeWorldPawnOrder256 {
 if(!validNativeWorldPawnOrder256(value,nextThingId,atCore))throw Error('Invalid actual native WorldPawns order');
 return Object.freeze({revision:1,birth:Object.freeze({...value.birth}),alive:freezeSlots(value.alive.slots,value.alive.free),mothballed:freezeSlots(value.mothballed.slots,value.mothballed.free),dead:freezeSlots(value.dead.slots,value.dead.free)});
}
function requireId(state:NativeWorldPawnOrder256,id:number):void {
 if(!integer(id)||id<state.birth.firstThingId)throw Error('Actual allocated WorldPawn ID required');
}
function remove(s:NativeWorldPawnSlots256,id:number):NativeWorldPawnSlots256 {
 const index=s.slots.indexOf(id);if(index<0)return s;
 // count1 → native logical reset, not a list of tombstones/history.
 if(s.slots.length-s.free.length===1)return freezeSlots([],[]);
 const slots=[...s.slots];slots[index]=null;return freezeSlots(slots,[...s.free,index]);
}
function add(s:NativeWorldPawnSlots256,id:number):NativeWorldPawnSlots256 {
 if(s.slots.includes(id))return s;
 const slots=[...s.slots],free=[...s.free];
 if(free.length)slots[free.pop()!]=id;else slots.push(id);return freezeSlots(slots,free);
}
function contained(state:NativeWorldPawnOrder256,id:number):boolean {
 return state.alive.slots.includes(id)||state.mothballed.slots.includes(id)||state.dead.slots.includes(id);
}
/** Actual successful PassToWorld/AddPawn branch. Existing membership is a
 * no-op as in PassToWorld's Contains guard, never an inferred mode transfer. */
export function passNativeWorldPawnOrder256(state:NativeWorldPawnOrder256,id:number,terminal:boolean):NativeWorldPawnOrder256 {
 requireId(state,id);if(typeof terminal!=='boolean')throw Error('Actual terminal fact required');if(contained(state,id))return state;
 return terminal?Object.freeze({...state,dead:add(state.dead,id)}):Object.freeze({...state,alive:add(state.alive,id)});
}
/** Slot portion of RemovePawn ONLY. Clinical mothball remainder/GC cancellation
 * and physical transfer belong to the real owner, outside this pure leaf. */
export function removeNativeWorldPawnOrder256(state:NativeWorldPawnOrder256,id:number):NativeWorldPawnOrder256 {
 requireId(state,id);const alive=remove(state.alive,id),mothballed=remove(state.mothballed,id),dead=remove(state.dead,id);
 return alive===state.alive&&mothballed===state.mothballed&&dead===state.dead?state:Object.freeze({...state,alive,mothballed,dead});
}
/** Actual Notify_PawnDestroyed: absent/dead are no-ops. This creates neither
 * clinical death nor a discarded Pawn and does not remove its real payload. */
export function destroyNativeWorldPawnOrder256(state:NativeWorldPawnOrder256,id:number):NativeWorldPawnOrder256 {
 requireId(state,id);if(!state.alive.slots.includes(id)&&!state.mothballed.slots.includes(id))return state;
 return Object.freeze({...state,alive:remove(state.alive,id),mothballed:remove(state.mothballed,id),dead:add(state.dead,id)});
}
/** Only after the actual ShouldMothball/clinical preflight succeeds for this
 * member of DoMothballProcessing's alive snapshot. No policy is invented here. */
export function mothballNativeWorldPawnOrder256(state:NativeWorldPawnOrder256,id:number):NativeWorldPawnOrder256 {
 requireId(state,id);if(!state.alive.slots.includes(id))throw Error('Actual alive mothball source is absent');
 return Object.freeze({...state,alive:remove(state.alive,id),mothballed:add(state.mothballed,id)});
}
/** Concrete WorldPawns portions for PawnsFinder: alive then mothballed, dead
 * separate at its real Finder position. Maps/Temporary are NOT filled here. */
export function captureNativeWorldPawnFinderIds256(state:NativeWorldPawnOrder256):Readonly<{alive:readonly number[];dead:readonly number[]}> {
 const live=(s:NativeWorldPawnSlots256)=>s.slots.filter((id):id is number=>id!==null);
 return Object.freeze({alive:Object.freeze([...live(state.alive),...live(state.mothballed)]),dead:Object.freeze(live(state.dead))});
}
