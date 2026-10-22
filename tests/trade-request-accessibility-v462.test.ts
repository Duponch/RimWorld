import {expect,test} from 'vitest';
import {TRADE_REQUEST_CONTENT_284,tradeRequestContent284,tradeRequestFamilyForItem284} from '../src/sim/trade-request-content-284.ts';
import {captureTradeRequestAvailability284} from '../src/sim/trade-request-accessibility-284.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import type {MaterialPile,Structure,World} from '../src/sim/types.ts';
import {healrootCamp} from './helpers/healroot-domestic-v195.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {initialWorldRegistry,captureLocalMap} from '../src/sim/world-map-context.ts';

/** Prepared reader fixtures, never an elapsed manufacturing campaign. */
function camp(){
 const w=healrootCamp(32,1);w.schemaVersion=284;
 delete w.worldMaps;delete w.worldGroups;delete w.worldFactions;delete w.planet;delete w.site;delete w.exploration;
 for(const p of w.pawns){delete p.background;p.priorities.craft=1;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};}
 w.research={points:0,completedAt:0,project:null};return w;
}
function stock(w:World,item:ItemId,quantity:number,x=4,z=4):MaterialPile {
 const p:MaterialPile={id:w.nextId++,kind:ITEM_DEFINITIONS[item].kind,item,quantity,owner:{type:'ground',x,z}};
 w.piles.push(p);return p;
}
const read=(w:World)=>captureTradeRequestAvailability284(w,w);
function station(w:World,kind:Structure['kind'],x:number,z:number):Structure {
 const s=fixtureBuilding(w,kind,x,z) as Structure;
 // The shared fixture is a bare geometric object. These current worktables
 // and caskets need their actual material to resolve their recovery recipe.
 s.material=kind==='tailor-bench'||kind==='electric-tailor-bench'?'wood':'steel';return s;
}

test('the pool binds native families across represented materials and uses abstract values, not variant sale prices',()=>{
 expect(tradeRequestContent284('shirt')).toMatchObject({baseMarketValue:99.72,baseMass:.3});
 expect(tradeRequestContent284('knife')).toMatchObject({baseMarketValue:66.48,baseMass:.5});
 expect(tradeRequestContent284('flak-helmet')!.items).toEqual(['flak-helmet','plasteel-flak-helmet']);
 expect(tradeRequestFamilyForItem284('cloth-shirt')).toBe('shirt');expect(tradeRequestFamilyForItem284('foxfur-shirt')).toBe('shirt');
 for(const item of ['silver','steel','wood','beer','pemmican','kibble','wort','unfinished-shirt'] as const)expect(tradeRequestFamilyForItem284(item)).toBeUndefined();
 expect(new Set(TRADE_REQUEST_CONTENT_284.map(e=>e.family)).size).toBe(TRADE_REQUEST_CONTENT_284.length);
 const items=TRADE_REQUEST_CONTENT_284.flatMap(e=>e.items);expect(new Set(items).size).toBe(items.length);
 expect(TRADE_REQUEST_CONTENT_284.every(e=>e.baseMarketValue/e.baseMass>=5)).toBe(true);
});

test('real stock and the makeable marker stay distinct, and a reader changes no saved field or RNG',()=>{
 const w=camp();stock(w,'medicine',100);stock(w,'neutroamine',50);stock(w,'muffalo-wool',120);
 const before=JSON.stringify(w),rows=read(w);
 expect(rows.get('medicine')).toEqual({actual:100,potential:100,makeable:false});
 expect(rows.get('neutroamine')).toEqual({actual:50,potential:50,makeable:false});
 expect(rows.get('muffalo-wool')).toEqual({actual:120,potential:120,makeable:false});
 expect(JSON.stringify(w)).toBe(before);expect(read(w)).toEqual(rows);
});

test('one present ingredient admits the native work estimate without full stock, skill, bill or power',()=>{
 const w=camp(),s=station(w,'electric-tailor-bench',8,8);
 s.power={on:false,parentId:null};s.bills=[];stock(w,'cloth',1);
 const before=JSON.stringify(w),rows=read(w);
 expect(rows.get('shirt')).toEqual({actual:0,potential:10,makeable:true});
 expect(rows.get('pants')!.potential).toBe(16);expect(rows.get('duster')!.potential).toBe(2);
 expect(JSON.stringify(w)).toBe(before);
});

