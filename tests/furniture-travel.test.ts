import { withoutResearch,withMigratedResearch } from './scenarios/legacy-skills';
import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { createWorld, stepWorld, validateWorld, serializeWorld, deserializeWorld, applyCommand, refreshStock } from '../src/sim/index';
import { furnitureDelay, canStandAt, captureStandability } from '../src/sim/furniture-travel';
import { startTravel } from '../src/sim/movement';
import { blockedCells, reachableCells, routeToJob } from '../src/sim/pathfinding';
import { candidateAccess } from '../src/sim/candidate-access';
import { furnitureSurfaces, travelHeight } from '../src/render/furniture-motion';
import { pileSurfaces } from '../src/render/pile-surfaces';
import { WORLD_SCALE } from '../src/world/scale';
import { furnitureTrafficFixture } from './scenarios/furniture-traffic';
import { footprintCells,footprintContains,STRUCTURE_DEFINITIONS } from '../src/sim/definitions';
import { groundOccupancyAllows,storageOccupancyAllows } from '../src/sim/occupancy';
import type { Orientation,StructureKind } from '../src/sim/types';

test('machining table presentation surfaces cover each rotated 3 × 1 footprint',()=>{
  const w=createWorld(42,16,16);w.structures=[];
  for(const orientation of [0,1,2,3] as const){
    const station={id:1,kind:'machining-table' as const,x:8,z:8,orientation,footprint:'standard' as const};
    w.structures=[station];
    const cells=footprintCells(station),movement=furnitureSurfaces(w),piles=pileSurfaces(w);
    expect(cells).toHaveLength(3);expect(movement.size).toBe(3);expect(piles.size).toBe(3);
    for(const cell of cells){
      const key=cell.z*w.width+cell.x;
      expect(movement.get(key)).toBe(WORLD_SCALE.stonecutterHeight);
      expect(piles.get(key)).toEqual({x:0,y:WORLD_SCALE.stonecutterHeight,z:0,scale:.65});
    }
  }
});

