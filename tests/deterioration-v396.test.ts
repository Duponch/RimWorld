import {expect,test} from 'vitest';
import {advanceDeterioration} from '../src/sim/deterioration.ts';
import {createDeteriorationState,DETERIORATION_INTERVAL,DETERIORATION_RATES} from '../src/sim/deterioration-content.ts';
import {deteriorationExposure,captureDeteriorationEnvironment} from '../src/sim/deterioration-rules.ts';
import {thermalLayout,reconcileTemperature} from '../src/sim/temperature.ts';
import {pileMaxHp,damagePile} from '../src/sim/thing-damage.ts';
import {addMaterial,depositMaterialPart,transferPile,refreshStock} from '../src/sim/materials.ts';
import {newWeatherState} from '../src/sim/weather.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import type {ItemId} from '../src/sim/items.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import type {World,MaterialPile} from '../src/sim/types.ts';
import {deteriorationWorkshopV396} from './scenarios/deterioration-v396.ts';
import {biofuelCamp} from './helpers/biofuel-v283.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
const first=()=>{const f=deteriorationWorkshopV396();return {...f,w:f.world,pile:f.world.piles.find(p=>p.id===f.pileId)!};};
function due(w:World){w.tick=w.deterioration!.lastTick+25;if(w.fires)w.fires.clockCore=w.tick*10;}
function until(w:World,done:()=>boolean,max=600){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);}

test('closed ten-material scope reuses Core HP and rates; wrong owners and finished goods stay outside',()=>{
 const {w,pile}=first();const expected={wood:[150,.5],cloth:[80,4],'muffalo-wool':[90,3.4],'light-leather':[60,2],plainleather:[60,2],bluefur:[60,2],camelhide:[60,2],foxfur:[60,2],component:[70,2],'advanced-component':[70,2]};
 expect(Object.keys(DETERIORATION_RATES)).toHaveLength(10);
 for(const [item,[hp,rate]] of Object.entries(expected)){const p={...pile,item:item as ItemId,kind:ITEM_DEFINITIONS[item as ItemId].kind};expect(pileMaxHp(p)).toBe(hp);expect(deteriorationExposure(w,p).baseRate).toBe(rate);}
 for(const item of ['steel','granite-blocks','rice','cloth-shirt','herbal-medicine','chemfuel','human-corpse'] as const)expect(deteriorationExposure(w,{...pile,item,kind:ITEM_DEFINITIONS[item].kind}).status).toBe('out-of-scope');
 for(const owner of [{type:'pawn',pawnId:w.pawns[0]!.id},{type:'job',jobId:123},{type:'inventory',pawnId:w.pawns[0]!.id}] as const)expect(deteriorationExposure(w,{...pile,owner}).status).toBe('not-ground');
 expect(deteriorationExposure({...w,schemaVersion:251 as World['schemaVersion']},pile).status).toBe('out-of-scope');
});

