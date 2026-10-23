import {expect,test} from 'vitest';
import {partyView292,partyParticipation292} from '../src/ui/party-inspection-292';
import {readStatusAlerts} from '../src/ui/status-alerts';
import {medicalCamp} from './scenarios/health';
import {queryPawnStatus} from '../src/sim/diagnostics';
import type {World} from '../src/sim/types';

function scene():World {
 const world=medicalCamp(4),now=world.tick*10,pawn=world.pawns[0]!;
 world.party292={adoptedAtCore:now-5000,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now,
  active:{startedAtCore:now,durationCore:5000,advancedAtCore:now,organizerId:pawn.id,site:{x:10,z:10},members:[]}};
 return world;
}

test('V472 a map celebration is visible before anyone joins, with its own physical focus',()=>{
 const world=scene(),before=JSON.stringify(world),row=readStatusAlerts(world).find(r=>r.key==='party');
 expect(row).toMatchObject({text:'Fête · 0 participant(s) · encore 2 h',targets:[{kind:'cell',cell:{x:10,z:10}},{kind:'actor',id:world.pawns[0]!.id}]});
 expect(partyParticipation292(world,world.pawns[0]!)).toBeUndefined();expect(JSON.stringify(world)).toBe(before);
});

test('V472 admission, travel and real participation have distinct confirmed labels without granting joy',()=>{
 const world=scene(),pawn=world.pawns[1]!,active=world.party292!.active!,level=pawn.recreation.level;
 active.members.push({pawnId:pawn.id,joinedAtCore:world.tick*10,presentCore:0});
 pawn.recreation.task={activity:'party',partyStartedAtCore:active.startedAtCore,target:{x:10,z:11},buildingId:null,phase:'travel',elapsed:0};
 pawn.state='moving';expect(queryPawnStatus(world,pawn).reason).toBe('Se rend à la fête.');
 expect(partyParticipation292(world,pawn)).toBe('Se rend à la fête · encore 2 h');
 pawn.recreation.task.phase='active';expect(partyParticipation292(world,pawn)).toBe('Participe à la fête · encore 2 h');
 pawn.state='recreating';expect(queryPawnStatus(world,pawn).reason).toBe('Participe à la fête.');
 expect(pawn.recreation.level).toBe(level);expect(pawn.partyMemories292).toBeUndefined();
});

test('V472 stale or distant task tokens do not borrow the active celebration',()=>{
 const world=scene(),pawn=world.pawns[1]!,active=world.party292!.active!;
 pawn.recreation.task={activity:'party',partyStartedAtCore:active.startedAtCore,target:{x:10,z:11},buildingId:null,phase:'travel',elapsed:0};
 expect(partyParticipation292(world,pawn)).toBeUndefined();
 active.members.push({pawnId:pawn.id,joinedAtCore:world.tick*10,presentCore:0});pawn.recreation.task.partyStartedAtCore=active.startedAtCore-10;
 expect(partyParticipation292(world,pawn)).toBeUndefined();
 delete world.party292!.active;expect(partyView292(world)).toBeUndefined();expect(readStatusAlerts(world).some(r=>r.key==='party')).toBe(false);
});

test('V472 celebration time reads the common duration and never invents a finished-event reward',()=>{
 const world=scene(),active=world.party292!.active!;world.tick+=499;
 expect(partyView292(world)?.remaining).toBe('encore 1 min');world.tick++;
 expect(partyView292(world)?.remaining).toBe('fin imminente');expect(active.members).toEqual([]);
 expect(world.pawns.every(p=>p.partyMemories292===undefined)).toBe(true);
});

test('V472 old and unknown future schema views stay closed',()=>{
 const world=scene();for(const version of [291,294,'292']){Object.assign(world,{schemaVersion:version});expect(partyView292(world)).toBeUndefined();}
});
