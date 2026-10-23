import {expect,test,vi} from 'vitest';
import {
  createFirstGesturesLearning,parseFirstGesturesLearning,LESSONS,FIRST_GESTURES_STORAGE_KEY,
  type FirstGestureToken,type FirstGesturesLearningState,
} from '../src/ui/first-gestures-learning.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import type {Command,World} from '../src/sim/types.ts';

const area=(action:'stockpile'|'growing'):Command=>({type:'area',action,from:{x:4,z:4},to:{x:5,z:5}});
const bed:Command={type:'designate',kind:'sleeping-spot',x:8,z:8};
const raw=(learned:FirstGesturesLearningState['learned']={},enabled=false)=>JSON.stringify({version:1,enabled,learned});
function fixture(initial:string|null=null){
  let stored=initial,changes=0;const writes:string[]=[];
  const model=createFirstGesturesLearning({read:()=>stored,write:value=>{stored=value;writes.push(value);},changed:()=>{changes++;}});
  return {model,writes,get stored(){return stored;},get changes(){return changes;}};
}
const noWorld=new Proxy({} as World,{get(){throw Error('This gesture must not read a World');}});

test('new player knowledge is disabled and empty, with four ordered lessons and no initialization write or callback',()=>{
  const f=fixture();expect(f.model.state).toEqual({version:1,enabled:false,learned:{}});expect(f.model.current).toBe('work');
  expect(f.model.saved).toBe(true);expect(f.writes).toEqual([]);expect(f.changes).toBe(0);
  expect(LESSONS.map(row=>row.id)).toEqual(['work','storage','beds','cultivation']);expect(FIRST_GESTURES_STORAGE_KEY).toContain('.v1');
  expect(f.model.prepare(area('stockpile'),noWorld)).toBeUndefined();expect(f.model.declareCurrentKnown()).toBe(false);
});

test('strict local records refuse old, future, malformed, extra fields, bad origins and oversized input without granting knowledge',()=>{
  const invalid=[
    '', '{', 'null','[]','true',JSON.stringify({version:0,enabled:true,learned:{work:'confirmed'}}),
    JSON.stringify({version:2,enabled:true,learned:{work:'confirmed'}}),
    JSON.stringify({enabled:true,learned:{work:'confirmed'}}),
    JSON.stringify({version:1,enabled:1,learned:{work:'confirmed'}}),
    JSON.stringify({version:1,enabled:true,learned:[]}),
    JSON.stringify({version:1,enabled:true,learned:{work:true}}),
    JSON.stringify({version:1,enabled:true,learned:{future:'confirmed'}}),
    JSON.stringify({version:1,enabled:true,learned:{work:'confirmed'},extra:1}),
    raw()+' '.repeat(1025),
  ];
  for(const value of invalid){
    expect(parseFirstGesturesLearning(value)).toBeUndefined();const f=fixture(value);
    expect(f.model.state).toEqual({version:1,enabled:false,learned:{}});expect(f.model.saved).toBe(false);expect(f.writes).toEqual([]);expect(f.changes).toBe(0);
  }
});

test('activation, pause and reprise persist only mutated state and announce after storage',()=>{
  const order:string[]=[];const model=createFirstGesturesLearning({read:()=>null,write:()=>{order.push('write');},changed:()=>{order.push('changed');}});
  model.start();model.start();expect(model.state.enabled).toBe(true);model.stop();model.stop();model.start();
  expect(order).toEqual(['write','changed','write','changed','write','changed']);expect(model.state.learned).toEqual({});
});

test('declared current knowledge and confirmed later knowledge retain their origins and choose the first unknown',()=>{
  const f=fixture();f.model.start();const cultivation=f.model.prepare(area('growing'),noWorld);
  expect(f.model.confirm(cultivation,'{"affected":2}')).toBe(true);expect(f.model.current).toBe('work');
  expect(f.model.declareCurrentKnown()).toBe(true);expect(f.model.current).toBe('storage');
  expect(f.model.declareCurrentKnown()).toBe(true);expect(f.model.current).toBe('beds');expect(f.model.declareCurrentKnown()).toBe(true);
  expect(f.model.current).toBeUndefined();expect(f.model.declareCurrentKnown()).toBe(false);
  expect(f.model.state.learned).toEqual({work:'declared',storage:'declared',beds:'declared',cultivation:'confirmed'});
});

