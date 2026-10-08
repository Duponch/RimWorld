import {expect,test} from 'vitest';
import {startShortCircuitDischarge} from '../src/sim/bomb-system.ts';
import {advanceWorldProjectiles} from '../src/sim/projectile-system.ts';
import {BOMB_RADIUS,bombCellCore,validBombWaveShape,validateBombWaves,type MiniTurretBombWave} from '../src/sim/bomb-state.ts';
import {captureBombCells} from '../src/sim/bomb-cells.ts';
import {miniTurretExplosive} from '../src/sim/bomb-eligibility.ts';
import {reconcileTemperature} from '../src/sim/temperature.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {fixtureBuilding,deconstructionCamp} from './scenarios/deconstruction.ts';
import type {Structure,World} from '../src/sim/types.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';

/** Explosion transport fixtures bypass selection/drain, which have their own
 * incident tests. Reports bind the captured source and geometry explicitly. */
function fixture():{w:World;source:Structure} {
  const w=deconstructionCamp(0,40);w.tick=30100;w.gameProfile=crashlandedProfile();
  const source:Structure={id:w.nextId++,kind:'power-conduit',x:20,z:20,orientation:0,footprint:'standard',material:'steel',power:newPowerState('power-conduit')};
  w.structures.push(source);
  w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:123,nextCheck:30200,introDone:true,
    checks:1,opportunities:1,heatwaves:0,shortCircuits:{adoptedAt:30099,count:0}};
  return {w,source};
}
function emit(w:World,source:Structure,radius:number):MiniTurretBombWave[] {
  const bomb=radius>3.5?radius*.3:undefined;
  expect(startShortCircuitDischarge(w,source,radius,bomb,266)).toBe(true);
  w.miscIncidents!.shortCircuits={adoptedAt:30099,count:1,lastStart:w.tick,last:{at:w.tick,conduitId:source.id,
    center:{x:source.x,z:source.z},energyWd:(radius/.05)**2,flameRadius:radius,...bomb!==undefined?{bombRadius:bomb}:{},outcome:'discharge'}};
  return w.bombWaves!;
}
function advance(w:World,ticks=1):void {for(let i=0;i<ticks;i++){w.tick++;advanceWorldProjectiles(w);}}
function validWaves(w:World):void {const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toEqual([]);}

test('discharge reserves Flame then Bomb identities, retaining its living conduit and both RNG streams',()=>{
  const {w,source}=fixture(),id=w.nextId,rng=w.rng,before=JSON.stringify(w.fires);
  const waves=emit(w,source,5);
  expect(waves.map(wave=>[wave.id,wave.shortCircuit!.damage])).toEqual([[id,'flame'],[id+1,'bomb']]);
  expect(w.nextId).toBe(id+2);expect(w.structures).toContain(source);expect(source.damage).toBeUndefined();
  expect(w.rng).toBe(rng);expect(JSON.stringify(w.fires)).toBe(before);
  expect(waves.every(wave=>wave.sourceId===source.id&&wave.startedAtCore===w.tick*10&&wave.nextCell===0)).toBe(true);validWaves(w);
});

test('maximum Flame has the full radial footprint beyond the historical eighty-one-cell bound',()=>{
  const {w,source}=fixture(),waves=emit(w,source,14.9),flame=waves[0]!;
  const expected:number[]=[];
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if((x-source.x)**2+(z-source.z)**2<=14.9**2)expected.push(z*w.width+x);
  expect([...flame.cells].sort((a,b)=>a-b)).toEqual(expected);expect(flame.cells.length).toBeGreaterThan(81);
  for(let i=1;i<flame.cells.length;i++)expect(bombCellCore(w,flame,flame.cells[i]!)).toBeGreaterThanOrEqual(bombCellCore(w,flame,flame.cells[i-1]!));
  expect(validBombWaveShape(flame,201)).toBe(true);expect(validBombWaveShape(flame,200)).toBe(false);validWaves(w);
});

