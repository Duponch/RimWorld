import {test,expect} from 'vitest';
import {siteAmbushHashDue263} from '../src/sim/world-site-ambush-state-263';

test('Site ambush60Core: every hash phase is consulted once per six actual10Core windows',()=>{
 for(let id=1;id<=60;id++){
  expect(Array.from({length:6},(_,i)=>siteAmbushHashDue263(i+1,id)).filter(Boolean)).toHaveLength(1);
  for(let tick=1;tick<=12;tick++){
   const coreDue=Array.from({length:10},(_,i)=>(tick-1)*10+i+1).some(core=>(core%60+id%60)%60===0);
   expect(siteAmbushHashDue263(tick,id)).toBe(coreDue);
  }
 }
});
test('Site ambush consultation refuses invalid clocks and stays exact at the safe integer frontier',()=>{
 for(const [tick,id]of [[0,1],[-1,1],[1,0],[1,-1],[1.5,1],[1,1.5],[Infinity,1]])expect(siteAmbushHashDue263(tick!,id!)).toBe(false);
 expect(siteAmbushHashDue263(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)).toBe(Array.from({length:10},(_,i)=>(((Number.MAX_SAFE_INTEGER-1)%6)*10+i+1+Number.MAX_SAFE_INTEGER%60)%60===0).some(Boolean));
});