test('a disabled Crafting priority or missing native recipe research removes workshop potential',()=>{
 const w=camp();station(w,'tailor-bench',8,8);stock(w,'cloth',1);
 w.pawns[0]!.priorities.craft=0;expect(read(w).get('shirt')!.makeable).toBe(false);
 w.pawns[0]!.priorities.craft=1;delete w.research!.completedAt;
 expect(read(w).get('shirt')!.makeable).toBe(false);
 // Parka has no native ComplexClothing prerequisite, independently of shirt.
 expect(read(w).get('parka')!.potential).toBe(3);
});

test('identical tables are counted once while different native table types retain independent estimates',()=>{
 const w=camp();station(w,'tailor-bench',8,8);station(w,'tailor-bench',12,8);stock(w,'cloth',1);
 expect(read(w).get('shirt')!.potential).toBe(10);
 station(w,'electric-tailor-bench',16,8);expect(read(w).get('shirt')!.potential).toBe(20);
});

test('future components do not become present ingredients of another recipe in the same capture',()=>{
 const w=camp();station(w,'fabrication-bench',8,8);stock(w,'steel',1);stock(w,'plasteel',1);stock(w,'gold',1);
 w.research!.fabrication={points:0,completedAt:0};w.research!.advancedFabrication={points:0,completedAt:0};
 const rows=read(w);expect(rows.get('component')!.makeable).toBe(true);
 // This real bench itself can return one advanced component by dismantling.
 // It is not a present ingredient: no advanced manufacture is counted yet.
 expect(rows.get('advanced-component')!.potential).toBe(1);
 stock(w,'component',1);expect(read(w).get('advanced-component')!.potential).toBe(3);
});

test('installed casket possessions remain the same actual goods in a pure recursive capture',()=>{
 const w=camp(),s=station(w,'cryptosleep-casket',8,8);
 const person=w.pawns.shift()!,held=stock(w,'medicine',4);w.piles=[];held.owner={type:'inventory',pawnId:person.id};
 s.cryptosleep={revision:1,heldAt:w.tick,human:person,items:[held],packed:[]};
 const before=JSON.stringify(w);expect(read(w).get('medicine')!.actual).toBe(4);expect(JSON.stringify(w)).toBe(before);
});

test('harvest and smelting add independent potential without creating their future products',()=>{
 const w=camp();w.resources.push({id:w.nextId++,kind:'cotton',amount:1,x:5,z:5,growth:1,growthTick:w.tick});
 const armor=stock(w,'plasteel-plate-armor',1);armor.apparel={quality:'normal',hitPoints:810};
 const before=JSON.stringify(w),rows=read(w);
 expect(rows.get('cloth')).toEqual({actual:0,potential:10,makeable:true});
 expect(rows.get('plasteel')).toEqual({actual:0,potential:42,makeable:true});
 expect(JSON.stringify(w)).toBe(before);
});

test('only original maps within five approximate world tiles contribute; retired contents remain out',()=>{
 const w=camp();w.planet={revision:1,adoptedAt:w.tick,generationSeed:42,homeTile:0,civilianTile:1,nextGroupId:1,
  tiles:Array.from({length:12},(_,id)=>({id,center:[100*Math.cos(id*Math.PI/6),100*Math.sin(id*Math.PI/6),0] as [number,number,number],neighbours:[(id+11)%12,(id+1)%12],biome:'temperate-forest' as const,hilliness:'flat' as const,meanTemperature:20,rainfall:1000}))};
 initialWorldRegistry(w);
 const near=camp(),far=camp();near.pawns=[];far.pawns=[];
 const a=stock(near,'neutroamine',7),b=stock(far,'neutroamine',99);a.id=w.nextId++;b.id=w.nextId++;
 w.worldMaps!.sites.push({id:1,tile:1,kind:'camp',createdAt:w.tick,visit:null,map:captureLocalMap(near)},
  {id:2,tile:6,kind:'camp',createdAt:w.tick,visit:null,map:captureLocalMap(far)});w.worldMaps!.nextMapId=3;
 const before=JSON.stringify(w);expect(read(w).get('neutroamine')!.actual).toBe(7);expect(JSON.stringify(w)).toBe(before);
 // Removing the original record is a real owner-boundary change for this
 // reader; its historical marker never becomes another map to inspect.
 w.worldMaps!.sites.splice(1,1);w.worldMaps!.retired.push({id:1,tile:1,kind:'camp',createdAt:0,settledAt:0,removedAt:w.tick,reason:'camp-empty'});
 expect(read(w).get('neutroamine')!.actual).toBe(0);
});

test('ordinary prospectivity is closed and existing stock cannot activate the family on an old schema',()=>{
 const w=camp();stock(w,'cloth',40);const old={...w,schemaVersion:283} as unknown as World;
 expect(captureTradeRequestAvailability284(old,old).get('cloth')).toEqual({actual:0,potential:0,makeable:false});
});
