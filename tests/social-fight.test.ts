import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { injurePawn } from '../src/sim/health.ts';
import { HP_UNIT } from '../src/sim/injury-rules.ts';
import { validMeleeShape } from '../src/sim/melee-save.ts';
import { canStartSocialFight,socialFightRecoveryDue,startSocialFight } from '../src/sim/social-fight.ts';
import { applyMeleeStun } from '../src/sim/stun.ts';
import { equipmentCamp } from './scenarios/equipment.ts';

test('physical social fight can use an equipped weapon, injures a colonist and resumes exactly',()=>{
  const world=equipmentCamp(2),[a,b]=world.pawns;
  addMaterial(world,'weapon',1,{type:'equipment',pawnId:a.id},'plasteel-knife');
  a.skills.melee.level=16;b.skills.melee.level=16;
  expect(canStartSocialFight(world,a,b)).toBe(true);
  expect(startSocialFight(world,a,b)).toBe(true);
  expect(a.melee?.order).toEqual({targetId:b.id,startedDowned:false,auto:'social'});
  expect(b.melee?.order).toEqual({targetId:a.id,startedDowned:false,auto:'social'});
  expect(a.social?.fight).toEqual({opponentId:b.id,startedAt:world.tick});
  expect(validateWorld(world)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(world));expect(copy).toEqual(world);
  let weaponStrike=false,injured=false;
  for(let i=0;i<450;i++){
    stepWorld(world);stepWorld(copy);expect(copy).toEqual(world);
    weaponStrike ||= !!a.melee?.strike?.tool.startsWith('knife-');
    injured ||= world.pawns.some(p=>!!p.health?.injuries.length||!!p.health?.missing.length);
    expect(validateWorld(world)).toEqual([]);
    if(!a.social?.fight&&!b.social?.fight)break;
  }
  expect(weaponStrike).toBe(true);
  expect(injured).toBe(true);
  expect(world.pawns.some(p=>p.state==='downed'||p.state==='dead')).toBe(true);
  expect(a.social?.fight).toBeUndefined();expect(b.social?.fight).toBeUndefined();
  expect(a.melee?.order).toBeFalsy();expect(b.melee?.order).toBeFalsy();
  stepWorld(world,20);expect(world.pawns.every(p=>p.melee?.order?.auto!=='social')).toBe(true);
});

test('approach and strike recovery both survive a saved continuation',()=>{
  const world=equipmentCamp(2),[a,b]=world.pawns;b.x=8;
  expect(startSocialFight(world,a,b)).toBe(true);
  expect(a.path.length+b.path.length).toBeGreaterThan(0);
  let copy=deserializeWorld(serializeWorld(world));expect(copy).toEqual(world);
  let struck=false;
  for(let i=0;i<120;i++){
    stepWorld(world);stepWorld(copy);expect(copy).toEqual(world);
    expect(validateWorld(world)).toEqual([]);
    if(a.melee?.strike||b.melee?.strike){
      struck=true;copy=deserializeWorld(serializeWorld(world));expect(copy).toEqual(world);
      break;
    }
  }
  expect(struck).toBe(true);
  for(let i=0;i<30;i++){stepWorld(world);stepWorld(copy);expect(copy).toEqual(world);}
});

test('player interruption ends both fighters and applies the paired aftermath once before contact',()=>{
  const world=equipmentCamp(2),[a,b]=world.pawns;
  expect(startSocialFight(world,a,b)).toBe(true);
  expect(applyCommand(world,{type:'draft',pawnIds:[a.id],enabled:true}).ok).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  const saved=deserializeWorld(serializeWorld(world));expect(saved).toEqual(world);
  stepWorld(world);
  expect(a.social?.fight).toBeUndefined();expect(b.social?.fight).toBeUndefined();
  expect(b.melee?.order).toBeFalsy();
  expect(a.social?.memories.filter(m=>m.otherId===b.id&&m.kind.startsWith('fight-'))).toHaveLength(1);
  expect(b.social?.memories.filter(m=>m.otherId===a.id&&m.kind.startsWith('fight-'))).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
});

test('fight route and schema prevalidation reject invalid starts without mutation',()=>{
  const world=equipmentCamp(2),[a,b]=world.pawns;
  applyMeleeStun(world,b,world.tick*10);
  const before=serializeWorld(world);
  expect(canStartSocialFight(world,a,b)).toBe(false);
  expect(startSocialFight(world,a,b)).toBe(false);
  expect(serializeWorld(world)).toBe(before);
  delete b.stun;
  expect(startSocialFight(world,a,b)).toBe(true);
  expect(validMeleeShape(a.melee,125,world.tick)).toBe(true);
  expect(validMeleeShape(a.melee,124,world.tick)).toBe(false);
});

test('a fight interrupts real work ownership and delays recovery draws until 420 Core ticks',()=>{
  const world=equipmentCamp(2),[a,b]=world.pawns;
  world.tiles[5*world.width+6]!.terrain='rock';
  expect(applyCommand(world,{type:'designate',kind:'mine',x:6,z:5}).ok).toBe(true);
  const job=world.jobs.find(j=>j.kind==='mine')!;
  job.status='active';job.reservedBy=a.id;a.priorities.mine=1;a.jobId=job.id;a.state='working';
  expect(applyCommand(world,{type:'draft',pawnIds:[b.id],enabled:true}).ok).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  expect(startSocialFight(world,a,b)).toBe(true);
  expect(a.jobId).toBeNull();expect(job.reservedBy).toBeNull();expect(job.status).toBe('pending');
  expect(b.draft).toBeUndefined();
  expect(validateWorld(world)).toEqual([]);
  const first=world.tick*10,initial=a.social!.rng;
  for(let core=first;core<first+420;core++)expect(socialFightRecoveryDue(a,core)).toBe(false);
  expect(a.social!.rng).toBe(initial);
  const due=Array.from({length:30},(_,i)=>first+420+i).find(core=>(core+a.id)%30===0)!;
  socialFightRecoveryDue(a,due);expect(a.social!.rng).not.toBe(initial);
});

test('external downing or death remains saveable before the paired fight cleanup',()=>{
  for(const fatal of [false,true]){
    const world=equipmentCamp(2),[a,b]=world.pawns;
    expect(startSocialFight(world,a,b)).toBe(true);
    if(fatal)injurePawn(world,b,'heart','cut',15000);
    else {
      injurePawn(world,b,'left-leg','crush',30*HP_UNIT);
      injurePawn(world,b,'right-leg','crush',30*HP_UNIT);
    }
    expect(b.state).toBe(fatal?'dead':'downed');
    expect(validateWorld(world)).toEqual([]);
    const copy=deserializeWorld(serializeWorld(world));expect(copy).toEqual(world);
    stepWorld(world);stepWorld(copy);expect(copy).toEqual(world);
    expect(a.social?.fight).toBeUndefined();expect(b.social?.fight).toBeUndefined();
    expect(a.melee?.order).toBeFalsy();expect(validateWorld(world)).toEqual([]);
  }
});
