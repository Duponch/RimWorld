import {expect,test} from 'vitest';
import {enableRaids,advanceRaids} from '../src/sim/raids.ts';
import {createRaidGroup} from '../src/sim/raid-spawn.ts';
import {raidEntries} from '../src/sim/raid-space.ts';
import {raidRandom} from '../src/sim/raid-state.ts';
import {injurePawn} from '../src/sim/health.ts';
import {validateWorld} from '../src/sim/serialization.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

test('a pursuit waits for its original border instead of appearing on another open edge',()=>{
  const w=deconstructionCamp(3),preferred={x:4,z:0};
  for(let x=0;x<w.width;x++)w.tiles[x]={terrain:'water'};
  expect(raidEntries(w,42,1)).not.toBeNull();
  expect(raidEntries(w,42,1,preferred)).toBeNull();
  w.tiles[4]={terrain:'soil'};
  expect(raidEntries(w,42,1,preferred)).toEqual([preferred]);
});

test('prepared raid group commits real border people, gear, calendar and two timing draws together',()=>{
  const w=deconstructionCamp(3);enableRaids(w);
  const s=w.raids!,beforeId=w.nextId,random={rng:s.rng},oracle={rng:s.rng};
  const sites=raidEntries(w,s.rng,1)!;
  const deadline=w.tick+2600+Math.floor(raidRandom(oracle)*1201);
  const lossPermille=400+Math.floor(raidRandom(oracle)*301);
  const group=createRaidGroup(w,{count:1,sites,random})!;
  expect(group).toMatchObject({id:1,startedAt:w.tick,deadline,lossPermille,members:[beforeId],lost:[],phase:'assault'});
  expect(w.raids).toMatchObject({serial:1,rng:oracle.rng,nextCheck:null,active:group});
  expect(random.rng).toBe(oracle.rng);
  const enemy=w.pawns.find(p=>p.id===beforeId)!;
  expect(enemy).toMatchObject({faction:'outlaws',raid:{group:1,exiting:false,goal:null}});
  expect({x:enemy.x,z:enemy.z}).toEqual(sites[0]);
  expect(w.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===enemy.id).map(p=>p.item)).toEqual(['cloth-shirt']);
  expect(w.nextId).toBe(beforeId+2);
  expect(validateWorld(w)).toEqual([]);
});

test('capacity or invalid prepared sites refuse before identities, RNG, calendar, and event change',()=>{
  const w=deconstructionCamp(2);enableRaids(w);
  const sites=raidEntries(w,w.raids!.rng,1)!,random={rng:w.raids!.rng};
  const before=JSON.stringify(w),beforeRandom=random.rng;
  expect(createRaidGroup(w,{count:1,sites:[{x:-1,z:0}],random})).toBeNull();
  expect(JSON.stringify(w)).toBe(before);expect(random.rng).toBe(beforeRandom);
  const priorId=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;
  const atCapacity=JSON.stringify(w);
  expect(createRaidGroup(w,{count:1,sites,random})).toBeNull();
  expect(JSON.stringify(w)).toBe(atCapacity);expect(random.rng).toBe(beforeRandom);
  w.nextId=priorId;
  expect(createRaidGroup(w,{count:2,sites:[sites[0]!,sites[0]!],random})).toBeNull();
  expect(JSON.stringify(w)).toBe(before);expect(random.rng).toBe(beforeRandom);
});

test('a private incident draw can create the same physical group without consuming the raid calendar RNG',()=>{
  const w=deconstructionCamp(2);enableRaids(w);
  const calendarRng=w.raids!.rng,privateRandom={rng:0x31415926};
  const sites=raidEntries(w,calendarRng,1)!;
  expect(createRaidGroup(w,{count:1,sites,random:privateRandom,preserveCalendarRng:true})).not.toBeNull();
  expect(w.raids!.rng).toBe(calendarRng);
  expect(privateRandom.rng).not.toBe(0x31415926);
});

test('off-map scout still occupies registry capacity; refusal preserves all raid and quest draws',()=>{
  const w=deconstructionCamp(2,8);enableRaids(w);
  const site=raidEntries(w,w.raids!.rng,1)![0]!;
  const occupied=new Set(w.pawns.map(p=>p.z*w.width+p.x));
  const original=w.pawns[0]!;
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++){
    const key=z*w.width+x;
    if(key===site.z*w.width+site.x||occupied.has(key))continue;
    w.pawns.push({...structuredClone(original),id:w.nextId++,name:`Réservant ${key}`,x,z});
  }
  expect(w.pawns).toHaveLength(w.width*w.height-1);
  const traveler={...structuredClone(original),id:w.nextId++,name:'Voyageur',x:site.x,z:site.z};
  const food={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:2,owner:{type:'inventory' as const,pawnId:traveler.id}};
  w.scout={phase:'travelling',pawn:traveler,items:[food],foodPileId:food.id,quantity:2,startedAt:0,departedAt:0,returnAt:1500,consumed:0,entry:{...site}};
  expect(validateWorld(w)).toEqual([]);
  const random={rng:0x513fac11},before=JSON.stringify(w),rng=random.rng;
  expect(createRaidGroup(w,{count:1,sites:[site],random,preserveCalendarRng:true})).toBeNull();
  expect(JSON.stringify(w)).toBe(before);
  expect(random.rng).toBe(rng);
});

test('ordinary second raid keeps legacy revolver and failed start keeps the historic retry',()=>{
  const w=deconstructionCamp(3);enableRaids(w);
  w.raids!.nextCheck=1;w.tick=1;advanceRaids(w);
  const first=w.raids!.active!,firstRaider=w.pawns.find(p=>p.id===first.members[0])!;
  expect(w.piles.some(p=>p.kind==='weapon'&&'pawnId' in p.owner&&p.owner.pawnId===firstRaider.id)).toBe(false);
  injurePawn(w,firstRaider,'brain','crush',99000);advanceRaids(w);
  expect(w.raids!.last?.id).toBe(1);
  w.raids!.nextCheck=2;w.tick=2;
  advanceRaids(w);
  const second=w.raids!.active!,members=second.members;
  expect(second).toMatchObject({id:2,members:[expect.any(Number),expect.any(Number)],phase:'assault'});
  expect(w.piles.filter(p=>p.kind==='weapon'&&'pawnId' in p.owner&&members.includes(p.owner.pawnId)).map(p=>p.item)).toEqual(['revolver']);
  expect(second.deadline).toBeGreaterThanOrEqual(w.tick+2600);
  expect(second.deadline).toBeLessThanOrEqual(w.tick+3800);
  expect(second.lossPermille).toBeGreaterThanOrEqual(400);
  expect(second.lossPermille).toBeLessThanOrEqual(700);
  const blocked=deconstructionCamp(2);enableRaids(blocked);
  for(let z=0;z<blocked.height;z++)for(let x=0;x<blocked.width;x++)if(x===0||z===0||x===blocked.width-1||z===blocked.height-1)blocked.tiles[z*blocked.width+x]={terrain:'rock'};
  blocked.raids!.nextCheck=1;blocked.tick=1;
  const oldRng=blocked.raids!.rng,oldId=blocked.nextId;
  advanceRaids(blocked);
  expect(blocked.raids).toMatchObject({serial:0,rng:oldRng,nextCheck:blocked.tick+1500});
  expect(blocked.nextId).toBe(oldId);
});
