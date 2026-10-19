import {expect,test} from 'vitest';
import {refreshStock} from '../src/sim/materials';
import {validCapturedTravelDelay} from '../src/sim/captured-travel-delay';
import {createWorld,stepWorld} from '../src/sim/engine';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {initializeSnowSurface,setSnowDepth,snowFullCells,finishSnowStep} from '../src/sim/snow-surface';
import {snowHistoricalFieldsAbsent,validateSnowTransport} from '../src/sim/snow-save';
import {SnowSweepRuntime} from '../src/sim/snow-sweep';
import {snowCategory,snowCorePathCost,snowSearchCost,snowMeltPerVisit,snowVisitsPerLocalTick,compactedSnowDepth} from '../src/sim/snow-rules';
import {navigationCosts,furnitureDelay} from '../src/sim/furniture-travel';
import {startTravel} from '../src/sim/movement';
import {processSnowClearing} from '../src/sim/snow-clearing';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {NeedContext} from '../src/sim/needs';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
const fresh=()=>{const w=createWorld(42,16,16);initializeSnowSurface(w);return w;};
const target=(w:World)=>{const full=snowFullCells(w);return w.tiles.findIndex((t,i)=>!full.has(i)&&!['rock','water'].includes(t.terrain));};

test('snow thresholds retain Core costs and local timing without byte overflow',()=>{
 expect([.029,.03,.249,.25,.499,.5,.749,.75].map(snowCategory)).toEqual([0,1,1,2,2,3,3,4]);
 expect([.24,.25,.5,.75].map(snowCorePathCost)).toEqual([0,4,8,12]);expect([.25,.5,.75].map(snowSearchCost)).toEqual([133,267,400]);
 expect(snowVisitsPerLocalTick(250*250)).toBe(380);expect(snowMeltPerVisit(-1)).toBe(0);expect(snowMeltPerVisit(5)).toBeCloseTo(.0145);expect(snowMeltPerVisit(10)).toBeCloseTo(.058);
 expect(compactedSnowDepth(.5,.9)).toBe(.5);expect(compactedSnowDepth(.5,.90001)).toBe(.499);
});

test('bounded sweep melts before adding snow and preserves exact phase after runtime reconstruction',()=>{
 const cells=Array(256).fill(1),state={revision:1 as const,adoptedAt:0,lastTick:0,cursor:0,seed:12};
 const ports={width:16,height:16,depth:(i:number)=>cells[i]!,writeDepth:(i:number,v:number)=>{cells[i]=v;},retains:()=>true,roofed:()=>false,usesIndoorAir:()=>false,temperature:()=>10,snowRate:()=>1,changed:()=>{}};
 let sweep=new SnowSweepRuntime(state,ports);expect(sweep.advance(state,1).visited).toBe(10);expect(cells.filter(x=>x<1)).toHaveLength(10);expect(Math.min(...cells)).toBeGreaterThan(.942);
 const saved=structuredClone({cells,state});for(let tick=2;tick<=30;tick++)sweep.advance(state,tick);const expected=structuredClone({cells,state});
 cells.splice(0,cells.length,...saved.cells);Object.assign(state,saved.state);sweep=new SnowSweepRuntime(state,ports);for(let tick=2;tick<=30;tick++)sweep.advance(state,tick);expect({cells,state}).toEqual(expected);
});

test('strict 238 migration leaves the snow domain absent and rejects future spellings',()=>{
 const w=createWorld(42,16,16),old=JSON.parse(serializeWorld(w));
 for(const policy of old.apparelPolicies)policy.allowedItems=policy.allowedItems.filter((item:string)=>item!=='recon-armor'&&!item.endsWith('-tuque'));
 // The declared238 fixture precedes these default domains and permissions.
 // Prepare it before the explicit future-snow fields are injected below.
 delete old.worldMaps;delete old.worldGroups;delete old.deterioration;delete old.spoiled.pemmican;
 for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter((item:string)=>item!=='pemmican');
 // V238 already permits the base mental state, but not V256's wander state.
 for(const pawn of old.pawns)if(pawn.mental)delete pawn.mental.wander;
 old.schemaVersion=238;const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect('snow' in migrated).toBe(false);expect(migrated.pawns.every(p=>p.mental?.wander===undefined)).toBe(true);
 const futureMental=structuredClone(old);futureMental.pawns[0].mental.wander={revision:1,nextMoveOrderIsWait:false};expect(()=>deserializeWorld(JSON.stringify(futureMental))).toThrow(/Invalid mental state/);
 for(const key of ['snow','snowClearArea'])expect(snowHistoricalFieldsAbsent({...old,[key]:undefined},238)).toBe(false);
 old.tiles[0].snowDepth=.2;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
});

