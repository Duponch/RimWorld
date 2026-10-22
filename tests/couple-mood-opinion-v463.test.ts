import {afterEach,expect,test,vi} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {moodThoughts,personalMoodThoughts,moodTarget,updateMood,updateMoodFromThoughts,expireMealMemoriesAt} from '../src/sim/mood.ts';
import {opinionCauses,opinionOf} from '../src/sim/social-state.ts';
import {addCoupleMemory285,coupleMoodThoughts285,coupleOpinionOffset285,COUPLE_MEMORY_DURATION_285 as D} from '../src/sim/couple-memories-285.ts';
import * as relationshipNamespace from '../src/sim/relationship-namespace.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {Pawn} from '../src/sim/types.ts';

afterEach(()=>vi.restoreAllMocks());
function camp(){
 const w=medicalCamp(3),[a,b,c]=w.pawns as [Pawn,Pawn,Pawn];
 for(const p of w.pawns){delete p.familyBereavement;delete p.romanceMemories;delete p.bereavement;delete p.deathThoughts;delete p.social;delete p.traits;delete p.mental;
  Object.assign(p,{hunger:80,rest:80,comfort:50,beauty:50,mood:50,state:'idle',memories:[]});p.recreation.level=50;}
 b.name='Camille';c.name='Camille';a.coupleMemories285=[{otherId:b.id,at:w.tick},{otherId:b.id,at:w.tick},{otherId:c.id,at:w.tick}];
 return {w,a,b,c};
}
/** Same actual people moved into the ordinary away-owner representation.
 * This is a reader/kernel witness, not a played formation or geographic trip. */
function movePartnersAway(s:ReturnType<typeof camp>):AwayGroup {
 const {w,b,c}=s;w.pawns=w.pawns.filter(p=>p!==b&&p!==c);
 const group:AwayGroup={id:1,phase:'at-site',members:[b,c],items:[],startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,
  destination:1,tile:1,route:[1],segment:null,paused:false,stop:{kind:'at-site'},entry:{x:0,z:0},ledger:emptyGroupLedger(),
  baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0}};
 w.group=group;return group;
}
const couple=(thoughts:ReturnType<typeof moodThoughts>)=>thoughts.filter(t=>t.id.startsWith('couple-'));

test('map labels use the actual local names, separate equal names and perform no owner capture',()=>{
 const {w,a,b,c}=camp(),capture=vi.spyOn(relationshipNamespace,'captureRelationshipPeople'),before=JSON.stringify(w),rng=w.rng;
 const thoughts=couple(moodThoughts(w,a));
 expect(thoughts).toEqual(coupleMoodThoughts285(a,w.tick,{get:id=>w.pawns.find(p=>p.id===id)}));
 expect(thoughts.map(t=>t.id)).toEqual([`couple-${b.id}`,`couple-${c.id}`]);expect(thoughts[0]!.label).toContain('Camille ×2');
 expect(capture).not.toHaveBeenCalled();expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
});

test('a same-tick rename, new event and removal are visible without a shared tick cache',()=>{
 const {w,a,b}=camp(),tick=w.tick;
 moodThoughts(w,a);b.name='Nouveau nom';addCoupleMemory285(a,b.id,w.tick);
 expect(couple(moodThoughts(w,a))[0]).toMatchObject({label:'Moment intime avec Nouveau nom ×3'});
 delete a.coupleMemories285;expect(couple(moodThoughts(w,a))).toEqual([]);expect(w.tick).toBe(tick);
});

test('displaying away partner names captures the real namespace once per read and sees same-tick owner updates',()=>{
 const s=camp(),group=movePartnersAway(s),capture=vi.spyOn(relationshipNamespace,'captureRelationshipPeople');
 expect(group.members[0]).toBe(s.b);expect(couple(moodThoughts(s.w,s.a)).map(t=>t.label)).toEqual(['Moment intime avec Camille ×2','Moment intime avec Camille']);
 expect(capture).toHaveBeenCalledTimes(1);s.b.name='Partenaire en voyage';
 expect(couple(moodThoughts(s.w,s.a))[0]!.label).toContain('Partenaire en voyage');expect(capture).toHaveBeenCalledTimes(2);
});

test('expired couple events never ask for an away name or capture owner knowledge',()=>{
 const s=camp();movePartnersAway(s);s.w.tick+=D;const capture=vi.spyOn(relationshipNamespace,'captureRelationshipPeople');
 expect(couple(moodThoughts(s.w,s.a))).toEqual([]);expect(capture).not.toHaveBeenCalled();
});

