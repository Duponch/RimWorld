import {createIngestionLedger,observeIngestion,ordinaryRationBoundary,promoteLegacyIngestionLedger,readIngestionLedger,trackIngestionStep,RATION_DEADLINE,type IngestionLedger,type IngestionRecord} from './scenarios/ingestion-conservation.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {startFoodBinge} from '../src/sim/mental-break.ts';
import {finishMentalBreak} from '../src/sim/mental-state.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {newBreakdownCalendar} from '../src/sim/breakdowns.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import type {World} from '../src/sim/types.ts';

const rations=(w:World)=>w.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0);
const valid=(w:World)=>expect(validateWorld(w),`tick${w.tick}`).toEqual([]);
/** Authored small late-time episode, not a replayed campaign prefix. The actual
 * task still plans, walks, takes its original portion and consumes at contact. */
function camp(binge=false){
  const w=deconstructionCamp(1,16),pawn=w.pawns[0]!;w.tick=RATION_DEADLINE;
  w.breakdown=newBreakdownCalendar(w.seed,w.tick);
  for(const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[work]=0;
  pawn.hunger=binge?100:20;pawn.rest=100;pawn.recreation.level=100;
  addMaterial(w,'food',1,{type:'ground',x:pawn.x+1,z:pawn.z},'survival-meal');refreshStock(w);valid(w);
  if(binge){expect(startFoodBinge(w,pawn)).toBe(true);expect(pawn.mental?.crisis?.kind).toBe('food-binge');valid(w);}
  return {w,pawn,ledger:createIngestionLedger(w.tick)};
}
function advance(w:World,ledger:IngestionLedger):IngestionRecord[]{
  const before=rations(w),records=trackIngestionStep(w,()=>stepWorld(w));
  for(const r of records)observeIngestion(ledger,r);
  expect(rations(w)+records.filter(r=>r.item==='survival-meal').reduce((n,r)=>n+r.quantity,0)).toBe(before);
  readIngestionLedger(ledger,w.tick,w.nextId);valid(w);return records;
}
function reachIngest(f:ReturnType<typeof camp>):void {
  for(let n=0;n<150&&f.pawn.need?.phase!=='ingest';n++)expect(advance(f.w,f.ledger)).toEqual([]);
  expect(f.pawn.need).toMatchObject({kind:'eat',phase:'ingest'});expect(rations(f.w)).toBe(1);
}

test('ordinary late ingestion remains a deadline failure, while a real satiated food-binge consumes and reports its original portion without erasing the raw ration timestamp',()=>{
  for(const binge of [false,true]){
    const f=camp(binge),{w,pawn,ledger}=f;reachIngest(f);
    const fork=deserializeWorld(serializeWorld(w)),originalPortion=pawn.need?.kind==='eat'?pawn.need.carryPileId:null;
    let rawLastSurvivalMealTick=0;const completed:IngestionRecord[]=[];
    for(let n=0;n<100&&rations(w)>0;n++){
      const records=advance(w,ledger);stepWorld(fork);expect(serializeWorld(fork)).toBe(serializeWorld(w));
      for(const r of records){completed.push(r);rawLastSurvivalMealTick=r.tick;}
    }
    expect(completed).toHaveLength(1);expect(completed[0]).toMatchObject({pawnId:pawn.id,portionId:originalPortion,item:'survival-meal',quantity:1,source:'self',mentalKind:binge?'food-binge':null});
    expect(rations(w)).toBe(0);expect(rawLastSurvivalMealTick).toBeGreaterThan(RATION_DEADLINE);
    expect(ledger.lateBingeSurvivalQuantity).toBe(binge?1:0);expect(ledger.lateSurvivalMeals).toEqual(completed);
    if(binge){expect(ordinaryRationBoundary(ledger)).toBeLessThanOrEqual(RATION_DEADLINE);expect(ledger.lateBingeSurvivalByPawn).toEqual({[pawn.id]:1});}
    else expect(ordinaryRationBoundary(ledger)).toBe(rawLastSurvivalMealTick);
    expect(readIngestionLedger(JSON.parse(JSON.stringify(ledger)),w.tick,w.nextId)).toEqual(ledger);
  }
});

test('an interrupted physical task credits nothing, and ending a crisis before the actual contact cannot excuse its retained ordinary ingestion',()=>{
  const normal=camp();reachIngest(normal);
  expect(applyCommand(normal.w,{type:'draft',pawnIds:[normal.pawn.id],enabled:true})).toMatchObject({ok:true});
  for(let n=0;n<4;n++)expect(advance(normal.w,normal.ledger)).toEqual([]);
  expect(rations(normal.w)).toBe(1);expect(normal.ledger.lateSurvivalMeals).toEqual([]);
  const recovered=camp(true);reachIngest(recovered);finishMentalBreak(recovered.w,recovered.pawn,false);valid(recovered.w);
  const records:IngestionRecord[]=[];
  for(let n=0;n<100&&rations(recovered.w)>0;n++)records.push(...advance(recovered.w,recovered.ledger));
  expect(records).toHaveLength(1);expect(records[0]!.mentalKind).toBeNull();expect(recovered.ledger.lateBingeSurvivalQuantity).toBe(0);
  expect(ordinaryRationBoundary(recovered.ledger)).toBeGreaterThan(RATION_DEADLINE);
});

test('strict revision4 observation rejects an unobserved late legacy prefix and malformed/future records; an authenticated early prefix stores only its conservative raw temporal bound',()=>{
  const sha='a'.repeat(64),legacy=promoteLegacyIngestionLedger(RATION_DEADLINE,90000,sha);
  expect(ordinaryRationBoundary(legacy)).toBe(90000);expect(legacy.lastObservedOrdinarySurvivalMealTick).toBe(0);expect(legacy.lateBingeSurvivalQuantity).toBe(0);
  expect(legacy.legacyBeforeDeadline).toMatchObject({tick:RATION_DEADLINE,rawLastSurvivalMealTick:90000,checkpointSha256:sha,boundary:'all-recorded-ingestions-before-or-at-102000'});
  expect(()=>promoteLegacyIngestionLedger(RATION_DEADLINE+1,90000,sha)).toThrow(/authenticated prefix/);
  expect(()=>promoteLegacyIngestionLedger(90000,90001,sha)).toThrow();expect(()=>promoteLegacyIngestionLedger(90000,80000,'missing-proof')).toThrow();
  expect(readIngestionLedger(legacy,RATION_DEADLINE,100)).toEqual(legacy);
  for(const bad of [{...legacy,extra:true},{...legacy,revision:2},{...legacy,lastObservedOrdinarySurvivalMealTick:RATION_DEADLINE+1},{...legacy,lateBingeSurvivalQuantity:1},
    {...legacy,legacyBeforeDeadline:{...legacy.legacyBeforeDeadline,extra:true}},{...legacy,lateSurvivalMeals:[{tick:RATION_DEADLINE+1,pawnId:1,portionId:2,item:'survival-meal',quantity:1,source:'self',mentalKind:'invented-crisis'}]}])expect(()=>readIngestionLedger(bad,RATION_DEADLINE,100)).toThrow();
  const f=camp(true);reachIngest(f);for(let n=0;n<100&&rations(f.w)>0;n++)advance(f.w,f.ledger);
  const record=f.ledger.lateSurvivalMeals[0]!;
  for(const bad of [{...f.ledger,lateSurvivalMeals:[record,record]},{...f.ledger,lateSurvivalMeals:[{...record,quantity:1.5}]},
    {...f.ledger,lateSurvivalMeals:[{...record,mentalKind:'berserk'}]},{...f.ledger,lateSurvivalMeals:[{...record,source:'assisted'}]},
    {...f.ledger,lateSurvivalMeals:[{...record,item:'component'}]},{...f.ledger,lateBingeSurvivalByPawn:{[record.pawnId]:2}}])expect(()=>readIngestionLedger(bad,f.w.tick,f.w.nextId)).toThrow();
});
