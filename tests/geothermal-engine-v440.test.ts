import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {constructionSupplied,deliveredMaterial} from '../src/sim/construction-materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {GEOTHERMAL_POWER_RESEARCH_COST,geothermalPowerUnlocked} from '../src/sim/research.ts';
import {powerWatts} from '../src/sim/power-rules.ts';
import type {Command,World} from '../src/sim/types.ts';

const fixtureUrl=new URL('../public/test-saves/v419/les-eclaircies.json',import.meta.url);
const total=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function command(w:World,c:Command):void {const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);}
function until(w:World,predicate:()=>boolean,limit:number,observe?:()=>void):void {
  for(let i=0;i<limit&&!predicate();i++){stepWorld(w);observe?.();}
  expect(predicate(),JSON.stringify({tick:w.tick,jobs:w.jobs.filter(j=>j.kind==='geothermal-generator').map(j=>({id:j.id,phase:j.construction,progress:j.progress,reservedBy:j.reservedBy})),pawns:w.pawns.map(p=>({id:p.id,x:p.x,z:p.z,state:p.state,jobId:p.jobId,haul:p.haul,research:p.research})),events:w.events.slice(-4)})).toBe(true);
}

/** Real generated250² Éclaircies source, never edited on disk. Declared test
 * preparation: original colonists released from their current services; two
 * skill8 workers placed at this real worksite/bench, full initial needs and
 * all-day work schedule;340steel+8components deposited on nearby ground;
 *3199.75 research points already prepared. The remaining research, clearing,
 * carrying, frame admission and entire1200-tick base build are real SIM work.
 * No geyser, terrain, animal, original good or research completion is created.
 */
function prepared(){
  const w=deserializeWorld(readFileSync(fixtureUrl,'utf8'));
  expect([w.width,w.height]).toEqual([250,250]);expect(validateWorld(w)).toEqual([]);
  const geyser=w.geysers!.items.find(g=>g.id===31553)!;
  expect(geyser).toMatchObject({x:138,z:151});
  const plan={type:'designate' as const,kind:'geothermal-generator' as const,x:geyser.x-2,z:geyser.z-2,orientation:0 as const,material:'steel' as const};
  const builder=w.pawns.find(p=>p.id===8)!,researcher=w.pawns.find(p=>p.id===9)!;
  const bench=w.structures.find(s=>s.kind==='research-bench')!;
  expect(bench).toBeDefined();
  for(const pawn of w.pawns){
    expect(releaseWork(w,pawn)).toBe(true);
    for(const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[work]=0;
    pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;pawn.schedule=pawn.schedule.map(()=>'work');
    pawn.motion=null;pawn.moveCooldown=0;
  }
  builder.skills.construction.level=8;builder.priorities.build=1;builder.priorities.haul=2;
  researcher.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};researcher.priorities.research=1;
  Object.assign(builder,{x:plan.x-1,z:plan.z+2});Object.assign(researcher,cookingSpot(bench));
  expect(canStandAt(w,builder)).toBe(true);expect(canStandAt(w,researcher)).toBe(true);
  addGroundMaterial(w,'steel',340,{x:plan.x+8,z:plan.z+1},'steel');
  addGroundMaterial(w,'component',8,{x:plan.x+8,z:plan.z+2},'component');
  w.research!.geothermalPower={points:GEOTHERMAL_POWER_RESEARCH_COST-250_000};
  expect(validateWorld(w)).toEqual([]);
  return {w,plan,builderId:builder.id,researcherId:researcher.id,geyserId:geyser.id,geyser,benchId:bench.id};
}

