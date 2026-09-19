import { HP_UNIT } from '../src/sim/injury-rules';
import { newDoorState } from '../src/sim/door-rules';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { pursuitCamp } from './scenarios/pursuit';
import { encounterCamp } from './scenarios/encounter';
import { fixtureBuilding } from './scenarios/deconstruction';
import { firingPosition,tacticalClaims } from '../src/sim/tactical-positions';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { blockedCells } from '../src/sim/pathfinding';
import { findShotLine } from '../src/sim/combat-space';
import { newTactics } from '../src/sim/tactics-state';
import { healthRandom,injurePawn } from '../src/sim/health';
import { startingPawn } from '../src/sim/starting-pawns';
import { addMaterial } from '../src/sim/materials';
const run=(w:ReturnType<typeof pursuitCamp>,n:number)=>{for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}};
function continuation(w:ReturnType<typeof pursuitCamp>,n:number){const loaded=deserializeWorld(serializeWorld(w));for(let i=0;i<n;i++){stepWorld(w);stepWorld(loaded);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);expect(loaded).toEqual(w);}}

test('visible threat outside range: physical approach, held firing post, actual shot and exact continuation of every phase',()=>{
  const w=pursuitCamp(),enemy=w.pawns[3],start=enemy.x;
  run(w,1);expect(enemy.tactics?.targetId).toBe(w.pawns[0].id);expect(enemy.path.length).toBeGreaterThan(0);expect(enemy.shooting).toBeUndefined();
  continuation(w,12);expect(enemy.x).toBeLessThan(start);expect(enemy.shooting).toBeUndefined();
  let reached=false;
  for(let i=0;i<100;i++){run(w,1);if(enemy.shooting?.stance?.phase==='aim'){reached=true;break;}}
  expect(reached).toBe(true);expect(enemy.motion!.end).toBeLessThanOrEqual(w.tick);expect(enemy.tactics?.post).toMatchObject({x:enemy.x,z:enemy.z});
  continuation(w,3);expect(enemy.lastAttack?.targetId).toBe(w.pawns[0].id);expect(enemy.shooting?.stance?.phase).toBe('cooldown');continuation(w,18);
});

test('target moves, geometry changes, and loss of visibility: replan after recovery without firing in transit',()=>{
  const w=pursuitCamp(),p=w.pawns[0],enemy=w.pawns[3];p.x=30;
  run(w,15);expect(enemy.lastAttack).toBeDefined();
  expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:6,z:40},queue:false}).ok).toBe(true);
  let moved=false,attacks=0,last=-1;
  for(let i=0;i<180;i++){run(w,1);if(enemy.lastAttack&&enemy.lastAttack.atCore!==last){last=enemy.lastAttack.atCore;attacks++;expect(enemy.motion?.end??0).toBeLessThanOrEqual(last/10);}if(enemy.path.length)moved=true;}
  expect(moved).toBe(true);expect(attacks).toBeGreaterThan(0);continuation(w,12);
  // A complete wall hides all targets; no invented knowledge after expiry.
  const hidden=pursuitCamp();for(let z=0;z<64;z++)fixtureBuilding(hidden,'wall',32,z);
  run(hidden,80);expect(hidden.pawns[3].tactics?.targetId).toBeNull();expect(hidden.pawns[3].x).toBe(52);
});

test('cover ranking excludes inaccessible winners, occupied posts and services; nearby cover holds its position',()=>{
  const w=pursuitCamp(),p=w.pawns[3],target=w.pawns[0];p.x=29;target.x=12;
  fixtureBuilding(w,'wall',28,16); // usable cover, with a leaning line
  let result=firingPosition(w,p,target,25.9,captureWorldShotGrid(w),blockedCells(w));
  expect(result?.post).toEqual({x:p.x,z:p.z});expect(result?.path).toEqual([]);
  // Another shooter's claim prevents choosing the same cover; unreachable cells
  // behind the sealed ring are ranked, but cannot win connectivity.
  const other=w.pawns[1];other.faction='outlaws';other.tactics={targetId:target.id,post:{x:p.x,z:p.z},reviewAtCore:500};
  for(let x=20;x<=24;x++){fixtureBuilding(w,'wall',x,12);fixtureBuilding(w,'wall',x,20);}
  for(let z=13;z<20;z++){fixtureBuilding(w,'wall',20,z);fixtureBuilding(w,'wall',24,z);}
  result=firingPosition(w,p,target,25.9,captureWorldShotGrid(w),blockedCells(w));expect(result).toBeDefined();
  expect(tacticalClaims(w,p).has(result!.post.z*w.width+result!.post.x)).toBe(false);
  expect(result!.post.x>20&&result!.post.x<24&&result!.post.z>12&&result!.post.z<20).toBe(false);
  expect(findShotLine(captureWorldShotGrid(w),result!.post,{cell:target,leans:true},25.9).ok).toBe(true);
});

