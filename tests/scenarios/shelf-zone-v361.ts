import {expect} from 'vitest';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../../src/sim/research.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {deconstructionCamp} from './deconstruction.ts';
import type {Cell,Command,Pawn,World} from '../../src/sim/types.ts';

/** Declared empty physical camp, completed prerequisite and capable workers.
 * Construction, hauling, furniture packing and cooking are played by callers;
 * no finished shelf, escrow, cargo or saved output is fabricated here. */
export function shelfZoneCamp(count=1,size=32):World {
 const w=deconstructionCamp(count,size);w.tick=3000;w.stockpiles=[];w.growingZones=[];
 w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
 for(const [i,p]of w.pawns.entries()){
  Object.assign(p,{x:Math.min(8+i,size-3),z:Math.min(10,size-3),hunger:100,rest:100,background:{childhood:'workshop-child',adulthood:'artisan'}});
  p.schedule.fill('work');p.recreation.level=100;
  for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  p.priorities.basic=3;p.priorities.build=i===0?1:0;
 }
 refreshStock(w);return w;
}
export function validShelfZone(w:World):void {const errors=validateWorld(w);expect(errors,JSON.stringify({tick:w.tick,errors:errors.slice(0,6)})).toEqual([]);}
export function acceptShelfZone(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});validShelfZone(w);}
export function untilShelfZone(w:World,done:()=>boolean,limit=1000):void {
 for(let n=0;n<limit&&!done();n++)stepWorld(w);
 expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,xy:[p.x,p.z],state:p.state,jobId:p.jobId,haul:p.haul,cooking:p.cooking})),packed:w.packed})).toBe(true);validShelfZone(w);
}
export function exactShelfZone(w:World):void {validShelfZone(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
export function shelfZone(w:World,from:Cell,to:Cell=from):void {
 acceptShelfZone(w,{type:'area',action:'stockpile',from,to,filters:{wood:true,food:true,steel:true},items:{wood:true,rice:true,'simple-meal':true,steel:true},priority:4,capacity:75,quality:{min:'normal',max:'legendary'},hitPoints:{min:20,max:100},allowFresh:true,allowRotten:false});
}
export function paidSmallShelfScene(){
 const w=shelfZoneCamp();shelfZone(w,{x:17,z:18},{x:18,z:18});
 const originalRiceId=w.nextId;addGroundMaterial(w,'food',5,{x:17,z:18},'rice');
 const sourceWoodId=w.nextId;addGroundMaterial(w,'wood',10,{x:12,z:16},'wood');
 acceptShelfZone(w,{type:'designate',kind:'small-shelf',x:17,z:18,orientation:0,material:'wood'});
 untilShelfZone(w,()=>w.structures.some(s=>s.kind==='small-shelf'),600);
 const s=w.structures.find(s=>s.kind==='small-shelf')!;exactShelfZone(w);
 return {w,s,originalRiceId,sourceWoodId,riceId:originalRiceId,woodId:sourceWoodId};
}
