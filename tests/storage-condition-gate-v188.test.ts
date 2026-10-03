import { expect,test } from 'vitest';
import { applyCommand } from '../src/sim/engine.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { mayImproveStorage } from '../src/sim/idle-logistics.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { Cell,Command,MaterialPile,StockpileCell,StorageSettings,World } from '../src/sim/types.ts';
import type { WeaponQuality } from '../src/sim/equipment-rules.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

const ranks=['awful','poor','normal','good','excellent','masterwork','legendary'] as const;
// All subjects in this oracle are real cloth shirts: maximum HP is 100, so
// integer remaining HP equals the rounded percentage. No condition/cache,
// priority-selection or storage-admission helper is shared with the gate.
function accepts(zone:StockpileCell,pile:MaterialPile):boolean {
  expect(pile.item).toBe('cloth-shirt');expect(pile.apparel).toBeDefined();
  if(zone.filters.apparel!==true||zone.items!==undefined&&zone.items['cloth-shirt']!==true)return false;
  const state=pile.apparel!;
  if(zone.quality) {
    const rank=ranks.indexOf(state.quality);
    if(rank<ranks.indexOf(zone.quality.min)||rank>ranks.indexOf(zone.quality.max))return false;
  }
  return !zone.hitPoints||state.hitPoints>=zone.hitPoints.min&&state.hitPoints<=zone.hitPoints.max;
}
/** Exhaustive conservative gate, not an assertion that a route/reservation
 * exists. Every source/destination pair is visited, without grouping policy. */
function oracle(w:World):boolean {
  let result=false;
  for(const pile of w.piles)if(pile.owner.type==='ground'&&!pile.apparel?.forbidden) {
    const owner=pile.owner,source=w.stockpiles.find(z=>z.x===owner.x&&z.z===owner.z);
    const priority=source&&accepts(source,pile)&&pile.quantity<=source.capacity?source.priority:0;
    for(const destination of w.stockpiles) {
      const occupying=w.piles.find(p=>p.owner.type==='ground'&&p.owner.x===destination.x&&p.owner.z===destination.z);
      const room=Math.min(destination.capacity,1)>(occupying?.quantity??0);
      if(destination.priority>priority&&accepts(destination,pile)&&room&&(!occupying||occupying.item===pile.item))result=true;
    }
  }
  return result;
}
function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function zone(w:World,cell:Cell,settings:StorageSettings):StockpileCell {
  command(w,{type:'stockpile',enabled:true,...cell,filters:{wood:false,food:false,apparel:true},capacity:1,...settings});
  return w.stockpiles.find(z=>z.x===cell.x&&z.z===cell.z)!;
}
function shirt(w:World,cell:Cell,quality:WeaponQuality,hp:number,forbidden=false):MaterialPile {
  const pile:MaterialPile={id:w.nextId++,item:'cloth-shirt',kind:'apparel',quantity:1,owner:{type:'ground',x:cell.x,z:cell.z},
    apparel:{...newApparelState('cloth-shirt'),quality,hitPoints:hp,...forbidden?{forbidden:true as const}:{}}};
  w.piles.push(pile);return pile;
}
function check(w:World,label:string,expected?:boolean):boolean {
  refreshStock(w);const errors=validateWorld(w);expect(errors,`${label}: ${JSON.stringify(errors)}`).toEqual([]);
  const before=JSON.stringify(w),independent=oracle(w),actual=mayImproveStorage(w);
  expect(actual,label).toBe(independent);if(expected!==undefined)expect(actual,label).toBe(expected);
  expect(JSON.stringify(w),`${label}: pure gate must preserve World/PRNG`).toBe(before);return actual;
}
const policies:ReadonlyArray<{name:string;settings:StorageSettings}>=[
  {name:'absent ranges',settings:{}},
  {name:'quality only',settings:{quality:{min:'normal',max:'excellent'}}},
  {name:'good and intact',settings:{quality:{min:'good',max:'legendary'},hitPoints:{min:70,max:100}}},
  {name:'poor and damaged',settings:{quality:{min:'awful',max:'poor'},hitPoints:{min:1,max:49}}},
  {name:'overlapping middle',settings:{quality:{min:'normal',max:'good'},hitPoints:{min:40,max:80}}},
  {name:'excellent and damaged',settings:{quality:{min:'excellent',max:'masterwork'},hitPoints:{min:10,max:60}}},
];
const variants=['loose mixed states','refused high-priority source','highest cell full','highest category refused','highest item refused','forbidden loose objects'] as const;

