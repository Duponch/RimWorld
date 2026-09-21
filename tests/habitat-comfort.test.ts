import { expect,test } from 'vitest';
import {
  FURNITURE_DEFINITIONS,FURNITURE_MATERIALS,QUALITY_BEAUTY,bedComfort,bedFacilityOffset,bedRestEffectiveness,
  cardinalToBedHead,comfortNeedCeiling,dresserCoversBed,furnitureBeauty,furnitureMaxHitPoints,furnitureWorkToBuildCore,
  comfortForStructure,materialAllowed,seatComfort,
} from '../src/sim/furniture-stats';
import {
  BeautyMapCache,RoomBeautyCapture,beautyBand,captureRoomBeauty,filthBeauty,floorBeauty,groundObjectBeauty,structureBeauty,weightedBeautySize,
  type BeautyInput,
} from '../src/sim/room-beauty';
import {
  DAYLILY_DEFINITION,DAYLILY_GROW_TICKS,DAYLILY_LIFESPAN_TICKS,advanceDaylily,advanceFlowerPot,createFlowerPotState,
  cutFlowerPotPlant,daylilyBeauty,daylilyStatus,flowerPotCanUninstall,sowDaylily,validateDaylilyState,validateFlowerPotState,
} from '../src/sim/flower-pot';
import { RoomTopologyCache } from '../src/sim/room-topology';
import { createWorld } from '../src/sim/engine';
import { updateWellbeing } from '../src/sim/wellbeing';

test('catalogue V90 keeps sourced recipes, material gates and non-inert quality factors',()=>{
  expect(Object.keys(FURNITURE_DEFINITIONS)).toHaveLength(10);
  expect(FURNITURE_DEFINITIONS['dining-chair']).toMatchObject({stuff:45,coreWork:8000,constructionSkill:4,beauty:8,comfort:.7});
  expect(FURNITURE_DEFINITIONS.armchair).toMatchObject({stuff:110,coreWork:14000,constructionSkill:5,beauty:4,comfort:.8});
  expect(FURNITURE_DEFINITIONS['table-square']).toMatchObject({width:2,depth:2,seats:8});
  expect(FURNITURE_DEFINITIONS['table-long']).toMatchObject({width:2,depth:4,seats:12});
  expect(FURNITURE_DEFINITIONS.bed).toMatchObject({research:null,coreResearch:'complex-furniture'});
  expect(FURNITURE_DEFINITIONS.stool.beauty).toBe(0);
  expect(materialAllowed('dining-chair','wood')).toBe(true);expect(materialAllowed('dining-chair','granite-blocks')).toBe(false);
  expect(materialAllowed('armchair','cloth')).toBe(true);expect(materialAllowed('armchair','light-leather')).toBe(true);expect(materialAllowed('armchair','wood')).toBe(false);
  expect(furnitureWorkToBuildCore('end-table','granite-blocks')).toBe(6140);
  expect(furnitureWorkToBuildCore('dresser','marble-blocks')).toBe(11140);
  expect(furnitureMaxHitPoints('dresser','granite-blocks')).toBe(204);
  expect(FURNITURE_MATERIALS['marble-blocks']).toMatchObject({beautyOffset:1,workFactor:5.5,restFactor:.9});
  expect(QUALITY_BEAUTY).toEqual({awful:-.1,poor:.5,normal:1,good:2,excellent:3,masterwork:5,legendary:8});
  expect(furnitureBeauty({kind:'dining-chair',material:'wood',quality:'awful'})).toBeCloseTo(-.8);
  expect(furnitureBeauty({kind:'dresser',material:'marble-blocks',quality:'excellent'})).toBe(16);
  expect(furnitureBeauty({kind:'flower-pot',material:'marble-blocks',quality:'legendary'})).toBe(1);
});

