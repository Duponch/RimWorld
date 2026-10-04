import { expect,test } from 'vitest';
import { predationCamp,animal } from './helpers/predation-v190-fixture.ts';
import { startAnimalManhunter,processAnimalManhunter,animalManhunterTarget,advanceAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { tameRefusal } from '../src/sim/animal-handling.ts';
import { scareAnimal } from '../src/sim/wildlife-health.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { startTravel } from '../src/sim/movement.ts';
import { advanceAnimalMelee } from '../src/sim/wildlife-melee.ts';
import { captureWorldShotGrid } from '../src/sim/combat-world.ts';
import { disturbanceEvents } from '../src/sim/disturbance.ts';

function camp(){const {w,foxId}=predationCamp();const a=animal(w,foxId);a.food=.5;return {w,a,p:w.pawns[0]!};}
test('start interrupts ordinary intentions, wakes, keeps the captured edge and never spends global streams',()=>{
  const {w,a}=camp();a.path=[{x:a.x+1,z:a.z}];moveAnimal(w,a,animalNavigation(w).step);
  const edge=structuredClone(a.motion),rng=w.rng,wrng=w.wildlife!.rng;
  a.state='sleeping';a.flee={danger:{x:0,z:0},until:w.tick+500};a.predation={targetId:w.wildlife!.animals[1]!.id,firstHit:true,startedAtCore:w.tick*10};a.taming={designated:true};
  expect(startAnimalManhunter(w,a)).toBe(true);expect(a.motion).toEqual(edge);expect(a.state).toBe('moving');
  expect(a.path).toEqual([]);expect(a.predation).toBeUndefined();expect(a.flee).toBeUndefined();expect(a.taming).toBeUndefined();
  expect(w.rng).toBe(rng);expect(w.wildlife!.rng).toBe(wrng);expect(a.manhunter!.zeroRestTicks).toBe(0);
  const copy=structuredClone(w);expect(startAnimalManhunter(w,a)).toBe(false);expect(w).toEqual(copy);
  const other=camp();other.a.domestic={since:other.w.tick,care:'none',tameness:5,nextDecay:other.w.tick+6000};
  const before=structuredClone(other.w);expect(startAnimalManhunter(other.w,other.a)).toBe(false);expect(other.w).toEqual(before);
});
test('one granted acquisition chooses a reachable human, including sleep, and rejects carried or disabled targets',()=>{
  const {w,a,p}=camp();p.x=a.x+4;p.z=a.z;p.state='sleeping';startAnimalManhunter(w,a);
  let searches=0;processAnimalManhunter(w,a,animalNavigation(w),blockedCells(w,true),()=>{searches++;return true;});
  expect(searches).toBe(1);expect(a.manhunter!.targetId).toBe(p.id);expect(a.motion).toBeDefined();expect(a.strike).toBeUndefined();
  expect(animalManhunterTarget(w,a)).toBe(p);w.pawns[1]!.rescue={patientId:p.id,bedId:1,phase:'carry'};expect(animalManhunterTarget(w,a)).toBeUndefined();
  delete w.pawns[1]!.rescue;p.state='downed';expect(animalManhunterTarget(w,a)).toBeUndefined();
});
test('a delayed review retains the same human and advances only a safe existing prefix',()=>{
  const {w,a,p}=camp();p.x=20;p.z=a.z;startAnimalManhunter(w,a);a.manhunter!.targetId=p.id;
  a.path=[{x:11,z:12},{x:12,z:12}];a.nextDecision=w.tick;
  processAnimalManhunter(w,a,animalNavigation(w),blockedCells(w,true),()=>false);
  expect(a.manhunter!.targetId).toBe(p.id);expect(a.motion!.from).toEqual({x:10,z:12});expect(a.motion!.to).toEqual({x:11,z:12});
});
test('a moving human cannot introduce a twenty-five tick pause after a short captured pursuit route',()=>{
  const {w,a,p}=camp();w.pawns=w.pawns.slice(0,1);p.x=12;p.z=12;startAnimalManhunter(w,a);
  let edges=0,spentShort=false,priorEnd:number|undefined;
  for(let i=0;i<30&&!a.strike;i++){
    advanceAnimalMelee(w,a,w.tick*10,()=>blockedCells(w,true),()=>captureWorldShotGrid(w),disturbanceEvents(w));
    if(a.strike)break;
    if((p.motion?.end??0)<=w.tick){p.moveCooldown=0;expect(startTravel(w,p,{x:p.x+1,z:p.z})).toBe(true);}
    if((a.motion?.end??0)<=w.tick){
      const old=a.motion?.start;processAnimalManhunter(w,a,animalNavigation(w),blockedCells(w,true),()=>true);
      if(a.motion?.start!==old){
        if(priorEnd!==undefined)expect(a.motion!.start-priorEnd).toBeLessThanOrEqual(1);
        priorEnd=a.motion!.end;edges++;spentShort ||= !a.path.length;
      }
    }
    w.tick++;
  }
  expect(edges).toBeGreaterThan(1);expect(spentShort).toBe(true);expect(a.strike).toBeDefined();
});
test('a closed initial enclosure protects; closing a door on an engaged route permits only nearby bounded bash',()=>{
  const {w,a,p}=camp();p.x=15;p.z=12;w.pawns=w.pawns.slice(0,1);
  for(let z=0;z<w.height;z++)w.structures.push({id:w.nextId++,kind:z===12?'door':'wall',material:'wood',x:13,z,orientation:0,footprint:'standard',...(z===12?{door:newDoorState(w.tick)}:{})});
  startAnimalManhunter(w,a);processAnimalManhunter(w,a,animalNavigation(w),blockedCells(w,true),()=>true);
  expect(a.manhunter!.targetId).toBeUndefined();expect(a.manhunter!.door).toBeUndefined();expect(a.strike).toBeUndefined();
  a.manhunter!.targetId=p.id;a.path=[{x:11,z:12},{x:12,z:12},{x:13,z:12},{x:14,z:12}];a.nextDecision=w.tick;
  processAnimalManhunter(w,a,animalNavigation(w),blockedCells(w,true),()=>false);
  expect(a.manhunter!.door!.remaining).toBeGreaterThanOrEqual(2);expect(a.manhunter!.door!.remaining).toBeLessThanOrEqual(5);
  expect(a.manhunter!.door!.untilCore-w.tick*10).toBeGreaterThanOrEqual(2000);expect(a.manhunter!.door!.untilCore-w.tick*10).toBeLessThan(4000);
  expect(a.motion!.to).toEqual({x:11,z:12});expect(a.path).toEqual([{x:12,z:12}]);
});
test('rage suppresses projectile fear and taming; a real pursuit resumes exactly after serialization',()=>{
  const {w,a}=camp();startAnimalManhunter(w,a);const rng=a.manhunter!.rng;
  scareAnimal(w,a,{x:0,z:0},w.tick*10);expect(a.flee).toBeUndefined();expect(a.manhunter!.rng).toBe(rng);expect(tameRefusal(w,a)).toContain('rage');
  stepWorld(w,4);expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(w,20);stepWorld(copy,20);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
});
test('sleep does not recover before minimum; hash recovery and exhaustion spend the private stream only',()=>{
  const {w,a}=camp();startAnimalManhunter(w,a);a.state='sleeping';a.manhunter!.rng=1;const rng=w.rng;
  w.tick+=3-(w.tick+a.id)%3;advanceAnimalManhunter(w,a);expect(a.manhunter).toBeDefined();
  a.state='idle';w.tick+=1002;while((w.tick+a.id)%3)w.tick++;
  advanceAnimalManhunter(w,a);expect(a.manhunter).toBeUndefined();expect(w.rng).toBe(rng);
  startAnimalManhunter(w,a);a.rest=0;a.manhunter!.zeroRestTicks=900;a.manhunter!.rng=1;
  while((w.tick+a.id)%15)w.tick++;advanceAnimalManhunter(w,a);
  expect(a.manhunter).toBeUndefined();expect(a.state).toBe('sleeping');expect(a.health!.death).toBeUndefined();expect(w.rng).toBe(rng);
});
test('an exhaustion success persists through an active edge, stops targeting and sleeps only at its real end',()=>{
  const {w,a,p}=camp();while((w.tick+a.id)%15)w.tick++;
  startAnimalManhunter(w,a,w.tick*10-900);a.manhunter!.targetId=p.id;a.rest=0;a.manhunter!.zeroRestTicks=900;a.manhunter!.rng=1;
  a.path=[{x:a.x+1,z:a.z},{x:a.x+2,z:a.z}];moveAnimal(w,a,animalNavigation(w).step);const edge=structuredClone(a.motion);
  advanceAnimalManhunter(w,a);expect(a.manhunter!.exhausted).toBe(true);expect(a.manhunter!.targetId).toBeUndefined();expect(a.path).toEqual([]);expect(a.motion).toEqual(edge);
  expect(a.state).toBe('moving');const privateRng=a.manhunter!.rng;
  advanceAnimalManhunter(w,a);expect(a.manhunter!.rng).toBe(privateRng);
  w.tick=Math.ceil(a.motion!.end);advanceAnimalManhunter(w,a);expect(a.manhunter).toBeUndefined();expect(a.state).toBe('sleeping');expect(a.motion).toEqual(edge);
});