test('unarmed pursuit reaches contact; target fall clears intent, weapon loss switches to melee and old sentries stay fixed',()=>{
  const w=pursuitCamp(false),enemy=w.pawns[3];enemy.x=22;
  run(w,1);expect(enemy.melee?.order?.targetId).toBe(w.pawns[0].id);continuation(w,20);run(w,45);expect(enemy.lastAttack).toBeDefined();
  const armed=pursuitCamp(),fighter=armed.pawns[3];run(armed,5);armed.piles=[];run(armed,10);expect(fighter.melee?.order).toBeDefined();continuation(armed,8);
  injurePawn(armed,armed.pawns[0],'torso','crush',100*HP_UNIT);run(armed,5);expect(fighter.tactics?.targetId).not.toBe(armed.pawns[0].id);
  const disabled=pursuitCamp();run(disabled,5);const npc=disabled.pawns[3];injurePawn(disabled,npc,'torso','crush',100*HP_UNIT);
  expect(npc.tactics).toEqual(newTactics());expect(npc.path).toEqual([]);continuation(disabled,10);
  const old=encounterCamp(),sentry=old.pawns[3];old.pawns[0].x=1;old.pawns[0].z=1;const origin={x:sentry.x,z:sentry.z};run(old,40);expect(sentry).toMatchObject(origin);expect(sentry.tactics).toBeUndefined();
});

test('mobile opponents reserve different posts and obey a closed colonial doorway without invalidating committed edges',()=>{
  const w=pursuitCamp(),first=w.pawns[3];
  const second=startingPawn(w.nextId++,'Second',52,18,0,100);second.faction='outlaws';second.tactics=newTactics();second.schedule.fill('work');w.pawns.push(second);
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:second.id},'revolver');
  run(w,10);expect(first.tactics?.post).not.toEqual(second.tactics?.post);expect(first.path.length+second.path.length).toBeGreaterThan(0);continuation(w,60);
  // Neither an invisible target nor a locked shortcut authorizes crossing a wall.
  const closed=pursuitCamp(false),enemy=closed.pawns[3];enemy.x=36;
  for(let z=0;z<64;z++)if(z!==16)fixtureBuilding(closed,'wall',32,z);
  const door=Object.assign(fixtureBuilding(closed,'door',32,16),{material:'wood' as const,door:newDoorState(closed.tick)});run(closed,80);expect(enemy.x).toBe(36);expect(enemy.melee).toBeUndefined();
  Object.assign(door.door,{open:true,holdOpen:true,from:1,changedAt:closed.tick});run(closed,120);expect(enemy.x).toBeLessThan(32);expect(enemy.lastAttack).toBeDefined();
});

test('strict V60 migration, invalid mandates/references/routes/deadlines and same-state randomized continuation',()=>{
  const old=encounterCamp();const saved=JSON.parse(serializeWorld(old));saved.schemaVersion=60;
  const migrated=deserializeWorld(JSON.stringify(saved));expect(migrated.schemaVersion).toBe(61);expect(migrated.pawns[3].tactics).toBeUndefined();
  saved.pawns[3].tactics=newTactics();expect(()=>deserializeWorld(JSON.stringify(saved))).toThrow('version 60');
  const w=pursuitCamp();run(w,2);
  for(const mutate of [
    (s:any)=>s.pawns[3].tactics=[],(s:any)=>s.pawns[0].tactics=newTactics(),
    (s:any)=>s.pawns[3].tactics.targetId=999999,(s:any)=>s.pawns[3].tactics.post={x:-1,z:4},
    (s:any)=>s.pawns[3].tactics.reviewAtCore=s.tick*10+551,
    (s:any)=>s.pawns[3].tactics.targetId=null,(s:any)=>s.pawns[3].tactics.post={x:1,z:1},
    (s:any)=>s.pawns[0].draft.target={...s.pawns[3].tactics.post},
  ]){const s=JSON.parse(serializeWorld(w));mutate(s);expect(()=>deserializeWorld(JSON.stringify(s))).toThrow();}
  // Multiple deterministic target orders while the enemy moves and shoots.
  const random={rng:91811};for(let i=0;i<6;i++){
    const goal={x:5+Math.floor(healthRandom(random)*20),z:8+Math.floor(healthRandom(random)*30)};
    applyCommand(w,{type:'draft-move',pawnIds:[w.pawns[0].id],target:goal,queue:false});continuation(w,15);
  }
});
