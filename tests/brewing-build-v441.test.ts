import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {addGroundMaterial} from '../src/sim/materials';
import {BREWING_RESEARCH_COST,RESEARCH_SCALE,brewingUnlocked} from '../src/sim/research';
import {constructionSupplied,deliveredMaterial} from '../src/sim/construction-materials';
import {footprintCells} from '../src/sim/definitions';
import {cookingSpot} from '../src/sim/cooking-bills';
import {architectToolAvailable} from '../src/ui/architect-availability';
import {researchProjects} from '../src/ui/research-projects';
import type {Command,Job,Structure,World} from '../src/sim/types';

const total=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function command(w:World,c:Command){const result=applyCommand(w,c);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);}
function until(w:World,done:()=>boolean,limit:number,observe?:()=>void,resumed?:World){
 for(let i=0;i<limit&&!done();i++){stepWorld(w);if(resumed)stepWorld(resumed);observe?.();}
 expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs.map(j=>({id:j.id,kind:j.kind,phase:j.construction,progress:j.progress,reservedBy:j.reservedBy})),pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,jobId:p.jobId,haul:p.haul,research:p.research})),events:w.events.slice(-3)})).toBe(true);
}
const contact=(p:{x:number;z:number},j:Job)=>footprintCells(j).some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)<=1);

/** Declared prepared small camp at its real factory tick: two colonists,
 * healthy full needs/all-day work, skill8, one existing simple research desk,
 * exactly150wood+40steel on nearby ground, and399/400 Brewing points already
 * learned. No clock jumps, completed brewing research, delivered ingredients,
 * frame, building or construction progression are prepared below. */
function prepared(){
 const w=deconstructionCamp(2),builder=w.pawns[0]!,researcher=w.pawns[1]!;
 w.jobs=[];w.structures=[];w.packed=[];w.stockpiles=[];w.growingZones=[];
 for(const p of w.pawns){
  for(const work of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[work]=0;
  p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule=p.schedule.map(()=>'work');p.motion=null;p.moveCooldown=0;
  p.skills.construction.level=8;p.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};
 }
 Object.assign(builder,{x:10,z:10});builder.priorities.build=1;builder.priorities.haul=2;researcher.priorities.research=1;
 const desk:Structure={id:w.nextId++,kind:'research-bench',x:8,z:8,orientation:0,footprint:'standard',material:'wood'};
 w.structures.push(desk);Object.assign(researcher,cookingSpot(desk));
 w.research??={project:null,points:0};w.research.project=null;w.research.brewing={points:BREWING_RESEARCH_COST-RESEARCH_SCALE};
 addGroundMaterial(w,'wood',150,{x:11,z:10},'wood');addGroundMaterial(w,'steel',40,{x:12,z:10},'steel');
 expect(validateWorld(w)).toEqual([]);expect(w.pawns).toHaveLength(2);expect([total(w,'wood'),total(w,'steel')]).toEqual([150,40]);
 return {w,deskId:desk.id,researcherId:researcher.id};
}

