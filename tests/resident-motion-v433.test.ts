import {expect,test} from 'vitest';
import {MotionRecorder} from '../src/bridge/motion-tracks';
import type {SnapshotMessage} from '../src/bridge/snapshots';
import type {World} from '../src/sim/types';
import type {PresentationSegment} from '../src/sim/travel-timing';
import {ResidentMotionRecorder,ResidentMotionEncoder,ResidentMotionFrameOwner} from '../src/bridge/resident-motion';

const own=(v:object,k:PropertyKey)=>Object.hasOwn(v,k);
const edge=(start:number,end=start+3):PresentationSegment=>({from:{x:-0,z:2},to:{x:1,z:2},start,end,terrainDelay:undefined});
// Codec-only partial fixture: explicit legacy296 preserves the original Recorder oracle.
function world(){return{schemaVersion:296,tick:0,nextId:100,pawns:[{id:1,motion:edge(0)}],wildlife:{animals:[{id:2,motion:edge(0)}]},mechanoids:[{id:3,motion:edge(0)}]} as unknown as World;}
function packet(w:World,revision:number,motion?:unknown,checkpoint=revision===1):SnapshotMessage<true>{const p={type:'snapshot',kind:checkpoint?'checkpoint':'delta',epoch:1,revision,...checkpoint?{}:{baseRevision:revision-1},world:{schemaVersion:w.schemaVersion,tick:w.tick,nextId:w.nextId},stepMs:0,speed:1};return(arguments.length>=3?{...p,motion}:p) as unknown as SnapshotMessage<true>;}
function exact(actual:unknown,expected:unknown):void {expect(actual).toStrictEqual(expected);if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){expect(Reflect.ownKeys(actual)).toEqual(Reflect.ownKeys(expected));for(const key of Reflect.ownKeys(expected))if(key!=='length')exact((actual as Record<PropertyKey,unknown>)[key],(expected as Record<PropertyKey,unknown>)[key]);}}
function harness(){const w=world(),recorder=new ResidentMotionRecorder(),oracle=new MotionRecorder(),encoder=new ResidentMotionEncoder(),owner=new ResidentMotionFrameOwner();let revision=0;
 const capture=(checkpoint=false)=>{recorder.capture(w);oracle.capture(w);const expected=structuredClone(oracle.snapshot()),full=packet(w,++revision,recorder.snapshot(),checkpoint||revision===1),encoded=encoder.capture(full);return{expected,full,encoded};};
 const admit=(row:ReturnType<typeof capture>)=>{const input=structuredClone(row.encoded.publication),draft=owner.prepare(input,structuredClone(row.encoded.motion));expect(draft).toBeDefined();if(!draft)throw Error('Refused');expect(()=>owner.read(input)).toThrow();expect(owner.canCommit(draft.publication,draft)).toBe(true);owner.commit(input,draft.publication,draft);exact(owner.read(input),row.expected);return{input,value:owner.read(input)!,draft};};
 return{w,recorder,oracle,encoder,owner,capture,admit};}

test('complex 160-tick Recorder history is an exact old-fullwire oracle, including retired actors, trims and old exposed arrays',()=>{
 const h=harness(),held:{value:unknown;expected:unknown}[]=[];let trimmed=false;
 for(let tick=0;tick<160;tick++){
  h.w.tick=tick;for(const actor of [...h.w.pawns,...h.w.wildlife!.animals,...h.w.mechanoids!]){const start=Math.floor(tick/3)*3;actor.motion=edge(start);if(actor.id===1&&tick%11===0){actor.motion.stagger=[{start,end:start+.5}];actor.motion.end=start+4;}if(actor.id===2&&tick%17===0){actor.motion.stuns=[{start,end:start+.5}];actor.motion.end=start+3.5;}}
  if(tick===35)h.w.pawns=[];if(tick===45)h.w.pawns=[{id:4,motion:edge(tick)} as World['pawns'][number]];
  const row=h.capture(),section=row.encoded.motion.section;if(section.mode==='tracks'&&section.rows.some(r=>r.drop>0))trimmed=true;
  const accepted=h.admit(row);held.push({value:accepted.value,expected:structuredClone(row.expected)});
  if(tick>35)expect(accepted.value.some(t=>t.id===1)).toBe(true);
 }
 expect(trimmed).toBe(true);for(const old of held)exact(old.value,old.expected);
});