test('point queries keep complete rotated and historical footprints, job targets and conduit coexistence',()=>{
  // Explicit occupied offsets are independent of both production footprint
  // functions. Distant points exercise the broad rejection; near points retain
  // the complete shape rather than merely its enclosing rectangle.
  const line=[[[0,0],[1,0],[-1,0]],[[0,0],[0,1],[0,-1]],[[0,0],[1,0],[-1,0]],[[0,0],[0,1],[0,-1]]];
  const pair=[[[0,0],[0,1]],[[0,0],[1,0]],[[0,0],[0,-1]],[[0,0],[-1,0]]];
  const bench=[[[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]],[[0,0],[0,-1],[0,1],[1,0],[1,-1],[1,1]],[[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]],[[0,0],[0,-1],[0,1],[-1,0],[-1,-1],[-1,1]]];
  const stands=new Set<StructureKind>(['grave','power-conduit','power-switch','butcher-spot','crafting-spot','door','stool','dining-chair','armchair','horseshoes']);
  const rejectsItems=new Set<StructureKind>(['grave','heater','wind-turbine','battery','solar-generator','cooler','wood-generator','passive-cooler','wall','bed','dresser','flower-pot','campfire']);
  const stores=new Set<StructureKind>(['power-conduit','standing-lamp','door','stool','dining-chair','armchair','horseshoes']);
  const flickable=new Set<StructureKind>(['machining-table','power-switch','wood-generator','standing-lamp','cooler','electric-stove']);
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];
  const points=Array.from({length:121},(_,i)=>({x:4+i%11,z:4+Math.floor(i/11)}));points.push({x:-20,z:8},{x:8,z:-20},{x:100,z:8},{x:8,z:100});
  for(const kind of Object.keys(STRUCTURE_DEFINITIONS) as StructureKind[])for(const orientation of [0,1,2,3] as const)for(const footprint of ['standard','legacy-single'] as const){
    const direction=[[0,1],[1,0],[0,-1],[-1,0]][orientation]!,side=[[1,0],[0,-1],[-1,0],[0,1]][orientation]!;
    const offsets=kind==='wind-turbine'?[0,1].flatMap(a=>[-3,-2,-1,0,1,2,3].map(b=>[direction[0]!*a+side[0]!*b,direction[1]!*a+side[1]!*b])):kind==='solar-generator'?Array.from({length:16},(_,i)=>[i%4,Math.floor(i/4)]):kind==='wood-generator'?[[0,0],[1,0],[0,1],[1,1]]:kind==='research-bench'?bench[orientation]!:['machining-table','stonecutter','tailor-bench','electric-tailor-bench','fueled-stove','electric-stove','butcher-table'].includes(kind)?line[orientation]!:kind==='table-square'?[0,1].flatMap(a=>[0,1].map(b=>[direction[0]!*a+side[0]!*b,direction[1]!*a+side[1]!*b])):kind==='table-long'?[0,1,2,3].flatMap(a=>[0,1].map(b=>[direction[0]!*a+side[0]!*b,direction[1]!*a+side[1]!*b])):kind==='dresser'?pair[orientation]!:footprint!=='legacy-single'&&['bed','table','battery','grave'].includes(kind)?pair[orientation]!:[[0,0]];
    const cells=offsets.map(([x,z])=>({x:8+x!,z:8+z!})),keys=new Set(cells.map(c=>`${c.x},${c.z}`)),expected=points.map(c=>keys.has(`${c.x},${c.z}`));
    const shape={x:8,z:8,orientation,footprint},structure={...shape,id:1,kind};
    const targets:Parameters<typeof footprintContains>[0][]=[structure,{...shape,kind:'install',furniture:{kind}},{...shape,kind:'deconstruct',deconstruction:{kind}}];
    if(flickable.has(kind))targets.push({...shape,kind:'flick',flick:{kind}});
    for(const target of targets){
      expect(footprintCells(target).map(c=>`${c.x},${c.z}`).sort(),`${kind}/${orientation}/${footprint}/${target.kind}`).toEqual([...keys].sort());
      expect(points.map(c=>footprintContains(target,c))).toEqual(expected);
    }
    const wire={id:2,kind:'power-conduit' as const,x:8,z:8,orientation:0 as const,footprint:'standard' as const};
    for(const structures of [[structure,wire],[wire,structure]]){
      w.structures=structures;
      expect(cells.map(c=>canStandAt(w,c)),`stand ${kind}`).toEqual(cells.map(()=>stands.has(kind)));
      expect(cells.map(c=>groundOccupancyAllows(w,c)),`ground ${kind}`).toEqual(cells.map(()=>!rejectsItems.has(kind)));
      expect(cells.map(c=>storageOccupancyAllows(w,c)),`storage ${kind}`).toEqual(cells.map(()=>stores.has(kind)));
      expect(canStandAt(w,{x:3,z:3})).toBe(true);expect(groundOccupancyAllows(w,{x:3,z:3})).toBe(true);expect(storageOccupancyAllows(w,{x:3,z:3})).toBe(true);
    }
  }
  w.structures=[{id:1,kind:'power-conduit',x:8,z:8,orientation:0,footprint:'standard'}];
  w.jobs=[{id:2,kind:'wall',x:8,z:8,orientation:0,footprint:'standard',construction:'frame',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}}];
  expect(canStandAt(w,{x:8,z:8})).toBe(false);expect(storageOccupancyAllows(w,{x:8,z:8})).toBe(false);
  w.jobs[0]!.kind='power-conduit';expect(canStandAt(w,{x:8,z:8})).toBe(true);expect(storageOccupancyAllows(w,{x:8,z:8})).toBe(true);
  w.jobs=[];w.structures=[{id:1,kind:'bed',x:8,z:8,orientation:0,footprint:'standard',quality:'normal'}];
  w.schemaVersion=21 as typeof w.schemaVersion;expect(canStandAt(w,{x:8,z:9})).toBe(true);expect(groundOccupancyAllows(w,{x:8,z:9})).toBe(false);
  w.schemaVersion=20 as typeof w.schemaVersion;expect(groundOccupancyAllows(w,{x:8,z:9})).toBe(true);
  expect(canStandAt(w,{x:8.5,z:8})).toBe(false);expect(groundOccupancyAllows(w,{x:8,z:8.5})).toBe(false);
});

