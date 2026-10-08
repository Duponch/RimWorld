import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {adoptColonyEconomy} from '../src/sim/colony-economy.ts';
import {adoptMiscIncidents,advanceMiscIncidents,MISC_FIRST_CHECK,MISC_RAW_WEIGHT} from '../src/sim/cassandra-misc.ts';
import {adoptCropBlights,CROP_BLIGHT_COOLDOWN,cropBlightInitialChance,cropBlightIncidentPoints,cropBlightRadiusFactor,eligibleCropBlight,resolveSelectedCropBlight} from '../src/sim/crop-blight-incident.ts';
import {initializeHydroponicBasin} from '../src/sim/hydroponics.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {computeThreatPoints} from '../src/sim/threat-points.ts';
import {TICKS_PER_DAY,type Resource,type Structure,type World} from '../src/sim/types.ts';

function camp():World {
  const w=createWorld(270,32,32);w.schemaVersion=205;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];w.growingZones=[];w.stockpiles=[];w.events=[];
  w.gameProfile=crashlandedProfile();w.tick=MISC_FIRST_CHECK;adoptMiscIncidents(w);adoptCropBlights(w);
  return w;
}
function crop(w:World,kind:Resource['kind']='rice',x=10,z=10):Resource {
  const p:Resource={id:w.nextId++,kind,x,z,amount:6,growth:.5,growthTick:w.tick};w.resources.push(p);return p;
}
function next(seed:number):number {let n=seed>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;return n>>>0;}
function blightTicketSeed():number {
  for(let seed=1;seed<1_000_000;seed++){
    const category=next(seed),ticket=next(category)/2**32*MISC_RAW_WEIGHT;
    if(category/2**32<1/288&&ticket>=6.4&&ticket<6.7)return seed;
  }
  throw Error('No bounded selected-ticket fixture');
}

test('adoption is prospective, idempotent, and absent for historical schema/profile/calendar',()=>{
  const w=camp(),before=structuredClone(w);adoptCropBlights(w);expect(w).toEqual(before);
  expect(w.miscIncidents!.cropBlights).toEqual({adoptedAt:w.tick,count:0});
  delete w.miscIncidents!.cropBlights;w.schemaVersion=204 as World['schemaVersion'];adoptCropBlights(w);expect(w.miscIncidents!.cropBlights).toBeUndefined();
  w.schemaVersion=205;delete w.gameProfile;adoptCropBlights(w);expect(w.miscIncidents!.cropBlights).toBeUndefined();
  w.gameProfile=crashlandedProfile();delete w.miscIncidents;adoptCropBlights(w);expect(w.miscIncidents).toBeUndefined();
});

test('unsupported plants, invalid seeds and absent calendars refuse without mutation',()=>{
  const w=camp();crop(w,'tree');const seedling=crop(w);seedling.growth=0;
  expect(eligibleCropBlight(w)).toBe(false);expect(resolveSelectedCropBlight(w,1)).toBe(false);
  seedling.growth=.5;
  for(const seed of [-1,1.5,0x1_0000_0000,NaN]){const before=structuredClone(w);expect(resolveSelectedCropBlight(w,seed)).toBe(false);expect(w).toEqual(before);}
  delete w.miscIncidents!.cropBlights;const before=structuredClone(w);
  expect(eligibleCropBlight(w)).toBe(false);expect(resolveSelectedCropBlight(w,1)).toBe(false);expect(w).toEqual(before);
});

test('a successful incident owns a thirty-day cooldown, including the exact boundary',()=>{
  const w=camp();crop(w);expect(resolveSelectedCropBlight(w,1)).toBe(true);
  expect(w.miscIncidents!.cropBlights).toMatchObject({count:1,lastStart:w.tick});
  crop(w,'rice',9,10);w.tick+=CROP_BLIGHT_COOLDOWN-1;
  expect(eligibleCropBlight(w)).toBe(false);
  const before=structuredClone(w);expect(resolveSelectedCropBlight(w,2)).toBe(false);expect(w).toEqual(before);
  w.tick++;expect(eligibleCropBlight(w)).toBe(true);
  expect(resolveSelectedCropBlight(w,2)).toBe(true);expect(w.miscIncidents!.cropBlights!.count).toBe(2);
});

