import { initializeCampTraits } from '../src/sim/traits';
import { expect,test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld,applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { enableRaids } from '../src/sim/raids';
import { enableArrivals } from '../src/sim/arrivals';
import { isColonist } from '../src/sim/affiliation';
import { playerArrivalDecisions,playerArrivalComplete,playerDecisions,colonySummary,woodAccount } from './scenarios/colony-player';

test('ordinary player builds, welcomes, faces a naturally scheduled raid, demobilizes and maintains the same camp for five days',()=>{
  const version=process.env.VALIDATION_VERSION??'v69';
  const w=createWorld(42,250,250);initializeCampTraits(w);enableArrivals(w);enableRaids(w);
  for(const d of playerArrivalDecisions(w))expect(applyCommand(w,d.command)).toMatchObject({ok:true});
  for(let i=0;i<120&&!playerArrivalComplete(w);i++)stepWorld(w);
  expect(playerArrivalComplete(w)).toBe(true);applyCommand(w,{type:'draft',pawnIds:[w.pawns[0]!.id],enabled:false});
  const initialWood=woodAccount(w),decisions:{tick:number;reason:string}[]=[],checkpoints=[];let began=0,ended=0,injured=false,treated=false,postMeal=false,postWork=false;
  for(let i=0;i<30000;i++){
    if(i%250===0||w.raids?.active&&i%20===0||!w.raids?.active&&w.pawns.some(p=>isColonist(p)&&p.draft))for(const d of playerDecisions(w)){expect(applyCommand(w,d.command),d.reason).toMatchObject({ok:true});decisions.push({tick:w.tick,reason:d.reason});}
    stepWorld(w);
    injured ||= w.pawns.some(p=>isColonist(p)&&!!p.health?.injuries.length);treated ||= w.pawns.some(p=>isColonist(p)&&p.health?.injuries.some(j=>j.tended!==undefined));
    if(w.raids!.active&&!began){began=w.tick;writeFileSync(`tmp/raid-camp-${version}.json`,serializeWorld(w));expect(w.structures.filter(s=>s.kind==='bed').length).toBeGreaterThanOrEqual(3);}
    if(w.raids!.last&&!ended){ended=w.tick;const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);}
    if(ended){postMeal ||= w.pawns.some(p=>isColonist(p)&&p.state==='eating');postWork ||= w.pawns.some(p=>isColonist(p)&&p.state==='working');}
    if(i%100===0){expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);expect(woodAccount(w)+(w.destroyed?.lost.wood??0)).toBe(initialWood);}
    if(w.tick%6000===0){checkpoints.push(colonySummary(w));console.info(`Raid camp day ${w.tick/6000}: ${w.raids!.active?.phase??w.raids!.last?.reason??'waiting'}`);}
  }
  const summary=colonySummary(w);writeFileSync(`artifacts/raid-colony-${version}.json`,JSON.stringify({began,ended,injured,treated,postMeal,postWork,raid:w.raids,decisions,checkpoints,summary},null,2));
  expect(began).toBeGreaterThanOrEqual(21000);expect(began).toBeLessThan(24000);expect(ended).toBeGreaterThan(began);expect(w.raids!.active).toBeUndefined();expect(w.arrivals!.accepted).toBe(1);
  expect(w.pawns.filter(isColonist)).toHaveLength(4);expect(w.pawns.filter(isColonist).every(p=>p.traits?.length===2)).toBe(true);expect(w.pawns.filter(p=>p.traits?.includes('nervous')).every(p=>p.schedule[20]==='recreation')).toBe(true);expect(w.pawns.filter(isColonist).every(p=>p.state!=='dead'&&p.state!=='downed'&&!p.draft)).toBe(true);
  expect(postMeal&&postWork).toBe(true);if(injured)expect(treated).toBe(true);expect(w.structures.filter(s=>s.kind==='bed')).toHaveLength(4);expect(w.stock.food).toBeGreaterThan(0);
},180000);
