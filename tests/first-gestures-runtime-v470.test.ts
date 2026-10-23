import {expect,test} from 'vitest';
import {createFirstGesturesLearning} from '../src/ui/first-gestures-learning';
import {applyCommand} from '../src/sim/engine';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {deconstructionCamp} from './scenarios/deconstruction';
import type {Command,World} from '../src/sim/types';

test('four actual authoritative gestures teach interface knowledge without changing their physical results',()=>{
 const w=deconstructionCamp(3);w.stockpiles=[];w.growingZones=[];
 let stored:string|null=null;const learning=createFirstGesturesLearning({read:()=>stored,write:value=>{stored=value;}});
 learning.start();const reference=structuredClone(w);
 const commands:Command[]=[
  {type:'priority',pawnId:w.pawns[0]!.id,work:'haul',value:1},
  {type:'area',action:'stockpile',from:{x:6,z:6},to:{x:7,z:7}},
  {type:'designate',kind:'sleeping-spot',x:10,z:10,orientation:0},
  {type:'area',action:'growing',from:{x:20,z:20},to:{x:21,z:21}},
 ];
 for(const command of commands){
  const token=learning.prepare(command,w),result=applyCommand(w,command);
  expect(result.ok).toBe(true);expect(applyCommand(reference,command)).toEqual(result);
  const acquired=structuredClone(w);
  learning.confirm(token,result.affected===undefined?undefined:JSON.stringify({affected:result.affected,skipped:result.skipped}));
  expect(w).toEqual(acquired);expect(w).toEqual(reference);
 }
 expect(learning.state.learned).toEqual({work:'confirmed',storage:'confirmed',beds:'confirmed',cultivation:'confirmed'});
 expect(w.structures.some(s=>s.kind==='sleeping-spot')).toBe(true);
 expect(w.jobs).toHaveLength(0);expect(w.piles).toHaveLength(0);
 expect(w.resources).toHaveLength(0);expect(validateWorld(w)).toEqual([]);
 const bytes=serializeWorld(w),loaded=deserializeWorld(bytes);expect(serializeWorld(loaded)).toBe(bytes);
 const reloaded=createFirstGesturesLearning({read:()=>stored,write:()=>{}});
 expect(reloaded.state).toEqual(learning.state);
 const fresh=createFirstGesturesLearning({read:()=>null,write:()=>{}});fresh.start();
 expect(fresh.state.learned).toEqual({});expect(loaded).toEqual(w);
});

test('a refused placement and a refused unchanged area give no knowledge',()=>{
 const w=deconstructionCamp();w.stockpiles=[];
 const learning=createFirstGesturesLearning({read:()=>null,write:()=>{}});learning.start();
 const good:Command={type:'area',action:'stockpile',from:{x:6,z:6},to:{x:6,z:6}};
 expect(applyCommand(w,good).ok).toBe(true);
 const token=learning.prepare(good,w),result=applyCommand(w,good);
 expect(result.ok).toBe(false);expect(result.reason).toBe('Aucune case compatible dans ce rectangle.');
 // As in the facade, a refused command has no confirm callback.
 expect(token).toBeDefined();
 expect(learning.state.learned).toEqual({});
 const bad:Command={type:'designate',kind:'sleeping-spot',x:-1,z:0};
 learning.prepare(bad,w);expect(applyCommand(w,bad).ok).toBe(false);
 // The real facade rejects the command promise and never calls confirm.
 expect(learning.state.learned).toEqual({});
});

test('replacement invalidates a successful old-map receipt while keeping prior player knowledge',()=>{
 const w=deconstructionCamp(),learning=createFirstGesturesLearning({read:()=>null,write:()=>{}});learning.start();learning.declareCurrentKnown();
 const command:Command={type:'designate',kind:'sleeping-spot',x:10,z:10,orientation:0},token=learning.prepare(command,w);
 expect(applyCommand(w,command).ok).toBe(true);learning.cancelPending();learning.confirm(token,undefined);
 expect(learning.state.learned).toEqual({work:'declared'});
 const unreadable=new Proxy({} as World,{get(){throw Error('No learning inferred from world');}});
 expect(()=>learning.prepare({type:'research-project',project:null},unreadable)).not.toThrow();
});
