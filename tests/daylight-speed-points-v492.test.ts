import {afterEach,expect,test,vi} from 'vitest';
import {createWorld,applyCommand} from '../src/sim/engine.ts';
import {LightEnvironmentCache,lightSpeedFactor,type LightReader} from '../src/sim/light-environment.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {annualNaturalLight} from '../src/sim/environment.ts';
import {humanMoveSpeedFactor297} from '../src/sim/human-move-speed-297.ts';
import * as drafting from '../src/sim/drafting.ts';
import * as movement from '../src/sim/core-movement-297.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {TICKS_PER_DAY,type Cell,type World,type Structure} from '../src/sim/types.ts';
afterEach(()=>vi.restoreAllMocks());
// Point-light NUM fixtures: controlled read-only light inputs, not admitted SAVE,
// played stuns or Native authority. Complete valid Worlds are tested separately.
function world(day=true):World{const w=createWorld(492,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.resources=[];w.roofing={constructed:[],build:[],remove:[],cursor:0};delete w.climate;delete w.gameProfile;w.tick=day?TICKS_PER_DAY/2:0;return w;}
function speed(cache:LightEnvironmentCache,w:World,c:Cell):number{const fn=(cache as LightEnvironmentCache&{speedAt?:(w:World,c:Cell)=>number}).speedAt;return typeof fn==='function'?fn.call(cache,w,c):cache.read(w).speedAt(c);}
function reference(w:World,c:Cell):number{return new LightEnvironmentCache().read(w).speedAt(c);}
function structure(w:World,kind:Structure['kind'],x:number,z:number):Structure{const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard'};w.structures.push(s);return s;}
const point={x:5,z:5};

test('sun saturation is exact on space, rock, wall and doorway without a topology read',()=>{
 const w=world(),cache=new LightEnvironmentCache();w.tiles[4*w.width+4]!.terrain='rock';structure(w,'wall',5,5);const door=structure(w,'door',6,6);door.door=newDoorState(w.tick);door.material='wood';
 const cells=[{x:3,z:3},{x:4,z:4},{x:5,z:5},{x:6,z:6}],expected=cells.map(c=>reference(w,c)),read=vi.spyOn(RoomTopologyCache.prototype,'read');expect(annualNaturalLight(w)).toBeGreaterThanOrEqual(.3);
 expect(cells.map(c=>speed(cache,w,c))).toEqual(expected);expect(expected).toEqual([1,1,1,1]);expect(read).toHaveBeenCalledTimes(0);
 for(const glow of [.3,.30000000000000004,.5,1])expect(lightSpeedFactor(glow)).toBe(1);
});

test('invalid coordinates keep full-reader semantics rather than accidentally returning sunny1',()=>{
 const w=world(),cache=new LightEnvironmentCache();for(const cell of [{x:-1,z:0},{x:w.width,z:0},{x:0,z:w.height},{x:1.5,z:2},{x:NaN,z:0},{x:0,z:Infinity}]){expect(speed(cache,w,cell)).toBe(reference(w,cell));expect(speed(cache,w,cell)).toBe(.8);}
});

test('constructed, thin and thick roof membership includes deliberately unordered arrays',()=>{
 const w=world(),at=point.z*w.width+point.x;for(const kind of ['constructed','thin','thick'] as const){w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[]}};const cells=[at+2,at,at-2];if(kind==='constructed')w.roofing.constructed=cells;else w.roofing.natural![kind]=cells;const cache=new LightEnvironmentCache();expect(speed(cache,w,point)).toBe(reference(w,point));expect(speed(cache,w,point)).toBe(.8);}
});

test('roof intentions alone are not physical roof coverage',()=>{
 const w=world(),at=point.z*w.width+point.x;w.roofing!.build=[at];w.roofing!.remove=[at+1];expect(speed(new LightEnvironmentCache(),w,point)).toBe(reference(w,point));expect(reference(w,point)).toBe(1);
});