test('snow-only same-tick snapshots preserve old views, clear depth and reject malformed delta atomically',()=>{
 const w=fresh(),i=target(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const send=()=>structuredClone(encoder.encode(w,0,6));
 const initial=decoder.adopt(send());expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('checkpoint');
 setSnowDepth(w,i,.6123456789012345);const packet=send();expect(packet.kind).toBe('delta');if(packet.kind!=='delta')throw Error('delta');expect(packet.tiles?.some(t=>t[0]===i&&t[7]===.6123456789012345)).toBe(true);
 const bad=structuredClone(packet);bad.tiles![0]![7]=Infinity;expect(decoder.adopt(bad).status).toBe('resync');
 const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('snow rejected');expect(initial.world.tiles[i]!.snowDepth).toBeUndefined();expect(adopted.world.tiles[i]!.snowDepth).toBe(.6123456789012345);
 setSnowDepth(w,i,0);const empty=decoder.adopt(send());expect(empty.status).toBe('applied');if(empty.status!=='applied')throw Error('zero');expect('snowDepth' in empty.world.tiles[i]!).toBe(false);expect(adopted.world.tiles[i]!.snowDepth).toBe(.6123456789012345);
});

test('deep snow costs remain captured for current navigation and real movement compacts only once',()=>{
 const w=fresh(),p=w.pawns[0]!;w.structures=[];w.jobs=[];w.piles=[];w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));p.x=2;p.z=2;p.motion=null;p.moveCooldown=0;
 const next={x:3,z:2},i=next.z*w.width+next.x;setSnowDepth(w,i,.8);const nav=navigationCosts(w);expect(nav.floors.get(i)).toBe(400);expect(furnitureDelay(w,p,next)).toBeCloseTo(1.2);
 expect(startTravel(w,p,next)).toBe(true);const end=p.motion!.end;setSnowDepth(w,i,.6);expect(nav.floors.get(i)).toBe(400);expect(navigationCosts(w).floors.get(i)).toBe(267);expect(p.motion!.end).toBe(end);
 w.tick=Math.ceil(end);finishSnowStep(w,p);expect(w.tiles[i]!.snowDepth).toBeCloseTo(.599);finishSnowStep(w,p);expect(w.tiles[i]!.snowDepth).toBeCloseTo(.599);
});

test('prepared clearing pays real contact work, partial save resumes and a removed zone releases without clearing',()=>{
 const w=fresh(),p=w.pawns[0]!,i=target(w);p.x=i%w.width;p.z=Math.floor(i/w.width);p.motion=null;p.moveCooldown=0;p.priorities.clean=1;p.cleaning={targets:[],snowCell:i,forced:false,phase:'clean',progress:0};w.snowClearArea=[i];setSnowDepth(w,i,1);
 const context:NeedContext={search:()=>null,move:()=>{throw Error('contact already reached');},release:()=>true,event:()=>{}};
 processSnowClearing(w,p,p.cleaning,context);expect(w.tiles[i]!.snowDepth).toBe(1);expect(p.cleaning!.progress).toBeGreaterThan(0);
 const saved=deserializeWorld(serializeWorld(w)),copy=saved.pawns.find(q=>q.id===p.id)!;expect(copy.cleaning).toEqual(p.cleaning);
 delete saved.snowClearArea;processSnowClearing(saved,copy,copy.cleaning!,context);expect(copy.cleaning).toBeUndefined();expect(saved.tiles[i]!.snowDepth).toBe(1);
 for(let n=0;n<30&&p.cleaning;n++)processSnowClearing(w,p,p.cleaning,context);expect(w.tiles[i]!.snowDepth).toBeUndefined();expect(p.cleaning).toBeUndefined();
});

test('confirmed environment ticks persist and resume snow phase without retroactive activation',()=>{
 const w=fresh();stepWorld(w,12);expect(validateSnowTransport(w,239)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,12);stepWorld(copy,12);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});


test('snow movement captures save exactly and old schemas keep their closed delay domain',()=>{
 for(const cost of [.4,.8,1.2,4.4,4.8,5.2]){expect(validCapturedTravelDelay(cost,238)).toBe(false);expect(validCapturedTravelDelay(cost,239)).toBe(true);}
 const w=fresh(),p=w.pawns[0]!;const next={x:p.x+1,z:p.z},i=next.z*w.width+next.x;
 w.structures=[];w.jobs=[];w.piles=[];w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));
 setSnowDepth(w,i,.8);p.path=[];p.motion=null;p.moveCooldown=0;
 expect(startTravel(w,p,next)).toBe(true);
 expect(p.motion!.terrainDelay).toBe(1.2);refreshStock(w);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