test('actual use comfort separates seats, bed facilities, need cap and rest',()=>{
  expect(seatComfort({kind:'stool',quality:'normal'})).toBe(.5);
  expect(seatComfort({kind:'dining-chair',quality:'good'})).toBeCloseTo(.784);
  expect(seatComfort({kind:'armchair',quality:'masterwork'})).toBeCloseTo(1.16);
  expect(seatComfort({kind:'dresser',quality:'legendary'})).toBe(0);
  expect(bedFacilityOffset({endTable:true,dresser:true})).toBe(.1);
  expect(bedComfort({kind:'bed',quality:'normal'},{endTable:true,dresser:true})).toBe(.85);
  expect(bedComfort({kind:'bed',quality:'excellent'},{endTable:true,dresser:true})).toBeCloseTo(1.054);
  expect(comfortNeedCeiling(1.054)).toBe(1);expect(comfortNeedCeiling(-.5)).toBe(0);
  expect(bedRestEffectiveness({kind:'bed',quality:'excellent',material:'granite-blocks'})).toBeCloseTo(1.026);
  expect(cardinalToBedHead({x:4,z:4},{x:5,z:4})).toBe(true);expect(cardinalToBedHead({x:4,z:4},{x:5,z:5})).toBe(false);
  const bed=[{x:0,z:0},{x:0,z:1}];expect(dresserCoversBed(bed,[{x:5,z:0}])).toBe(true);expect(dresserCoversBed(bed,[{x:6,z:0}])).toBe(false);
  expect(dresserCoversBed([{x:0,z:0},{x:0,z:1}],[{x:1,z:6},{x:2,z:6}])).toBe(true);
  const structure={id:1,kind:'bed',x:0,z:0,orientation:0 as const,material:'wood',quality:'normal'};
  expect(comfortForStructure({structures:[structure,{kind:'end-table',x:1,z:0},{kind:'dresser',x:5,z:0,orientation:0}]},structure)).toBe(.85);
  expect(comfortForStructure({structures:[structure,{kind:'end-table',x:1,z:0},{kind:'dresser',x:5,z:0,orientation:0}],lineOfSight:()=>false},structure)).toBe(.75);
});

test('bed facilities use physical sight through doors and research reads seat quality',()=>{
  const world=createWorld(90,12,12),pawn=world.pawns[0]!;world.structures=[];world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  const bed={id:world.nextId++,kind:'bed' as const,x:2,z:2,orientation:0 as const,footprint:'standard' as const,quality:'normal' as const};
  const dresser={id:world.nextId++,kind:'dresser' as const,x:2,z:8,orientation:1 as const,footprint:'standard' as const,quality:'normal' as const};
  const door={id:world.nextId++,kind:'door' as const,x:2,z:5,orientation:0 as const,footprint:'standard' as const,door:{open:false}};
  world.structures.push(bed,dresser,door as never,...Array.from({length:12},(_,x)=>x===2?null:{id:world.nextId++,kind:'wall' as const,x,z:5,orientation:0 as const,footprint:'standard' as const}).filter(x=>x!==null));
  Object.assign(pawn,{x:2,z:2,state:'sleeping',comfort:75,need:{kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:2,z:2}}});
  updateWellbeing(world,pawn);expect(pawn.comfort).toBe(75);
  (door.door as {open:boolean}).open=true;updateWellbeing(world,pawn);expect(pawn.comfort).toBeCloseTo(75.24);
  world.structures=[{id:world.nextId++,kind:'dining-chair',x:4,z:4,orientation:0,footprint:'standard',quality:'good',material:'wood'}];
  Object.assign(pawn,{x:4,z:4,state:'working',comfort:77,need:null,research:{stationId:999,spot:{x:4,z:4},worked:0}});
  updateWellbeing(world,pawn);expect(pawn.comfort).toBeCloseTo(77.24);
});

