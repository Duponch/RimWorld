import {createWorld,refreshStock} from '../../src/sim/index.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';
import {fixtureBuilding} from './deconstruction.ts';
import type {Pawn,World} from '../../src/sim/types.ts';

/** Declared initial, finite camp. No party owner, occasion or presence supplied.
 * The actual constructor receives seed before all derived identities/calendars. */
export function partyCamp472(count=4,seed=42):World {
 const w=createWorld(seed,32,32),original=w.pawns[0]!;
 w.tick=2000;w.deterioration=createDeteriorationState(w.seed,w.tick);
 w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.growingZones=[];
 w.tiles=w.tiles.map(()=>({terrain:'grass'}));
 w.pawns=Array.from({length:count},(_,i)=>{
  const p:Pawn={...structuredClone(original),id:w.nextId++,name:`Convive ${i+1}`,x:3+i%8,z:10+Math.floor(i/8)*2,
   hunger:100,rest:100,jobId:null,haul:null,cooking:null,need:null,bedId:null,path:[],moveCooldown:0,planCooldown:0,needCooldown:0,state:'idle'};
  p.orders={active:null,queue:[]};p.recreation.task=null;p.recreation.level=100;p.schedule.fill('anything');
  for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  delete p.medicalCare;p.apparelAutomation=false;return p;
 });
 fixtureBuilding(w,'table',22,16);w.home=Array.from({length:24*16},(_,i)=>(6+Math.floor(i/24))*32+2+i%24);
 refreshStock(w);return w;
}
