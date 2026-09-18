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

function building(w:World,kind:StructureKind,x:number,z:number,orientation:Orientation=0):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',...(kind==='door'?{door:newDoorState(w.tick)}:{})};
  w.structures.push(s);return s;
}

test('real content separates sight, navigation and cover over every furniture footprint',()=>{
  // Source-derived cases; deliberately independent of the implementation table.
  const cases:Array<[StructureKind,number,number]>=[['wall',1,.75],['door',1,.75],['wood-generator',1,.75],['stonecutter',.5,.5],['bed',.4,.4],['table',.4,.4],['passive-cooler',.4,.4],['stool',.2,.2],['campfire',.2,.2],['standing-lamp',.2,.2],['horseshoes',0,0]];
  for(const [kind,fill,chance] of cases)for(const orientation of [0,1,2,3] as const) {
    const w=miningCamp(),s=building(w,kind,12,12,orientation),before=JSON.stringify(w),grid=captureWorldShotGrid(w);
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