test('priority preparation credits only a different positive effective priority of a living free civilian',()=>{
  const w=deconstructionCamp(2),p=w.pawns[0]!,f=fixture();f.model.start();p.priorities.haul=0;
  const command:Command={type:'priority',pawnId:p.id,work:'haul',value:1},before=JSON.stringify(w);
  const token=f.model.prepare(command,w);expect(token).toBeDefined();expect(f.model.state.learned).toEqual({});
  expect(JSON.stringify(w)).toBe(before);expect(f.model.confirm(token)).toBe(true);expect(f.model.state.learned.work).toBe('confirmed');
  expect(JSON.stringify(w)).toBe(before);
  const invalid=createFirstGesturesLearning({read:()=>raw({},true),write:()=>{}});
  for(const value of [-1,0,.5,5,NaN,Infinity])expect(invalid.prepare({...command,value},noWorld)).toBeUndefined();
  expect(invalid.prepare(command)).toBeUndefined();expect(invalid.prepare({...command,pawnId:-1},w)).toBeUndefined();
  p.priorities.haul=1;expect(invalid.prepare(command,w)).toBeUndefined();p.priorities.haul=0;
  for(const patch of [{faction:'outlanders'},{prisoner:true},{visitor:{}},{raid:{}},{podRescue:{}},{state:'dead'},{health:{death:{}}}]){
    const candidate={...p,...patch};expect(invalid.prepare(command,{pawns:[candidate]} as unknown as World)).toBeUndefined();
  }
});

test('accepted stockpile and growing rectangles require positive safe integer affected JSON and consume their tokens',()=>{
  for(const action of ['stockpile','growing'] as const){
    const f=fixture(raw({},true));
    for(const data of [undefined,'','broken','null','[]','{}','{"affected":0}','{"affected":-1}','{"affected":0.5}','{"affected":"1"}','{"affected":9007199254740992}','{"ok":false,"affected":2}']){
      const token=f.model.prepare(area(action),noWorld);expect(token).toBeDefined();expect(f.model.confirm(token,data)).toBe(false);
      expect(f.model.confirm(token,'{"affected":1}')).toBe(false);
    }
    expect(f.model.state.learned).toEqual({});expect(f.model.confirm(f.model.prepare(area(action),noWorld),'{"ok":true,"affected":1,"skipped":2}')).toBe(true);
    expect(f.model.state.learned[action==='stockpile'?'storage':'cultivation']).toBe('confirmed');
  }
});

test('only a designated immediate sleeping spot credits beds, never a bed blueprint or unrelated command',()=>{
  const f=fixture(raw({},true));
  for(const command of [{...bed,kind:'bed'},{...bed,kind:'animal-sleeping-spot'},area('stockpile'),{type:'stockpile',enabled:true,x:3,z:3},{type:'cancel',x:3,z:3}] as Command[]){
    const token=f.model.prepare(command,noWorld);if(command.type!=='area')expect(token).toBeUndefined();
  }
  const token=f.model.prepare(bed,noWorld);expect(f.model.confirm(token)).toBe(true);expect(f.model.state.learned).toEqual({beds:'confirmed'});
});

test('prepared but refused or never resolved gestures grant nothing and forged or cross-model tokens fail',()=>{
  const f=fixture(raw({},true)),other=fixture(raw({},true));const token=f.model.prepare(bed,noWorld);
  expect(f.model.state.learned).toEqual({});expect(f.model.confirm(undefined)).toBe(false);
  expect(other.model.confirm(token)).toBe(false);expect(f.model.confirm({} as FirstGestureToken)).toBe(false);
  expect(f.model.confirm(token,'{"ok":false}')).toBe(false);expect(f.model.confirm(token)).toBe(false);expect(f.model.state.learned).toEqual({});
});

