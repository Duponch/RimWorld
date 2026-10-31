import {emptyLandscape} from '../../src/sim/generation.ts';
import {startingPawn} from '../../src/sim/starting-pawns.ts';
import {createMedicalRecord} from '../../src/sim/injury-state.ts';
import {newCorePathBudget297} from '../../src/sim/core-path-budget-297.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';
import {newBreakdownCalendar} from '../../src/sim/breakdowns.ts';
import {createApparelWearCalendar} from '../../src/sim/apparel-renewal.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../../src/sim/ship-casket-state-277.ts';
import {shipReactorEndCore275} from '../../src/sim/ship-reactor-state-275.ts';
import {initialWorldRegistry,isActualMapMutationContext298} from '../../src/sim/world-map-context.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {effectiveCore297} from '../../src/sim/core-phase-297.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../../src/sim/serialization.ts';
import type {Structure} from '../../src/sim/types.ts';

export const DECLARED_SHIP_SCENARIO298=Object.freeze({seed:941298,width:32,height:32,tick:90000,reactorStartCore:0});
export const DECLARED_READY_SHIP_PREPARATION298='Entirely NEW diagnostic scenario, current constructors298, initial date90000 chosen before validation. Neutral landscape date is set once, then every neutral dated calendar/budget is initialized by its constructor at90000. Eight installed ship parts, a running reactor with declared historical0→840000Core, and one newly constructed human already frozen with finite3meals/1medicine are DECLARED initial data. No construction, AI acquisition, activation, defence, suspension interval or campaign time was played. No acquired/ACTUAL parent, schema renumbering, clock repair after failure or fake finalizer.';
function require298(ok:unknown,reason:string):asserts ok {if(!ok)throw Error(reason);}

/** No date argument exists on emptyLandscape. This is its explicit NEW test
 * scenario initialization, before any validation/publication or game step.
 * It does not retime a previously admitted World or keep old dated actors. */
export function declaredReadyShip298(){
 const d=DECLARED_SHIP_SCENARIO298,world=emptyLandscape(d.seed,d.width,d.height);
 require298(Number(world.schemaVersion)===298,'Current fixture constructor did not create schema298');
 world.tick=d.tick;
 world.corePathBudget297=newCorePathBudget297(d.tick);
 world.deterioration=createDeteriorationState(d.seed,d.tick);
 world.breakdown=newBreakdownCalendar(d.seed,d.tick);
 world.apparelWear=createApparelWearCalendar(d.tick,(d.seed^0x0a77e1)>>>0);
 world.tiles=Array.from({length:d.width*d.height},()=>({terrain:'grass' as const}));
 world.roofing={constructed:[],build:[],remove:[],cursor:0};
 const core=effectiveCore297(world),actor=startingPawn(world.nextId++,'Voyageuse déclarée',10,19,0,80,d.seed,d.tick,world.schemaVersion);
 actor.health??=createMedicalRecord(d.tick);world.pawns.push(actor);
 const part=(kind:Structure['kind'],x:number,z:number,orientation:Structure['orientation']=0):Structure=>{
  const s:Structure={id:world.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:{on:kind==='ship-reactor',parentId:null}};
  world.structures.push(s);return s;
 };
 const reactor=part('ship-reactor',20,20,1),beam=part('ship-beam',13,20,1);
 const engines=[part('ship-engine',13,16),part('ship-engine',13,22),part('ship-engine',16,24)];
 const computer=part('ship-computer',17,15),sensors=part('ship-sensors',19,15),casket=part('ship-cryptosleep-casket',10,19,3) as ShipCasket277;
 const reactorEnd=shipReactorEndCore275(d.reactorStartCore);
 require298(reactorEnd!==undefined&&reactorEnd<=core,'Declared scenario date does not admit its past reactor dates');
 reactor.shipReactor275={state:'running',startCore:d.reactorStartCore,endCore:reactorEnd};
 casket.shipCryptosleep277=newShipCasketHolder277(d.tick);
 // The actual item constructors initialize conditions at the chosen date.
 // These finite initial possessions are held directly, not acquired/transported.
 addMaterial(world,'food',3,{type:'inventory',pawnId:actor.id},'survival-meal');
 addMaterial(world,'medicine',1,{type:'inventory',pawnId:actor.id},'medicine');
 const heldItems=world.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===actor.id);
 world.pawns=world.pawns.filter(p=>p!==actor);world.piles=world.piles.filter(p=>!heldItems.includes(p));
 actor.shipCryptosleepHeldAt277=d.tick;
 casket.shipCryptosleep277={...casket.shipCryptosleep277,heldAtCore297:core,occupant:{kind:'human',pawn:actor},items:heldItems};refreshStock(world);
 initialWorldRegistry(world);
 require298(isActualMapMutationContext298(world,world),'Declared fixture did not establish its actual root map');
 const errors=validateWorld(world);require298(!errors.length,'Declared ready ship input is not a Whole: '+errors.join('; '));
 const text=serializeWorld(world),copy=deserializeWorld(text);
 require298(validateWorld(copy).length===0,'Declared ready ship OwnReload is not a Whole');
 require298(serializeWorld(copy)===text&&serializeWorld(world)===text,'Declared ready ship OwnReload changed exact bytes');
 return {world,actor,reactor,beam,engines,computer,sensors,casket,parts:[reactor,beam,...engines,computer,sensors,casket],heldItems:[...casket.shipCryptosleep277.items],core,text};
}
