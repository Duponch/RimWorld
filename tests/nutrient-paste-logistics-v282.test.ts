import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {hopperCapacity} from '../src/sim/nutrient-paste.ts';
import {mayImproveStorage} from '../src/sim/idle-logistics.ts';
import {pasteCamp} from './helpers/nutrient-paste-v282.ts';

test('a kitchen without stockpile zones fills its hopper by ordinary hauling and resumes while carrying',()=>{
  const {world:w,hopperId}=pasteCamp(),h=w.structures.find(s=>s.id===hopperId)!;
  expect(mayImproveStorage(w)).toBe(true);
  let carrier=w.pawns.find(p=>p.haul?.destination.type==='hopper'&&p.haul.phase==='deliver');
  for(let i=0;i<300&&!carrier;i++){stepWorld(w);carrier=w.pawns.find(p=>p.haul?.destination.type==='hopper'&&p.haul.phase==='deliver');}
  expect(carrier?.haul?.quantity).toBe(10);expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,300);stepWorld(resumed,300);
  expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===h.x&&p.owner.z===h.z)?.quantity).toBe(12);
});

test('hopper priority does not take food already in an Important reserve',()=>{
  const {world:w}=pasteCamp();
  w.stockpiles.push({id:w.nextId++,x:9,z:13,filters:{wood:false,food:true},priority:3,capacity:75});
  expect(mayImproveStorage(w)).toBe(false);stepWorld(w,100);
  expect(w.pawns.every(p=>!p.haul)).toBe(true);
  expect(w.piles.find(p=>p.item==='rice')?.owner).toEqual({type:'ground',x:9,z:13});
});

test('an incoming hopper stack protects the floor against another item or competing capacity',()=>{
  const {world:w,hopperId}=pasteCamp(75),p=w.pawns[0]!,h=w.structures.find(s=>s.id===hopperId)!,rice=w.piles.find(p=>p.item==='rice')!;
  p.haul={sourcePileId:rice.id,quantity:10,phase:'pickup',carryPileId:null,destination:{type:'hopper',structureId:hopperId}};
  expect(hopperCapacity(w,hopperId,'rice')).toBe(65);
  expect(groundCapacity(w,h,'corn')).toBe(0);
  expect(hopperCapacity(w,hopperId,'rice',p.id)).toBe(75);
  expect(groundCapacity(w,h,'rice',p.id)).toBe(75);
});

test('a hopper requires a cardinal real footprint or plan and excludes ordinary storage',()=>{
  const {world:w}=pasteCamp(0);
  expect(applyCommand(w,{type:'designate',kind:'hopper',x:20,z:20,orientation:0}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'hopper',x:16,z:16,orientation:0}).ok).toBe(false);
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:16,z:14,filters:{wood:false,food:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'hopper',x:16,z:14,orientation:0}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'hopper',x:16,z:13,orientation:3}).ok).toBe(true);
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:16,z:13,filters:{wood:false,food:true}}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'nutrient-paste-dispenser',x:22,z:22,orientation:1}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'hopper',x:22,z:20,orientation:2}).ok).toBe(true);
});
