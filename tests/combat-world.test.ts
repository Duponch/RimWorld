import { combatShotBatch } from '../src/sim/combat-shot-batch';
import { expect,test } from 'vitest';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { clearShotSegment,findShotLine } from '../src/sim/combat-space';
import { coverBase,shotCover } from '../src/sim/combat-report';
import { newDoorState } from '../src/sim/door-rules';
import { footprintCells } from '../src/sim/definitions';
import { ITEM_DEFINITIONS } from '../src/sim/items';
import { blockedCells } from '../src/sim/pathfinding';
import { addGroundMaterial,applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { miningCamp } from './scenarios/mining';
import type { Orientation,Structure,StructureKind,World } from '../src/sim/types';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world';
import { projectileCanHit } from '../src/sim/projectile-rules';
import { advanceBulletFlight,type BulletFlight } from '../src/sim/bullet-flight';
import { emitRevolverBullet } from '../src/sim/bullet-emission';
import { revolverProfile } from '../src/sim/ranged-statistics';
import { shotAim } from '../src/sim/combat-report';
import { damageUnarmoredPawnWithBullet } from '../src/sim/bullet-damage';
import { healthRandom } from '../src/sim/health';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { rescueCamp } from './scenarios/rescue';

function building(w:World,kind:StructureKind,x:number,z:number,orientation:Orientation=0):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',...(kind==='door'?{door:newDoorState(w.tick)}:{})};
  w.structures.push(s);return s;
}

test('real content separates sight, navigation and cover over every furniture footprint',()=>{
  // Source-derived cases; deliberately independent of the implementation table.
  const cases:Array<[StructureKind,number,number]>=[['wall',1,.75],['door',1,.75],['wood-generator',1,.75],['stonecutter',.5,.5],['bed',.4,.4],['table',.4,.4],['passive-cooler',.4,.4],['stool',.2,.2],['campfire',.2,.2],['standing-lamp',.2,.2],['horseshoes',0,0]];
  for(const [kind,fill,chance] of cases)for(const orientation of [0,1,2,3] as const) {
    const w=miningCamp(),s=building(w,kind,12,12,orientation),before=JSON.stringify(w),grid=captureWorldShotGrid(w);
    // A local acquisition window must preserve every material/door/footprint
    // result, including an object whose origin lies just outside the window.
    for(const minX of [0,12,13]){
      const local=captureWorldShotGrid(w,{minX,minZ:10,maxX:17,maxZ:16});
      for(let z=10;z<=16;z++)for(let x=minX;x<=17;x++){
        expect(local.coverAt(x,z)).toEqual(grid.coverAt(x,z));expect(local.blocksSight(x,z)).toBe(grid.blocksSight(x,z));
      }
      expect(local.blocksSight(18,12)).toBe(true);expect(local.coverAt(18,12)).toBeUndefined();
    }
    for(const c of footprintCells(s)) {
      const cover=grid.coverAt(c.x,c.z);
      expect(cover?.fill??0,`${kind}/${orientation}`).toBe(fill);
      expect(cover?coverBase(cover):0).toBe(chance);
      expect(grid.blocksSight(c.x,c.z)).toBe(fill===1);
      if(cover)expect(cover.key).toBe(`structure:${s.id}`);
    }
    expect(grid.coverAt(15,15)).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
    s.material='granite-blocks';expect(captureWorldShotGrid(w).coverAt(12,12)).toEqual(grid.coverAt(12,12));
    if(kind==='wood-generator')expect(blockedCells(w)[12*32+12]).toBe(0); // Walk over, cannot see through.
    if(kind==='bed'||kind==='table') {
      s.footprint='legacy-single';const single=captureWorldShotGrid(w);
      expect(single.coverAt(12,12)?.fill).toBe(.4);
      for(const c of footprintCells({...s,footprint:'standard'}).slice(1))expect(single.coverAt(c.x,c.z)).toBeUndefined();
    }
  }
  const w=miningCamp();w.tiles[8*32+8]={terrain:'water'};w.tiles[8*32+9]={terrain:'rough-stone',stone:'granite'};
  const grid=captureWorldShotGrid(w);expect(blockedCells(w)[8*32+8]).toBe(1);
  expect(clearShotSegment(grid,{x:7,z:8},{x:10,z:8})).toBe(true);
  expect(grid.coverAt(9,8)).toBeUndefined();
});

