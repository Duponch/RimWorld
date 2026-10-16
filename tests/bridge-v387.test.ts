import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {canDesignate} from '../src/sim/engine.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {bridgeSupportsBuilding,BUILDING_SUPPORT} from '../src/sim/bridge-rules.ts';
import {removeBridge,destroyBridge} from '../src/sim/bridge.ts';
import {terrainTravelDelay,navigationCosts} from '../src/sim/furniture-travel.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {refreshStock,addGroundMaterial} from '../src/sim/materials.ts';
import {terrainRetainsSnow,initializeSnowSurface,setSnowDepth} from '../src/sim/snow-surface.ts';
import {addFilth} from '../src/sim/filth.ts';
import {startFire,advanceFires} from '../src/sim/fire.ts';
import {FireContent} from '../src/sim/fire-content.ts';
import {thermalLayout} from '../src/sim/temperature.ts';
import {createFlowerPotState} from '../src/sim/flower-pot.ts';
import {validateMarshTransport} from '../src/sim/marsh.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import type {World,Structure,DesignateCommand} from '../src/sim/types.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';

const until=(w:World,done:()=>boolean,limit=2200)=>{for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);};
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
const accept=(w:World,c:Parameters<typeof applyCommand>[1])=>expect(applyCommand(w,c).ok,JSON.stringify(c)).toBe(true);

test('ordinary two deliveries pay12wood, interrupted contact construction resumes, transport crosses only the finished bridge, removal refunds6',()=>{
  const {world:w,pawnId,bridgeCell,cargoId,storage}=bridgeWorkshopV387(32),i=bridgeCell.z*w.width+bridgeCell.x,p=w.pawns[0]!;
  expect(validateWorld(w)).toEqual([]);expect(wood(w)).toBe(22);expect(terrainTravelDelay(w,i)).toBe(3);
  accept(w,{type:'designate',kind:'build-bridge',...bridgeCell});const job=w.jobs.find(j=>j.kind==='build-bridge')!;
  expect(constructionRecipe(job)).toEqual({ingredients:[{item:'wood',quantity:12}],work:150,coreWork:1500});
  until(w,()=>job.progress>0);expect(job.construction).toBe('frame');expect(job.escrow.wood).toBe(12);expect(w.tiles[i]!.bridge).toBeUndefined();
  expect(Math.max(Math.abs(p.x-job.x),Math.abs(p.z-job.z))).toBeLessThanOrEqual(1);
  const paid=job.progress;accept(w,{type:'priority',pawnId,work:'build',value:0});expect(job.progress).toBe(paid);
  const resumed=deserializeWorld(serializeWorld(w));accept(w,{type:'priority',pawnId,work:'build',value:1});accept(resumed,{type:'priority',pawnId,work:'build',value:1});const start=w.tick;
  until(w,()=>w.tiles[i]!.bridge===true);stepWorld(resumed,w.tick-start);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(wood(w)).toBe(10);expect(w.tiles[i]).toEqual({terrain:'marsh',bridge:true});expect(terrainTravelDelay(w,i)).toBe(0);expect(navigationCosts(w,p).costs?.get(i)??0).toBe(0);
  accept(w,{type:'priority',pawnId,work:'haul',value:1});
  until(w,()=>p.haul?.phase==='deliver'&&p.motion?.to.x===bridgeCell.x&&p.motion.to.z===bridgeCell.z);
  expect(p.motion!.terrainDelay??0).toBe(0);const carried=p.haul!.carryPileId!,saved=deserializeWorld(serializeWorld(w)),at=w.tick;
  expect(carried).not.toBe(cargoId);expect(w.piles.find(v=>v.id===carried)).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId}});
  until(w,()=>w.piles.some(v=>v.id===carried&&v.owner.type==='ground'&&v.owner.x===storage.x&&v.owner.z===storage.z));stepWorld(saved,w.tick-at);expect(serializeWorld(saved)).toBe(serializeWorld(w));
  accept(w,{type:'priority',pawnId,work:'haul',value:0});accept(w,{type:'designate',kind:'remove-bridge',...bridgeCell});until(w,()=>!w.tiles[i]!.bridge);
  expect(w.tiles[i]!.terrain).toBe('marsh');expect(terrainTravelDelay(w,i)).toBe(3);expect(wood(w)).toBe(16);expect(w.deconstructed.lostWood).toBe(6);expect(validateWorld(w)).toEqual([]);
});