test('furniture routes agree with an independent directed-cost oracle, repeat across different furniture, and retain exact timed edges',()=>{
  for(let orientation=0;orientation<4;orientation++) {
    const w=createWorld(orientation,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.resources=[];
    const added=new Map<number,number>(),repeat=new Set<number>();
    const cells=[{kind:'stonecutter' as const,x:3,z:10,cost:1667},{kind:'table' as const,x:6,z:6,cost:1400},{kind:'bed' as const,x:10,z:10,cost:1400},{kind:'stool' as const,x:4,z:6,cost:1000},{kind:'campfire' as const,x:7,z:5,cost:1400},{kind:'horseshoes' as const,x:12,z:8,cost:467}];
    for(const s of cells) {
      w.structures.push({id:w.nextId++,kind:s.kind,x:s.x,z:s.z,orientation:orientation as Orientation,footprint:'standard',...(['table','bed','stool'] as const).includes(s.kind as 'table'|'bed'|'stool')?{quality:'normal' as const}:{},...(s.kind==='stonecutter'?{material:'wood' as const}:{})});
      const occupied=[s.z*16+s.x];
      if(s.kind==='stonecutter'){const delta=[1,-16,-1,16][orientation]!;occupied.push(occupied[0]!+delta,occupied[0]!-delta);}
      if(s.kind==='table'||s.kind==='bed')occupied.push(occupied[0]!+[16,1,-16,-1][orientation]!);
      for(const c of occupied){added.set(c,s.cost);if(s.kind!=='horseshoes')repeat.add(c);}
    }
    w.jobs.push({id:w.nextId++,kind:'wall',x:10,z:3,orientation:0,footprint:'standard',construction:'frame',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});added.set(58,467);
    for(const i of [70,86,118,151,182])w.tiles[i]={terrain:'rock'};
    const blocked=blockedCells(w),origin=34,oracle=Array(256).fill(Infinity),done=new Set<number>();oracle[origin]=0;
    for(;;){let a=-1;for(let i=0;i<256;i++)if(!done.has(i)&&oracle[i]<Infinity&&(a<0||oracle[i]<oracle[a]))a=i;if(a<0)break;done.add(a);
      for(let b=0;b<256;b++){const dx=b%16-a%16,dz=Math.floor(b/16)-Math.floor(a/16);if(Math.max(Math.abs(dx),Math.abs(dz))!==1||blocked[b]||dx&&dz&&(blocked[a+dx]||blocked[a+dz*16]))continue;
        const surcharge=repeat.has(a)&&repeat.has(b)?0:added.get(b)??0;oracle[b]=Math.min(oracle[b],oracle[a]+(dx&&dz?1414:1000)+surcharge);
      }
    }
    const reach=reachableCells(w,{x:2,z:2},blocked,new Set());expect(Array.from(reach.costs)).toEqual(oracle);
    const access=candidateAccess(w,{x:2,z:2},blocked,new Set());
    for(const target of [102,170,58]){expect(access.has(target)).toBe(Number.isFinite(oracle[target]));expect(access.resolve(new Set([target])).costs[target]).toBe(oracle[target]);}
    expect(canStandAt(w,{x:6,z:6})).toBe(false);expect(canStandAt(w,{x:10,z:3})).toBe(false);expect(canStandAt(w,{x:4,z:6})).toBe(true);
    const path=routeToJob(w,{x:6,z:6},reach,true);expect(path).not.toBeNull();expect(canStandAt(w,path!.at(-1)!)).toBe(true);
    const standable=captureStandability(w);
    for(let z=-1;z<=16;z++)for(let x=-1;x<=16;x++)expect(standable({x,z}),`standing index ${orientation}:${x},${z}`).toBe(canStandAt(w,{x,z}));
    expect(standable({x:6.5,z:6})).toBe(false);
    const p=w.pawns[0]!;p.x=6;p.z=orientation===2?7:5;w.tick=20;p.motion=null;p.moveCooldown=0;
    startTravel(w,p,{x:6,z:6});expect(p.motion!.end-p.motion!.start).toBeCloseTo(3/.8+4.2,9);
    const captured=structuredClone(p.motion);w.structures=w.structures.filter(s=>s.kind!=='table');expect(p.motion).toEqual(captured);
  }
  const w=furnitureTrafficFixture();expect(furnitureDelay(w,{x:6,z:8},{x:7,z:8})).toBe(4.2);expect(furnitureDelay(w,{x:7,z:8},{x:8,z:8})).toBe(0);
  w.structures.push({id:w.nextId++,kind:'stool',x:6,z:8,orientation:0,footprint:'standard',quality:'normal'});expect(furnitureDelay(w,{x:6,z:8},{x:7,z:8})).toBe(0);
  expect(furnitureDelay(w,{x:5,z:7},{x:6,z:8})).toBe(3);
  const heights=furnitureSurfaces(w);expect(heights.get(135)).toBe(.76);expect(travelHeight(0,.76,1/3)).toBe(.76);expect(travelHeight(.76,0,2/3)).toBe(.76);
});

test('opposite loaded trips cross furniture, cancel in transit without teleport or loss, and migrate old edges strictly',()=>{
  const w=furnitureTrafficFixture(),copy=deserializeWorld(serializeWorld(w));const onTable=new Set<number>();let interrupted=false;
  for(let t=0;t<500;t++) {
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
    for(const p of w.pawns)if(p.motion&&[7,8].includes(p.x)&&p.z===8)onTable.add(p.id);
    const p=w.pawns.find(p=>p.haul?.phase==='deliver'&&p.motion&&[7,8].includes(p.x)&&p.motion.end>w.tick);
    if(p&&!interrupted) {
      const fork=deserializeWorld(serializeWorld(w)),fp=fork.pawns.find(q=>q.id===p.id)!,motion=structuredClone(fp.motion),held=fork.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
      expect(applyCommand(fork,{type:'clear-orders',pawnId:fp.id}).ok).toBe(true);expect(fp.motion).toEqual(motion);expect(fork.piles.find(q=>q.id===held.id)).toBeDefined();
      for(let i=0;i<100;i++){stepWorld(fork);expect(validateWorld(fork)).toEqual([]);}
      expect(canStandAt(fork,fp)).toBe(true);expect(fork.stock).toEqual({wood:10,food:10});interrupted=true;
    }
    if(w.pawns.every(p=>!p.haul)&&w.tick>100)break;
  }
  expect(onTable.size).toBe(2);expect(interrupted).toBe(true);expect(w.piles.find(p=>p.item==='wood')?.owner).toEqual({type:'ground',x:2,z:8});expect(w.piles.find(p=>p.item==='rice')?.owner).toEqual({type:'ground',x:13,z:8});
  const original=furnitureTrafficFixture(),raw=JSON.parse(serializeWorld(original));((raw.schemaVersion=21,withoutResearch(raw)),withoutPawnSkills(raw));for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;
  expect(deserializeWorld(JSON.stringify(raw))).toEqual(withMigratedSkills(original));
  const invalid=JSON.parse(serializeWorld(original));invalid.pawns[0].x=7;invalid.pawns[0].z=8;invalid.pawns[0].path=[];(invalid.schemaVersion=21,withoutPawnSkills(invalid));for(const a of invalid.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete invalid.deconstructed;delete invalid.packed;
  expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/version 21/);
  const timed=furnitureTrafficFixture(),p=timed.pawns[0]!;p.x=6;p.z=8;p.path=[];p.motion=null;timed.tick=20;startTravel(timed,p,{x:7,z:8});
  expect(deserializeWorld(serializeWorld(timed))).toEqual(timed);
  const bad=JSON.parse(serializeWorld(timed));bad.pawns[0].motion.terrainDelay=1.7;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/duration/);
  // Old services on a bed were legal in V21. Migration cancels only those
  // destinations, keeps a held portion and never rewrites an engaged edge.
  for(const service of ['meal','ground-sleep','edge'] as const) {
    const old=createWorld(42,16,16);old.tiles=old.tiles.map(()=>({terrain:'grass'}));old.resources=[];old.jobs=[];old.structures=[];old.pawns=old.pawns.slice(0,1);
    const actor=old.pawns[0]!;Object.assign(actor,{x:8,z:8,hunger:100,rest:60,schedule:Array(24).fill('anything')});
    old.structures.push({id:old.nextId++,kind:'bed',x:8,z:8,orientation:0,footprint:'standard',quality:'normal'});
    if(service==='meal') {
      const portion=old.piles.find(p=>p.kind==='food')!;portion.owner={type:'pawn',pawnId:actor.id};portion.quantity=1;
      actor.need={kind:'eat',phase:'ingest',sourcePileId:portion.id,carryPileId:portion.id,quantity:1,progress:12,dining:{target:{x:8,z:8},seatId:null,tableId:null}};actor.state='eating';
    }else if(service==='ground-sleep'){actor.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:8,z:8}};actor.state='sleeping';}
    else{actor.motion={from:{x:7,z:8},to:{x:8,z:8},start:0,end:3};actor.moveCooldown=3;}
    refreshStock(old);const raw=structuredClone(old) as any;((raw.schemaVersion=21,withoutResearch(raw)),withoutPawnSkills(raw));for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;
    const loaded=deserializeWorld(JSON.stringify(raw));expect(loaded.tick).toBe(old.tick);expect(loaded.rng).toBe(old.rng);expect(loaded.piles).toEqual(raw.piles);expect(loaded.pawns[0]!.motion).toEqual(actor.motion);
    if(service==='meal')expect(loaded.pawns[0]!.need).toMatchObject({kind:'eat',phase:'choose-spot',progress:0,dining:null});
    if(service==='ground-sleep')expect(loaded.pawns[0]!.need).toBeNull();
    const resumed=deserializeWorld(serializeWorld(loaded));for(let t=0;t<35;t++){stepWorld(loaded);stepWorld(resumed);expect(validateWorld(loaded)).toEqual([]);expect(resumed).toEqual(loaded);}
    expect(canStandAt(loaded,loaded.pawns[0]!)).toBe(true);
  }
  const fake=JSON.parse(serializeWorld(furnitureTrafficFixture()));fake.pawns[0].transitExit=true;expect(()=>deserializeWorld(JSON.stringify(fake))).toThrow(/exit lacks/);

});
