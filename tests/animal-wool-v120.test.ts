import {expect,test} from 'vitest';
import {applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index';
import {addGroundMaterial,refreshStock} from '../src/sim/materials';
import {APPAREL,APPAREL_FAMILIES,apparelInsulation,apparelItemFor,newApparelState} from '../src/sim/apparel-rules';
import {validApparelShape} from '../src/sim/apparel-save';
import {validUnfinishedShape} from '../src/sim/unfinished';
import {newCookingBill} from '../src/sim/cooking-bills';
import {apparelAppearance,APPAREL_CARGO,foldedApparel} from '../src/render/character-apparel';
import {BIOME_CARGO} from '../src/render/biome-cargo';
import {ITEM_DEFINITIONS} from '../src/sim/items';
import {pileMarketValue} from '../src/sim/trade-prices';
import {colonyWealth} from '../src/sim/colony-wealth';
import type {MaterialPile,World} from '../src/sim/types';

const command=(world:World,action:Parameters<typeof applyCommand>[1])=>expect(applyCommand(world,action)).toMatchObject({ok:true});
function until(world:World,done:()=>boolean,limit=3000):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(world);
  expect(done(),JSON.stringify(world.pawns.map(p=>({state:p.state,cooking:p.cooking,equipment:p.equipmentTask})))).toBe(true);
  expect(validateWorld(world)).toEqual([]);
}
function workshop():World {
  const world=createWorld(1201,16,16);world.resources=[];world.piles=[];world.jobs=[];world.structures=[];world.stockpiles=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.pawns=world.pawns.slice(0,1);world.tick=2000;
  const pawn=world.pawns[0]!;Object.assign(pawn,{x:4,z:4,hunger:100,rest:100});pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities))pawn.priorities[key as keyof typeof pawn.priorities]=0;
  pawn.priorities.craft=1;pawn.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
  addGroundMaterial(world,'textile',60,{x:2,z:4},'muffalo-wool');refreshStock(world);
  command(world,{type:'designate',kind:'crafting-spot',x:8,z:8});
  const station=world.structures[0]!;command(world,{type:'bill-add',structureId:station.id});station.bills![0]!.destination='drop';
  return world;
}

test('Core wool stats flow through five craftable garments, insulation and shared presentation',()=>{
  expect(ITEM_DEFINITIONS['muffalo-wool']).toMatchObject({kind:'textile',stackLimit:100,color:0xb3c0ba});
  expect(APPAREL['muffalo-wool-parka']).toMatchObject({color:0xb3c0ba,coldInsulation:56,heatInsulation:0});
  expect(APPAREL['muffalo-wool-duster'].ratings.heat).toBeCloseTo(.33);
  expect(APPAREL['muffalo-wool-parka'].coldInsulation).toBeGreaterThan(APPAREL['bluefur-parka'].coldInsulation);
  expect(newCookingBill(1,'tribalwear').filters['muffalo-wool']).toBe(true);
  for(const family of APPAREL_FAMILIES){
    const item=apparelItemFor(family,'muffalo-wool');
    const pile:MaterialPile={id:1,kind:'apparel',item,quantity:1,owner:{type:'apparel',pawnId:1},apparel:newApparelState(item)};
    expect(validApparelShape(pile as unknown as Record<string,unknown>,120)).toBe(true);
    expect(validApparelShape(pile as unknown as Record<string,unknown>,119)).toBe(false);
    expect(apparelInsulation(pile).cold).toBe(APPAREL[item].coldInsulation);
    expect(foldedApparel(item)[0]!.color).toBe(0xb3c0ba);
    expect(APPAREL_CARGO[item]).toBeGreaterThan(0);
  }
  const pants:MaterialPile={id:2,kind:'apparel',item:'muffalo-wool-pants',quantity:1,owner:{type:'apparel',pawnId:1},apparel:newApparelState('muffalo-wool-pants')};
  const parka:MaterialPile={id:3,kind:'apparel',item:'muffalo-wool-parka',quantity:1,owner:{type:'apparel',pawnId:1},apparel:newApparelState('muffalo-wool-parka')};
  expect(apparelAppearance([pants,parka])).toMatchObject({silhouette:4,pants:6,color:0xb3c0ba});
  expect(BIOME_CARGO['muffalo-wool']).toBe(69);
  expect(new Set([...Object.values(BIOME_CARGO),...Object.values(APPAREL_CARGO)]).size).toBe(Object.keys(BIOME_CARGO).length+Object.keys(APPAREL_CARGO).length);
});

test('physical wool keeps its identity through unfinished work, reload, completion and wear',()=>{
  const world=workshop(),pawn=world.pawns[0]!;
  until(world,()=>world.piles.some(p=>(p.unfinished?.progress??0)>0));
  const work=world.piles.find(p=>p.unfinished)!;
  expect(work.unfinished).toMatchObject({recipe:'tribalwear',material:'muffalo-wool',units:60,authorId:pawn.id});
  expect(validUnfinishedShape(work as unknown as Record<string,unknown>,120)).toBe(true);
  expect(validUnfinishedShape(work as unknown as Record<string,unknown>,119)).toBe(false);
  const restored=deserializeWorld(serializeWorld(world));stepWorld(world,100);stepWorld(restored,100);expect(restored).toEqual(world);
  until(world,()=>world.piles.some(p=>p.item==='muffalo-wool-tribalwear')&&!pawn.cooking);
  expect(world.piles.some(p=>p.item==='muffalo-wool'||p.unfinished)).toBe(false);
  const garment=world.piles.find(p=>p.item==='muffalo-wool-tribalwear')!;
  expect(garment.apparel?.material).toBe('muffalo-wool');
  command(world,{type:'order-equipment',pawnId:pawn.id,itemId:garment.id,action:'wear',queue:false});
  until(world,()=>garment.owner.type==='apparel');
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('cancelling wool work refunds wool and counts its physical input value',()=>{
  const world=workshop();until(world,()=>world.piles.some(p=>(p.unfinished?.progress??0)>0));
  const work=world.piles.find(p=>p.unfinished)!;
  expect(colonyWealth(world).items).toBe(60*2.7);
  const before=serializeWorld(world),nextId=world.nextId;
  world.nextId=Number.MAX_SAFE_INTEGER;
  expect(applyCommand(world,{type:'cancel-unfinished',itemId:work.id}).ok).toBe(false);
  world.nextId=nextId;expect(serializeWorld(world)).toBe(before);
  command(world,{type:'cancel-unfinished',itemId:work.id});
  expect(world.piles.some(p=>p.unfinished)).toBe(false);
  expect(world.piles.filter(p=>p.item==='muffalo-wool').reduce((n,p)=>n+p.quantity,0)).toBe(45);
  expect(world.piles.filter(p=>p.item==='cloth')).toEqual([]);
  expect(pileMarketValue(world.piles.find(p=>p.item==='muffalo-wool')!)).toBe(2.7);
  expect(validateWorld(world)).toEqual([]);
});