test('Light support is resolved per definition and explicit stuff, on every footprint and relocation; no Heavy floor or universal river support',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(32),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;
  expect(bridgeSupportsBuilding({kind:'wall',material:'wood'})).toBe(true);
  expect(bridgeSupportsBuilding({kind:'wall'})).toBe(true);expect(bridgeSupportsBuilding({kind:'autodoor'})).toBe(false);
  for(const material of ['steel','granite-blocks'])expect(bridgeSupportsBuilding({kind:'wall',material})).toBe(false);
  expect(BUILDING_SUPPORT['mini-turret']).toBe('Light');expect(bridgeSupportsBuilding({kind:'bed',material:'granite-blocks'})).toBe(true);
  for(const [kind,material,allowed] of [['wall','wood',true],['wall','steel',false],['wall','granite-blocks',false],['vent','steel',false],['wind-turbine','steel',false],['power-conduit','steel',true]] as const){
    const before=serializeWorld(w);expect(canDesignate(w,{type:'designate',kind,material,...bridgeCell}).ok).toBe(allowed);expect(serializeWorld(w)).toBe(before);
  }
  const bed:DesignateCommand={type:'designate',kind:'bed',material:'wood',...bridgeCell,orientation:0};
  for(const c of footprintCells(bed))w.tiles[c.z*w.width+c.x]={terrain:'marsh'};w.tiles[i]!.bridge=true;
  expect(canDesignate(w,bed).ok).toBe(false);for(const c of footprintCells(bed))w.tiles[c.z*w.width+c.x]!.bridge=true;expect(canDesignate(w,bed).ok).toBe(true);
  const source={id:w.nextId++,kind:'bed' as const,material:'wood' as const,x:3,z:3,orientation:0 as const,footprint:'standard' as const,quality:'normal' as const};w.packed.push({building:source,owner:{type:'ground',x:3,z:3}});
  accept(w,{type:'install',structureId:source.id,...bridgeCell,orientation:0});const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'remove-bridge',...bridgeCell}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  accept(w,{type:'cancel-job',jobId:w.jobs.find(j=>j.kind==='install')!.id});
  expect(canDesignate(w,{type:'designate',kind:'lay-floor',floor:'wood-planks',...bridgeCell}).ok).toBe(false);
  const water={x:2,z:2};w.tiles[2*w.width+2]={terrain:'water'};expect(applyCommand(w,{type:'designate',kind:'build-bridge',...water}).ok).toBe(false);
});

