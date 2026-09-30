import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, stepWorld, validateWorld } from '../src/sim/index.ts';
import { miningCamp } from './scenarios/mining.ts';
import { completedStoneOpenings, pendingStoneOpenings, stoneMatter } from './scenarios/stone-balance.ts';

test('physical chunk hauling changes identity but conserves its typed stone',()=>{
  const world=miningCamp();
  expect(applyCommand(world,{type:'stockpile',x:13,z:12,enabled:true,filters:{wood:false,food:false,chunk:true},capacity:1}).ok).toBe(true);
  addGroundMaterial(world,'chunk',1,{x:11,z:12},'granite-chunk');
  const sourceId=world.piles.find(p=>p.kind==='chunk')!.id,initial=stoneMatter(world);
  expect(applyCommand(world,{type:'area',action:'haul-chunks',from:{x:11,z:12},to:{x:11,z:12}}).ok).toBe(true);
  for(let tick=0;tick<500&&!world.piles.some(p=>p.kind==='chunk'&&p.owner.type==='ground'&&p.owner.x===13&&p.owner.z===12);tick++){
    stepWorld(world);
    expect(stoneMatter(world)).toEqual(initial);
  }
  const stored=world.piles.find(p=>p.kind==='chunk'&&p.owner.type==='ground'&&p.owner.x===13&&p.owner.z===12);
  expect(stored).toBeDefined();
  expect(stored!.id).not.toBe(sourceId);
  expect(validateWorld(world)).toEqual([]);
});

test('a completed rock opening adds at most one typed chunk',()=>{
  const world=miningCamp(),index=12*world.width+12;
  world.tiles[index]={terrain:'rock',stone:'granite'};
  expect(applyCommand(world,{type:'designate',kind:'mine',x:12,z:12}).ok).toBe(true);
  const initial=stoneMatter(world);
  let opened=false;
  for(let tick=0;tick<1000&&!opened;tick++){
    const pending=pendingStoneOpenings(world);
    stepWorld(world);
    const completed=completedStoneOpenings(world,pending);
    if(completed.length){
      expect(completed).toEqual(['granite']);
      const gain=stoneMatter(world).granite-initial.granite;
      expect([0,20]).toContain(gain);
      opened=true;
    } else expect(stoneMatter(world)).toEqual(initial);
  }
  expect(opened).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});