test('actual thermal regions distinguish outdoor canopy, enclosed roof, roof hole and wet terrain',()=>{
 const {w,pile}=first();
 for(let z=15;z<=19;z++)for(let x=15;x<=19;x++)if(x===15||x===19||z===15||z===19)fixtureBuilding(w,'wall',x,z);
 const cells=[];for(let z=16;z<=18;z++)for(let x=16;x<=18;x++)cells.push(z*w.width+x);
 w.roofing={constructed:[...cells,4*w.width+4].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
 fixtureBuilding(w,'wall',4,5);let layout=reconcileTemperature(w);
 const read=(x:number,z:number)=>deteriorationExposure(w,{...pile,owner:{type:'ground',x,z}},captureDeteriorationEnvironment(w,layout));
 expect(read(6,5)).toMatchObject({status:'outside',rate:4,usesOutdoorTemperature:true});expect(read(4,4)).toMatchObject({status:'covered-outside',rate:2,roofed:true});
 expect(read(17,17)).toMatchObject({status:'protected-inside',rate:0,usesOutdoorTemperature:false});
 w.weather={...newWeatherState(w.seed,w.tick),current:'rain',previous:'rain'};
 expect(read(6,5).rate).toBe(20);expect(read(4,4).rate).toBe(2);
 w.roofing.constructed=w.roofing.constructed.filter(c=>c!==17*w.width+17);layout=reconcileTemperature(w);
 expect(read(17,17)).toMatchObject({status:'unroofed-inside',rate:10,roofed:false,usesOutdoorTemperature:false});
 w.roofing.constructed.push(17*w.width+17);w.roofing.constructed.sort((a,b)=>a-b);layout=reconcileTemperature(w);
 w.tiles[17*w.width+17]!.terrain='marsh';expect(read(17,17)).toMatchObject({status:'terrain-exposed',rate:12,terrainFactor:3});
 w.tiles[17*w.width+17]!.bridge=true;expect(read(17,17)).toMatchObject({status:'protected-inside',rate:0,terrainFactor:0});
 w.tiles[5*w.width+6]!.terrain='marsh';expect(read(6,5).rate).toBe(80);w.tiles[5*w.width+6]!.bridge=true;expect(read(6,5).rate).toBe(20);
 delete w.tiles[5*w.width+6]!.bridge;w.tiles[5*w.width+6]!.floor='wood-planks';expect(read(6,5).rate).toBe(20);delete w.tiles[5*w.width+6]!.floor;
 expect(read(6,5).rate*DETERIORATION_INTERVAL/6000).toBe(1/3);
 const shelf=w.structures.find(s=>s.shelf)!;w.tiles[shelf.z*w.width+shelf.x]!.terrain='marsh';expect(read(shelf.x,shelf.z)).toMatchObject({status:'protected-shelf',rate:0,terrainFactor:3});
 const before=JSON.stringify(w);expect(deteriorationExposure(w,pile)).toEqual(read(6,5));expect(JSON.stringify(w)).toBe(before);
});

test('one prospective 25-tick Bernoulli hit changes only real damage and private stream; no duplicate or backlog',()=>{
 const {w,pile}=first(),rng=w.rng,clock=w.deterioration!,layout=thermalLayout(w);
 expect(DETERIORATION_INTERVAL).toBe(25);expect(advanceDeterioration(w,layout)).toBe(false);expect(pile.damage).toBeUndefined();
 w.tick++;if(w.fires)w.fires.clockCore=w.tick*10;expect(advanceDeterioration(w,layout)).toBe(true);expect(pile.damage).toBe(1);expect(w.rng).toBe(rng);expect(clock.rng).not.toBe(1);expect(clock.lastTick).toBe(w.tick);
 const before=JSON.stringify(w);expect(advanceDeterioration(w,layout)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 const skipped=structuredClone(w);skipped.tick+=26;expect(()=>advanceDeterioration(skipped,layout)).toThrow(/interval.*skipped/i);expect(skipped.piles.find(p=>p.id===pile.id)!.damage).toBe(1);
});

test('empty and protected passes do not build thermal/shelf work or draw exposure RNG',()=>{
 const {w,pile,shelfCell}=first();w.piles=[];due(w);const structures=w.structures;
 Object.defineProperty(w,'structures',{configurable:true,get(){throw Error('No candidates: no shelf scan');}});
 expect(advanceDeterioration(w,{get indices(){throw Error('No thermal lookup');}} as never)).toBe(false);expect(w.deterioration!.rng).toBe(1);
 Object.defineProperty(w,'structures',{configurable:true,writable:true,value:structures});w.piles=[pile];pile.owner={type:'ground',...shelfCell};due(w);
 expect(advanceDeterioration(w,thermalLayout(w))).toBe(false);expect(pile.damage).toBeUndefined();expect(w.deterioration!.rng).toBe(1);
});

test('split copies integer damage, merge rounds surviving weighted HP upward and transport does not repair',()=>{
 const {w,pile}=first();pile.damage=7;expect(depositMaterialPart(w,pile,{x:7,z:5},20)).toBe(true);
 const part=w.piles.find(p=>p!==pile&&p.item==='cloth')!;expect([pile.quantity,part.quantity]).toEqual([30,20]);expect(part.damage).toBe(7);
 part.damage=8;expect(transferPile(w,part,{type:'ground',x:6,z:5})).toBe(true);expect(pile.quantity).toBe(50);expect(pile.damage).toBe(7);expect(w.piles).toHaveLength(1);
 expect(transferPile(w,pile,{type:'pawn',pawnId:w.pawns[0]!.id})).toBe(true);expect(pile.damage).toBe(7);expect(deteriorationExposure(w,pile).status).toBe('not-ground');
});

test('fatal loss refuses ledger overflow atomically and normal loss never writes a FireLedger',()=>{
 const {w,pile}=first();pile.damage=79;w.destroyed={count:0,lost:{},items:{cloth:Number.MAX_SAFE_INTEGER}};
 const before=JSON.stringify(w);expect(damagePile(w,pile,1,'deterioration',w.piles.indexOf(pile))).toBe(false);expect(JSON.stringify(w)).toBe(before);
 w.destroyed={count:0,lost:{}};const fire=structuredClone(w.fires),rng=w.rng;
 expect(damagePile(w,pile,1,'deterioration',9999)).toBe(true);expect(w.piles).not.toContain(pile);expect(w.destroyed.items?.cloth).toBe(50);expect(w.fires).toEqual(fire);expect(w.rng).toBe(rng);
 const stale=JSON.stringify(w);expect(damagePile(w,pile,1,'deterioration',0)).toBe(false);expect(JSON.stringify(w)).toBe(stale);
});

test('destruction of one reserved source preserves the other real cooking cargo across its saved motion edge',()=>{
 const {world:w,refineryId}=biofuelCamp(),p=w.pawns[0]!,station=w.structures.find(s=>s.id===refineryId)!;
 if(w.fires)w.fires.clockCore=w.tick*10;p.priorities.craft=1;
 const bill=newCookingBill(w.nextId++,'chemfuel-from-wood');station.bills=[bill];
 addMaterial(w,'wood',70,{type:'ground',x:8,z:11},'wood');const source=w.piles.at(-1)!;refreshStock(w);
 expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:false}).ok).toBe(true);
 until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true&&(p.motion?.end??0)>w.tick);
 const held=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!,motion=structuredClone(p.motion),meta=structuredClone(held),fire=structuredClone(w.fires);
 expect(held.id).not.toBe(source.id);expect(held.quantity).toBe(10);
 source.damage=149; // Declared one-HP destruction boundary after the actual cargo edge exists.
 expect(damagePile(w,source,1,'deterioration',w.piles.indexOf(source))).toBe(true);expect(p.cooking).toBeNull();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(motion);expect(held).toEqual(meta);expect(w.fires).toEqual(fire);
 expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);
 const cp=copy.pawns.find(q=>q.id===p.id)!;until(w,()=>!p.interruptedCargo);until(copy,()=>!cp.interruptedCargo);expect(copy).toEqual(w);expect(w.piles.find(i=>i.id===held.id)!.owner.type).toBe('ground');
 expect(w.destroyed?.items?.wood).toBe(60);
});
