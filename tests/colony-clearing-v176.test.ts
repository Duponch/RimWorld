import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { miningCamp } from './scenarios/mining.ts';
import { campChunks, miningDecisions } from './scenarios/mining-player.ts';
import { playerDecisions } from './scenarios/colony-player.ts';
import { stonecuttingDecisions } from './scenarios/stonecutting-player.ts';

test('the ordinary camp designates its work contacts, field, storage and mined chunks without sweeping natural stone',()=>{
  const w=miningCamp();
  w.tick=6000;
  for(const x of [13,16,19])w.structures.push({id:w.nextId++,kind:'bed',x,z:16,orientation:0,footprint:'standard',material:'wood',quality:'normal'});
  expect(applyCommand(w,{type:'area',action:'growing',from:{x:14,z:22},to:{x:18,z:24}}).ok).toBe(true);
  expect(applyCommand(w,{type:'stockpile',x:18,z:18,enabled:true,filters:{wood:true,food:false}}).ok).toBe(true);
  expect(applyCommand(w,{type:'stockpile',x:20,z:20,enabled:true,filters:{wood:false,food:false,chunk:true}}).ok).toBe(true);
  const locations=[{x:2,z:2},{x:16,z:15},{x:16,z:18},{x:15,z:22},{x:18,z:18},{x:25,z:25},{x:20,z:20}];
  for(const cell of locations)addGroundMaterial(w,'chunk',1,cell,'granite-chunk');
  w.tiles[25*w.width+25]={terrain:'rough-stone',stone:'granite'};
  expect(validateWorld(w)).toEqual([]);
  const needed=locations.slice(1,-1).map(c=>w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z)!.id);
  const stored=w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===20&&p.owner.z===20)!.id;
  expect(campChunks(w).map(p=>p.id)).toEqual([...needed,stored]);
  const hauls=miningDecisions(w).filter(d=>d.command.type==='area'&&d.command.action==='haul-chunks');
  expect(hauls).toHaveLength(5);
  expect(playerDecisions(w).filter(d=>d.command.type==='area'&&d.command.action==='haul-chunks')).toEqual(hauls);
  for(const decision of hauls)expect(applyCommand(w,decision.command).ok).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));
  expect(validateWorld(resumed)).toEqual([]);
  expect(resumed.piles.filter(p=>p.kind==='chunk'&&p.haulRequested).map(p=>p.id)).toEqual(needed);
  expect(resumed.piles.find(p=>p.id===stored)?.haulRequested).toBeUndefined();
  expect(resumed.piles.find(p=>p.owner.type==='ground'&&p.owner.x===2&&p.owner.z===2)?.haulRequested).toBeUndefined();
  expect(miningDecisions(resumed).filter(d=>d.command.type==='area'&&d.command.action==='haul-chunks')).toEqual([]);
});

test('a chunk picked up before observation remains in the camp maintenance set after save and resume',()=>{
  const w=miningCamp();
  expect(applyCommand(w,{type:'stockpile',x:13,z:12,enabled:true,filters:{wood:false,food:false,chunk:true},capacity:1}).ok).toBe(true);
  addGroundMaterial(w,'chunk',1,{x:11,z:12},'granite-chunk');
  expect(applyCommand(w,{type:'area',action:'haul-chunks',from:{x:11,z:12},to:{x:11,z:12}}).ok).toBe(true);
  for(let i=0;i<200&&!w.pawns.some(p=>p.haul?.phase==='deliver');i++)stepWorld(w);
  const carrier=w.pawns.find(p=>p.haul?.phase==='deliver');
  expect(carrier).toBeDefined();
  expect(validateWorld(w)).toEqual([]);
  const carried=campChunks(w);
  expect(carried).toHaveLength(1);
  expect(carried[0]!.id).toBe(carrier!.haul!.carryPileId);
  expect(carried[0]!.owner).toEqual({type:'pawn',pawnId:carrier!.id});
  const resumed=deserializeWorld(serializeWorld(w));
  expect(campChunks(resumed).map(p=>p.id)).toEqual([carried[0]!.id]);
  expect(validateWorld(resumed)).toEqual([]);
});

test('distant natural chunks do not suppress a needed replacement mining order',()=>{
  const w=miningCamp();w.tick=6000;
  for(const x of [13,16,19])w.structures.push({id:w.nextId++,kind:'bed',x,z:18,orientation:0,footprint:'standard',material:'wood',quality:'normal'});
  w.structures.push({id:w.nextId++,kind:'stonecutter',x:20,z:15,orientation:0,footprint:'standard',material:'wood',bills:[]});
  for(const x of [5,6,7,8])w.tiles[5*w.width+x]={terrain:'rough-stone',stone:'granite'};
  for(const x of [10,11,12,13])w.tiles[11*w.width+x]={terrain:'rock',stone:'granite'};
  addGroundMaterial(w,'chunk',1,{x:2,z:2},'granite-chunk');
  expect(campChunks(w)).toEqual([]);
  const mines=miningDecisions(w).filter(d=>d.command.type==='designate'&&d.command.kind==='mine');
  expect(mines).toHaveLength(4);
  expect(mines.every(d=>applyCommand(w,d.command).ok)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
});

test('the camp supplies storage for a second block type before maintaining its stone bill',()=>{
  const w=miningCamp();
  w.structures.push({id:w.nextId++,kind:'stonecutter',x:20,z:15,orientation:0,footprint:'standard',material:'wood',bills:[]});
  const stores=stonecuttingDecisions(w).filter(d=>d.command.type==='stockpile');
  expect(stores).toHaveLength(2);
  for(const d of stores)expect(applyCommand(w,d.command).ok).toBe(true);
  const cells=w.stockpiles.filter(s=>s.filters.blocks);
  expect(cells).toHaveLength(2);
  for(const [i,item] of ['slate-blocks','limestone-blocks'].entries())
    addGroundMaterial(w,'blocks',20,{x:cells[i]!.x,z:cells[i]!.z},item as 'slate-blocks'|'limestone-blocks');
  expect(validateWorld(w)).toEqual([]);
  expect(stonecuttingDecisions(w).filter(d=>d.command.type==='stockpile')).toEqual([]);
  expect(w.piles.filter(p=>p.kind==='blocks').reduce((n,p)=>n+p.quantity,0)).toBe(40);
});