test('invalid radii, relation, seed, owner and exhausted IDs refuse before every mutation',()=>{
  const {w,source}=fixture();
  for(const [flame,bomb,seed] of [[1.49,undefined,266],[15,4.5,266],[3.5,1.05,266],[4,undefined,266],[4,1.3,266],[4,1.2,0],[4,1.2,0x100000000]] as const) {
    const before=JSON.stringify(w);expect(startShortCircuitDischarge(w,source,flame,bomb,seed)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  }
  const before=JSON.stringify(w);expect(startShortCircuitDischarge(w,{...source},5,1.5,266)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  w.nextId=Number.MAX_SAFE_INTEGER;const full=JSON.stringify(w);
  expect(startShortCircuitDischarge(w,source,5,1.5,266)).toBe(false);expect(JSON.stringify(w)).toBe(full);
});

test('radius three-point-five creates only Flame and damages a multi-cell Thing exactly once',()=>{
  const {w,source}=fixture(),table:Structure=fixtureBuilding(w,'table-long',21,20);table.material='wood';
  const wave=emit(w,source,3.5)[0]!;expect(w.bombWaves).toHaveLength(1);advance(w);
  expect(table.damage).toBe(10);expect(wave.damagedThingKeys.filter(key=>key===`structure:${table.id}`)).toHaveLength(1);
  expect(source.damage).toBe(7);expect(w.structures).toContain(source);validWaves(w);
});

test('the captured LOS remains closed after a wall is destroyed by the Bomb wave',()=>{
  const {w,source}=fixture(),wall:Structure=fixtureBuilding(w,'wall',21,20);wall.material='steel';wall.damage=101;
  const waves=emit(w,source,5),behind=20*w.width+22;
  expect(waves.every(wave=>!wave.cells.includes(behind))).toBe(true);advance(w);
  expect(w.structures).not.toContain(wall);expect(waves.every(wave=>!wave.cells.includes(behind))).toBe(true);validWaves(w);
});

test('a source under a complete edifice still captures its origin without exposing the lower layer',()=>{
  const {w,source}=fixture(),wall:Structure=fixtureBuilding(w,'wall',20,20);wall.material='steel';
  const waves=emit(w,source,1.5);expect(waves[0]!.cells).toContain(20*w.width+20);advance(w);
  expect(source.damage).toBeUndefined();expect(wall.damage).toBe(4);validWaves(w);
});

test('retired conduit provenance binds the report rather than a turret identity heuristic',()=>{
  const {w,source}=fixture();emit(w,source,5);advance(w);
  expect(w.structures).not.toContain(source);validWaves(w);
  const correct=JSON.stringify(w.miscIncidents!.shortCircuits!.last);w.miscIncidents!.shortCircuits!.last!.center.x++;
  const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toContain('Invalid short-circuit wave provenance.');
  w.miscIncidents!.shortCircuits!.last=JSON.parse(correct);validWaves(w);
});

test('malformed peer waves and report centers produce validation errors without throwing',()=>{
  const {w,source}=fixture();emit(w,source,5);
  const corruptions:Array<(world:World)=>void>=[
    world=>{Object.assign(world.bombWaves!,{1:null});},
    world=>{Object.assign(world.bombWaves!,{1:{shortCircuit:{damage:'bomb'}}});},
    world=>{Reflect.deleteProperty(world.miscIncidents!.shortCircuits!.last!,'center');},
    world=>{Object.assign(world.miscIncidents!.shortCircuits!.last!,{center:null});},
    world=>{Object.assign(world.miscIncidents!.shortCircuits!.last!,{center:'invalid'});},
    world=>{Object.assign(world.miscIncidents!.shortCircuits!,{last:null});},
  ];
  for(const corrupt of corruptions){
    const bad:World=JSON.parse(JSON.stringify(w));corrupt(bad);const errors:string[]=[];
    expect(()=>validateBombWaves(bad,errors)).not.toThrow();expect(errors.length).toBeGreaterThan(0);
  }
});

test('heat is committed at emission to the source room using fifteen and five per captured cell',()=>{
  const {w,source}=fixture();
  for(let z=18;z<=22;z++)for(let x=18;x<=22;x++)if(x===18||x===22||z===18||z===22){const wall:Structure=fixtureBuilding(w,'wall',x,z);wall.material='steel';}
  w.roofing={constructed:[19,20,21].flatMap(z=>[19,20,21].map(x=>z*w.width+x)),build:[],remove:[],cursor:0};
  const layout=reconcileTemperature(w),room=w.thermal!.regions[layout.indices[20*w.width+20]!]!;room.temperature=21;
  const count=room.cells.length,waves=emit(w,source,5),expected=21+(15*waves[0]!.cells.length+5*waves[1]!.cells.length)/count;
  expect(w.thermal!.regions.find(region=>region.cells.includes(20*w.width+20))!.temperature).toBeCloseTo(expected,12);
});

test('mid-wave JSON continuation preserves every cursor, identity, fire draw and physical consequence',()=>{
  const {w,source}=fixture();emit(w,source,14.9);advance(w);validWaves(w);
  expect(w.bombWaves!.some(wave=>wave.nextCell<wave.cells.length)).toBe(true);
  const resumed:World=JSON.parse(JSON.stringify(w));advance(w);advance(resumed);expect(resumed).toEqual(w);validWaves(w);
  advance(w);advance(resumed);expect(resumed).toEqual(w);advance(w);advance(resumed);expect(resumed).toEqual(w);
  expect(w.bombWaves).toBeUndefined();
});

test('Flame uses mechanical Heat armor with zero penetration and retains the weapon RNG',()=>{
  const {w,source}=fixture(),mech:Mechanoid={id:w.nextId++,mechKind:'scyther',x:21,z:20,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};
  w.mechanoids=[mech];const rng=w.rng,wave=emit(w,source,3.5)[0]!;advance(w);
  expect(mech.health?.injuries).toEqual([]);expect(mech.state).toBe('idle');expect(w.rng).toBe(rng);
  expect(wave.damagedThingKeys.filter(key=>key===`mech:${mech.id}`)).toHaveLength(1);
});

test('historical turret geometry, shape ceiling and retired explosive-source rule remain unchanged',()=>{
  const {w,source}=fixture(),center={x:source.x,z:source.z};
  expect(captureBombCells(w,center)).toEqual(captureBombCells(w,center,BOMB_RADIUS,false));
  let sourceId=w.nextId++;while(!miniTurretExplosive(sourceId))sourceId=w.nextId++;
  const wave:MiniTurretBombWave={id:w.nextId++,sourceId,center,startedAtCore:w.tick*10,advancedAtCore:w.tick*10,
    cells:captureBombCells(w,center),nextCell:0,damagedThingKeys:[]};
  w.bombWaves=[wave];expect(validBombWaveShape(wave,193)).toBe(true);expect(wave.cells.length).toBeLessThanOrEqual(81);validWaves(w);
  wave.sourceId=source.id;const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toContain('Invalid bomb wave ownership/clock.');
});
