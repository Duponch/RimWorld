import {expect,test} from 'vitest';
import {preparedTreeWrapper} from './scenarios/tree-transfer-v349.ts';
import {prepareCryptosleepPossessionsResume271,planCryptosleepEntry271} from '../src/sim/cryptosleep-transfer-271.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {validTreePileShape} from '../src/sim/tree-transfer-save.ts';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save.ts';
import {treePackExpiry271,treePackLive} from '../src/sim/tree-transfer-rules.ts';
import {rotAge} from '../src/sim/food-preservation.ts';
import type {MaterialPile} from '../src/sim/types.ts';

test('suspended tree preserves original packing and plant dates, with exact remaining lifetime through successive holds',()=>{
 const {w,pile,source}=preparedTreeWrapper(),at=w.tick,birth=structuredClone(pile.plantPack),original=structuredClone(source),owner=w.pawns[0]!;pile.owner={type:'inventory',pawnId:owner.id};
 const plan=prepareCryptosleepPossessionsResume271([pile],[],50000);expect(pile.plantPack).toEqual(birth);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 expect(pile.innerResource).toBe(source);expect(source).toEqual(original);expect(pile.plantPack).toEqual({...birth,suspendedTicks271:50000});
 const now=at+50000;expect(treePackLive(pile,now)).toBe(true);expect(treePackExpiry271(pile)-now).toBe(birth.expiresAt-at);
 expect(validTreePileShape(pile,271,now,w.nextId,(v,tick)=>validOriginalTreeResource(v,w,271,tick))).toBe(true);
 expect(validTreePileShape(pile,270,now,w.nextId,(v,tick)=>validOriginalTreeResource(v,w,270,tick))).toBe(false);
 expect(prepareCryptosleepPossessionsResume271([pile],[],17).commit()).toBe(true);expect(pile.plantPack.suspendedTicks271).toBe(50017);expect(source).toEqual(original);
 const stale=prepareCryptosleepPossessionsResume271([pile],[],10);pile.plantPack.suspendedTicks271=pile.plantPack.suspendedTicks271!+1;const changed=structuredClone(pile);expect(stale.commit()).toBe(false);expect(pile).toEqual(changed);
});

test('food and fertilized egg resume with their own active progress, not the elapsed civil gap',()=>{
 const food:MaterialPile={id:10,item:'rice',kind:'food',quantity:5,owner:{type:'inventory',pawnId:1},rot:{atTick:80,progress:200,rate:.5}},egg:MaterialPile={id:11,item:'duck-egg-fertilized',kind:'food',quantity:1,owner:{type:'inventory',pawnId:1},egg:{progress:.2,temperatureDamage:.1,atTick:100,faction:'player'}};
 const age=rotAge(food,100),before=structuredClone([food,egg]),plan=prepareCryptosleepPossessionsResume271([food,egg],[],300);
 expect([food,egg]).toEqual(before);expect(plan.commit()).toBe(true);expect(rotAge(food,400)).toBe(age);expect(egg.egg).toEqual({...before[1]!.egg,atTick:400});
});

test('direct transfer plans cannot bypass the actual earned closing service or insert a distant original',()=>{
 const {w}=preparedTreeWrapper(),p=w.pawns[0]!,c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:20,z:20,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};w.structures.push(c);
 const before=structuredClone(w),plan=planCryptosleepEntry271(w,c,p);expect(plan.ok).toBe(false);expect(w).toEqual(before);
 p.cryptosleepTask={action:'enter',casketId:c.id,phase:'closing',progressCore:500,lastWorkedAt:w.tick};const remote=structuredClone(w);expect(planCryptosleepEntry271(w,c,p).ok).toBe(false);expect(w).toEqual(remote);
});
