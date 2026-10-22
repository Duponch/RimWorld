import {deconstructionCamp} from './deconstruction.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {CLOTHING_RESEARCH_COST} from '../../src/sim/research.ts';
import type {Command,Structure} from '../../src/sim/types.ts';

/** Finite declared control workshop, never a naturally acquired settlement.
 * Two existing adults and a finished manual tailor bench, research and90cloth
 * are prepared at tick0. No author, work, output or quality draw is prepared.
 * All later admissions, transport, manufacture and interruptions use the engine. */
export function billWorkerWorkshop461(){
 const w=deconstructionCamp(2,32),author=w.pawns[0]!,other=w.pawns[1]!;
 author.name='Alix';other.name='Noé';
 for(const [i,p]of w.pawns.entries()){
  p.x=4+i;p.z=5;p.hunger=p.rest=p.recreation.level=100;p.schedule.fill('work');p.apparelAutomation=false;
  for(const work of Object.keys(p.priorities)as(keyof typeof p.priorities)[])p.priorities[work]=0;
  p.priorities.basic=3;p.priorities.craft=1;p.skills.crafting={level:i?4:8,xp:0,dailyXp:0,passion:1};
 }
 w.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0};
 const station:Structure={id:w.nextId++,kind:'tailor-bench',x:10,z:10,orientation:0,footprint:'standard',material:'wood',bills:[]};w.structures.push(station);
 addGroundMaterial(w,'textile',90,{x:8,z:8},'cloth');
 const command=(c:Command)=>{const result=applyCommand(w,c);if(!result.ok)throw Error(result.reason);};
 for(let x=13;x<16;x++)command({type:'stockpile',enabled:true,x,z:10,filters:{wood:false,food:false,apparel:true,unfinished:true}});
 command({type:'bill-add',structureId:station.id,recipe:'shirt'});const bill=station.bills![0]!;
 command({type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,target:2}});
 refreshStock(w);
 return {w,author,other,station,bill,preparation:'Prepared legacy32² tick0 control map,2healthy adults Crafting8/4, finished wooden tailor bench, Complex Clothing,90finite cloth,3apparel stores and2requested shirts. No learned work, output, author or quality is supplied; no skill/need/RNG/property setter after play.'};
}
