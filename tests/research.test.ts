import { withoutHunting } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { readFileSync,writeFileSync } from 'node:fs';
import { applyCommand,createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld,footprintCells } from '../src/sim/index';
import { footprintContains } from '../src/sim/definitions';
import { constructionRecipe } from '../src/sim/construction-materials';
import { CLOTHING_RESEARCH_COST,RESEARCH_SCALE,researchRate } from '../src/sim/research';
import { WorkEnvironmentCache } from '../src/sim/work-environment';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import type { Command,World,Structure } from '../src/sim/types';

const command=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
function until(w:World,done:()=>boolean,limit=60000){for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}if(!done())writeFileSync('tmp/research-failure.json',serializeWorld(w));expect(done(),JSON.stringify({tick:w.tick,research:w.research,pawns:w.pawns.map(p=>({state:p.state,research:p.research,job:p.jobId,need:p.need,hunger:p.hunger})),jobs:w.jobs})).toBe(true);}
function fixture(count=2){const w=createWorld(42,16,16);w.resources=[];w.structures=[];w.piles=[];w.pawns=w.pawns.slice(0,count);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));delete w.arrivals;delete w.raids;
  for(const [i,p] of w.pawns.entries()){p.x=3+i;p.z=3;p.hunger=p.rest=100;p.schedule.fill('work');for(const k in p.priorities)p.priorities[k as keyof typeof p.priorities]=0;p.priorities.research=1;}
  refreshStock(w);return w;}
function bench(w:World,x=8,z=8):Structure{const s:Structure={id:w.nextId++,kind:'research-bench',x,z,orientation:0,material:'wood',footprint:'standard'};w.structures.push(s);return s;}

