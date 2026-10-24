import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {
 advanceFirefoamManualContact290,applyFirefoamTrigger290,firefoamManualClaim290,firefoamManualServiceCell290,
 firefoamUseIntent290,queryFirefoamUseReason290,reconcileFirefoamManual290,
 validFirefoamManualTask290,validFirefoamManualField290,validFirefoamTriggerCommand290,validateFirefoamManualOwners290,
 type FirefoamManualTask290,
} from '../src/sim/firefoam-manual-290.ts';
import {reservedServiceCells} from '../src/sim/service-reservations.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {firefoamManualCamp469} from './scenarios/firefoam-v469.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import type {Command} from '../src/sim/types.ts';

const task=(overrides:Partial<FirefoamManualTask290>={}):FirefoamManualTask290=>({structureId:2,phase:'approach',progressCore:0,lastWorkedAt:2000,...overrides});

test('the civilian intent and menu reason read the same real route without allocating IDs, changing RNG, or acquiring an early wick',()=>{
 const {w,pawn,popper}=firefoamManualCamp469(),before=serializeWorld(w);
 const intent=firefoamUseIntent290(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id});
 expect(intent.ok).toBe(true);if(!intent.ok)return;
 expect(intent.path.length).toBeGreaterThan(0);
 const last=intent.path.at(-1)!;expect(Math.abs(last.x-popper.x)+Math.abs(last.z-popper.z)).toBe(1);
 expect(queryFirefoamUseReason290(w,pawn.id,popper.id)).toBeUndefined();
 expect(serializeWorld(w)).toBe(before);expect(popper.firefoam290!.wick).toBeUndefined();expect(pawn.firefoamTask290).toBeUndefined();
});

test('manual order requires a free demobilized capable colonial human and refuses invalid requests atomically',()=>{
 for(const change of [
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.pawn.prisoner=createPrisonerState(f.w,f.pawn);},
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.pawn.faction='outlaws';},
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.pawn.draft={lastActiveTick:f.w.tick,target:null,queue:[]};},
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.pawn.health=createMedicalRecord(f.w.tick);f.pawn.health.missing=[{part:'left-arm',bornAt:f.w.tick,tended:true},{part:'right-arm',bornAt:f.w.tick,tended:true}];},
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.pawn.state='downed';},
  (f:ReturnType<typeof firefoamManualCamp469>)=>{f.w.structures=[];},
 ]){
  const f=firefoamManualCamp469();change(f);const before=JSON.stringify(f.w);
  expect(applyFirefoamTrigger290(f.w,{type:'firefoam-trigger',pawnId:f.pawn.id,structureId:f.popper.id}).ok).toBe(false);
  expect(queryFirefoamUseReason290(f.w,f.pawn.id,f.popper.id)).toBeDefined();expect(JSON.stringify(f.w)).toBe(before);
 }
});

test('an unreachable contact ring refuses without arming or supplying work',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();
 for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]])w.structures.push({id:w.nextId++,kind:'wall',x:popper.x+dx!,z:popper.z+dz!,orientation:0,footprint:'standard',material:'steel'});
 const before=JSON.stringify(w);
 expect(queryFirefoamUseReason290(w,pawn.id,popper.id)).toContain('accessible');
 expect(applyFirefoamTrigger290(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id}).ok).toBe(false);
 expect(JSON.stringify(w)).toBe(before);
});

test('continuous use starts only at settled contact, duplicate or skipped intervals never supply hidden progress',()=>{
 const current=task();expect(advanceFirefoamManualContact290(current,2010,true)).toBe('wait');expect(current).toEqual(task({phase:'use',lastWorkedAt:2010}));
 expect(advanceFirefoamManualContact290(current,2010,true)).toBe('wait');expect(current.progressCore).toBe(0);
 for(let tick=2011;tick<=2019;tick++){expect(advanceFirefoamManualContact290(current,tick,true)).toBe('wait');expect(current.progressCore).toBe((tick-2010)*10);}
 expect(advanceFirefoamManualContact290(current,2020,true)).toBe('ready');expect(current.progressCore).toBe(100);
 expect(advanceFirefoamManualContact290(task({phase:'use',lastWorkedAt:2000}),2002,true)).toBe('cancel');
 expect(advanceFirefoamManualContact290(task({phase:'use',lastWorkedAt:2000,progressCore:90}),2001,false)).toBe('cancel');
});

test('the ordered human travels, reserves one actual Touch place, waits100Core, then arms without consuming the device at use completion',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();
 expect(applyCommand(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id})).toMatchObject({ok:true});
 expect(pawn.firefoamTask290?.phase).toBe('approach');expect(popper.firefoam290!.wick).toBeUndefined();
 const claimed=firefoamManualServiceCell290(pawn,w);expect(claimed).not.toBeNull();
 expect(reservedServiceCells(w).has(claimed!.z*w.width+claimed!.x)).toBe(true);expect(firefoamManualClaim290(w,popper.id)).toBe(true);
 let useTick:number|undefined;
 for(let n=0;n<600&&!popper.firefoam290!.wick;n++){
  stepWorld(w);
  if(pawn.firefoamTask290?.phase==='use'){
   useTick??=w.tick;expect(pawn.moveCooldown).toBe(0);expect((pawn.motion?.end??0)<=w.tick).toBe(true);
   expect(pawn.firefoamTask290.progressCore).toBe((w.tick-useTick)*10);expect(popper.firefoam290!.wick).toBeUndefined();
  }
 }
 expect(useTick).toBeDefined();expect(popper.firefoam290!.wick).toBeDefined();
 expect(popper.firefoam290!.wick!.startedAtCore).toBe((useTick!+10)*10);
 expect(w.structures.find(s=>s.id===popper.id)).toBe(popper);expect(pawn.firefoamTask290).toBeUndefined();
 expect(firefoamManualClaim290(w,popper.id)).toBe(false);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});

