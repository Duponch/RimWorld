import {expect,test} from 'vitest';
import {prepareDepartureCombat261} from '../src/sim/caravan-departure-combat-261.ts';
import type {World} from '../src/sim/types.ts';

// Minimal transaction recipients, not an admitted campaign or simulated fight.
// The full acquired BattleField continuation exercises the actual departure.
function fixture(){
 const departed={id:7},enemy={id:20,state:'moving',path:[{x:1,z:1}],planCooldown:4,raid:{group:1,goal:{x:1,z:1}},tactics:{targetId:7,post:null,reviewAtCore:110},melee:{order:{targetId:7,startedDowned:false},strike:{targetId:7,atCore:90,untilCore:150,tool:'left-fist',outcome:'hit'}},shooting:{order:{targetId:7},stance:{phase:'cooldown',endsAtCore:180}}};
 const w={schemaVersion:261,tick:10,rng:12,nextId:40,pawns:[departed,enemy],structures:[],mechanoids:[],wildlife:{animals:[]}} as unknown as World;
 return {w,enemy,departed};
}
test('physical departure ends targeting while keeping real recoveries and captured movement edges',()=>{
 const {w,enemy,departed}=fixture(),motion={from:{x:0,z:0},to:{x:1,z:1},start:9,end:12};Object.assign(enemy,{motion});const plan=prepareDepartureCombat261(w,new Set([7]));expect(plan.ok).toBe(true);if(!plan.ok)throw Error('Expected mutable recipients');expect(plan.current()).toBe(true);
 w.pawns=w.pawns.filter(p=>p!==departed);plan.commit();expect(enemy.melee.order).toBeNull();expect(enemy.melee.strike).toMatchObject({targetId:null,atCore:90,untilCore:150});expect(enemy.shooting.order).toBeNull();expect(enemy.shooting.stance.endsAtCore).toBe(180);expect(enemy).not.toHaveProperty('tactics');expect(enemy.path).toEqual([]);expect(enemy.raid.goal).toBeNull();expect(enemy).toHaveProperty('motion',motion);expect(enemy.state).toBe('moving');expect([w.tick,w.rng,w.nextId]).toEqual([10,12,40]);
});
test('readonly nested recovery refuses before any original change',()=>{
 const {w,enemy}=fixture();Object.defineProperty(enemy.melee.strike,'targetId',{writable:false});const before=JSON.stringify(w);expect(prepareDepartureCombat261(w,new Set([7])).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
test('current rejects an equal replacement actor and a changed target',()=>{
 const {w,enemy}=fixture(),plan=prepareDepartureCombat261(w,new Set([7]));if(!plan.ok)throw Error('Expected mutable recipients');w.pawns[1]=structuredClone(w.pawns[1]!);expect(plan.current()).toBe(false);w.pawns[1]=enemy as unknown as World['pawns'][number];enemy.tactics.targetId=8;expect(plan.current()).toBe(false);
});
test('current rejects equal replacement nested recipients, including a readonly recovery clone',()=>{
 const {w,enemy}=fixture(),plan=prepareDepartureCombat261(w,new Set([7]));if(!plan.ok)throw Error('Expected mutable recipients');const original=enemy.melee;enemy.melee=structuredClone(original);Object.defineProperty(enemy.melee.strike,'targetId',{writable:false});expect(plan.current()).toBe(false);enemy.melee=original;expect(plan.current()).toBe(true);enemy.shooting=structuredClone(enemy.shooting);expect(plan.current()).toBe(false);
});
test('permanent rage and fauna recovery retain their real clocks without a removed target',()=>{
 const {w}=fixture();const a={id:22,state:'moving',path:[{x:1,z:1}],nextDecision:14,manhunter:{permanent261:true,startedAtCore:20,rng:13,zeroRestTicks:0,targetId:7,door:{targetId:30}},strike:{targetId:7,atCore:90,untilCore:170}};w.wildlife!.animals=[a as unknown as NonNullable<World['wildlife']>['animals'][number]];const plan=prepareDepartureCombat261(w,new Set([7]));if(!plan.ok)throw Error('Expected mutable recipients');plan.commit();expect(a.manhunter).toEqual({permanent261:true,startedAtCore:20,rng:13,zeroRestTicks:0});expect(a.strike).toEqual({targetId:null,atCore:90,untilCore:170});expect(a.path).toEqual([]);expect(a.nextDecision).toBe(10);
});
test('mechanical recovery and already emitted turret burst retain their clocks and ammunition',()=>{
 const {w}=fixture();const m={id:23,state:'moving',path:[{x:1,z:1}],planCooldown:4,melee:{order:{targetId:7,startedDowned:false},strike:{targetId:7,atCore:90,untilCore:170}},ranged:{order:{targetKey:'pawn:7'},stance:{phase:'cooldown',remainingCore:100}},raid:{goal:{x:1,z:1}}},t={targetKey:'pawn:7',warmup:{remainingCore:10},ammoQ:236,burst:{targetKey:'pawn:7',shotsLeft:1,delayCore:4},cooldownCore:0};w.mechanoids=[m as unknown as NonNullable<World['mechanoids']>[number]];w.structures=[{id:30,turret:t} as unknown as World['structures'][number]];const plan=prepareDepartureCombat261(w,new Set([7]));if(!plan.ok)throw Error('Expected mutable recipients');plan.commit();expect(m.melee.strike.targetId).toBeNull();expect(m.melee.order).toBeNull();expect(m.ranged.order).toBeNull();expect(m.ranged.stance.remainingCore).toBe(100);expect(t).toEqual({targetKey:null,warmup:null,ammoQ:236,burst:{targetKey:'pawn:7',shotsLeft:1,delayCore:4},cooldownCore:0});
});