function enclosure(){
  const width=7,height=7,tiles=Array.from({length:width*height},()=>({terrain:'grass'}));
  const walls:{id:number;kind:'wall';x:number;z:number;orientation:0;footprint:'standard'}[]=[];let id=1;
  for(let x=1;x<=5;x++){walls.push({id:id++,kind:'wall',x,z:1,orientation:0,footprint:'standard'});walls.push({id:id++,kind:'wall',x,z:5,orientation:0,footprint:'standard'});}
  for(let z=2;z<5;z++){walls.push({id:id++,kind:'wall',x:1,z,orientation:0,footprint:'standard'});walls.push({id:id++,kind:'wall',x:5,z,orientation:0,footprint:'standard'});}
  const topology=new RoomTopologyCache().read({width,height,tiles,structures:walls} as never);
  const chair={id:100,kind:'dining-chair',x:3,z:3,material:'wood',quality:'normal'};
  const structures=[...walls.map((w,i)=>({...w,baseBeauty:0,...i===0?{material:'marble-blocks'}:{}})),chair];
  const input:BeautyInput={width,height,tiles,structures,filth:[{x:4,z:3,kind:'blood'}],objects:[{x:3,z:3,beauty:18},{x:2,z:3}]};
  return {input,topology,chair};
}

test('beauty ledger distinguishes terrain, floor, filth, object stacks and material offsets',()=>{
  expect(floorBeauty({terrain:'soil'})).toBe(-3);expect(floorBeauty({terrain:'soil'},true)).toBe(0);
  expect(floorBeauty({terrain:'soil',floor:'marble-tile'})).toBe(1);expect(floorBeauty({terrain:'soil',floor:'wood-planks'})).toBe(0);
  expect(floorBeauty({terrain:'soil',floor:'steel-tile'})).toBe(0);expect(floorBeauty({terrain:'soil',floor:'burned-wood'})).toBe(-6);
  expect(['dirt','trash','blood','ash','vomit','corpse-bile'].map(kind=>filthBeauty({kind}))).toEqual([-15,-15,-30,-10,-40,-50]);
  expect(filthBeauty({kind:'dirt'},true)).toBe(-1);expect(filthBeauty({kind:'blood'},true)).toBe(-30);
  expect(groundObjectBeauty({x:0,z:0,kind:'wood'})).toBe(-4);expect(groundObjectBeauty({x:0,z:0,beauty:18})).toBe(18);
  expect(structureBeauty({x:0,z:0,kind:'wall',baseBeauty:0,material:'marble-blocks'})).toBe(1);
  expect(structureBeauty({x:0,z:0,kind:'wall',material:'marble-blocks'})).toBe(1);
  expect(weightedBeautySize(9)).toBe(24.5);expect(weightedBeautySize(40)).toBe(40);
  expect([-4,-3.5,0,2.4,5,15,50,100].map(beautyBand)).toEqual(['hideous','ugly','neutral','pretty','beautiful','very-beautiful','extremely-beautiful','unbelievably-beautiful']);
});

test('room capture floods once while explicit invalidation rebuilds in-place beauty changes',()=>{
  const {input,topology,chair}=enclosure(),cache=new BeautyMapCache(),firstMap=cache.read(input),first=new RoomBeautyCapture(firstMap,topology);
  const room=first.room({x:3,z:3})!;
  // Nine indoor soil cells: -27; chair +8; flower +18; blood -30;
  // one ordinary ground stack -4; one diagonal marble boundary wall +1.
  expect(room.cells.size).toBe(9);expect(room.total).toBe(-34);expect(room.beauty).toBeCloseTo(-34/24.5);expect(room.band).toBe('ugly');
  expect(first.room({x:4,z:4})).toBe(room);expect(cache.rebuilds).toBe(1);
  chair.quality='excellent';expect(cache.read(input)).toBe(firstMap);expect(first.room({x:3,z:3})!.total).toBe(-34);
  cache.invalidateStructure(chair);expect(cache.invalidatedCells()).toEqual([24]);
  const secondMap=cache.read(input);expect(secondMap).not.toBe(firstMap);expect(cache.rebuilds).toBe(2);
  const second=new RoomBeautyCapture(secondMap,topology);expect(second.room({x:3,z:3})!.total).toBe(-18);expect(first.room({x:3,z:3})!.total).toBe(-34);
  expect(second.perceived({x:3,z:3})).toBe(second.perceived({x:3,z:3},()=>true,8.9));
  expect(second.perceived({x:3,z:3},()=>true,0)).toBe(39); // -3 terrain + 24 chair + 18 flower.
  expect(cache.read(input)).toBe(secondMap);expect(cache.rebuilds).toBe(2);
  const replacement={...input,objects:[...input.objects??[]]};expect(cache.read(replacement)).not.toBe(secondMap);expect(cache.rebuilds).toBe(3);
  expect(captureRoomBeauty(replacement,topology).room({x:3,z:3})?.cells.size).toBe(9);
});

