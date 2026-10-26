import {emptyLandscape} from '../../src/sim/generation.ts';
import {finalizeInitialWorldRegistry} from '../../src/sim/world-map-context.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {createOrbitalShip} from '../../src/sim/orbital.ts';
import {newBuildingFuel,fuelLimit} from '../../src/sim/fuel.ts';
import {reconcilePower} from '../../src/sim/power.ts';
import {MICROELECTRONICS_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST} from '../../src/sim/research.ts';
import {copyNovelBook295} from '../../src/sim/book-state-295.ts';
import {applyCommand,stepWorld} from '../../src/sim/engine.ts';
import {quoteOrbitalTrade} from '../../src/sim/orbital-rules.ts';
import {SCHEMA_VERSION,type Pawn,type Structure} from '../../src/sim/types.ts';
import type {OrbitalKind} from '../../src/sim/orbital-state.ts';

/** Fresh tick0 prepared property, not a played construction/economy or healed
 * population. Native constructors retain ages, ailments, skills and needs.
 * The actual purchase, capsule arrival and reading have NOT happened. */
export function prepareNovelScenario482(size=32,kind:OrbitalKind='bulk'){
 const world=emptyLandscape(482,size,size);
 world.tiles=Array.from({length:size*size},()=>({terrain:'soil' as const}));
 const cells={reader:{x:18,z:17},otherReader:{x:10,z:16},chair:{x:9,z:13},table:{x:9,z:11},storage:{x:11,z:13},console:{x:18,z:12},beacon:{x:15,z:15},generator:{x:14,z:10}};
 const reader=startingPawn(world.nextId++,'Alix',cells.reader.x,cells.reader.z,0,55,world.seed,world.tick,SCHEMA_VERSION);
 const otherReader=startingPawn(world.nextId++,'Basile',cells.otherReader.x,cells.otherReader.z,1,52,world.seed,world.tick,SCHEMA_VERSION);
 world.pawns.push(reader,otherReader);
 for(const p of world.pawns){p.schedule.fill('work');for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
 world.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:0},complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
 const generator:Structure={id:world.nextId++,kind:'wood-generator',...cells.generator,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null},fuel:{...newBuildingFuel('wood-generator'),ticks:fuelLimit('wood-generator')}};
 const console:Structure={id:world.nextId++,kind:'comms-console',...cells.console,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
 const beacon:Structure={id:world.nextId++,kind:'orbital-beacon',...cells.beacon,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id}};
 const chair:Structure={id:world.nextId++,kind:'dining-chair',...cells.chair,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
 const table:Structure={id:world.nextId++,kind:'table',...cells.table,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
 world.structures.push(generator,console,beacon,chair,table);
 const storageId=world.nextId++;
 world.stockpiles.push({id:storageId,...cells.storage,filters:{wood:false,food:false,book:true},priority:3,capacity:1});
 for(const cell of [{x:14,z:15},{x:14,z:16},{x:14,z:17}])addGroundMaterial(world,'silver',500,cell,'silver');
 addGroundMaterial(world,'food',20,{x:11,z:17},'survival-meal');
 reconcilePower(world);refreshStock(world);finalizeInitialWorldRegistry(world);
 const ship=createOrbitalShip(world,kind);if(!ship)throw Error('Prepared Novel colony cannot admit its actual orbital stock.');
 const book=world.piles.find(p=>p.item==='novel'&&p.owner.type==='orbital-ship'&&p.owner.shipId===ship.id);
 if(!book?.book)throw Error('Prepared Novel stock has no original physical Novel.');
 return {world,ids:{readerId:reader.id,otherReaderId:otherReader.id,shipId:ship.id,bookId:book.id,consoleId:console.id,beaconId:beacon.id,generatorId:generator.id,chairId:chair.id,tableId:table.id,storageId},cells,
  baseline:{book:copyNovelBook295(book.book),bookDamage:book.damage??0,readerJoy:reader.recreation.level,otherReaderJoy:otherReader.recreation.level,intellectual:structuredClone(reader.skills.intellectual),readerHealth:structuredClone(reader.health),otherReaderHealth:structuredClone(otherReader.health),silver:1500,rng:world.rng,orbitalRng:world.orbital!.rng,nextId:world.nextId},
  preparation:'PRÉPARÉ au tick0 : terrain plat, deux adultes des vrais constructeurs avec âges/affections/compétences/besoins conservés, Microélectronique et Mobilier complexe, réseau fini alimenté (75bois déjà dans le générateur), une chaise adjacente à la vraie emprise de table, une case Romans, 1500argent et20repas. Vrai stock orbital futur créé une fois ; aucun paiement, livraison, prise, lecture ou gain de loisirs/XP joué.'};
}

/** Node/runtime fixture continuation through the real contact, quote, payment
 * and capsule. Native UI demonstrations should import prepareNovelScenario482
 * instead and play those interactions themselves. No needs or XP are restored. */
export function purchaseNovelScenario482(size=32,kind:OrbitalKind='bulk',awaitLanding=true){
 const f=prepareNovelScenario482(size,kind),w=f.world,p=w.pawns.find(p=>p.id===f.ids.readerId)!;
 const contact=applyCommand(w,{type:'order-orbital-trade',pawnId:p.id,shipId:f.ids.shipId,consoleId:f.ids.consoleId});
 if(!contact.ok)throw Error('Novel contact refused: '+contact.reason);
 for(let i=0;i<200&&p.orbitalTrade?.phase!=='ready';i++)stepWorld(w);
 if(p.orbitalTrade?.phase!=='ready')throw Error('Novel negotiator never reached actual contact.');
 const lines=[{pileId:f.ids.bookId,quantity:1}],quote=quoteOrbitalTrade(w,p.id,f.ids.shipId,lines);
 if(!quote.ok)throw Error('Novel quote refused: '+quote.reason);
 const payment=applyCommand(w,{type:'orbital-trade-execute',pawnId:p.id,shipId:f.ids.shipId,lines,quote:quote.signature,acceptShortfall:false});
 if(!payment.ok)throw Error('Novel payment refused: '+payment.reason);
 const purchasedAt=w.tick;
 if(awaitLanding){for(let i=0;i<20&&w.orbital!.pending.length;i++)stepWorld(w);
  if(w.orbital!.pending.length||w.piles.find(p=>p.id===f.ids.bookId)?.owner.type!=='ground')throw Error('Paid Novel did not arrive physically.');}
 return {...f,paid:quote.paid,purchasedAt,...awaitLanding?{landedAt:w.tick}:{}};
}
