import {expect,test} from 'vitest';
import {createWorld,applyCommand,stepWorld} from '../src/sim/engine.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {rockMaxHP} from '../src/sim/mining-rules.ts';
import {validOre} from '../src/sim/ore.ts';
import {validConstructionMaterial,constructionRecipe} from '../src/sim/construction-materials.ts';
import {sculptureBeauty,sculptureMaxHitPoints,sculptureWorkToMakeCore,materialAllowed} from '../src/sim/furniture-stats.ts';
import {structureMaxHp,structureFlammability,pileMaxHp} from '../src/sim/thing-damage-rules.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {validStorageItems,storageAccepts} from '../src/sim/storage-filters.ts';
import {validStorageSettings} from '../src/sim/designation.ts';
import type {Pawn} from '../src/sim/types.ts';

test('jade is a real mined item and Stony furniture input; stats never inherit block aliases or item HP',()=>{
 expect(ITEM_DEFINITIONS.jade).toMatchObject({kind:'jade',stackLimit:75,nutrition:0});
 expect(rockMaxHP({terrain:'rock',ore:'jade'})).toBe(1500);expect(validOre({terrain:'rock',ore:'jade'},255)).toBe(false);expect(validOre({terrain:'rock',ore:'jade'},256)).toBe(true);
 expect(pileMaxHp({item:'jade',kind:'jade'},256)).toBe(0);expect(commercialItemMassGrams('jade',256)).toBe(500);expect(commercialItemMassGrams('jade',255)).toBeUndefined();
 expect(materialAllowed('table','jade')).toBe(true);expect(materialAllowed('armchair','jade')).toBe(false);expect(materialAllowed('hospital-bed','jade')).toBe(false);
 expect(constructionRecipe({kind:'table',material:'jade'})).toMatchObject({ingredients:[{item:'jade',quantity:28}],coreWork:3750});
 expect(structureMaxHp({kind:'table',material:'jade'})).toBe(38);expect(structureFlammability({kind:'table',material:'jade'})).toBe(0);
 expect(sculptureMaxHitPoints('small-sculpture','jade')).toBe(45);expect(sculptureWorkToMakeCore('small-sculpture','jade')).toBe(25200);expect(sculptureBeauty({kind:'small-sculpture',material:'jade',quality:'normal'})).toBe(135);
});
test('legacy filters, piles and construction cannot gain prospective jade; no backfilled old bill input',()=>{
 expect(validConstructionMaterial('table','jade',255)).toBe(false);expect(validConstructionMaterial('table','jade',256)).toBe(true);
 expect(validConstructionMaterial('wall','jade',256)).toBe(false);
 expect(validStorageItems({jade:true},255)).toBe(false);expect(validStorageItems({jade:true},256)).toBe(true);
 expect(validStorageSettings({filters:{wood:false,food:false,jade:undefined}},255)).toBe(false);expect(validStorageSettings({filters:{wood:false,food:false,jade:true}},256)).toBe(true);
 const old=newCookingBill(1,'small-sculpture',255),current=newCookingBill(2,'small-sculpture',256);
 expect(Object.hasOwn(old.filters,'jade')).toBe(false);expect(current.filters.jade).toBe(true);
 expect(validBillSettings({...old,filters:{...old.filters,jade:false}},'small-sculpture',255)).toBe(false);
 expect(validBillSettings(old,'small-sculpture',256)).toBe(true);
 expect(storageAccepts({filters:{wood:false,food:false,jade:true}},'jade')).toBe(true);
});

test('prepared actual mining produces jade owners, then strict save/reload retains identities and quantities',()=>{
 // Small physical fixture; no natural generation or performance claim.
 const world=createWorld(156,32,32);world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.piles=[];world.structures=[];world.stockpiles=[];world.packed=[];delete world.raids;delete world.arrivals;
 if(world.wildlife)world.wildlife.animals=[];world.pawns=world.pawns.slice(0,1);const miner=world.pawns[0]!;miner.x=8;miner.z=8;miner.hunger=100;miner.rest=100;miner.recreation.level=100;miner.schedule.fill('work');
 for(const key of Object.keys(miner.priorities) as (keyof Pawn['priorities'])[])miner.priorities[key]=0;miner.priorities.mine=1;miner.skills.mining!.level=20;
 world.tiles[8*32+9]={terrain:'rock',stone:'granite',ore:'jade'};
 expect(applyCommand(world,{type:'area',action:'mine',from:{x:9,z:8},to:{x:9,z:8}}).ok).toBe(true);
 for(let count=0;count<1500&&world.tiles[8*32+9]!.terrain==='rock';count++){miner.hunger=100;miner.rest=100;miner.recreation.level=100;stepWorld(world);}
 expect(world.tiles[8*32+9]!.terrain).toBe('rough-stone');const jade=world.piles.filter(p=>p.item==='jade');expect(jade.length).toBeGreaterThan(0);expect(jade.every(p=>p.kind==='jade'&&p.owner.type==='ground'&&p.quantity>0)).toBe(true);
 expect(validateWorld(world)).toEqual([]);const before=serializeWorld(world),restored=deserializeWorld(before);expect(serializeWorld(restored)).toBe(before);expect(restored.piles.filter(p=>p.item==='jade')).toEqual(jade);
});
