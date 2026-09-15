import { withoutPostV10Fields } from './scenarios/legacy-save';
import { expect, test } from 'vitest';
import { createWorld, addGroundMaterial, applyCommand, canDesignate, stepWorld, serializeWorld, deserializeWorld, validateWorld, refreshStock } from '../src/sim/index';
import { blockedCells, canStep, reachableCells, routeToCell } from '../src/sim/pathfinding';
import { startTravel } from '../src/sim/movement';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { storageCapacity } from '../src/sim/ground-placement';
import { civilCrossingFixture } from './scenarios/civil-traffic';

test('eight-direction routes agree with an independent relaxation oracle and preserve geometric travel time',()=>{
  let seed=12345;
  for(let run=0;run<12;run++) {
    const w=createWorld(run,16,16);w.jobs=[];w.structures=[];
    w.tiles=w.tiles.map(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return {terrain:seed%5===0?'rock':'grass'};});w.tiles[17]={terrain:'grass'};
    for(let i=18;i<256;i++)if(w.tiles[i]!.terrain==='grass'&&i%7===0)w.jobs.push({id:w.nextId++,kind:'wall',construction:'frame',x:i%16,z:Math.floor(i/16),orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
    const frames=new Set(w.jobs.map(j=>j.z*16+j.x));
    const blocks=blockedCells(w),found=reachableCells(w,{x:1,z:1},blocks,new Set());
    const oracle=new Array<number>(256).fill(Infinity);oracle[17]=0;
    for(let pass=0;pass<256;pass++) {
      let changed=false;
      for(let i=0;i<256;i++)if(!blocks[i]&&Number.isFinite(oracle[i]))for(let j=0;j<256;j++) {
        const dx=j%16-i%16,dz=Math.floor(j/16)-Math.floor(i/16);
        if(blocks[j]||Math.max(Math.abs(dx),Math.abs(dz))!==1)continue;
        if(dx&&dz&&(blocks[i+dx]||blocks[i+dz*16]))continue;
        const cost=oracle[i]!+(dx&&dz?1414:1000)+(frames.has(j)?467:0);
        if(cost<oracle[j]!){oracle[j]=cost;changed=true;}
      }
      if(!changed)break;
    }
    expect(Array.from(found.costs),`seed ${run}`).toEqual(oracle);
    for(let i=0;i<256;i++) {
      const path=routeToCell(w,{x:i%16,z:Math.floor(i/16)},found);
      if(!Number.isFinite(oracle[i])) {expect(path).toBeNull();continue;}
      let before={x:1,z:1},cost=0;
      for(const cell of path!) {cost+=(cell.x!==before.x&&cell.z!==before.z?1414:1000)+(frames.has(cell.z*16+cell.x)?467:0);before=cell;}
      expect(cost).toBe(oracle[i]);
    }
  }
  const w=createWorld(1,16,16),p=w.pawns[0]!;p.x=1;p.z=1;w.tick=10;
  let previousEnd=10;
  for(let i=0;i<8;i++) {
    startTravel(w,p,{x:p.x+1,z:p.z+1});
    expect(p.motion!.start).toBeCloseTo(previousEnd,9);
    expect(Math.hypot(p.motion!.to.x-p.motion!.from.x,p.motion!.to.z-p.motion!.from.z)/(p.motion!.end-p.motion!.start)*10).toBeCloseTo(10/3,3);
    previousEnd=p.motion!.end;w.tick=Math.ceil(previousEnd);
  }
  expect(previousEnd-10).toBeCloseTo(8*3*Math.SQRT2,9);
  const savedWorld=createWorld(5,16,16);savedWorld.tiles=savedWorld.tiles.map(()=>({terrain:'grass'}));savedWorld.resources=[];savedWorld.pawns=savedWorld.pawns.slice(0,1);
  const actor=savedWorld.pawns[0]!;actor.x=1;actor.z=1;
  startTravel(savedWorld,actor,{x:2,z:2});
  const checkpoint=serializeWorld(savedWorld),copy=deserializeWorld(checkpoint);
  stepWorld(savedWorld,40);stepWorld(copy,40);expect(serializeWorld(copy)).toBe(serializeWorld(savedWorld));
  const bad=JSON.parse(checkpoint);delete bad.pawns[0].motion;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/travel/i);
  const crossing=deserializeWorld(checkpoint);
  expect(canDesignate(crossing,{type:'designate',kind:'wall',x:2,z:1}).ok).toBe(true);
  const wallThroughEdge=JSON.parse(checkpoint);wallThroughEdge.tiles[1*16+2].terrain='rock';
  expect(()=>deserializeWorld(JSON.stringify(wallThroughEdge))).toThrow(/travel/i);
  const traffic=createWorld(6,16,16);traffic.tiles=traffic.tiles.map(()=>({terrain:'grass'}));traffic.resources=[];traffic.pawns=traffic.pawns.slice(0,2);
  Object.assign(traffic.pawns[0]!,{x:4,z:4});Object.assign(traffic.pawns[1]!,{x:6,z:4});
  startTravel(traffic,traffic.pawns[0]!,{x:5,z:5});
  expect(canStep(traffic,traffic.pawns[1]!,{x:5,z:4},blockedCells(traffic),new Set([4*16+4,5*16+5]))).toBe(true);
  startTravel(traffic,traffic.pawns[1]!,{x:5,z:4});expect(validateWorld(traffic)).toEqual([]);
});