test('same-tick correction follows only the existing Recorder start/end semantics',()=>{
 const h=harness();const a=h.admit(h.capture()),before=structuredClone(a.value);
 h.w.pawns[0]!.motion!.to.x=9;h.w.pawns[0]!.motion!.terrainDelay=8;
 const unchanged=h.capture(),section=unchanged.encoded.motion.section;expect(section.mode==='tracks'&&section.rows.length).toBe(0);h.admit(unchanged);
 h.w.pawns[0]!.motion!.end=4;const changed=h.admit(h.capture());expect(changed.value[0]!.segments.at(-1)!.to.x).toBe(9);exact(a.value,before);
});

test('unchanged tracks and segment identities remain resident, exact own undefined and negative zero survive',()=>{
 const h=harness(),a=h.admit(h.capture()),b=h.admit(h.capture());expect(b.value[0]).toBe(a.value[0]);expect(b.value[0]!.segments).toBe(a.value[0]!.segments);
 const first=b.value[0]!.segments[0]!;expect(own(first,'terrainDelay')).toBe(true);expect(Object.is(first.from.x,-0)).toBe(true);expect(Object.isFrozen(h.w.pawns[0]!.motion)).toBe(false);expect(Object.isFrozen(first)).toBe(true);expect(Object.isFrozen(first.from)).toBe(true);expect(Object.isFrozen(b.value[0]!.segments)).toBe(true);expect(()=>{first.to.x=999;}).toThrow();
 h.w.tick=3;h.w.pawns[0]!.motion=edge(3);const c=h.admit(h.capture());expect(c.value[0]!.segments[0]).toBe(first);expect(c.value[1]).toBe(b.value[1]);
});

test('reset and teleport retain the literal Recorder reset contract at a new checkpoint',()=>{
 const h=harness(),a=h.admit(h.capture()),before=structuredClone(a.value);h.recorder.reset();h.oracle.reset();h.w.tick=0;h.w.pawns=[];h.w.wildlife!.animals=[];h.w.mechanoids=[];
 const empty=h.capture(true);expect(empty.encoded.motion.section).toMatchObject({mode:'tracks',reset:true,count:0,rows:[]});expect(h.admit(empty).value).toEqual([]);exact(a.value,before);
 h.w.pawns=[{id:5,motion:{...edge(0),from:{x:11,z:11},to:{x:11,z:11}}} as World['pawns'][number]];h.admit(h.capture());
});

test('generation reset also works on an adjacent same-tick private delta',()=>{
 const h=harness();h.admit(h.capture());h.recorder.reset();h.oracle.reset();h.w.pawns=[];h.w.wildlife!.animals=[];h.w.mechanoids=[];const row=h.capture();expect(row.encoded.motion.section).toMatchObject({mode:'tracks',reset:true,count:0});h.admit(row);
});

test('public mutable snapshots stay literal, with copies rather than an identity trust grant',()=>{
 const w=world(),encoder=new ResidentMotionEncoder(),owner=new ResidentMotionFrameOwner(),motion=[{id:1,segments:[edge(0)]}],full=packet(w,1,motion),encoded=encoder.capture(full);expect(encoded.motion.section.mode).toBe('literal');expect(full.motion).toBe(motion);
 const input=structuredClone(encoded.publication),draft=owner.prepare(input,structuredClone(encoded.motion));expect(draft).toBeDefined();if(!draft)throw Error('Refused');owner.commit(input,draft.publication,draft);const old=structuredClone(owner.read(input));motion[0]!.segments[0]!.to.x=8;exact(owner.read(input),old);
 const next=encoder.capture(packet(w,2,motion));expect(next.motion.section.mode).toBe('literal');
});

test('strict absent, own undefined, certified empty and literal empty are distinct',()=>{
 for(const mode of ['absent','undefined','certified-empty','literal-empty'] as const){const w=world(),encoder=new ResidentMotionEncoder(),owner=new ResidentMotionFrameOwner(),r=new ResidentMotionRecorder(),full=mode==='absent'?packet(w,1):packet(w,1,mode==='undefined'?undefined:mode==='certified-empty'?r.snapshot():[]),encoded=encoder.capture(full),input=structuredClone(encoded.publication),draft=owner.prepare(input,structuredClone(encoded.motion));expect(draft).toBeDefined();if(!draft)throw Error('Refused');expect(own(draft.publication,'motion')).toBe(mode!=='absent');owner.commit(input,draft.publication,draft);exact(owner.read(input),mode.endsWith('empty')?[]:undefined);}
});