test('initial infection preserves array-root selection, culture and room boundaries',()=>{
  const w=camp(),root=crop(w),near=crop(w,'rice',9,10),otherKind=crop(w,'cotton',10,11),otherRoom=crop(w,'rice',12,10);
  for(let z=0;z<w.height;z++)w.structures.push({id:w.nextId++,kind:'wall',x:11,z,orientation:0,footprint:'standard',material:'wood'});
  expect(resolveSelectedCropBlight(w,1)).toBe(true);
  expect(root.blight).toBeDefined();expect(near.blight).toBeDefined();
  expect(otherKind.blight).toBeUndefined();expect(otherRoom.blight).toBeUndefined();
});

test('point/radius/chance curves preserve the Core knots and minimum envelope',()=>{
  expect([0,100,500,2000,10000].map(cropBlightRadiusFactor)).toEqual([.6,.6,1,2,2]);
  expect(cropBlightRadiusFactor(300)).toBeCloseTo(.8);expect(cropBlightRadiusFactor(1250)).toBeCloseTo(1.5);
  for(const factor of [.6,1,2]){
    expect(cropBlightInitialChance(8*factor,factor)).toBe(1);
    expect(cropBlightInitialChance(11*factor,factor)).toBeCloseTo(.3);
    expect(cropBlightInitialChance(11.01*factor,factor)).toBe(0);
  }
  const w=camp(),root=crop(w),beyond=crop(w,'rice',17,10);
  expect(cropBlightIncidentPoints(w)).toBe(35);expect(resolveSelectedCropBlight(w,1)).toBe(true);
  expect(root.blight).toBeDefined();expect(beyond.blight).toBeUndefined();
});

test('an adopted economy supplies the same threat points as the existing storyteller',()=>{
  const w=camp();adoptColonyEconomy(w);const economy=w.economy!;
  economy.wealth={...economy.wealth,knownStorytellerWealth:400000};economy.adaptationDays=30;
  const expected=computeThreatPoints({knownWealth:400000,freeColonists:w.pawns.length,colonistHealthSum:w.pawns.length,
    elapsedDays:w.tick/TICKS_PER_DAY,adaptationDays:30,seedBucket:Math.floor(w.tick/250)}).points;
  const before=structuredClone(w);expect(cropBlightIncidentPoints(w)).toBe(expected);expect(w).toEqual(before);
});

test('linked hydroponic crops remain eligible even with the pump off',()=>{
  const w=camp(),basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:4,z:4,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  w.structures.push(basin);initializeHydroponicBasin(w,basin);const p=crop(w,'rice',4,4);
  expect(basin.power!.on).toBe(false);expect(eligibleCropBlight(w)).toBe(true);
  expect(resolveSelectedCropBlight(w,123)).toBe(true);expect(p.blight).toBeDefined();
  expect(w.growingZones[0]!.basinId).toBe(basin.id);
});

test('deterministic private infection leaves World/calendar RNG and unrelated policies unchanged',()=>{
  const w=camp();crop(w);crop(w,'rice',12,10);crop(w,'rice',16,10);
  const copy=structuredClone(w),worldRng=w.rng,calendarRng=w.miscIncidents!.rng,policies=structuredClone(w.growingZones);
  expect(resolveSelectedCropBlight(w,987654)).toBe(true);expect(resolveSelectedCropBlight(copy,987654)).toBe(true);
  expect(w).toEqual(copy);expect(w.rng).toBe(worldRng);expect(w.miscIncidents!.rng).toBe(calendarRng);expect(w.growingZones).toEqual(policies);
  expect(w.events.at(-1)?.message).toContain('coupez les plantes malades');
});

test('the new ticket follows short circuit within the unchanged Misc envelope',()=>{
  const w=camp();crop(w);const state=w.miscIncidents!,seed=blightTicketSeed();state.rng=seed;state.nextCheck=w.tick;
  const worldRng=w.rng;advanceMiscIncidents(w);
  expect(MISC_RAW_WEIGHT).toBe(16.9);expect(state.opportunities).toBe(1);expect(state.cropBlights!.count).toBe(1);expect(w.rng).toBe(worldRng);
  expect(state.rng).toBe(next(next(next(seed))));
});

test('the same ticket on an old calendar remains consumed without adopting or drawing a plant seed',()=>{
  const w=camp();crop(w);const state=w.miscIncidents!,seed=blightTicketSeed();
  delete state.cropBlights;w.schemaVersion=204 as World['schemaVersion'];state.rng=seed;state.nextCheck=w.tick;
  advanceMiscIncidents(w);
  expect(state.cropBlights).toBeUndefined();expect(w.resources[0]!.blight).toBeUndefined();
  expect(state.rng).toBe(next(next(seed)));expect(state.opportunities).toBe(1);
});