test('projectile capture retains all targets, ownership and anchors independently of the best cover',()=>{
  const w=miningCamp(),table=building(w,'table',12,12,1),door=building(w,'door',16,12);
  door.door!.open=true;
  const chunk={id:w.nextId++,kind:'chunk' as const,item:'granite-chunk' as const,quantity:1,owner:{type:'ground' as const,x:16,z:12}};w.piles.push(chunk);
  addGroundMaterial(w,'food',2,{x:12,z:12},'rice');const food=w.piles.find(p=>p.item==='rice')!;
  w.piles.push({...chunk,id:w.nextId++,owner:{type:'pawn',pawnId:w.pawns[0].id}});
  w.piles.push({...chunk,id:w.nextId++,owner:{type:'job',jobId:999}});
  w.piles.push({...chunk,id:w.nextId++,owner:{type:'equipment',pawnId:w.pawns[0].id}});
  const packedId=w.nextId++;w.packed.push({building:{...table,id:packedId},owner:{type:'ground',x:15,z:15}});
  w.packed.push({building:{...table,id:w.nextId++},owner:{type:'pawn',pawnId:w.pawns[0].id}});
  w.resources=[{id:w.nextId++,kind:'tree',x:17,z:12,amount:7},{id:w.nextId++,kind:'rice',x:18,z:12,amount:6},{id:w.nextId++,kind:'rock',x:19,z:12,amount:5}];
  w.jobs.push({id:w.nextId++,x:21,z:12,kind:'wall',orientation:0,footprint:'standard',construction:'blueprint',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  w.jobs.push({...w.jobs[0],id:w.nextId++,x:22,construction:'frame'});
  const before=JSON.stringify(w),capture=captureWorldProjectileTargets(w),scene=capture.scene(new Set(),.4);
  expect(captureWorldShotGrid(w).coverAt(16,12)?.key).toBe(`structure:${door.id}`);
  expect(scene.at({x:16,z:12}).map(t=>t.key)).toEqual([`structure:${door.id}`,`pile:${chunk.id}`]);
  expect(scene.target(`pile:${food.id}`)?.fill).toBe(0);
  for(const p of w.piles.filter(p=>p.owner.type!=='ground'))expect(scene.target(`pile:${p.id}`)).toBeUndefined();
  expect(scene.target(`packed:${packedId}`)).toMatchObject({cell:{x:15,z:15},fill:0,kind:'object'});
  expect(scene.target(`structure:${packedId}`)).toBeUndefined();expect(scene.target(`packed:${w.packed[1].building.id}`)).toBeUndefined();
  for(const c of footprintCells(table)){expect(scene.at(c).some(t=>t.key===`structure:${table.id}`)).toBe(true);expect(capture.anchor(`structure:${table.id}`)).toEqual({x:12,z:12});}
  expect(scene.target(`resource:${w.resources[1].id}`)?.fill).toBe(0);expect(scene.target(`resource:${w.resources[2].id}`)).toBeUndefined();
  expect(scene.target(`frame:${w.jobs[0].id}`)).toBeUndefined();expect(scene.target(`frame:${w.jobs[1].id}`)?.fill).toBe(.2);
  const immutable=scene.at({x:16,z:12});expect(Object.isFrozen(immutable)).toBe(true);expect(Object.isFrozen(immutable[0])).toBe(true);expect(Object.isFrozen(immutable[0].cell)).toBe(true);
  expect(JSON.stringify(w)).toBe(before);
  w.structures=[];w.resources=[];w.piles=[];expect(scene.at({x:16,z:12})).toBe(immutable);
  expect(captureWorldProjectileTargets(w).scene(new Set(),.4).at({x:16,z:12})).toEqual([]);
});

test('recouvrement requires every occupied cell and definition altitude, even for an open door',()=>{
  // Geometry fixtures intentionally overlap objects; these are not valid builds.
  const w=miningCamp(),table=building(w,'table',12,12),cells=footprintCells(table);
  const capture=()=>captureWorldProjectileTargets(w).scene(new Set(),.4),key=`structure:${table.id}`;
  for(const c of cells.slice(0,-1))building(w,'wall',c.x,c.z);
  expect(capture().target(key)?.covered).toBe(false);
  const last=cells.at(-1)!;building(w,'wall',last.x,last.z);expect(capture().target(key)?.covered).toBe(true);
  w.structures=w.structures.filter(s=>s.id===table.id);w.tiles[last.z*w.width+last.x]={terrain:'rock',stone:'granite'};
  expect(capture().target(key)?.covered).toBe(false);table.footprint='legacy-single';
  w.tiles[12*w.width+12]={terrain:'rock',stone:'granite'};expect(capture().target(key)?.covered).toBe(true);
  w.structures=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  const door=building(w,'door',12,12);door.door!.open=true;
  const tree={id:w.nextId++,kind:'tree' as const,x:12,z:12,amount:5},berry={...tree,id:w.nextId++,kind:'berries' as const};w.resources=[tree,berry];
  w.pawns[0].x=12;w.pawns[0].z=12;addGroundMaterial(w,'chunk',1,{x:12,z:12},'marble-chunk');const chunk=w.piles.find(p=>p.item==='marble-chunk')!;
  let scene=capture();expect(scene.target(`resource:${tree.id}`)?.covered).toBe(false);expect(scene.target(`resource:${berry.id}`)?.covered).toBe(true);
  expect(scene.target(`pawn:${w.pawns[0].id}`)?.covered).toBe(false);expect(scene.target(`pile:${chunk.id}`)?.covered).toBe(false);
  expect(scene.target(`structure:${door.id}`)?.covered).toBe(false);door.door!.open=false;
  expect(capture().target(`resource:${berry.id}`)?.covered).toBe(true); // Logical open does not change definition altitude/fullness.
  const large=building(w,'wood-generator',12,12);scene=capture();expect(scene.target(`structure:${door.id}`)?.covered).toBe(true);expect(scene.target(`structure:${large.id}`)?.covered).toBe(false);
});

test('relations, rectangular bounds and persistent IDs are copied without depending on world array order',()=>{
  const w=miningCamp(3);w.width=37;w.height=23;w.tiles=Array.from({length:37*23},()=>({terrain:'grass'}));w.tiles[0]={terrain:'rock'};w.tiles[37*23-1]={terrain:'rock'};
  for(const p of w.pawns){p.x=12;p.z=12;}
  w.pawns[1].id=Number.MAX_SAFE_INTEGER-1;w.pawns[2].state='sleeping';
  const ids=w.pawns.map(p=>p.id).sort((a,b)=>a-b),friendly=new Set([ids[0]]),capture=captureWorldProjectileTargets(w),scene=capture.scene(friendly,.4),other=capture.scene(new Set([ids[2]]),0);
  friendly.clear();expect(scene.at({x:12,z:12}).map(t=>t.key)).toEqual(ids.map(id=>`pawn:${id}`));
  expect(scene.target(`pawn:${ids[0]}`)).toMatchObject({friendly:true});expect(other.target(`pawn:${ids[0]}`)).toMatchObject({friendly:false});expect(other.target(`pawn:${ids[2]}`)).toMatchObject({friendly:true});
  expect(scene.target(`pawn:${w.pawns[2].id}`)).toMatchObject({bodySize:1,standing:false});
  expect(scene.target('rock:0')).toMatchObject({cell:{x:0,z:0},fill:1});expect(scene.target('rock:850')).toMatchObject({cell:{x:36,z:22}});
  for(const bad of ['rock:851','rock:-1','rock:00','pawn:Infinity','pawn:9007199254740992','tree:1','pawn:1:2'])expect(scene.target(bad)).toBeUndefined();
  for(const bad of [{x:-1,z:0},{x:37,z:0},{x:0,z:23},{x:.5,z:0}])expect(scene.at(bad)).toEqual([]);
  w.pawns.reverse();expect(captureWorldProjectileTargets(w).scene(new Set([ids[0]]),.4).at({x:12,z:12})).toEqual(scene.at({x:12,z:12}));
  const unordered=captureWorldProjectileTargets(w).scene(new Set([ids[0]]),.4);for(const id of ids)expect(unordered.target(`pawn:${id}`)).toEqual(scene.target(`pawn:${id}`));
  expect(()=>capture.scene(new Set(),NaN)).toThrow();expect(()=>capture.scene(new Set(),1.01)).toThrow();
});

test('real rescue removes a carried patient from interception, then restores the lying body after exact save continuation',()=>{
  const w=rescueCamp(),[actor,patient]=w.pawns,key=`pawn:${patient.id}`,initial=captureWorldProjectileTargets(w).scene(new Set(),.4);
  expect(initial.target(key)).toMatchObject({kind:'pawn',standing:false});
  expect(applyCommand(w,{type:'order-rescue',pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  for(let i=0;i<200&&actor.rescue?.phase!=='carry';i++)stepWorld(w);
  expect(actor.rescue?.phase).toBe('carry');const carried=captureWorldProjectileTargets(w).scene(new Set(),.4);
  expect(carried.target(key)).toBeUndefined();expect(carried.at(actor).map(t=>t.key)).not.toContain(key);expect(initial.target(key)).toBeDefined();
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300&&actor.rescue;i++){stepWorld(w);stepWorld(resumed);}
  expect(actor.rescue).toBeUndefined();expect(w).toEqual(resumed);expect(validateWorld(w)).toEqual([]);
  const atBed=captureWorldProjectileTargets(w).scene(new Set(),.4);expect(atBed.target(key)).toMatchObject({standing:false,covered:false});expect(carried.target(key)).toBeUndefined();
  patient.state='dead';expect(captureWorldProjectileTargets(w).scene(new Set(),.4).target(key)).toBeUndefined(); // Corpse item is still absent.
});

test('query, emission, moving World targets and medical impact agree before and after saved continuation',()=>{
  const w=medicalCamp(2),[shooter,target]=w.pawns;shooter.x=2;shooter.z=10;target.x=20;target.z=10;
  const grid=captureWorldShotGrid(w),line=findShotLine(grid,shooter,{cell:target,leans:true},25.9);expect(line.ok).toBe(true);if(!line.ok)throw Error();
  const capture=captureWorldProjectileTargets(w),key=`pawn:${target.id}`,cover=shotCover(grid,shooter,target,key),profile=revolverProfile('normal');
  const emitted=emitRevolverBullet({grid,line,origin:{x:2.5,z:10.5},launcherKey:`pawn:${shooter.id}`,equipmentKey:'weapon:fixture',target:{key,cell:target,full:false,canBenefitFromCover:true},aim:shotAim({distance:18,pawnAccuracy:1,weaponAccuracy:[1,1,1,1],targetSize:1,standing:true,weather:1,blindSmoke:false}),cover,profile,canHitOtherPawns:true,preventFriendlyFire:false,coverAnchor:capture.anchor},()=>.5);
  expect(applyCommand(w,{type:'draft',pawnIds:[target.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[target.id],target:{x:25,z:10},queue:false}).ok).toBe(true);
  const advance=(world:World,f:BulletFlight)=>{stepWorld(world);const scene=captureWorldProjectileTargets(world).scene(new Set(world.pawns.map(p=>p.id)),.4),local={rng:world.rng};const result=advanceBulletFlight(f,scene,()=>healthRandom(local),10);world.rng=local.rng;if(result.arrival?.targetKey===key)damageUnarmoredPawnWithBullet(world,world.pawns.find(p=>p.id===target.id)!,{damage:profile.damage,part:'left-lung'});return result;};
  let first=advance(w,emitted.flight);expect(first.arrival).toBeNull();expect(target.x).not.toBe(20);
  const resumed=deserializeWorld(serializeWorld(w));let copy=JSON.parse(JSON.stringify(first.flight)) as BulletFlight;
  while(!first.flight.completed){first=advance(w,first.flight);const other=advance(resumed,copy);copy=other.flight;expect(other).toEqual(first);}
  expect(first.arrival?.targetKey).toBe(key);expect(first.arrival?.point).toEqual({x:20.5,z:10.5});expect(target.x+.5).not.toBe(20.5);
  expect(target.health?.injuries.map(i=>i.kind)).toEqual(['gunshot','gunshot']);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(projectileCanHit(first.flight,capture.scene(new Set(),.4).target(key)!)).toBe(true);
});

test('dominant raw fill, carried items, packed furniture and plants use their own cover contracts',()=>{
  const w=miningCamp(),target={x:12,z:12},from={x:2,z:12};
  const s=building(w,'stool',11,12);
  const chunk={id:w.nextId++,kind:'chunk' as const,item:'granite-chunk' as const,quantity:1,owner:{type:'ground' as const,x:11,z:12}};w.piles.push(chunk);
  let grid=captureWorldShotGrid(w);expect(shotCover(grid,from,target).blockChance).toBe(.5);
  expect(grid.coverAt(11,12)?.key).toBe(`pile:${chunk.id}`);
  // An open door dominates the same chunk by raw fill; its effective cover is 0.
  s.kind='door';s.door={...newDoorState(w.tick),open:true,forbidden:true};grid=captureWorldShotGrid(w);
  expect(grid.blocksSight(11,12)).toBe(false);expect(shotCover(grid,from,target).blockChance).toBe(0);
  s.door.open=false;expect(shotCover(captureWorldShotGrid(w),from,target).blockChance).toBe(.75);
  expect(shotCover(grid,from,target).blockChance).toBe(0); // Snapshot remains owned, not live.
  w.structures=[];w.piles=[];
  for(const [i,item] of Object.keys(ITEM_DEFINITIONS).entries()) {
    const def=ITEM_DEFINITIONS[item as keyof typeof ITEM_DEFINITIONS];
    w.piles.push({id:w.nextId++,kind:def.kind,item:item as keyof typeof ITEM_DEFINITIONS,quantity:1,owner:{type:'ground',x:i%25,z:3+Math.floor(i/25)}});
  }
  grid=captureWorldShotGrid(w);
  for(const p of w.piles)if(p.owner.type==='ground')expect(grid.coverAt(p.owner.x,p.owner.z)?.fill??0).toBe(p.kind==='chunk'?.5:0);
  w.piles=[{...chunk,owner:{type:'pawn',pawnId:w.pawns[0].id}}];
  w.packed=[{building:{...s,kind:'table'},owner:{type:'ground',x:11,z:12}}];
  expect(captureWorldShotGrid(w).coverAt(11,12)).toBeUndefined();
  w.resources=[{id:w.nextId++,kind:'tree',x:11,z:12,amount:7},{id:w.nextId++,kind:'berries',x:11,z:13,amount:10,growth:.01},{id:w.nextId++,kind:'rice',x:11,z:14,amount:6,growth:1},{id:w.nextId++,kind:'rock',x:11,z:15,amount:10}];
  grid=captureWorldShotGrid(w);expect(grid.coverAt(11,12)?.fill).toBe(.25);expect(grid.blocksSight(11,12)).toBe(false);
  expect(grid.coverAt(11,13)?.fill).toBe(.2);expect(grid.coverAt(11,14)).toBeUndefined();expect(grid.coverAt(11,15)).toBeUndefined();
  w.resources[1].growth=1;expect(captureWorldShotGrid(w).coverAt(11,13)).toEqual(grid.coverAt(11,13));
  // Overlap tie: stable IDs, even after loading or reordering arrays.
  w.resources[1].id=Number.MAX_SAFE_INTEGER-4;
  const sameFill=building(w,'stool',11,13);sameFill.id=Number.MAX_SAFE_INTEGER-2;
  const first=captureWorldShotGrid(w).coverAt(11,13);
  expect(first?.key).toBe(`resource:${Number.MAX_SAFE_INTEGER-4}`);expect(Object.isFrozen(first)).toBe(true);
  w.resources.reverse();w.structures.reverse();
  expect(captureWorldShotGrid(w).coverAt(11,13)).toEqual(first);
});

test('same-tick door mutations, rock removal and bounds cannot leak stale live lines',()=>{
  const w=miningCamp();w.width=37;w.height=23;w.tiles=Array.from({length:w.width*w.height},()=>({terrain:'grass'}));
  for(let z=0;z<w.height;z++)w.tiles[z*w.width+18]={terrain:'rock',stone:'marble',...z%2?{ore:'steel'}:{}};
  w.tiles[10*w.width+18]={terrain:'grass'};const door=building(w,'door',18,10),from={x:12,z:10},target={cell:{x:24,z:10},leans:true};
  const closed=captureWorldShotGrid(w),before=JSON.stringify(w);
  expect(findShotLine(closed,from,target,25.9)).toEqual({ok:false,reason:'blocked'});
  expect(closed.coverAt(18,9)?.fill).toBe(1);expect(closed.coverAt(18,9)).toBe(closed.coverAt(18,9));
  expect(JSON.stringify(w)).toBe(before);
  door.door!.open=true; // Leaf still at 0: logical Open controls sight, not the animation.
  const open=captureWorldShotGrid(w);expect(findShotLine(open,from,target,25.9)).toMatchObject({ok:true});
  door.door!.holdOpen=true;door.door!.forbidden=true;
  expect(findShotLine(captureWorldShotGrid(w),from,target,25.9)).toMatchObject({ok:true});
  door.door!.open=false;door.door!.from=1;
  expect(findShotLine(captureWorldShotGrid(w),from,target,25.9)).toEqual({ok:false,reason:'blocked'});
  expect(findShotLine(open,from,target,25.9)).toMatchObject({ok:true});
  w.structures=[];w.tiles[9*w.width+18]={terrain:'rough-stone',stone:'marble'};
  const removed=captureWorldShotGrid(w);expect(removed.coverAt(18,9)).toBeUndefined();expect(closed.coverAt(18,9)?.full).toBe(true);
  for(const [x,z] of [[-1,1],[37,0],[0,23],[NaN,1],[1.5,2]]){expect(removed.coverAt(x,z)).toBeUndefined();expect(removed.blocksSight(x,z)).toBe(true);}
  expect(removed.coverAt(0,1)).toBeUndefined();expect(removed.blocksSight(0,1)).toBe(false);
});

test('actual mining, chopping and construction refresh cover without changing save continuation or RNG',()=>{
  const w=miningCamp(),p=w.pawns[0];p.priorities.gather=2;p.priorities.build=2;
  w.tiles[11*32+11]={terrain:'rock',stone:'granite',ore:'steel'};
  w.resources.push({id:w.nextId++,kind:'tree',x:13,z:11,amount:12});
  addGroundMaterial(w,'wood',5,{x:10,z:13},'wood');
  for(const command of [{type:'designate',kind:'mine',x:11,z:11},{type:'designate',kind:'chop',x:13,z:11},{type:'designate',kind:'wall',material:'wood',x:14,z:12}] as const)expect(applyCommand(w,command).ok).toBe(true);
  const initial=captureWorldShotGrid(w);expect(initial.blocksSight(11,11)).toBe(true);expect(initial.coverAt(13,11)?.fill).toBe(.25);expect(initial.coverAt(14,12)).toBeUndefined();
  let resumed:World|undefined,sawFrame=false;
  for(let i=0;i<1200&&!w.structures.some(s=>s.x===14&&s.z===12);i++) {
    stepWorld(w);if(resumed)stepWorld(resumed);
    const rng=w.rng,grid=captureWorldShotGrid(w);
    if(w.jobs.some(j=>j.x===14&&j.z===12&&j.construction==='frame')) {
      sawFrame=true;expect(grid.coverAt(14,12)?.fill).toBe(.2);expect(grid.blocksSight(14,12)).toBe(false);
      if(!resumed)resumed=deserializeWorld(serializeWorld(w));
    }
    expect(w.rng).toBe(rng);
    if(i%50===0)expect(validateWorld(w)).toEqual([]);
  }
  expect(sawFrame).toBe(true);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const final=captureWorldShotGrid(w);
  expect(final.blocksSight(11,11)).toBe(false);expect(final.coverAt(11,11)).toBeUndefined();
  expect(final.coverAt(13,11)).toBeUndefined();expect(final.blocksSight(14,12)).toBe(true);
  expect(w.piles.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0)).toBe(40);
  expect(w.piles.reduce((n,p)=>n+(p.item==='wood'?p.quantity:0),0)).toBe(12);
  expect(initial.blocksSight(11,11)).toBe(true);expect(initial.coverAt(13,11)?.fill).toBe(.25);
});


test('combat transaction reuses fixed cover after injury but refreshes real dropped/moved cover; next batch recaptures terrain',()=>{
  const w=miningCamp();building(w,'stool',11,12);
  const batch=combatShotBatch(w),first=batch.read();
  controlledInjury(w,w.pawns[0],'left-arm',1000);batch.afterImpact();expect(batch.read()).toBe(first);
  const chunk={id:w.nextId++,kind:'chunk' as const,item:'granite-chunk' as const,quantity:1,owner:{type:'ground' as const,x:11,z:12}};w.piles.push(chunk);
  batch.afterImpact();const dropped=batch.read();expect(dropped).not.toBe(first);expect(dropped.coverAt(11,12)?.fill).toBe(.5);expect(first.coverAt(11,12)?.fill).toBe(.2);
  chunk.owner.x=12;batch.afterImpact();const moved=batch.read();expect(moved.coverAt(11,12)?.fill).toBe(.2);expect(moved.coverAt(12,12)?.fill).toBe(.5);
  w.piles=w.piles.filter(p=>p!==chunk);batch.afterImpact();expect(batch.read().coverAt(12,12)).toBeUndefined();
  w.tiles[12*w.width+12]={terrain:'rock',stone:'granite'};
  expect(combatShotBatch(w).read().blocksSight(12,12)).toBe(true);
});