test('stop, explicit review and replacement cancellation invalidate pending knowledge without touching retained learning',()=>{
  for(const invalidate of ['stop','review','cancelPending'] as const){
    const f=fixture(raw({work:'declared'},true)),token=f.model.prepare(bed,noWorld);f.model[invalidate]();
    if(invalidate==='stop')f.model.start();
    expect(f.model.confirm(token)).toBe(false);expect(f.model.state.learned).toEqual(invalidate==='review'?{}:{work:'declared'});
    expect(f.model.state.enabled).toBe(true);
  }
});

test('explicit review forgets acquired concepts without silently changing the enabled preference',()=>{
  const f=fixture(raw({work:'declared',beds:'confirmed'},false));f.model.review();
  expect(f.model.state).toEqual({version:1,enabled:false,learned:{}});expect(f.model.current).toBe('work');expect(f.writes).toHaveLength(1);
  f.model.review();expect(f.writes).toHaveLength(1);
});

test('browser reload retains only acquired local knowledge while unfinished tokens never transfer to the next model',()=>{
  const f=fixture(raw({},true));f.model.declareCurrentKnown();const pending=f.model.prepare(bed,noWorld);
  const reload=fixture(f.stored);expect(reload.model.state).toEqual(f.model.state);expect(reload.model.current).toBe('storage');
  expect(reload.model.confirm(pending)).toBe(false);expect(reload.writes).toEqual([]);expect(reload.changes).toBe(0);
});

test('storage denial keeps acquired RAM state and reports unsaved without undoing knowledge, later successful changes persist it',()=>{
  let fail=true,changes=0;const writes:string[]=[];
  const model=createFirstGesturesLearning({read:()=>{throw Error('denied');},write:value=>{if(fail)throw Error('quota');writes.push(value);},changed:()=>{changes++;}});
  expect(model.saved).toBe(false);expect(changes).toBe(0);model.start();expect(model.state.enabled).toBe(true);expect(model.saved).toBe(false);
  model.declareCurrentKnown();expect(model.state.learned.work).toBe('declared');expect(model.saved).toBe(false);
  fail=false;model.stop();expect(model.saved).toBe(true);expect(JSON.parse(writes[0]!)).toEqual(model.state);expect(changes).toBe(3);
  const refused=createFirstGesturesLearning({read:()=>null,write:()=>false});refused.start();expect(refused.saved).toBe(false);expect(refused.state.enabled).toBe(true);
});

test('public state copies cannot forge acquired knowledge or change the active preference',()=>{
  const f=fixture(raw({work:'confirmed'},true)),view=f.model.state;view.enabled=false;view.learned.storage='confirmed';delete view.learned.work;
  expect(f.model.state).toEqual({version:1,enabled:true,learned:{work:'confirmed'}});expect(f.writes).toEqual([]);
});

test('a failed presentation callback cannot reject an already accepted gesture or undo durable learning',()=>{
  const writes:string[]=[];const model=createFirstGesturesLearning({read:()=>raw({},true),write:value=>{writes.push(value);},changed:()=>{throw Error('Display fault');}});
  const token=model.prepare(bed,noWorld);expect(()=>model.confirm(token)).not.toThrow();
  expect(model.state.learned.beds).toBe('confirmed');expect(model.saved).toBe(true);expect(JSON.parse(writes[0]!)).toEqual(model.state);
});

test('non-priority gestures and local reads never read a World or consume randomness',()=>{
  const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('No random learning');});
  try{
    const f=fixture(raw({},true));for(const command of [area('stockpile'),area('growing'),bed])expect(f.model.prepare(command,noWorld)).toBeDefined();
    const state=f.model.state;expect(parseFirstGesturesLearning(JSON.stringify(state))).toEqual(state);expect(f.model.current).toBe('work');expect(random).not.toHaveBeenCalled();
    f.model.stop();expect(f.model.prepare({type:'priority',pawnId:1,work:'haul',value:1},noWorld)).toBeUndefined();
  }finally{random.mockRestore();}
});
