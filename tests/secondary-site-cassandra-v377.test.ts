import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {groupMemberChoices} from '../src/sim/group-authority.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {BATTERY_ENERGY_SCALE,batteryQuanta} from '../src/sim/power-battery.ts';
import type {Command,Pawn,Structure,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason??JSON.stringify(c)).toBe(true);};
const until=(w:World,done:()=>boolean,limit=12000)=>{let n=0;while(!done()&&n++<limit)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,group:w.group?.phase,events:w.events.slice(-4)})).toBe(true);};

/** Actual Cassandra creation. Only terrain access, healthy/free actors and
 * eight finite ground rations are prepared; no production/research/route,
 * incident roll or disease is credited by this preparation. */
function expedition(){
  const w=createScenarioWorld(216,32,'crashlanded',{biome:'temperate-forest',hilliness:'small-hills'});
  expect(w.gameProfile?.storyteller).toBe('cassandra-partial');
  expect(w.raids?.profile).toBe('cassandra-raids-v1');expect(w.fluIncidents).toBeDefined();
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];w.packed=[];
  w.stockpiles=[];w.growingZones=[];w.growingCursor=0;w.piles=w.piles.filter(p=>p.owner.type!=='ground');
  for(const [i,p] of w.pawns.entries()){
    p.x=12+i*3;p.z=14;p.health=createMedicalRecord(w.tick);p.hunger=p.rest=p.mood=100;p.recreation.level=100;p.schedule.fill('anything');p.apparelAutomation=false;
    for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
  }
  addMaterial(w,'food',8,{type:'ground',x:13,z:20},'survival-meal');refreshStock(w);
  const ids=w.pawns.slice(0,2).map(p=>p.id);command(w,{type:'planet-adopt'});
  const tile=52;expect(w.planet!.tiles[w.planet!.homeTile]!.neighbours).toContain(tile);
  expect(w.planet!.tiles[tile]!.biome).toBe('temperate-forest');
  until(w,()=>ids.every(id=>groupMemberChoices(w).some(c=>c.pawn.id===id&&c.ok)));
  const food=w.piles.find(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&p.quantity>=8)!;
  command(w,{type:'group-start',memberIds:ids,destination:tile,sources:[{pileId:food.id,quantity:8}]});
  until(w,()=>w.group?.phase==='at-site');command(w,{type:'secondary-enter'});
  return {w,local:secondaryContext(w)!,ids,tile};
}

test('a real Cassandra expedition saves and decodes immediately on entry, with a prospective local disease clock',()=>{
  const {w,local,ids}=expedition(),enteredAt=w.tick;
  expect(local.gameProfile).toBe(w.gameProfile);expect(Object.hasOwn(w.secondarySite!.map,'gameProfile')).toBe(false);
  expect(local.fluIncidents).toMatchObject({profile:'cassandra-flu-v1',checks:0,fluDraws:0,episodes:0,cases:0});
  expect(local.fluIncidents!.nextCheck).toBeGreaterThan(enteredAt);
  expect(local.fluIncidents!.immuneDiseases).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
  const restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);
  expect(restored.secondarySite!.map.pawns.map(p=>p.id).sort()).toEqual([...ids].sort());
  const packet=structuredClone(new SnapshotEncoder().encode(campaignPresentation(w),0,0,true)),adopted=new SnapshotDecoder().adopt(packet);
  expect(adopted.status,adopted.status==='resync'?adopted.reason:'').toBe('applied');
  stepWorld(w);stepWorld(restored);
  expect(local.fluIncidents!.immuneDiseases).toMatchObject({adoptedAt:enteredAt+1,draws:0,episodes:0,cases:0});
  expect(serializeWorld(restored)).toBe(serializeWorld(w));
  // Deliberately partial: no raid/visitor producer was added by this fix.
  expect(local.raids).toBeUndefined();expect(local.visitors).toBeUndefined();
});

test('a prepared solar condition keeps its last five Core boundaries on both real maps before shared expiry',()=>{
  const {w,local}=expedition();
  // Condition/network checkpoint only, not evidence of a natural solar roll
  // or player construction. The first case covers complete save validity.
  const batteries:{battery:NonNullable<Structure['battery']>}[]=[];
  for(const map of [w,local]){
    const battery:Structure={id:map.nextId++,kind:'battery',x:10,z:10,orientation:0,footprint:'standard',material:'steel',battery:{stored:100*BATTERY_ENERGY_SCALE}},
      lamp:Structure={id:map.nextId++,kind:'standing-lamp',x:12,z:10,orientation:0,footprint:'standard',material:'steel',power:newPowerState('standing-lamp')};
    map.structures.push(battery,lamp);reconcilePower(map);expect(lamp.power!.parentId).not.toBeNull();lamp.power!.on=true;
    const roof:number[]=[];for(let z=10;z<=12;z++)for(let x=10;x<=13;x++)roof.push(z*map.width+x);
    map.roofing={constructed:roof,build:[],remove:[],cursor:0};batteries.push({battery:battery.battery!});
  }
  const start=Math.max(0,w.tick-900),endCore=w.tick*10+5;
  w.worldIncidents={profile:'cassandra-world-v1',adoptedAt:0,rng:377,nextCheck:90100,checks:0,opportunities:1,flares:1,lastStart:start,lastEndCore:endCore,active:{start,endCore}};
  flushSecondaryContext(w);stepWorld(w);
  const expected=100*BATTERY_ENERGY_SCALE-10*10-5*30*2;
  expect(batteryQuanta(batteries[0]!.battery)).toBe(expected);
  expect(batteryQuanta(batteries[1]!.battery)).toBe(expected);
  expect(w.worldIncidents!.active).toBeUndefined();expect(local.worldIncidents).toBe(w.worldIncidents);
});