test('paid Brewing research and both real construction chains resume the entire world mid-build and after completion',()=>{
 const {w,deskId,researcherId}=prepared(),start=w.tick;
 const breweryPlan={type:'designate' as const,kind:'brewery' as const,x:12,z:12,orientation:0 as const,material:'wood' as const};
 const barrelPlan={type:'designate' as const,kind:'fermenting-barrel' as const,x:15,z:12,orientation:0 as const,material:'wood' as const};
 const locked=structuredClone(w);
 for(const plan of [breweryPlan,barrelPlan])expect(applyCommand(w,plan).ok).toBe(false);
 expect(w).toEqual(locked);expect(architectToolAvailable(w,'brewery')).toBe(false);expect(architectToolAvailable(w,'fermenting-barrel')).toBe(false);
 expect(researchProjects.find(p=>p.id==='brewing')!.progress(w)!.points/RESEARCH_SCALE).toBe(399);
 command(w,{type:'research-project',project:'brewing'});
 let researchContact=false;
 until(w,()=>brewingUnlocked(w),180,()=>{
  const p=w.pawns.find(p=>p.id===researcherId)!;
  if(p.research?.stationId===deskId&&p.research.worked>0&&p.x===p.research.spot.x&&p.z===p.research.spot.z)researchContact=true;
 });
 expect(researchContact).toBe(true);expect(w.research!.brewing).toMatchObject({points:BREWING_RESEARCH_COST});expect(w.research!.brewing!.completedAt).toBeGreaterThan(start);
 expect(architectToolAvailable(w,'brewery')).toBe(true);expect(architectToolAvailable(w,'fermenting-barrel')).toBe(true);
 command(w,{type:'priority',pawnId:researcherId,work:'research',value:0});command(w,{type:'priority',pawnId:researcherId,work:'haul',value:1});command(w,{type:'priority',pawnId:researcherId,work:'build',value:2});

 const seen=new Map<string,{carriedWood:boolean;carriedSteel:boolean;delivered:boolean;worked:boolean}>();
 function watch(kind:'brewery'|'fermenting-barrel',jobId:number){
  const facts={carriedWood:false,carriedSteel:false,delivered:false,worked:false};seen.set(kind,facts);
  let priorWood=0,priorSteel=0,carriers: {id:number;item:string}[]=[];
  return ()=>{
   const j=w.jobs.find(j=>j.id===jobId);if(!j)return;
   const wood=deliveredMaterial(w,j,'wood'),steel=deliveredMaterial(w,j,'steel');
   for(const item of [...(wood>priorWood?['wood']:[]),...(steel>priorSteel?['steel']:[])]){
    expect(carriers.some(c=>{const p=w.pawns.find(p=>p.id===c.id)!;return c.item===item&&contact(p,j)&&(p.motion?.end??0)<=w.tick;}),`${item} delivery requires the previously carrying colonist at contact`).toBe(true);
   }
   priorWood=wood;priorSteel=steel;carriers=[];
   for(const p of w.pawns){
    if(p.haul?.destination.type==='job'&&p.haul.destination.jobId===jobId&&p.haul.phase==='deliver'){
     const held=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);facts.carriedWood||=held?.item==='wood';facts.carriedSteel||=held?.item==='steel';
     if(held)carriers.push({id:p.id,item:held.item});
    }
    if(p.jobId===jobId&&p.state==='working'&&j.progress>0){expect(contact(p,j)).toBe(true);expect((p.motion?.end??0)<=w.tick).toBe(true);facts.worked=true;}
   }
   if(constructionSupplied(w,j)){
    expect(deliveredMaterial(w,j,'wood')).toBe(kind==='brewery'?120:30);expect(deliveredMaterial(w,j,'steel')).toBe(kind==='brewery'?30:10);facts.delivered=true;
   }
  };
 }
 command(w,breweryPlan);const breweryJob=w.jobs.find(j=>j.kind==='brewery')!,breweryId=breweryJob.id;
 const duplicated=structuredClone(w);expect(applyCommand(w,breweryPlan).ok).toBe(false);expect(w).toEqual(duplicated);
 const breweryWatch=watch('brewery',breweryId);
 until(w,()=>{const j=w.jobs.find(j=>j.id===breweryId);return !!j&&j.construction==='frame'&&constructionSupplied(w,j)&&j.progress>0;},2400,breweryWatch);
 expect([total(w,'wood'),total(w,'steel')]).toEqual([150,40]);
 expect(validateWorld(w)).toEqual([]);const checkpoint=serializeWorld(w),resumed=deserializeWorld(checkpoint);expect(serializeWorld(resumed)).toBe(checkpoint);
 until(w,()=>w.structures.some(s=>s.kind==='brewery'),1600,breweryWatch,resumed);
 expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect([total(w,'wood'),total(w,'steel')]).toEqual([30,10]);
 expect(w.structures.filter(s=>s.kind==='brewery')).toHaveLength(1);expect(w.jobs.some(j=>j.id===breweryId)).toBe(false);

 command(w,barrelPlan);command(resumed,barrelPlan);const barrelId=w.jobs.find(j=>j.kind==='fermenting-barrel')!.id,barrelWatch=watch('fermenting-barrel',barrelId);
 until(w,()=>w.structures.some(s=>s.kind==='fermenting-barrel'),1600,barrelWatch,resumed);
 expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect([total(w,'wood'),total(w,'steel')]).toEqual([0,0]);
 expect(w.structures.filter(s=>s.kind==='brewery')).toHaveLength(1);expect(w.structures.filter(s=>s.kind==='fermenting-barrel')).toHaveLength(1);
 expect(w.structures.find(s=>s.kind==='fermenting-barrel')!.fermentation).toEqual({wort:0,progress:0,ruin:0});
 expect(w.piles.some(p=>p.owner.type==='job'&&(p.owner.jobId===breweryId||p.owner.jobId===barrelId))).toBe(false);
 expect([...seen.values()]).toEqual(Array.from({length:2},()=>({carriedWood:true,carriedSteel:true,delivered:true,worked:true})));
 expect(validateWorld(w)).toEqual([]);const complete=serializeWorld(w),reloaded=deserializeWorld(complete);expect(serializeWorld(reloaded)).toBe(complete);
 stepWorld(w,3);stepWorld(reloaded,3);expect(serializeWorld(reloaded)).toBe(serializeWorld(w));
});