test('night and an actual eclipse formula retain the full fallback in cold and warm caches',()=>{
 const w=world(false),cache=new LightEnvironmentCache();expect(annualNaturalLight(w)).toBeLessThan(.3);expect(speed(cache,w,point)).toBe(reference(w,point));expect(speed(cache,w,point)).toBe(.8);
 w.tick=TICKS_PER_DAY/2;w.miscIncidents={...(w.miscIncidents??{}),weather:{...(w.miscIncidents?.weather??{}),eclipse:{start:w.tick-20,end:w.tick+5000}}} as NonNullable<World['miscIncidents']>;
 expect(annualNaturalLight(w)).toBe(0);expect(speed(cache,w,point)).toBe(reference(w,point));expect(speed(cache,w,point)).toBe(.8);
 delete w.miscIncidents!.weather!.eclipse;expect(speed(cache,w,point)).toBe(reference(w,point));
});

test('source and barrier changes remain fresh after sunny bypasses and later full reads',()=>{
 const w=world(),cache=new LightEnvironmentCache(),lamp=structure(w,'standing-lamp',5,5);lamp.power={on:true,parentId:null};expect(speed(cache,w,point)).toBe(reference(w,point));
 w.tick=0;for(const mutate of [()=>{},()=>{lamp.power!.on=false;},()=>{lamp.power!.on=true;lamp.x=7;},()=>{w.tiles[5*w.width+6]!.terrain='rock';},()=>{lamp.kind='glow-pod';},()=>{w.structures=[];}]){mutate();expect(speed(cache,w,point)).toBe(reference(w,point));}
 w.tick=TICKS_PER_DAY/2;expect(speed(cache,w,point)).toBe(reference(w,point));w.roofing!.constructed.push(point.z*w.width+point.x);expect(speed(cache,w,point)).toBe(reference(w,point));
});

test('cold night work is postponed rather than claimed eliminated by sunny reads',()=>{
 const w=world(),cache=new LightEnvironmentCache();expect(speed(cache,w,point)).toBe(1);expect(cache.localLight.rebuilds).toBe(0);
 w.tick=0;expect(speed(cache,w,point)).toBe(reference(w,point));expect(cache.localLight.rebuilds).toBe(1);expect(speed(cache,w,point)).toBe(reference(w,point));expect(cache.localLight.rebuilds).toBe(1);
});

test('default human speed uses the point path with exactly the full-reference arithmetic result',()=>{
 const w=world(),pawn=w.pawns[0]!,read=vi.spyOn(RoomTopologyCache.prototype,'read'),actual=humanMoveSpeedFactor297(w,pawn);expect(read).toHaveBeenCalledTimes(0);
 expect(actual).toBe(humanMoveSpeedFactor297(w,pawn,()=>new LightEnvironmentCache().read(w)));
});

test('a supplied dark reader without a point method stays authoritative in a sunny valid-coordinate context',()=>{
 const w=world(),pawn=w.pawns[0]!,dark=world(false),environment=new LightEnvironmentCache().read(dark);let calls=0;const custom:LightReader=()=>{calls++;return environment;};
 expect(environment.speedAt(pawn)).toBe(.8);expect(annualNaturalLight(w)).toBeGreaterThanOrEqual(.3);const actual=humanMoveSpeedFactor297(w,pawn,custom);expect(calls).toBe(1);expect(actual).toBe(humanMoveSpeedFactor297(w,pawn,()=>environment));
});

test('one callable reader and its same retained cache survive owner invalidation and macro reset',()=>{
 const w=world(false);expect(applyCommand(w,{type:'draft',pawnIds:w.pawns.map(p=>p.id),enabled:true}).ok).toBe(true);for(const pawn of w.pawns){pawn.moveCooldown=0;delete pawn.motion;pawn.path=[];pawn.draft!.target={x:pawn.x+1,z:pawn.z};}
 const callbacks:LightReader[]=[],realRead=LightEnvironmentCache.prototype.read,receivers:LightEnvironmentCache[]=[];vi.spyOn(drafting,'processDraft').mockImplementation((_w,_p,_g,_b,reader)=>{callbacks.push(reader);});vi.spyOn(LightEnvironmentCache.prototype,'read').mockImplementation(function(this:LightEnvironmentCache,...args:Parameters<LightEnvironmentCache['read']>){receivers.push(this);return Reflect.apply(realRead,this,args);});
 const owner=movement.createCoreMovement297(w);owner.advance();owner.invalidate();owner.beginMacro({remaining:8,pairs:32768});owner.advance();expect(callbacks.length).toBeGreaterThanOrEqual(2);
 for(const reader of callbacks){expect(reader).toBe(callbacks[0]);expect(typeof reader.speedAt).toBe('function');reader();}expect(new Set(receivers).size).toBe(1);
});
