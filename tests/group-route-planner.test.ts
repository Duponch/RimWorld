import {afterEach,expect,test,vi} from 'vitest';
import {appendGroupWaypoint,removeGroupWaypoint,createGroupRoutePlanner} from '../src/ui/group-route-planner';
import {preparationDOM,preparationFind} from './helpers/group-preparation-dom';
import type {GroupItineraryResult} from '../src/sim/group-travel-estimate';
afterEach(()=>vi.unstubAllGlobals());
test('temporary waypoint edits keep the origin, bound25points and collapse neighbouring duplicates',()=>{
 expect(()=>removeGroupWaypoint([2,3],0)).toThrow();expect(removeGroupWaypoint([2,3,2,4],1)).toEqual([2,4]);expect(()=>appendGroupWaypoint([2,3],3)).toThrow();expect(()=>appendGroupWaypoint(Array.from({length:25},(_,i)=>i),26)).toThrow();
});
function fixture(){
 const host=preparationDOM(),context={tick:0,key:'map0:new',origin:2,mass:{grams:0,capacityGrams:35000,rations:0,pemmicanUnits:0,provisionNutrition:0,byMember:[]}},accepted=vi.fn(),pause=vi.fn(async()=>{}),overlay=vi.fn(),lock=vi.fn();
 const query=vi.fn((points:readonly number[]):GroupItineraryResult=>({ok:true,points:[...points],route:[...points],arrivals:points.map((tile,i)=>({tile,elapsedCore:i*100})),waypointCore:points.map((_,i)=>i*100),durationCore:(points.length-1)*100}));
 // Actual GroupPanel.current() returns a fresh confirmed scalar context.
 const planner=createGroupRoutePlanner(host as unknown as HTMLElement,{current:()=>({...context}),pause,blocked:()=>undefined,query,label:id=>`Case ${id}`,accept:accepted,overlay,lock});return {host,context,accepted,pause,overlay,lock,query,planner};
}
test('confirmed pause precedes edits, accepting three points transmits only the first destination and clears the plan',async()=>{
 const f=fixture();preparationFind(f.host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();expect(f.pause).toHaveBeenCalledTimes(1);expect(f.planner.active).toBe(true);
 f.planner.choose(3);f.planner.choose(4);preparationFind(f.host,'groupPlannerAccept').fire('click');expect(f.accepted).toHaveBeenCalledTimes(1);expect(f.accepted).toHaveBeenCalledWith(3);expect(f.planner.active).toBe(false);expect(f.overlay).toHaveBeenLastCalledWith([]);f.planner.dispose();
});
test('cancel and resumed confirmed time discard waypoints without adopting any destination or recalculating per snapshot',async()=>{
 const f=fixture();preparationFind(f.host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();f.planner.choose(3);const count=f.query.mock.calls.length;f.planner.update();f.planner.update();expect(f.query).toHaveBeenCalledTimes(count);
 preparationFind(f.host,'groupPlannerCancel').fire('click');expect(f.accepted).not.toHaveBeenCalled();
 preparationFind(f.host,'groupPlannerOpen').fire('click');await Promise.resolve();await Promise.resolve();const beforeResume=f.query.mock.calls.length;f.context.tick=1;f.planner.update();expect(f.planner.active).toBe(false);expect(f.query).toHaveBeenCalledTimes(beforeResume);expect(f.accepted).not.toHaveBeenCalled();f.planner.dispose();
});