test('perceived beauty cannot borrow decorations through an enclosed room boundary',()=>{
  const {input,topology}=enclosure();
  const before=captureRoomBeauty(input,topology).perceived({x:3,z:3});
  const outside={...input,objects:[...input.objects??[],{x:0,z:0,beauty:10000}]};
  const after=captureRoomBeauty(outside,topology);
  expect(after.perceived({x:3,z:3})).toBe(before);
  expect(after.perceived({x:3,z:3},()=>true,8.9)).toBe(before);
  expect(after.perceived({x:0,z:0})).toBeGreaterThan(100);
});

test('daylily growth, lifespan damage, pot policy and save-shape validation are deterministic',()=>{
  const planted=sowDaylily(100);expect(planted).toMatchObject({growth:.0001,ageCore:0,unlitCore:0,hitPoints:85});expect(daylilyBeauty(planted)).toBe(18);
  const dark=advanceDaylily(planted,1100,{growthFactor:1,glow:.29});expect(dark.growth).toBe(.0001);expect(dark.ageCore).toBe(10_000);expect(dark.unlitCore).toBe(10_000);expect(planted.ageCore).toBe(0);
  const grown=advanceDaylily(planted,100+DAYLILY_GROW_TICKS,{growthFactor:1,glow:.3});expect(grown.growth).toBe(1);expect(daylilyStatus(grown)).toBe('mature');
  const limit=advanceDaylily(planted,100+DAYLILY_LIFESPAN_TICKS,{growthFactor:1,glow:.3});expect(limit.ageCore).toBe(DAYLILY_DEFINITION.lifespanCoreTicks);expect(daylilyStatus(limit)).toBe('mature');expect(limit.hitPoints).toBe(85);
  const dying=advanceDaylily(limit,limit.lastTick+1,{growthFactor:0,glow:0});expect(daylilyStatus(dying)).toBe('dying');expect(dying.hitPoints).toBeCloseTo(84.95);
  const dead=advanceDaylily(limit,limit.lastTick+1700,{growthFactor:0,glow:0});expect(daylilyStatus(dead)).toBe('dead');expect(daylilyBeauty(dead)).toBe(0);expect(dead.hitPoints).toBe(0);
  const empty=createFlowerPotState();expect(flowerPotCanUninstall(empty)).toBe(true);
  const pot={allowSow:true,plant:planted} as const;expect(flowerPotCanUninstall(pot)).toBe(false);expect(advanceFlowerPot(pot,101,{growthFactor:1,glow:.3}).plant?.ageCore).toBe(10);expect(cutFlowerPotPlant(pot)).toEqual({allowSow:true});
  expect(validateDaylilyState(planted,100)).toEqual([]);expect(validateFlowerPotState(pot,100)).toEqual([]);
  expect(validateFlowerPotState({...pot,unknown:true},100)).toEqual(['Invalid flower pot shape.']);
  expect(validateDaylilyState({...planted,lastTick:101},100)).toContain('Invalid daylily chronology.');
  expect(validateDaylilyState({...planted,growth:1.1},100)).toContain('Invalid daylily growth.');
  expect(validateDaylilyState({...planted,hitPoints:-1},100)).toContain('Invalid daylily hit points.');
});
