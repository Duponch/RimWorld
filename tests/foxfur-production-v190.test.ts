import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { adultAgeTicks } from '../src/sim/animal-life';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { refreshStock } from '../src/sim/materials';
import { PRODUCTION_RECIPES,productionWorkTotal } from '../src/sim/production-recipes';
import { WEAPON_QUALITIES } from '../src/sim/equipment-rules';
import { APPAREL } from '../src/sim/apparel-rules';
import type { Command,MaterialPile,World } from '../src/sim/types';
import { medicalCamp } from './scenarios/health';

const quantity=(w:World,item:MaterialPile['item'])=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
const accept=(w:World,command:Command)=>expect(applyCommand(w,command),JSON.stringify(command)).toMatchObject({ok:true});

/** Rare-boundary preparation: three fresh adult fox bodies with their own
 * identity and frozen death record, an experienced butcher and empty ground.
 * No hunt or natural acquisition is claimed. No fur, work, delivery or product
 * is granted: every subsequent transition goes through the simulation. */
test('three real fox bodies supply the conserved fur of one physically collected, crafted and delivered garment with exact resumption',()=>{
  const w=medicalCamp(1,16),pawn=w.pawns[0]!,start=w.tick;
  w.resources=[];w.jobs=[];w.structures=[];w.piles=[];w.stockpiles=[];delete w.wildlife;
  Object.assign(pawn,{x:3,z:4,hunger:100,rest:100});
  pawn.apparelAutomation=false;
  pawn.skills.cooking={level:20,xp:0,dailyXp:0,passion:0};
  pawn.skills.crafting={level:12,xp:0,dailyXp:0,passion:0};
  pawn.priorities.cook=1;
  for(const policy of w.foodPolicies)policy.allowed=[];
  const sources=new Map<number,{x:number;z:number}>();
  for(let i=0;i<3;i++){
    const id=w.nextId++,cell={x:5+i,z:4};sources.set(id,cell);
    const health={...createMedicalRecord(w.tick),body:'red-fox' as const,bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss' as const}};
    w.piles.push({id,item:'red-fox-corpse',kind:'corpse',quantity:1,owner:{type:'ground',...cell},
      corpse:{animalId:id,species:'red-fox',sex:'female',ageTicks:adultAgeTicks('red-fox'),health},rot:{progress:0,atTick:w.tick}});
  }
  const historicalBodies=new Map(w.piles.map(p=>[p.id,structuredClone(p.corpse!)]));
  accept(w,{type:'designate',kind:'butcher-spot',x:8,z:8});
  const butcher=w.structures.find(s=>s.kind==='butcher-spot')!;
  accept(w,{type:'bill-add',structureId:butcher.id,recipe:'butcher-creature'});
  const butcherBill=butcher.bills![0]!;
  accept(w,{type:'bill-update',structureId:butcher.id,billId:butcherBill.id,settings:{...butcherBill,target:3,destination:'drop',
    filters:Object.fromEntries(Object.keys(butcherBill.filters).map(item=>[item,item==='red-fox-corpse']))}});
  refreshStock(w);expect(validateWorld(w)).toEqual([]);expect(quantity(w,'foxfur')).toBe(0);

  const collected=new Set<number>();let staged=false,replay:World|undefined,acquired:number|undefined;
  let furHeld=false,garmentHeld=false;
  function observe():void {
    const worker=w.pawns[0]!;
    expect(w.piles.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===worker.id).length).toBeLessThanOrEqual(1);
    for(const pile of w.piles){
      if(pile.corpse&&sources.has(pile.id)){
        expect(pile.quantity).toBe(1);expect(pile.corpse).toEqual(historicalBodies.get(pile.id));
        if(pile.owner.type==='pawn'&&!collected.has(pile.id)){
          const source=sources.get(pile.id)!;
          expect(Math.abs(worker.x-source.x)+Math.abs(worker.z-source.z)).toBeLessThanOrEqual(1);
          collected.add(pile.id);
        }
      }
      if(pile.item==='foxfur'&&pile.owner.type==='pawn')furHeld=true;
      if(pile.item==='foxfur-tribalwear'&&pile.owner.type==='pawn')garmentHeld=true;
    }
    const task=worker.cooking;
    if(task?.recipe==='butcher-creature'&&task.phase==='work'&&task.progress>0){
      expect(task.ingredients).toHaveLength(1);const ingredient=task.ingredients[0]!,body=w.piles.find(p=>p.id===ingredient.pileId)!;
      expect(ingredient.stage).toBe('placed');expect(body.owner).toEqual({type:'ground',...ingredient.cell});
      expect(Math.abs(worker.x-ingredient.cell.x)+Math.abs(worker.z-ingredient.cell.z)).toBeLessThanOrEqual(1);staged=true;
    }
    if(acquired!==undefined){
      const unfinished=w.piles.reduce((sum,p)=>sum+(p.unfinished?.material==='foxfur'?p.unfinished.units??0:0),0);
      expect(quantity(w,'foxfur')+unfinished+quantity(w,'foxfur-tribalwear')*60).toBe(acquired);
      expect(quantity(w,'red-fox-meat')).toBe(w.butchery!.meat);
    }
  }
  function until(done:()=>boolean):void {
    while(!done()&&w.tick-start<2500){
      stepWorld(w);if(replay)stepWorld(replay);
      observe();expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
      if(replay&&(w.tick-start)%25===0)expect(replay).toEqual(w);
    }
    expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0],piles:w.piles,bills:w.structures.map(s=>s.bills)})).toBe(true);
    if(replay)expect(replay).toEqual(w);
  }
  function checkpoint():void {
    const saved=serializeWorld(w);replay=deserializeWorld(saved);
    expect(replay).toEqual(w);expect(serializeWorld(replay)).toBe(saved);
  }

  until(()=>pawn.cooking?.recipe==='butcher-creature'&&pawn.cooking.phase==='work'&&pawn.cooking.progress>0);
  expect(staged).toBe(true);checkpoint();
  until(()=>w.butchery?.completed===3&&!pawn.cooking);
  expect(collected.size).toBe(3);expect(w.piles.some(p=>sources.has(p.id))).toBe(false);
  acquired=quantity(w,'foxfur');expect(acquired).toBe(w.butchery!.leather);expect(acquired).toBeGreaterThanOrEqual(60);
  expect(quantity(w,'red-fox-meat')).toBe(w.butchery!.meat);
  expect(w.piles.every(p=>p.item!=='foxfur'||p.owner.type==='ground')).toBe(true);

  // The ordinary existing tribalwear recipe is the only admission path.
  replay=undefined;
  accept(w,{type:'priority',pawnId:pawn.id,work:'cook',value:0});accept(w,{type:'priority',pawnId:pawn.id,work:'craft',value:1});
  accept(w,{type:'designate',kind:'crafting-spot',x:12,z:8});
  const station=w.structures.find(s=>s.kind==='crafting-spot')!;
  accept(w,{type:'bill-add',structureId:station.id,recipe:'tribalwear'});const bill=station.bills![0]!;
  expect(PRODUCTION_RECIPES.tribalwear.units).toBe(60);
  accept(w,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,destination:'drop',
    filters:Object.fromEntries(Object.keys(bill.filters).map(item=>[item,item==='foxfur']))}});
  until(()=>w.piles.some(p=>p.unfinished?.material==='foxfur'&&p.unfinished.progress>0));
  expect(furHeld).toBe(true);
  const unfinished=w.piles.find(p=>p.unfinished?.material==='foxfur')!,unfinishedId=unfinished.id;
  expect(unfinished.unfinished).toMatchObject({recipe:'tribalwear',authorId:pawn.id,material:'foxfur',units:60,billId:bill.id});
  expect(unfinished.unfinished!.parts.reduce((sum,n)=>sum+n,0)).toBe(60);
  expect(unfinished.unfinished!.progress).toBeLessThan(productionWorkTotal('tribalwear'));checkpoint();
  until(()=>w.tailoring?.completed===1&&!pawn.cooking);
  expect(garmentHeld).toBe(true);expect(w.piles.some(p=>p.id===unfinishedId)).toBe(false);
  const garments=w.piles.filter(p=>p.item==='foxfur-tribalwear');expect(garments).toHaveLength(1);
  const garment=garments[0]!;
  expect(garment).toMatchObject({kind:'apparel',quantity:1,owner:{type:'ground'},apparel:{material:'foxfur'}});
  expect(WEAPON_QUALITIES).toContain(garment.apparel!.quality);expect(garment.apparel!.quality).not.toBe('legendary');
  expect(garment.apparel!.hitPoints).toBe(APPAREL['foxfur-tribalwear'].hitPoints);
  expect(quantity(w,'foxfur')).toBe(acquired-60);expect(w.tailoring).toMatchObject({completed:1,cancelled:0,lostCloth:0});
  expect(w.tailoring!.lostLeather??0).toBe(0);expect(station.bills![0]!.target).toBe(0);
  expect(w.tick-start).toBeLessThan(2500);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