test('real250² research→hauling→paid frame→construction powers the same relocated lamp and resumes both phases exactly',()=>{
  const {w,plan,builderId,researcherId,geyserId,geyser,benchId}=prepared(),researchStart=w.tick;
  const locked=structuredClone(w);expect(applyCommand(w,plan).ok).toBe(false);expect(w).toEqual(locked);
  command(w,{type:'research-project',project:'geothermal-power'});
  let sawResearchContact=false;
  until(w,()=>geothermalPowerUnlocked(w),240,()=>{
    const p=w.pawns.find(p=>p.id===researcherId)!;
    if(p.research?.stationId===benchId&&p.research.worked>0&&p.x===p.research.spot.x&&p.z===p.research.spot.z)sawResearchContact=true;
  });
  expect(sawResearchContact).toBe(true);expect(w.research!.geothermalPower!.completedAt).toBeGreaterThan(researchStart);
  expect(w.research!.geothermalPower!.points).toBe(GEOTHERMAL_POWER_RESEARCH_COST);
  const materialBefore={steel:total(w,'steel'),component:total(w,'component')};
  command(w,plan);const jobId=w.jobs.find(j=>j.kind==='geothermal-generator')!.id;
  let sawCarriedSteel=false,sawCarriedComponents=false,sawPartialDelivery=false;
  const observe=()=>{
    const p=w.pawns.find(p=>p.id===builderId)!,haul=p.haul,job=w.jobs.find(j=>j.id===jobId);
    if(haul?.destination.type==='job'&&haul.destination.jobId===jobId&&haul.phase==='deliver'){
      const carried=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id);
      if(carried?.item==='steel')sawCarriedSteel=true;if(carried?.item==='component')sawCarriedComponents=true;
    }
    if(job&&deliveredMaterial(w,job,'steel')>0&&!constructionSupplied(w,job))sawPartialDelivery=true;
  };
  until(w,()=>{const j=w.jobs.find(j=>j.id===jobId);return !!j&&j.construction==='frame'&&constructionSupplied(w,j);},4500,observe);
  expect(sawCarriedSteel).toBe(true);expect(sawCarriedComponents).toBe(true);expect(sawPartialDelivery).toBe(true);
  const frame=w.jobs.find(j=>j.id===jobId)!;
  expect(deliveredMaterial(w,frame,'steel')).toBe(340);expect(deliveredMaterial(w,frame,'component')).toBe(8);
  expect(validateWorld(w)).toEqual([]);

  // The same paid-frame checkpoint branches once into a real cancellation;
  // the main branch continues the original work without replaying preparation.
  const cancelled=deserializeWorld(serializeWorld(w)),naturalBefore=structuredClone(cancelled.geysers);
  command(cancelled,{type:'area',action:'cancel',from:{x:plan.x,z:plan.z},to:{x:plan.x,z:plan.z}});
  expect(cancelled.jobs.some(j=>j.id===jobId)).toBe(false);expect(cancelled.piles.some(p=>p.owner.type==='job'&&p.owner.jobId===jobId)).toBe(false);
  expect(total(cancelled,'steel')).toBe(materialBefore.steel);expect(total(cancelled,'component')).toBe(materialBefore.component);expect(cancelled.geysers).toEqual(naturalBefore);
  expect(validateWorld(cancelled)).toEqual([]);expect(deserializeWorld(serializeWorld(cancelled))).toEqual(cancelled);

  let sawWorkContact=false;
  until(w,()=>w.structures.some(s=>s.kind==='geothermal-generator'),4500,()=>{
    const p=w.pawns.find(p=>p.id===builderId)!,job=w.jobs.find(j=>j.id===jobId);
    if(job&&job.progress>0&&p.jobId===job.id&&p.state==='working'){
      const cells=footprintCells(job);
      if(!cells.some(c=>c.x===p.x&&c.z===p.z)&&cells.some(c=>Math.abs(c.x-p.x)+Math.abs(c.z-p.z)===1))sawWorkContact=true;
    }
  });
  const generator=w.structures.find(s=>s.kind==='geothermal-generator')!;
  expect(sawWorkContact).toBe(true);expect(w.jobs.some(j=>j.id===jobId)).toBe(false);
  expect(total(w,'steel')).toBe(materialBefore.steel-340);expect(total(w,'component')).toBe(materialBefore.component-8);
  expect(generator).toMatchObject({x:plan.x,z:plan.z,material:'steel',orientation:0,footprint:'standard',geothermal:{geyserId}});
  expect(generator.fuel).toBeUndefined();expect(generator.quality).toBeUndefined();expect(generator.power?.switchOn).toBeUndefined();
  expect(w.geysers!.items.find(g=>g.id===geyserId)).toBe(geyser);
  const naturalAtHarvest=structuredClone(geyser);
  expect(powerWatts(generator,w)).toBe(3600);

  // Relocate an ORIGINAL minifiable consumer through its physical transport,
  // avoiding a second manufactured generator, consumer or free resource grant.
  const lamp=w.structures.find(s=>s.id===37608&&s.kind==='standing-lamp')!;
  command(w,{type:'install',structureId:lamp.id,x:plan.x+7,z:plan.z+2,orientation:0});
  until(w,()=>w.structures.some(s=>s.id===lamp.id&&s.x===plan.x+7&&s.z===plan.z+2&&s.power?.on),1800);
  const relocated=w.structures.find(s=>s.id===lamp.id)!;
  expect(relocated.power).toMatchObject({on:true,parentId:generator.id});expect(powerWatts(relocated,w)).toBe(-30);
  expect(geyser).toEqual(naturalAtHarvest);

  until(w,()=>generator.geothermal!.sprayTicksLeft>0,250);
  expect(validateWorld(w)).toEqual([]);
  const saved=serializeWorld(w),peer=deserializeWorld(saved);expect(serializeWorld(peer)).toBe(saved);
  stepWorld(w,73);stepWorld(peer,73);
  expect(serializeWorld(peer)).toBe(serializeWorld(w));expect(peer).toEqual(w);
  expect(w.geysers!.items.find(g=>g.id===geyserId)).toEqual(naturalAtHarvest);
  expect(generator.geothermal!.atTick).toBe(w.tick);expect(powerWatts(generator,w)).toBe(3600);
},180000);

test('a future geothermal blueprint cannot enter an unchanged valid263 source before migration',()=>{
  const source=readFileSync(fixtureUrl,'utf8');expect(deserializeWorld(source).schemaVersion).toBe(264);
  const raw=JSON.parse(source) as World;expect(raw.schemaVersion).toBe(263);
  const geyser=raw.geysers!.items.find(g=>g.id===31553)!;
  raw.jobs.push({id:raw.nextId++,kind:'geothermal-generator',x:geyser.x-2,z:geyser.z-2,orientation:0,footprint:'standard',material:'steel',construction:'blueprint',progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}});
  expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
});
