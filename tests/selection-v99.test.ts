import {expect,test} from 'vitest';
import {equivalentActors,hitActors,rectangleActors,type ScreenPawn} from '../src/render/PawnSelectionInput';
import {PawnSelection} from '../src/ui/pawn-selection';
const actor=(id:number,group:string,category:number,x=20):ScreenPawn=>({id,group,category,x,y:20,radius:9,depth:id/100});
test('click priority and same-race/faction double selection exclude unrelated actors',()=>{
  const all=[actor(1,'animal:hare',2),actor(2,'human:outlaws:false',1),actor(3,'human:colony:false',0),actor(4,'animal:deer',2,50),actor(5,'animal:hare',2,80),actor(6,'human:colony:false',0,100)];
  expect(hitActors(all,20,20).map(p=>p.id)).toEqual([3,2,1]);
  expect(hitActors(all,500,500)).toEqual([]);
  expect(equivalentActors(all,all[0]!)).toEqual([1,5]);
  expect(equivalentActors(all,all[2]!)).toEqual([3,6]);
  expect(rectangleActors(all,110,30,0,0)).toEqual([3,6]);
  expect(rectangleActors(all.slice(3,5),0,0,110,30)).toEqual([4,5]);
});
test('shift toggles animal identity, group replacements and removed actors remain exact',()=>{
  const selection=new PawnSelection(),available=new Set([1,2,3]);
  selection.apply({ids:[1,2],additive:false,toggle:false},available);
  selection.apply({ids:[1],additive:true,toggle:true},available);expect(selection.single).toBe(2);
  selection.apply({ids:[3],additive:true,toggle:true},available);expect([...selection.ids]).toEqual([2,3]);
  selection.apply({ids:[1,9],additive:false,toggle:false},available);expect(selection.single).toBe(1);
  selection.apply({ids:[],additive:true,toggle:false},new Set([2,3]));expect(selection.ids.size).toBe(0);
});