test('civil crossing preserves beds, opposing cargo, every edge and exact continuation without pushing other actors',()=>{
  const w=civilCrossingFixture();expect(validateWorld(w)).toEqual([]);
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=13;for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;for(const pawn of old.pawns)delete pawn.orders;
  expect(deserializeWorld(JSON.stringify(old))).toEqual(w); // No rewritten positions, tasks or IDs.
  const start=w.tick;let shared:string|undefined;
  const endings=new Map<number,number>();
  for(let i=0;i<55;i++) {
    stepWorld(w);expect(validateWorld(w),`crossing tick ${w.tick}`).toEqual([]);
    expect(w.pawns[2]).toMatchObject({x:8,z:8,state:'sleeping'});
    for(const p of w.pawns.slice(0,2))if(p.motion) {
      expect(p.motion.end-p.motion.start).toBeCloseTo(3+(p.motion.terrainDelay??0),8);
      const end=endings.get(p.id);
      if(end!==undefined&&end!==p.motion.end)expect(p.motion.start).toBeCloseTo(end,8);
      endings.set(p.id,p.motion.end);
    }
    if(!shared&&new Set(w.pawns.map(p=>p.z*w.width+p.x)).size<w.pawns.length)shared=serializeWorld(w);
  }
  expect(w.tick-start).toBe(55);expect(shared).toBeDefined();
  expect(w.pawns.map(p=>[p.x,p.z,p.state])).toEqual([[14,8,'sleeping'],[1,8,'sleeping'],[8,8,'sleeping']]);
  expect(new Set(w.pawns.map(p=>p.bedId)).size).toBe(3);
  const resumed=deserializeWorld(shared!);stepWorld(resumed,w.tick-resumed.tick);expect(resumed).toEqual(w);
  const overlapV13=JSON.parse(shared!);overlapV13.schemaVersion=13;for(const a of overlapV13.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete overlapV13.deconstructed;delete overlapV13.packed;for(const pawn of overlapV13.pawns){delete pawn.orders;delete pawn.transitExit;if(pawn.motion?.terrainDelay){pawn.motion.end-=pawn.motion.terrainDelay;delete pawn.motion.terrainDelay;pawn.moveCooldown=Math.max(0,pawn.motion.end-overlapV13.tick);}}
  expect(()=>deserializeWorld(JSON.stringify(overlapV13))).toThrow(/overlap/i);
  const duplicate=JSON.parse(serializeWorld(w));duplicate.pawns[0].bedId=duplicate.pawns[1].bedId;
  expect(()=>deserializeWorld(JSON.stringify(duplicate))).toThrow(/bed|sleep/i);

  const haul=civilCrossingFixture();haul.structures=haul.structures.filter(s=>s.x===8);
  haul.pawns.slice(0,2).forEach(p=>{p.bedId=null;p.rest=100;p.priorities.haul=1;});
  addGroundMaterial(haul,'wood',10,{x:2,z:8},'wood');addGroundMaterial(haul,'food',10,{x:13,z:8},'rice');
  expect(applyCommand(haul,{type:'stockpile',enabled:true,x:14,z:8,filters:{wood:true,food:false}}).ok).toBe(true);
  expect(applyCommand(haul,{type:'stockpile',enabled:true,x:1,z:8,filters:{wood:false,food:true}}).ok).toBe(true);
  const quantity=(item:string,x:number)=>haul.piles.filter(p=>p.item===item&&p.owner.type==='ground'&&p.owner.x===x).reduce((n,p)=>n+p.quantity,0);
  let carriedCrossing:string|undefined;
  for(let i=0;i<150&&(quantity('wood',14)!==10||quantity('rice',1)!==10);i++) {
    stepWorld(haul);expect(validateWorld(haul),`haul tick ${haul.tick}`).toEqual([]);
    expect(haul.piles.reduce((n,p)=>n+p.quantity,0)).toBe(20);
    const [a,b]=haul.pawns;
    if(!carriedCrossing&&a!.haul?.phase==='deliver'&&b!.haul?.phase==='deliver'&&a!.motion&&b!.motion&&a!.motion.end>haul.tick&&b!.motion.end>haul.tick
      &&a!.motion.from.x===b!.x&&b!.motion.from.x===a!.x)carriedCrossing=serializeWorld(haul);
    expect(haul.pawns[2]).toMatchObject({x:8,z:8,state:'sleeping'});
  }
  expect(quantity('wood',14)).toBe(10);expect(quantity('rice',1)).toBe(10);expect(carriedCrossing).toBeDefined();
  const cargoResume=deserializeWorld(carriedCrossing!);stepWorld(cargoResume,haul.tick-cargoResume.tick);expect(cargoResume).toEqual(haul);
  const legacyEdge=JSON.parse(carriedCrossing!);legacyEdge.schemaVersion=13;for(const a of legacyEdge.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete legacyEdge.deconstructed;delete legacyEdge.packed;for(const pawn of legacyEdge.pawns){delete pawn.orders;delete pawn.transitExit;if(pawn.motion?.terrainDelay){pawn.motion.end-=pawn.motion.terrainDelay;delete pawn.motion.terrainDelay;pawn.moveCooldown=Math.max(0,pawn.motion.end-legacyEdge.tick);}}
  expect(()=>deserializeWorld(JSON.stringify(legacyEdge))).toThrow(/overlap/i);
});

test('buffered motion is linear across jitter, duplicate messages, turns, pause and replacement',()=>{
  const segments=[{from:{x:0,z:0},to:{x:1,z:0},start:0,end:3},{from:{x:1,z:0},to:{x:1,z:1},start:3,end:6}];
  const timeline=new MotionTimeline();timeline.adopt(0,1,[{id:1,segments}],0,true);
  const arrivals=new Map([[180,2],[390,4],[580,6],[600,6],[700,6]]);
  let previous={x:0,z:0},distance=0;
  for(let ms=10;ms<=1000;ms+=10) {
    if(arrivals.has(ms))timeline.adopt(arrivals.get(ms)!,1,[{id:1,segments}],ms);
    timeline.advance(ms);const segment=timeline.segment(1)!;
    const t=Math.min(1,Math.max(0,(timeline.tick-segment.start)/(segment.end-segment.start)));
    const position={x:segment.from.x+(segment.to.x-segment.from.x)*t,z:segment.from.z+(segment.to.z-segment.from.z)*t};
    const delta=Math.hypot(position.x-previous.x,position.z-previous.z);
    if(ms>400)expect(delta,`frame ${ms}`).toBeCloseTo(1/30,8);else expect(delta).toBe(0);
    // A turn must pass through (1,0), never cut diagonally from (0,0) to (1,1).
    expect(position.z===0||position.x===1).toBe(true);distance+=delta;previous=position;
  }
  expect(distance).toBeCloseTo(2,8);
  timeline.adopt(6,0,[],1000);expect(timeline.advance(2000)).toBe(6);
  timeline.adopt(100,1,[],2100,true);expect(timeline.advance(2200)).toBe(100);expect(timeline.segment(1)).toBeUndefined();
  // A worker message can run before RAF while performance.now() is already
  // later than that frame's timestamp. Only rendered timestamps pace playback.
  // Five-Hz publications with 80–130 ms delivery jitter at speed 6 stay linear.
  const jitter=new MotionTimeline();jitter.adopt(0,6,[],0,true);
  const delayed=new Map([[280,12],[530,24],[680,36],[900,48],[1130,60]]);
  for(let ms=10;ms<=1200;ms+=10){if(delayed.has(ms))jitter.adopt(delayed.get(ms)!,6,[],ms);expect(jitter.advance(ms)).toBeCloseTo(Math.max(0,ms-400)*.06,9);}
  const interleaved=new MotionTimeline();interleaved.adopt(0,6,[],0,true);
  interleaved.adopt(100,6,[],420);interleaved.advance(430);
  const first=interleaved.tick;
  interleaved.adopt(101,6,[],452);interleaved.advance(450);
  expect(interleaved.tick-first).toBeCloseTo(1.2,9);
  interleaved.advance(470);expect(interleaved.tick-first).toBeCloseTo(2.4,9);
});

test('floor stacks enforce identity, reserved destination type, migration and atomic refusal when no drop fits',()=>{
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.pawns=w.pawns.slice(0,2);w.pawns.forEach(p=>{p.hunger=100;p.rest=100;});
  const empty=JSON.stringify(w);expect(()=>addGroundMaterial(w,'food',75.5,{x:5,z:5},'berries')).toThrow();expect(JSON.stringify(w)).toBe(empty);
  addGroundMaterial(w,'food',21,{x:5,z:5},'survival-meal');addGroundMaterial(w,'food',76,{x:5,z:5},'berries');
  const cells=()=>w.piles.filter(p=>p.owner.type==='ground').map(p=>p.owner.type==='ground'?`${p.owner.x}:${p.owner.z}`:'');
  expect(new Set(cells()).size).toBe(5);expect(w.stock.food).toBe(97);expect(validateWorld(w)).toEqual([]);
  applyCommand(w,{type:'stockpile',enabled:true,x:12,z:12,priority:4});
  const zone=w.stockpiles[0]!;w.pawns[0]!.haul={sourcePileId:w.piles[0]!.id,quantity:3,phase:'pickup',destination:{type:'stockpile',stockpileId:zone.id},carryPileId:null};
  expect(storageCapacity(w,zone,'berries')).toBe(0);expect(storageCapacity(w,zone,'survival-meal')).toBe(7);
  // Harvesting beside a reserved empty cell must not invalidate an existing haul.
  addGroundMaterial(w,'wood',75,zone);
  expect(w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===zone.x&&p.owner.z===zone.z)).toBe(false);
  w.pawns[0]!.haul=null;
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=5;for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;withoutPostV10Fields(old);for(const p of old.pawns){delete p.cooking;delete p.priorities.cook;}old.piles[1].owner={...old.piles[0].owner};
  const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated.piles.map(p=>[p.id,p.item,p.quantity])).toEqual(w.piles.map(p=>[p.id,p.item,p.quantity]));expect(validateWorld(migrated)).toEqual([]);
  const impossible=JSON.parse(JSON.stringify(old));impossible.schemaVersion=6;for(const a of impossible.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete impossible.deconstructed;delete impossible.packed;expect(()=>deserializeWorld(JSON.stringify(impossible))).toThrow(/floor cell/);
  // Full floor: failed production must leave its entire input/quantity intact.
  w.stockpiles=[];w.piles=[];for(let z=0;z<16;z++)for(let x=0;x<16;x++)w.piles.push({id:w.nextId++,item:'wood',kind:'wood',quantity:75,owner:{type:'ground',x,z}});refreshStock(w);
  const before=JSON.stringify(w);expect(()=>addGroundMaterial(w,'food',76,{x:8,z:8},'berries')).toThrow();expect(JSON.stringify(w)).toBe(before);
  expect(()=>addGroundMaterial(w,'food',75.5,{x:8,z:8},'berries')).toThrow();expect(JSON.stringify(w)).toBe(before);
  stepWorld(w);expect(validateWorld(w)).toEqual([]);
});
