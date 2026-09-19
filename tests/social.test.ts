import { describe,expect,test } from 'vitest';
import { injurePawn } from '../src/sim/health';
import { newDoorState } from '../src/sim/door-rules';
import { createMedicalRecord } from '../src/sim/injury-state';
import { medicalCamp } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { advanceSocial,canSocialize,exchangeSocial,goodSocialPosition } from '../src/sim/social';
import { addSocialMemory,deepTalkWeight,expireSocialMemories,memoryOffset,opinionOf,socialCompatibility,socialImpact,type SocialState } from '../src/sim/social-state';

describe('physical social interactions and directed memories',()=>{
  test('passive exchange changes each opinion by the other person’s impact, XP only for initiator, no mood or work interruption',()=>{
    const w=medicalCamp(2),[a,b]=w.pawns; a!.skills.social={level:0,xp:0,dailyXp:0,passion:1};b!.skills.social={level:20,xp:0,dailyXp:0,passion:0};a!.traits=['fast-learner'];
    const before=structuredClone(w),rng=w.rng;
    expect(socialImpact(a!)).toBeCloseTo(.82);expect(socialImpact(b!)).toBeCloseTo(1.37);
    expect(exchangeSocial(w,a!,b!,'deep-talk')).toBe(true);
    expect(opinionOf(a!,b!.id,w.tick)).toBe(21);expect(opinionOf(b!,a!.id,w.tick)).toBe(12);
    expect(a!.skills.social.xp).toBe(17500);expect(b!.skills.social.xp).toBe(0);
    for(let i=0;i<2;i++){const p=w.pawns[i]!,old=before.pawns[i]!;expect([p.mood,p.jobId,p.path,p.orders,p.need,p.haul,p.motion,p.moveCooldown]).toEqual([old.mood,old.jobId,old.path,old.orders,old.need,old.haul,old.motion,old.moveCooldown]);}
    expect(w.rng).toBe(rng);expect(validateWorld(w)).toEqual([]);
    expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);w.tick+=12;expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(true);
    const injured=medicalCamp(2);injured.pawns[0]!.health=createMedicalRecord(injured.tick);injured.pawns[0]!.health.missing.push({part:'tongue',bornAt:0,tended:true});expect(canSocialize(injured,injured.pawns[0]!,true)).toBe(false);expect(canSocialize(injured,injured.pawns[0]!,false)).toBe(true);
  });
  test('strict range, sight/doors and actual presence; sleep, downed, crisis, enemy and silence eligibility',()=>{
    const w=medicalCamp(2),[a,b]=w.pawns;Object.assign(a!,{x:10,z:10});Object.assign(b!,{x:17,z:10});expect(goodSocialPosition(w,a!,b!)).toBe(false);b!.x=16;expect(goodSocialPosition(w,a!,b!)).toBe(true);
    const wall=fixtureBuilding(w,'wall',12,10);expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);w.structures=[];
    const door:import('../src/sim/types').Structure=fixtureBuilding(w,'door',12,10);door.door=newDoorState(0);expect(goodSocialPosition(w,a!,b!)).toBe(false);door.door.open=true;expect(goodSocialPosition(w,a!,b!)).toBe(true);w.structures=[];
    w.tiles[10*w.width+12]={terrain:'rock'};expect(goodSocialPosition(w,a!,b!)).toBe(false);w.tiles[10*w.width+12]={terrain:'grass'};
    for(const state of ['dead','downed','sleeping'] as const){b!.state=state;expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);}b!.state='idle';b!.medicalSleep=true;expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);delete b!.medicalSleep;
    b!.faction='outlaws';expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);delete b!.faction;
    b!.mental={below:[0,0,0],cooldown:0,catharsis:[],crisis:{kind:'sad-wander',age:0,target:null,waitUntil:0}};expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);delete b!.mental;
    w.pawns.pop();expect(exchangeSocial(w,a!,b!,'chitchat')).toBe(false);expect(exchangeSocial(w,a!,a!,'chitchat')).toBe(false);expect(a!.social).toBeUndefined();expect(wall.id).toBeGreaterThan(0);
  });
  test('cumulative chatter does not reset decay, deep talks fade after fourteen days and expire at twenty, newest ten with diminishing returns',()=>{
    const w=medicalCamp(2),p=w.pawns[0]!,id=w.pawns[1]!.id,s:SocialState={rng:1,memories:[]};p.social=s;
    for(let i=0;i<30;i++)addSocialMemory(s,id,'chitchat',0,1);
    expect(s.memories).toHaveLength(1);expect(opinionOf(p,id,0)).toBe(10);expect(s.memories[0]!.offset).toBeCloseTo(19.8);
    addSocialMemory(s,id,'chitchat',5999,1);expect(s.memories[0]!.at).toBe(0);expireSocialMemories(p,6000);expect(s.memories[0]!.offset).toBeCloseTo(19.46);expect(s.memories[0]!.at).toBe(6000);
    s.memories=[];for(let i=0;i<11;i++)addSocialMemory(s,id,'deep-talk',i*12,1);
    expect(s.memories).toHaveLength(10);expect(s.memories[0]!.at).toBe(12);expect(opinionOf(p,id,132)).toBe(98);
    const m={kind:'deep-talk' as const,otherId:id,offset:15,at:0};expect(memoryOffset(m,84000)).toBe(15);expect(memoryOffset(m,102000)).toBeCloseTo(7.5);expect(memoryOffset(m,120000)).toBe(0);
    p.state='dead';expireSocialMemories(p,120120);expect(s.memories).toEqual([]);
    expect(deepTalkWeight(-1.5)).toBe(0);expect(deepTalkWeight(.5)).toBe(.075);expect(deepTalkWeight(9)).toBe(.225);expect(socialCompatibility(42,1,2)).toBe(socialCompatibility(42,2,1));
  });
  test('pending approaches persist without teleporting or rerolling the world RNG, wake resumes natural conversations and replay is exact',()=>{
    const w=medicalCamp(2),[a,b]=w.pawns;b!.x=27;const rng=w.rng;
    for(let i=0;i<2000&&!a!.social?.wants;i++){w.tick++;advanceSocial(w);}expect(a!.social?.wants).toBe(true);expect(a!.social?.memories).toEqual([]);expect(w.rng).toBe(rng);
    const resumed=deserializeWorld(serializeWorld(w));b!.x=a!.x+1;resumed.pawns[1]!.x=b!.x;
    for(let i=0;i<300;i++){w.tick++;resumed.tick++;advanceSocial(w);advanceSocial(resumed);}
    expect(w).toEqual(resumed);expect(a!.social!.memories.length).toBeGreaterThan(0);expect(w.rng).toBe(rng);
    const playing=deserializeWorld(serializeWorld(w)),copy=deserializeWorld(serializeWorld(w));stepWorld(playing,200);stepWorld(copy,200);expect(copy).toEqual(playing);expect(validateWorld(copy)).toEqual([]);
  });
  test('strict old migration, unknown/self/duplicate/expired/corrupt memories rejected and references survive a retained death',()=>{
    const w=medicalCamp(2),legacy=JSON.parse(serializeWorld(w));legacy.schemaVersion=69;expect(deserializeWorld(JSON.stringify(legacy))).toEqual(w);
    const a=w.pawns[0]!,b=w.pawns[1]!;expect(exchangeSocial(w,a,b,'deep-talk')).toBe(true);const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
    for(const mutate of [
      (v:any)=>v.pawns[0].social.rng=0,(v:any)=>v.pawns[0].social.extra=1,(v:any)=>v.pawns[0].social.last.otherId=v.pawns[0].id,
      (v:any)=>v.pawns[0].social.memories[0].otherId=999999,(v:any)=>v.pawns[0].social.memories[0].kind='insult',(v:any)=>v.pawns[0].social.memories[0].offset=21,
      (v:any)=>v.pawns[0].social.memories[0].at=v.tick+1,(v:any)=>v.pawns[0].social.memories=Array(11).fill(v.pawns[0].social.memories[0]),
      (v:any)=>v.pawns[0].skills.social.level=21,(v:any)=>v.schemaVersion=69,
    ]){const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
    // Social references are IDs, not reciprocal pointers or copies of the biography.
    b.social=undefined;expect(opinionOf(b,a.id,w.tick)).toBe(0);expect(opinionOf(a,b.id,w.tick)).toBeGreaterThan(0);
    injurePawn(w,b,'heart','bruise',15000);expect(b.state).toBe('dead');
    const retained=deserializeWorld(serializeWorld(w));expect(retained.pawns[0]!.social!.memories[0]!.otherId).toBe(b.id);expect(opinionOf(retained.pawns[0]!,b.id,w.tick)).toBeGreaterThan(0);
  });
});