test('missing and skipped predecessors refuse and leave retries and old admitted reads intact',()=>{
 const h=harness(),a=h.admit(h.capture()),b=h.capture(),c=h.capture();expect(new ResidentMotionFrameOwner().prepare(b.encoded.publication,b.encoded.motion)).toBeUndefined();expect(h.owner.prepare(c.encoded.publication,c.encoded.motion)).toBeUndefined();expect(()=>h.owner.read(b.encoded.publication)).toThrow();h.admit(b);h.admit(c);exact(h.owner.read(a.input),a.value);
});

test('prepare and canCommit cannot publish a partial or stale motion value',()=>{
 const h=harness();h.admit(h.capture());const row=h.capture(),input=structuredClone(row.encoded.publication),draft=h.owner.prepare(input,structuredClone(row.encoded.motion));expect(draft).toBeDefined();if(!draft)throw Error('Refused');expect(()=>h.owner.read(input)).toThrow();expect(new ResidentMotionFrameOwner().canCommit(draft.publication,draft)).toBe(false);expect(h.owner.canCommit({...draft.publication,motion:[]} as SnapshotMessage<true>,draft)).toBe(false);
 h.admit(row);expect(h.owner.canCommit(draft.publication,draft)).toBe(false);expect(()=>h.owner.commit(input,draft.publication,draft)).toThrow();expect(()=>h.owner.read(input)).toThrow();
});

test('producer preparation stages without consuming revision and rejects a stale commit',()=>{
 const w=world(),r=new ResidentMotionRecorder(),e=new ResidentMotionEncoder();r.capture(w);const p=packet(w,1,r.snapshot()),a=e.prepare(p),b=e.prepare(p);e.commit(a);expect(()=>e.commit(b)).toThrow();expect(()=>e.capture(packet(w,2,r.snapshot()))).not.toThrow();
});

test('malformed order, bounds, marker and own-data descriptors refuse without advancing',()=>{
 const h=harness();h.admit(h.capture());h.w.tick=3;h.w.pawns[0]!.motion=edge(3);const good=h.capture();
 const corruptions:((s:any,p:any)=>void)[]=[(s,p)=>delete p.world.schemaVersion,(s,p)=>p.world.schemaVersion=298,(s,p)=>p.motion=[],s=>s.tick++,s=>s.section.count++,s=>s.section.order=[1,1,3],s=>s.section.rows[0].drop=999,s=>s.section.rows[0].append[0].from.x=Infinity,s=>s.section.rows.push(s.section.rows[0]),s=>Object.defineProperty(s.section,Symbol('expando'),{value:1,enumerable:true}),s=>Object.defineProperty(s.section,'count',{value:3,enumerable:false})];
 for(const corrupt of corruptions){const s=structuredClone(good.encoded.motion),p=structuredClone(good.encoded.publication);corrupt(s,p);expect(h.owner.prepare(p,s)).toBeUndefined();expect(()=>h.owner.read(p)).toThrow();}
 let reads=0;const s=structuredClone(good.encoded.motion);Object.defineProperty(s.section,'rows',{enumerable:true,get(){reads++;return[];}});expect(h.owner.prepare(good.encoded.publication,s)).toBeUndefined();expect(reads).toBe(0);h.admit(good);
});

test('an explicit valid ordering patch preserves caller-visible track order',()=>{
 const h=harness();h.admit(h.capture());const row=h.capture(),side=structuredClone(row.encoded.motion);if(side.section.mode!=='tracks')throw Error('Wrong mode');Object.assign(side.section,{order:[3,1,2]});const input=structuredClone(row.encoded.publication),draft=h.owner.prepare(input,side);expect(draft).toBeDefined();if(!draft)throw Error('Refused');h.owner.commit(input,draft.publication,draft);expect(h.owner.read(input)!.map(t=>t.id)).toEqual([3,1,2]);
});

test('empty aliased slow arrays remain value-exact when modified without a new Recorder edge',()=>{
 const h=harness();h.w.pawns[0]!.motion!.stagger=[];const a=h.admit(h.capture()),before=structuredClone(a.value);h.w.pawns[0]!.motion!.stagger!.push({start:0,end:.5});const b=h.admit(h.capture());expect(b.value[0]!.segments[0]!.stagger).toEqual([{start:0,end:.5}]);exact(a.value,before);
});