test('SIM omits only new couple names while preserving all values and the actual mood update',()=>{
 const s=camp();movePartnersAway(s);const full=moodThoughts(s.w,s.a),expected=structuredClone(s.a);
 updateMoodFromThoughts(expected,full);const capture=vi.spyOn(relationshipNamespace,'captureRelationshipPeople');
 const anonymous=moodThoughts(s.w,s.a,undefined,undefined,false);
 expect(anonymous.map(({label:_,...rest})=>rest)).toEqual(full.map(({label:_,...rest})=>rest));
 expect(moodTarget(anonymous)).toBe(moodTarget(full));updateMood(s.w,s.a);
 expect(s.a.mood).toBe(expected.mood);expect(capture).not.toHaveBeenCalled();
});

test('personal away readers use their supplied real people and leave all old labels unchanged',()=>{
 const {w,a,b}=camp();a.social={rng:1,memories:[{otherId:b.id,kind:'insult',at:w.tick,offset:-15}]};
 a.memories=[{kind:'ate-raw-food',expiresAt:w.tick+6000}];
 const people=new Map(w.pawns.map(p=>[p.id,p])),context={tick:w.tick,people,items:w.piles,difficultyMood:0};
 const full=personalMoodThoughts(a,context),anonymous=personalMoodThoughts(a,{...context,resolveCoupleNames285:false});
 expect(couple(full)[0]!.label).toContain(b.name);
 expect(anonymous.filter(t=>!t.id.startsWith('couple-'))).toEqual(full.filter(t=>!t.id.startsWith('couple-')));
 expect(anonymous.map(t=>[t.id,t.offset,t.expiresAt])).toEqual(full.map(t=>[t.id,t.offset,t.expiresAt]));
 const noLabelRead={get:()=>{throw Error('Couple names are not needed for SIM');}};
 expect(()=>personalMoodThoughts(a,{...context,couplePeople285:noLabelRead,resolveCoupleNames285:false})).not.toThrow();
});

test('opinion is directed, already rounded by the pure helper and bounded by the same ten memories',()=>{
 const {w,a,b,c}=camp();a.coupleMemories285=Array.from({length:10},(_,i)=>({otherId:i%2?c.id:b.id,at:w.tick}));
 const before=JSON.stringify(w),value=coupleOpinionOffset285(a,b.id,w.tick),cause=opinionCauses(a,b.id,w.tick).find(c=>c.kind==='couple-intimacy');
 expect(cause).toMatchObject({count:5,value,nextChange:w.tick+D});expect(opinionOf(a,b.id,w.tick)).toBe(value);
 expect(opinionCauses(b,a.id,w.tick).some(c=>c.kind==='couple-intimacy')).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('final opinion decay remains distinct from full mood and expires without stale same-tick causes',()=>{
 const {w,a,b}=camp();a.coupleMemories285=[{otherId:b.id,at:0}];w.tick=D*.85;
 expect(opinionCauses(a,b.id,w.tick).find(c=>c.kind==='couple-intimacy')).toMatchObject({count:1,value:3});
 expect(couple(moodThoughts(w,a))[0]!.offset).toBe(8);
 w.tick=D;expect(opinionOf(a,b.id,w.tick)).toBe(0);expect(couple(moodThoughts(w,a))).toEqual([]);
 addCoupleMemory285(a,b.id,w.tick);expect(opinionOf(a,b.id,w.tick)).toBe(6);expect(couple(moodThoughts(w,a))[0]!.offset).toBe(8);
});

test('the common personal expiry cleans sleeping and terminal records without rewriting personal clocks',()=>{
 for(const state of ['idle','sleeping','dead'] as const){
  const {a,b}=camp();a.state=state;a.coupleMemories285=[{otherId:b.id,at:0}];
  a.coupleClock285={revision:1,rng:99,lastAttemptAtCore:100,nextAllowedAtCore:200};const clock=a.coupleClock285,before=JSON.stringify(clock);
  expireMealMemoriesAt(a,D-1);expect(a.coupleMemories285).toHaveLength(1);expireMealMemoriesAt(a,D);
  expect(Object.hasOwn(a,'coupleMemories285')).toBe(false);expect(a.coupleClock285).toBe(clock);expect(JSON.stringify(clock)).toBe(before);
 }
});

test('a held person keeps mood and directed opinion at the real held frontier, without passive expiry',()=>{
 const {w,a,b}=camp();a.coupleMemories285=[{otherId:b.id,at:0}];a.cryptosleepHeldAt271=100;w.tick=2*D;
 const before=JSON.stringify(a);expireMealMemoriesAt(a,w.tick);
 expect(couple(moodThoughts(w,a))[0]!.offset).toBe(8);expect(opinionOf(a,b.id,w.tick)).toBe(6);expect(JSON.stringify(a)).toBe(before);
});
