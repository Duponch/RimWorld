import {expect,test} from 'vitest';
import {constructAncientCasketGroupIds256,takeAncientCasketGroupId256,validAncientCasketGroupIdsEnvelope256,validAncientCasketGroupLinks256} from '../src/sim/ancient-casket-group-ids-256.ts';
import {planAncientShrinesGroup256,ancientShrineExecutionOrder256} from '../src/sim/ancient-shrine-group-plan-256.ts';
import {actualAncientPodContents256} from '../src/sim/ancient-temple-orchestration-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';

test('the casket group allocator is separate, monotone and never installed by a guard',()=>{
 const ids=constructAncientCasketGroupIds256();expect(takeAncientCasketGroupId256(ids)).toBe(0);expect(takeAncientCasketGroupId256(ids)).toBe(1);expect(ids).toEqual({nextId:2});
 const old={};expect(validAncientCasketGroupIdsEnvelope256(old,255,2)).toBe(true);expect(old).toEqual({});
 for(const version of [254,255]){expect(validAncientCasketGroupIdsEnvelope256({nextAncientCasketGroupId:0},version,3)).toBe(false);expect(validAncientCasketGroupIdsEnvelope256({nextAncientCasketGroupId:undefined},version,3)).toBe(false);}
 expect(validAncientCasketGroupIdsEnvelope256({nextAncientCasketGroupId:undefined},256,3)).toBe(false);
 expect(validAncientCasketGroupIdsEnvelope256({nextAncientCasketGroupId:2},256,2)).toBe(false);
 const resumed=JSON.parse(JSON.stringify({nextAncientCasketGroupId:ids.nextId}));expect(validAncientCasketGroupIdsEnvelope256(resumed,256,3)).toBe(true);expect(takeAncientCasketGroupId256({nextId:resumed.nextAncientCasketGroupId})).toBe(2);
 const exhausted={nextId:2147483646};expect(()=>takeAncientCasketGroupId256(exhausted)).toThrow();expect(exhausted.nextId).toBe(2147483646);
 let reads=0;const getter=Object.defineProperty({},'nextAncientCasketGroupId',{enumerable:true,get(){reads++;return 0;}});expect(validAncientCasketGroupIdsEnvelope256(getter,256,3)).toBe(false);expect(reads).toBe(0);
});
test('group allocation occurs even when all actual slots skip and children execute LIFO',()=>{
 const ids=constructAncientCasketGroupIds256(),values=[.8,.1];let at=0;
 const empty=planAncientShrinesGroup256({minX:8,minZ:8,maxX:11,maxZ:10},{width:32,height:32},{value:()=>values[at++]!},()=>true,undefined,ids);
 expect(empty.sharedContents).toBe('ancient-hostile');expect(empty.groupId).toBe(0);expect(empty.pushOrder).toEqual([]);expect(ids.nextId).toBe(1);expect(at).toBe(2);
 const placements=planAncientShrinesGroup256({minX:8,minZ:8,maxX:14,maxZ:10},{width:32,height:32},{value:()=>.5},()=>true,'slave',ids);
 expect(placements.groupId).toBe(1);expect(ids.nextId).toBe(2);expect(ancientShrineExecutionOrder256(placements)).toEqual([...placements.pushOrder].reverse());
});
test('per-casket null selects the non-first native enum once, shared contents consume none',()=>{
 const random=new WorldGenerationRandom(481),before=random.state.counter;
 expect(actualAncientPodContents256('slave',random)).toBe('slave');expect(random.state.counter).toBe(before);
 const value=actualAncientPodContents256(null,random);expect(['ancient-friendly','ancient-incapped','ancient-half-eaten','ancient-hostile','slave']).toContain(value);expect(random.state.counter).toBe(before+1);
 expect(value).not.toBe('empty');
});
test('projection/RAW linkage uses the same strict next-group scalar without inferring history',()=>{
 const rows=[{kind:'ancient-cryptosleep-casket',casket:{groupId:1}}];expect(validAncientCasketGroupLinks256(rows,2)).toBe(true);expect(validAncientCasketGroupLinks256(rows,1)).toBe(false);
 expect(validAncientCasketGroupLinks256([{kind:'ancient-cryptosleep-casket',casket:{groupId:-1}}],0)).toBe(true);
 let reads=0;const bad=Object.defineProperty({},'groupId',{enumerable:true,get(){reads++;return 0;}});expect(validAncientCasketGroupLinks256([{kind:'ancient-cryptosleep-casket',casket:bad}],2)).toBe(false);expect(reads).toBe(0);
});