test.each(policies)('policy grouping agrees with an exhaustive gate: $name (six prepared variants, same-tick edits)',({name,settings})=>{
  for(const [index,variant] of variants.entries()) {
    const w=deconstructionCamp(1),tick=w.tick;w.stockpiles=[];w.packed=[];w.growingZones=[];
    const low=zone(w,{x:14,z:10},{...settings,priority:1});
    const high=zone(w,{x:16,z:10},{...settings,priority:4});
    // A third, distinct policy must coexist with the duplicate low/high one.
    // Its lower priority cannot improve the valid source used by variants 2–4.
    zone(w,{x:18,z:10},settings.quality===undefined?{priority:1}:
      {priority:1,quality:{min:'excellent',max:'legendary'},hitPoints:{min:90,max:100}});
    let first:MaterialPile;
    if(index===1) {
      const source=zone(w,{x:4,z:4},{priority:4,quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
      command(w,{type:'stockpile',enabled:true,x:high.x,z:high.z,priority:3});
      first=shirt(w,source,'poor',30);shirt(w,{x:5,z:4},'normal',80,true);
    }else if(index>=2&&index<=4) {
      const source=zone(w,{x:4,z:4},{priority:2});first=shirt(w,source,'normal',80);
      shirt(w,{x:5,z:4},'poor',30,true);
      if(index===2)shirt(w,high,'masterwork',90,true);
      if(index===3)command(w,{type:'stockpile',enabled:true,x:high.x,z:high.z,filters:{wood:false,food:false,apparel:false}});
      if(index===4)command(w,{type:'stockpile',enabled:true,x:high.x,z:high.z,items:{'cloth-shirt':false}});
    }else {
      first=shirt(w,{x:4,z:4},'poor',30,index===5);shirt(w,{x:5,z:4},'normal',80,index===5);
    }
    const label=`${name}; ${variant}`;
    check(w,`${label}: initial`,index>=2?false:undefined);
    // Edit the same World repeatedly without advancing its tick: neither the
    // grouped policy nor the instance admission may survive a synchronous query.
    delete first.apparel!.forbidden;
    command(w,{type:'stockpile',enabled:true,x:low.x,z:low.z,priority:4,
      quality:{min:'awful',max:'legendary'},hitPoints:{min:0,max:100}});
    check(w,`${label}: newly admitted`,true);
    for(const destination of w.stockpiles)command(w,{type:'stockpile',enabled:true,x:destination.x,z:destination.z,
      filters:{wood:false,food:false,apparel:false}});
    check(w,`${label}: categories closed`,false);
    command(w,{type:'stockpile',enabled:true,x:low.x,z:low.z,filters:{wood:false,food:false,apparel:true},
      quality:{min:'poor',max:'poor'},hitPoints:{min:10,max:30}});
    first.apparel!.quality='poor';first.apparel!.hitPoints=30;
    check(w,`${label}: inclusive HP boundary`,true);
    first.apparel!.hitPoints=31;check(w,`${label}: same quality, changed HP`,false);
    first.apparel!.hitPoints=30;first.apparel!.quality='normal';check(w,`${label}: same HP, changed quality`,false);
    first.apparel!.quality='poor';check(w,`${label}: returned instance state`,true);
    first.apparel!.forbidden=true;check(w,`${label}: forbidden flag`,false);
    delete first.apparel!.forbidden;check(w,`${label}: permission restored`,true);
    expect(w.tick,label).toBe(tick);
  }
});