test('removal or loss of settled contact cancels an incomplete task without forging a wick or rewriting an acquired movement edge',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();
 expect(applyFirefoamTrigger290(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id}).ok).toBe(true);
 w.structures=w.structures.filter(s=>s!==popper);reconcileFirefoamManual290(w,pawn);
 expect(pawn.firefoamTask290).toBeUndefined();expect(popper.firefoam290!.wick).toBeUndefined();
 w.structures.push(popper);pawn.x=popper.x;pawn.z=popper.z-1;pawn.state='working';pawn.path=[];pawn.moveCooldown=0;delete pawn.motion;
 pawn.firefoamTask290={structureId:popper.id,phase:'use',progressCore:90,lastWorkedAt:w.tick};
 pawn.moveCooldown=1;const beforeCooldown=pawn.moveCooldown;reconcileFirefoamManual290(w,pawn);
 expect(pawn.firefoamTask290).toBeUndefined();expect(pawn.moveCooldown).toBe(beforeCooldown);expect(popper.firefoam290!.wick).toBeUndefined();
});

test('clear-orders releases the manual service reservation before use can arm the target',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();
 expect(applyCommand(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id}).ok).toBe(true);
 expect(applyCommand(w,{type:'clear-orders',pawnId:pawn.id}).ok).toBe(true);
 expect(pawn.firefoamTask290).toBeUndefined();expect(firefoamManualClaim290(w,popper.id)).toBe(false);
 expect(popper.firefoam290!.wick).toBeUndefined();
});

test('task and command guards reject hidden, inherited, accessor, symbol, undefined and future fields without invoking getters',()=>{
 let reads=0;const base=task(),badTask:unknown[]=[undefined,null,[],{},Object.create(base),Object.assign(Object.create(null),base),{...base,future:true},{...base,[Symbol('future')]:1},
  {...base,structureId:0},{...base,phase:'opening'},{...base,progressCore:100},{...base,progressCore:5},{...base,progressCore:10},{...base,lastWorkedAt:2001}];
 const hidden={...base};Object.defineProperty(hidden,'structureId',{value:2,enumerable:false});badTask.push(hidden);
 const getter={...base};Object.defineProperty(getter,'progressCore',{enumerable:true,get(){reads++;throw Error('No task accessor');}});badTask.push(getter);
 for(const value of badTask)expect(validFirefoamManualTask290(value,290,2000,10)).toBe(false);
 expect(validFirefoamManualTask290(base,290,2000,10)).toBe(true);
 expect(validFirefoamManualTask290(task({phase:'use',progressCore:90}),290,2000,10)).toBe(true);
 for(const version of [289,294])expect(validFirefoamManualField290({firefoamTask290:base},version,2000,10)).toBe(false);
 for(const version of [290,291,292,293])expect(validFirefoamManualField290({firefoamTask290:base},version,2000,10)).toBe(true);
 expect(validFirefoamManualField290({},289,2000,10)).toBe(true);expect(validFirefoamManualField290({firefoamTask290:undefined},290,2000,10)).toBe(false);
 const inherited=Object.create({firefoamTask290:base});expect(validFirefoamManualField290(inherited,290,2000,10)).toBe(false);
 const command={type:'firefoam-trigger',pawnId:1,structureId:2};
 expect(validFirefoamTriggerCommand290(command,290,10)).toBe(true);
 for(const value of [{...command,paused:true},{...command,pawnId:undefined},Object.create(command),{...command,[Symbol('future')]:true}])expect(validFirefoamTriggerCommand290(value,290,10)).toBe(false);
 const unsafe={...command};Object.defineProperty(unsafe,'pawnId',{enumerable:true,get(){reads++;throw Error('No command accessor');}});
 expect(validFirefoamTriggerCommand290(unsafe,290,10)).toBe(false);expect(reads).toBe(0);
});

test('owner validation retains actual approach identity and rejects two humans claiming one popper or an unrelated simultaneous task',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();expect(applyFirefoamTrigger290(w,{type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id}).ok).toBe(true);
 expect(validateFirefoamManualOwners290(w)).toEqual([]);
 const other=structuredClone(pawn);other.id=w.nextId++;other.name='Second colon préparé';w.pawns.push(other);
 expect(validateFirefoamManualOwners290(w).length).toBeGreaterThan(0);
 w.pawns.pop();pawn.orders.active='consume';expect(validateFirefoamManualOwners290(w).length).toBeGreaterThan(0);
});

test('malformed trigger commands are refused before changing an actual world',()=>{
 const {w,pawn,popper}=firefoamManualCamp469();const before=serializeWorld(w);
 const malformed={type:'firefoam-trigger',pawnId:pawn.id,structureId:popper.id,progressCore:100} as unknown as Command;
 expect(applyCommand(w,malformed).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});
