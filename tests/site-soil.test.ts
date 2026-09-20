import { expect,test } from 'vitest';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { plantFertility,plantGrowth } from '../src/sim/plants.ts';
import { infectionRoomFactor } from '../src/sim/infection-room.ts';
import { soilFertility,isGrowingTerrain } from '../src/sim/soil.ts';
import type { Terrain,World } from '../src/sim/types.ts';

function field():World {
  const w=createWorld(42,16,16);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];
  w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;
  Object.assign(p,{x:3,z:3,hunger:100,rest:100});p.recreation.level=100;p.schedule.fill('anything');
  for(const work of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[work]=work==='grow'?1:0;
  const soils:Terrain[]=['grass','soil','rich-soil','gravel'];
  soils.forEach((terrain,i)=>{w.tiles[4*w.width+3+i]={terrain};});
  refreshStock(w);return w;
}

test('site soils support physical sowing and harvest, distinct growth, strict old saves and exact continuation',()=>{
  const w=field();
  expect(['grass','soil','rich-soil','gravel'].map(t=>soilFertility(t as Terrain))).toEqual([1,.7,1.4,.7]);
  expect(['rock','rough-stone','water'].every(t=>!isGrowingTerrain(t as Terrain))).toBe(true);
  expect(applyCommand(w,{type:'area',action:'growing',from:{x:3,z:4},to:{x:6,z:4}})).toMatchObject({ok:true,affected:4});
  let duringSow='';
  for(let i=0;i<600&&w.resources.length<4;i++){
    stepWorld(w);
    if(!duringSow&&w.jobs.some(j=>j.kind==='sow'&&j.reservedBy!==null))duringSow=serializeWorld(w);
  }
  expect(duringSow).not.toBe('');expect(w.resources.filter(r=>r.kind==='rice')).toHaveLength(4);
  expect(validateWorld(w)).toEqual([]);
  const a=deserializeWorld(duringSow),b=deserializeWorld(duringSow);stepWorld(a,100);stepWorld(b,100);
  expect(serializeWorld(a)).toBe(serializeWorld(b));
  const old=JSON.parse(duringSow);old.schemaVersion=82;
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/terrain/i);

  // A controlled common sowing instant isolates fertility from travel time.
  // The daylight integral and historical poor soil are left unchanged.
  const growth=deserializeWorld(serializeWorld(w));growth.tick=6000;
  for(const p of growth.resources){p.growth=.0001;p.growthTick=0;}
  const plants=[3,4,5,6].map(x=>growth.resources.find(p=>p.x===x)!);
  const gained=plants.map(p=>plantGrowth(growth,p)-.0001);
  expect(gained[2]!/gained[0]!).toBeCloseTo(1.4,12);
  expect(gained[3]!/gained[0]!).toBeCloseTo(.7,12);
  expect(gained[3]).toBe(gained[1]);
  expect(plants.map(p=>plantFertility(growth,p))).toEqual([1,.7,1.4,.7]);
  const matureAt=plants.map(p=>{
    let low=0,high=72000;
    while(low<high){const mid=Math.floor((low+high)/2);growth.tick=mid;if(plantGrowth(growth,p)>=1)high=mid;else low=mid+1;}
    return low;
  });
  expect(matureAt[2]!).toBeLessThan(matureAt[0]!);expect(matureAt[0]!).toBeLessThan(matureAt[3]!);
  expect(matureAt[3]).toBe(matureAt[1]);

  // Mature plants are a declared short fixture, not an accelerated colony run.
  for(const p of w.resources){p.growth=1;p.growthTick=w.tick;}
  expect(applyCommand(w,{type:'growing-policy',zoneId:w.growingZones[0]!.id,allowSow:false,allowCut:true}).ok).toBe(true);
  for(let i=0;i<600&&w.resources.length;i++)stepWorld(w);
  expect(w.resources).toEqual([]);expect(w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(24);
  expect(validateWorld(w)).toEqual([]);
  const after=deserializeWorld(serializeWorld(w));stepWorld(w,80);stepWorld(after,80);
  expect(serializeWorld(after)).toBe(serializeWorld(w));
});

test('new fertile terrain keeps the same dirt penalty in an enclosed treatment room',()=>{
  const w=field(),cell={x:9,z:9};
  for(let z=7;z<=11;z++)for(let x=7;x<=11;x++)if(x===7||x===11||z===7||z===11)
    w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  for(const terrain of ['grass','soil','rich-soil','gravel'] as const){
    for(let z=8;z<=10;z++)for(let x=8;x<=10;x++)w.tiles[z*w.width+x]={terrain};
    expect(infectionRoomFactor(w,cell)).toBe(600);
  }
  expect(infectionRoomFactor(w,{x:4,z:4})).toBe(1000);
});