test('pending plans/frames and free emplacements block voluntary removal; full refund failure is atomic',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;
  accept(w,{type:'designate',kind:'wall',material:'wood',...bridgeCell});const plan=w.jobs.at(-1)!;
  for(const construction of ['blueprint','frame'] as const){plan.construction=construction;const raw=JSON.stringify(w);expect(applyCommand(w,{type:'designate',kind:'remove-bridge',...bridgeCell}).ok).toBe(false);expect(JSON.stringify(w)).toBe(raw);}
  accept(w,{type:'cancel-job',jobId:plan.id});
  for(const c of footprintCells({kind:'sleeping-spot',...bridgeCell,orientation:0}))w.tiles[c.z*w.width+c.x]={terrain:'marsh',bridge:true};
  accept(w,{type:'designate',kind:'sleeping-spot',...bridgeCell});const spot=w.structures.at(-1)!;
  expect(applyCommand(w,{type:'designate',kind:'remove-bridge',...bridgeCell}).ok).toBe(false);
  expect(destroyBridge(w,bridgeCell,'bomb',34)).toBe(false);expect(w.structures.includes(spot)).toBe(true);
  expect(destroyBridge(w,bridgeCell,'bomb',35)).toBe(true);expect(w.structures.includes(spot)).toBe(false);expect(w.tiles[i]!.bridge).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  w.tiles[i]!.bridge=true;w.piles=[];for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addGroundMaterial(w,'food',75,{x,z},'rice');refreshStock(w);
  accept(w,{type:'designate',kind:'remove-bridge',...bridgeCell});const removal=w.jobs.at(-1)!,before=JSON.stringify(w);expect(removeBridge(w,removal)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('finished bridge accepts snow and filth, protects no open door, and a ground fire removes the entire foundation at7500Core without salvage',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;w.piles=[];refreshStock(w);
  initializeSnowSurface(w);setSnowDepth(w,i,.4);expect(terrainRetainsSnow('marsh',true)).toBe(true);expect(terrainRetainsSnow('marsh')).toBe(false);expect(addFilth(w,bridgeCell,'blood')).toBe(true);
  const door={id:w.nextId++,kind:'door' as const,material:'wood' as const,...bridgeCell,orientation:0 as const,footprint:'standard' as const,door:newDoorState(w.tick)};w.structures.push(door);
  expect(new FireContent(w).bridgeFuel(bridgeCell)).toBe(0);door.door.open=true;expect(new FireContent(w).bridgeFuel(bridgeCell)).toBe(.8);w.structures=[];
  expect(startFire(w,bridgeCell)).toBe(true);w.tick=749;advanceFires(w,{rainRate:0},thermalLayout(w));expect(w.tiles[i]!.bridge).toBe(true);
  w.tick=750;advanceFires(w,{rainRate:0},thermalLayout(w));expect(w.tiles[i]).toEqual({terrain:'marsh'});expect(w.filth!.items.some(f=>f.x===bridgeCell.x&&f.z===bridgeCell.z)).toBe(false);
  expect(w.fires!.ledger.items.wood).toBe(12);expect(wood(w)).toBe(0);
});

test('forced loss during actual construction delivery cancels exact intent, retains in-flight cargo, and resumes without orphan owners or extra refund',()=>{
  const {world:w,pawnId,bridgeCell}=bridgeWorkshopV387(32),i=bridgeCell.z*w.width+bridgeCell.x,p=w.pawns[0]!;w.tiles[i]!.bridge=true;
  addGroundMaterial(w,'wood',20,{x:bridgeCell.x-3,z:bridgeCell.z-3},'wood');const original=wood(w);
  accept(w,{type:'designate',kind:'wall',material:'wood',...bridgeCell});const plan=w.jobs.at(-1)!;
  until(w,()=>p.haul?.destination.type==='job'&&p.haul.destination.jobId===plan.id&&p.haul.carryPileId!==null&&!!p.motion&&p.motion.end>w.tick);
  const cargo=p.haul!.carryPileId!,motion=structuredClone(p.motion);expect(destroyBridge(w,bridgeCell,'bomb',35)).toBe(true);
  expect(w.jobs.some(j=>j.id===plan.id)).toBe(false);expect(w.piles.find(v=>v.id===cargo)?.owner).toEqual({type:'pawn',pawnId});expect(p.motion).toEqual(motion);
  const resumed=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!w.piles.some(v=>v.id===cargo&&v.owner.type==='pawn'));stepWorld(resumed,w.tick-at);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(wood(w)).toBe(original);expect(w.destroyed?.items?.wood).toBe(12);expect(w.piles.some(v=>v.owner.type==='job'&&v.owner.jobId===plan.id)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('foundation is revealed before killed-trap callbacks, so auto-rebuild cannot leave a new unsupported blueprint',()=>{
  for(const cause of ['fire','bomb'] as const){
    const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;
    w.structures.push({id:w.nextId++,kind:'spike-trap',material:'wood',...bridgeCell,orientation:0,footprint:'standard',spikeTrap:{autoRebuild:true,touching:[]}});
    expect(validateWorld(w)).toEqual([]);expect(destroyBridge(w,bridgeCell,cause,35)).toBe(true);
    expect(w.tiles[i]).toEqual({terrain:'marsh'});expect(w.structures.some(s=>s.kind==='spike-trap')).toBe(false);expect(w.jobs.some(j=>j.kind==='spike-trap')).toBe(false);expect(validateWorld(w)).toEqual([]);
  }
});

test.each(['campfire','passive-cooler'] as const)('%s on destroyed bridge keeps the actual fuel cargo in flight until arrival, exact save/replay',kind=>{
  const {world:w,pawnId,bridgeCell}=bridgeWorkshopV387(32),i=bridgeCell.z*w.width+bridgeCell.x,p=w.pawns[0]!;w.tiles[i]!.bridge=true;
  const s=fixtureBuilding(w,kind,bridgeCell.x,bridgeCell.z) as Structure;s.material='wood';s.fuel={...newBuildingFuel(kind),ticks:0,burned:0,autoRefuel:false};
  accept(w,{type:'priority',pawnId,work:'haul',value:1});accept(w,{type:'order-haul',pawnId,target:{type:'fuel',structureId:s.id},queue:false});
  until(w,()=>p.haul?.phase==='deliver'&&!!p.motion&&p.motion.end>w.tick);const cargo=p.haul!.carryPileId!,motion=structuredClone(p.motion),quantity=w.piles.find(v=>v.id===cargo)!.quantity;
  expect(validateWorld(w)).toEqual([]);expect(destroyBridge(w,bridgeCell,'bomb',35)).toBe(true);
  expect(p.haul).toBeNull();expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(motion);expect(w.piles.find(v=>v.id===cargo)).toMatchObject({quantity,owner:{type:'pawn',pawnId}});
  const saved=deserializeWorld(serializeWorld(w)),at=w.tick;until(w,()=>!p.interruptedCargo);stepWorld(saved,w.tick-at);expect(serializeWorld(saved)).toBe(serializeWorld(w));
  expect(w.piles.find(v=>v.id===cargo)).toMatchObject({item:'wood',quantity,owner:{type:'ground'}});expect(w.structures.includes(s)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('destroyed bridge retires a supported shelf and keeps every original stack on actual ground without duplicating capacity',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;w.piles=[];refreshStock(w);
  const shelf={id:w.nextId++,kind:'small-shelf' as const,material:'wood' as const,...bridgeCell,orientation:0 as const,footprint:'standard' as const,shelf:newShelfStorage([w.nextId++])};w.structures.push(shelf);
  const originals=[] as {id:number;quantity:number;item:string}[];
  for(const [kind,quantity] of [['wood',10],['steel',20],['component',2]] as const){addGroundMaterial(w,kind,quantity,bridgeCell,kind);const p=w.piles.at(-1)!;originals.push({id:p.id,quantity:p.quantity,item:p.item});}
  expect(validateWorld(w)).toEqual([]);expect(destroyBridge(w,bridgeCell,'bomb',35)).toBe(true);expect(w.structures.includes(shelf)).toBe(false);
  for(const original of originals){const p=w.piles.find(v=>v.id===original.id)!;expect(p).toMatchObject({item:original.item,owner:{type:'ground'}});expect(p.quantity).toBeGreaterThanOrEqual(original.quantity);}
  expect(w.piles.filter(v=>v.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(20);expect(w.piles.filter(v=>v.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(2);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('Light flower-pot sowing uses its own substrate; the foundation does not become fertile ground',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;
  const pot={id:w.nextId++,kind:'flower-pot' as const,material:'wood' as const,quality:'normal' as const,...bridgeCell,orientation:0 as const,footprint:'standard' as const,flower:createFlowerPotState()};w.structures.push(pot);
  w.jobs.push({id:w.nextId++,kind:'sow',flowerPotId:pot.id,...bridgeCell,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  expect(validateMarshTransport(w)).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'area',action:'growing',from:bridgeCell,to:bridgeCell}).affected??0).toBe(0);
});