test('research is physical and collective: exclusive seats, pause, priority, interruptions and exact continuation',()=>{
  const w=fixture(),s=bench(w);command(w,{type:'research-project',project:'complex-clothing'});
  stepWorld(w);expect(w.research!.points).toBe(0);expect(w.pawns.filter(p=>p.research)).toHaveLength(1);
  until(w,()=>w.research!.points>1000000,500);expect(w.pawns.find(p=>p.research)!.state).toBe('working');
  const points=w.research!.points;command(w,{type:'research-project',project:null});stepWorld(w,20);expect(w.research!.points).toBe(points);expect(w.pawns.some(p=>p.research)).toBe(false);
  bench(w,11,8);command(w,{type:'research-project',project:'complex-clothing'});until(w,()=>w.pawns.every(p=>p.research&&p.state==='working'),500);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,60);stepWorld(copy,60);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  const queued=w.pawns[1]!;queued.priorities.gather=1;
  w.resources.push({id:w.nextId++,kind:'tree',x:3,z:10,amount:12});command(w,{type:'designate',kind:'chop',x:3,z:10});const chop=w.jobs.at(-1)!;
  command(w,{type:'order-job',pawnId:queued.id,jobId:chop.id,queue:true});expect(queued.research).toBeDefined();expect(queued.orders.queue).toEqual([chop.id]);
  until(w,()=>!w.jobs.some(j=>j.id===chop.id),1200);expect(w.piles.filter(i=>i.item==='wood').reduce((n,i)=>n+i.quantity,0)).toBe(12);
  const p=w.pawns[0]!;command(w,{type:'priority',pawnId:p.id,work:'research',value:0});expect(p.research).toBeUndefined();
  command(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z});p.priorities.build=1;until(w,()=>w.packed.some(p=>p.building.id===s.id),1200);expect(w.research!.points).toBeGreaterThan(points);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('bench geometry, material costs and researched gating apply to every orientation and corrupt saves',()=>{
  const w=fixture(1);expect(applyCommand(w,{type:'designate',kind:'tailor-bench',material:'wood',x:7,z:7}).ok).toBe(false);
  expect(constructionRecipe({kind:'research-bench',material:'steel'}).ingredients).toEqual([{item:'steel',quantity:100}]);
  expect(constructionRecipe({kind:'tailor-bench',material:'wood'}).ingredients).toEqual([{item:'wood',quantity:75}]);
  for(const orientation of [0,1,2,3] as const){const s={...bench(w),orientation};w.structures=[];const cells=footprintCells(s);expect(cells).toHaveLength(6);for(let z=6;z<=10;z++)for(let x=6;x<=10;x++)expect(footprintContains(s,{x,z})).toBe(cells.some(c=>c.x===x&&c.z===z));}
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=72;withoutHunting(old);for(const p of old.pawns){delete p.priorities.research;delete p.skills.intellectual;}
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.research).toBeUndefined();expect(migrated.pawns[0]!.skills.intellectual).toBeUndefined();expect(migrated.pawns[0]!.priorities.research).toBe(3);
  for(const mutation of [(s:any)=>s.research={project:null,points:0},(s:any)=>s.pawns[0].priorities.research=1,(s:any)=>s.pawns[0].skills.intellectual={level:8,xp:0,dailyXp:0,passion:0}]){const bad=structuredClone(old);mutation(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 72/);}
  for(const state of [{project:null,points:CLOTHING_RESEARCH_COST},{project:'complex-clothing',points:-1},{project:null,points:1,completedAt:0},{project:'unknown',points:0}]){const bad=JSON.parse(serializeWorld(w));bad.research=state;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('research rate respects intellect, capacities, light and thermal thresholds without changing existing points',()=>{
  const w=fixture(1),p=w.pawns[0]!,s=bench(w),env=new WorkEnvironmentCache().read(w);p.x=8;p.z=7;
  const normal=researchRate(p,s,env,20);expect(normal).toBeGreaterThan(0);expect(researchRate(p,s,env,8.99)).toBeCloseTo(normal*.7,0);expect(researchRate(p,s,env,9)).toBe(normal);expect(researchRate(p,s,env,35)).toBe(normal);
  p.skills.intellectual!.level=0;expect(researchRate(p,s,env,20)).toBeLessThan(normal);p.skills.intellectual!.level=20;expect(researchRate(p,s,env,20)).toBeGreaterThan(normal);
});

test('cotton colony mines and builds its research chain, researches from zero, makes and wears the unlocked shirt',()=>{
  const w=deserializeWorld(readFileSync('artifacts/tailoring-cotton-checkpoint-v72.json','utf8')),p=w.pawns[0]!,start=w.tick;
  // Extend this finite natural-growth fixture with harvestable trees and ore,
  // never inject research progress, construction deliveries or textile output.
  for(let z=12;z<=15;z++)for(let x=1;x<=14;x++){if(x>6&&x<11)continue;w.resources.push({id:w.nextId++,kind:'tree',x,z,amount:12});}
  w.tiles[13*w.width+10]={terrain:'rock',stone:'sandstone',ore:'steel'};

  for(const work of ['mine','gather','build','research','craft','cook'] as const)command(w,{type:'priority',pawnId:p.id,work,value:work==='research'?2:1});
  command(w,{type:'area',action:'chop',from:{x:1,z:12},to:{x:14,z:15}});command(w,{type:'designate',kind:'mine',x:10,z:13});
  command(w,{type:'designate',kind:'research-bench',material:'wood',x:8,z:9});command(w,{type:'research-project',project:'complex-clothing'});
  command(w,{type:'area',action:'growing',from:{x:7,z:0},to:{x:14,z:3}});
  command(w,{type:'area',action:'growing',from:{x:0,z:0},to:{x:2,z:2}});
  command(w,{type:'area',action:'remove-growing',from:{x:8,z:5},to:{x:10,z:6}});
  command(w,{type:'area',action:'stockpile',from:{x:1,z:9},to:{x:2,z:10}});
  command(w,{type:'designate',kind:'campfire',material:'wood',x:1,z:6});until(w,()=>w.structures.some(s=>s.kind==='campfire'),10000);
  const fire=w.structures.find(s=>s.kind==='campfire')!;command(w,{type:'bill-add',structureId:fire.id});command(w,{type:'bill-update',structureId:fire.id,billId:fire.bills![0]!.id,settings:{...fire.bills![0]!,mode:'until',target:3}});
  let slept=false,ate=false;until(w,()=>{slept ||= p.state==='sleeping';ate ||= p.state==='eating';return (w.research?.points??0)>=598*RESEARCH_SCALE;},120000);
  writeFileSync('artifacts/research-checkpoint-v74.json',serializeWorld(w));
  until(w,()=>w.research?.completedAt!==undefined);const done=w.research!.completedAt!;expect(w.events.filter(e=>e.message.startsWith('Recherche achevée'))).toHaveLength(1);
  command(w,{type:'designate',kind:'tailor-bench',material:'wood',x:8,z:12});until(w,()=>w.structures.some(s=>s.kind==='tailor-bench'),30000);
  const tailor=w.structures.find(s=>s.kind==='tailor-bench')!;command(w,{type:'bill-add',structureId:tailor.id,recipe:'shirt'});
  until(w,()=>w.piles.some(i=>i.unfinished?.recipe==='shirt'),15000);const u=w.piles.find(i=>i.unfinished?.recipe==='shirt')!;expect(u.unfinished!.cloth).toBe(45);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,200);stepWorld(w,200);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  until(w,()=>w.piles.some(i=>i.item==='cloth-shirt'&&i.owner.type==='ground'),15000);const shirt=w.piles.find(i=>i.item==='cloth-shirt')!;
  command(w,{type:'order-equipment',pawnId:p.id,itemId:shirt.id,action:'wear',queue:false});until(w,()=>shirt.owner.type==='apparel',1500);
  expect(w.piles.filter(i=>i.item==='cloth').reduce((n,i)=>n+i.quantity,0)).toBe(15);expect(slept&&ate).toBe(true);expect(w.research!.completedAt).toBe(done);expect(p.skills.intellectual!.xp).toBeGreaterThan(0);
  writeFileSync('artifacts/research-colony-v74.json',JSON.stringify({start,end:w.tick,research:w.research,skills:p.skills,shirt,slept,ate,buildings:w.structures.map(s=>s.kind),stock:w.stock},null,2));
},30000);
