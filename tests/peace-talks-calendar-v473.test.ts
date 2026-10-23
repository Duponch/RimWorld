import {expect,test} from 'vitest';
import {newQuestCalendar263,selectWorldQuest263,advanceWorldQuestCalendar263,notifyPeaceTalksBorn293} from '../src/sim/world-quest-calendar-263';

const admission={points:400,progress:10,adjustedPopulation:4,hasFreeColonist:true,hasHomeMap:true,tradeRequests284:true};
test('V473 enables the existing PeaceTalks ticket without redistributing unsupported tickets or changing the calendar stream',()=>{
 let peace=0,other=0;
 for(let seed=1;seed<=512;seed++){
  const current=newQuestCalendar263(0,seed,[1]),old=structuredClone(current);
  const selected=selectWorldQuest263(current,{...admission,peaceTalks293:true}),unsupported=selectWorldQuest263(old,admission);
  expect(current).toEqual(old);
  if(selected==='peace-talks'){peace++;expect(unsupported).toBeNull();}else{other++;expect(selected).toBe(unsupported);}
 }
 expect(peace).toBeGreaterThan(0);expect(other).toBeGreaterThan(0);
});
test('V473 below the existing progress threshold no peace offer can be selected, and a true birth alone records history',()=>{
 const c=newQuestCalendar263(0,12,[1]);for(let i=0;i<128;i++)expect(selectWorldQuest263(c,{...admission,progress:9,peaceTalks293:true})).not.toBe('peace-talks');
 expect(c.siteOffers).toBe(0);expect(c.recent).toEqual([]);notifyPeaceTalksBorn293(c);expect(c.siteOffers).toBe(1);expect(c.recent).toEqual(['peace-talks']);
});
test('V473 a due opportunity cannot repeat at the same campaign tick even when its producer refuses',()=>{
 const c=newQuestCalendar263(0,37,[1]);c.nextCheckCore=1000;c.pendingCore=1000;
 advanceWorldQuestCalendar263(c,1000,{...admission,peaceTalks293:true});const before=structuredClone(c);
 expect(advanceWorldQuestCalendar263(c,1000,{...admission,peaceTalks293:true})).toBeNull();expect(c).toEqual(before);expect(c.opportunities).toBe(1);expect(c.siteOffers).toBe(0);
});
