import {expect,test} from 'vitest';
import {NaturalIdPresentationEvents} from '../src/render/natural-presentation-events';

// Scheduling structure fixture only: these are not plants, a World or a SAVE.
// Private access isolates put/drop without manufacturing transport authority.
type Forecast={input:{id:number;x:number;z:number};deadline:number|undefined;order:number;plannedAt:number;observation:{size:number;ripe:boolean;leafless:boolean}};
type Agenda={clock:{width:number};forecasts:Map<number,Forecast>;cells:Map<number,Set<number>>;heap:number[];positions:Map<number,number>;
 put(id:number,forecast:Forecast):void;drop(id:number):void;removeHeap(id:number):void};
const WIDTH=16;
function fixture():Agenda {const agenda=new NaturalIdPresentationEvents()as unknown as Agenda;agenda.clock={width:WIDTH};return agenda;}
function forecast(id:number,deadline:number|undefined,order=id,x=id%WIDTH,z=Math.floor(id/WIDTH)):Forecast {
 return {input:{id,x,z},deadline,order,plannedAt:0,observation:{size:.65,ripe:false,leafless:false}};
}
const priority=(a:Forecast,b:Forecast)=>a.deadline!-b.deadline!||a.order-b.order;
function assertOracle(agenda:Agenda,expected:ReadonlyMap<number,Forecast>):void {
 expect([...agenda.forecasts]).toStrictEqual([...expected]);
 const due=[...expected].filter(([,f])=>f.deadline!==undefined).sort(([,a],[,b])=>priority(a,b));
 expect(new Set(agenda.heap)).toEqual(new Set(due.map(([id])=>id)));
 expect(agenda.heap.length).toBe(due.length);expect(agenda.positions.size).toBe(due.length);
 expect(agenda.heap[0]).toBe(due[0]?.[0]);
 for(let at=0;at<agenda.heap.length;at++){
  const id=agenda.heap[at]!;expect(agenda.positions.get(id)).toBe(at);
  if(at)expect(priority(expected.get(agenda.heap[Math.floor((at-1)/2)]!)!,expected.get(id)!)).toBeLessThanOrEqual(0);
 }
 const cells=new Map<number,Set<number>>();
 for(const [id,f]of expected){const cell=f.input.z*WIDTH+f.input.x;let occupants=cells.get(cell);if(!occupants){occupants=new Set();cells.set(cell,occupants);}occupants.add(id);}
 expect(agenda.cells.size).toBe(cells.size);
 for(const [cell,ids]of cells)expect(agenda.cells.get(cell)).toEqual(ids);
}

test('same cell and priority retain the resident cell Set and heap slots through anchor-only refreshes',()=>{
 const agenda=fixture(),expected=new Map<number,Forecast>();
 for(const id of [3,1,4,2]){const f=forecast(id,100+id,id,5,5);expected.set(id,f);agenda.put(id,f);}
 const occupants=agenda.cells.get(85)!,heap=[...agenda.heap],positions=[...agenda.positions];
 for(let tick=1;tick<=12;tick++)for(const id of [4,2,1,3]){
  const f={...forecast(id,100+id,id,5,5),plannedAt:tick};expected.set(id,f);agenda.put(id,f);
  expect(agenda.cells.get(85)).toBe(occupants);expect(agenda.heap).toStrictEqual(heap);expect([...agenda.positions]).toStrictEqual(positions);
  assertOracle(agenda,expected);
 }
});

test('priority changes in either direction, cancellation and due reinsertion follow an independent sorted oracle',()=>{
 const agenda=fixture(),expected=new Map<number,Forecast>();
 const put=(f:Forecast)=>{expected.set(f.input.id,f);agenda.put(f.input.id,f);assertOracle(agenda,expected);};
 const drop=(id:number)=>{expected.delete(id);agenda.drop(id);assertOracle(agenda,expected);};
 for(let id=1;id<=24;id++)put(forecast(id,60+(id*17)%31,25-id));
 // Earlier/later and equal deadlines with changed source order exercise both
 // heap directions; undefined removes only the scheduled entry, not the cell.
 for(let i=0;i<48;i++){
  const id=1+(i*7)%24,deadline=i%5===0?undefined:i%4===0?1:120-(i*13)%97;
  put(forecast(id,deadline,100-i));
 }
 for(const id of [1,9,24,3,20])drop(id);
 // Read removes due heap entries before recomputing their retained forecasts.
 const due=agenda.heap[0]!,cell=expected.get(due)!.input.z*WIDTH+expected.get(due)!.input.x,occupants=agenda.cells.get(cell);
 agenda.removeHeap(due);put(forecast(due,240,expected.get(due)!.order));expect(agenda.cells.get(cell)).toBe(occupants);
 while(expected.size){const next=[...expected].filter(([,f])=>f.deadline!==undefined).sort(([,a],[,b])=>priority(a,b))[0]?.[0]??expected.keys().next().value!;drop(next);}
 expect(agenda.cells.size).toBe(0);expect(agenda.heap).toStrictEqual([]);
});

test('movement updates both cell owners, ties keep source order, and no-deadline forecasts can be scheduled again',()=>{
 const agenda=fixture(),expected=new Map<number,Forecast>();
 const put=(f:Forecast)=>{expected.set(f.input.id,f);agenda.put(f.input.id,f);assertOracle(agenda,expected);};
 put(forecast(1,50,20,2,3));put(forecast(2,50,10,2,3));put(forecast(3,undefined,30,9,7));
 const original=agenda.cells.get(50)!;expect(agenda.heap[0]).toBe(2);
 put(forecast(1,50,5,9,7));expect(agenda.cells.get(50)).toBe(original);expect([...original]).toStrictEqual([2]);expect(agenda.heap[0]).toBe(1);
 const destination=agenda.cells.get(121)!;put(forecast(3,40,30,9,7));expect(agenda.cells.get(121)).toBe(destination);expect(agenda.heap[0]).toBe(3);
 put(forecast(2,undefined,10,0,0));expect(agenda.cells.has(50)).toBe(false);
 put(forecast(3,undefined,30,9,7));expect(agenda.cells.get(121)).toBe(destination);expect(agenda.heap[0]).toBe(1);
 put(forecast(2,50,1,0,0));expect(agenda.heap[0]).toBe(2);
});
