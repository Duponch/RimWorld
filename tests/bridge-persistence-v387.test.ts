import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {validBridgeTile,validateBridgeTransport} from '../src/sim/bridge-rules.ts';
import {terrainTravelDelay} from '../src/sim/furniture-travel.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {PresentationChanges} from '../src/bridge/presentation-changes.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {destroyBridge,removeBridge} from '../src/sim/bridge.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

test('246→247 validates both OLD maps before neutral bump and rejects every future bridge spelling including false, jobs and misplaced object fields',()=>{
  const {w}=preparedCassandraExpedition();(w as {schemaVersion:number}).schemaVersion=246;
  const old=JSON.parse(JSON.stringify(w)),before=JSON.stringify(w);expect(deserializeWorld(before)).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  for(const side of ['home','secondary'] as const)for(const bridge of [false,true]){
    const future=structuredClone(w),map=side==='home'?future:future.secondarySite!.map;(map.tiles[0] as unknown as Record<string,unknown>)={terrain:'marsh',bridge};
    expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version246/);expect(future.schemaVersion).toBe(246);expect(validateWorld(future).length).toBeGreaterThan(0);
  }
  for(const side of ['home','secondary'] as const){
    const future=structuredClone(w),map=side==='home'?future:future.secondarySite!.map;
    map.tiles[0]={terrain:'marsh'};map.jobs.push({id:future.nextId++,kind:'build-bridge',x:0,z:0,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},construction:'blueprint'});
    expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version246/);
  }
  expect(JSON.stringify(w)).toBe(before);expect(validBridgeTile({terrain:'marsh',bridge:true},247)).toBe(true);
  expect(validBridgeTile({terrain:'water',bridge:true},247)).toBe(false);expect(validBridgeTile({terrain:'marsh',floor:'wood-planks',bridge:true},247)).toBe(false);
  const {world:wrong}=bridgeWorkshopV387(16);wrong.structures.push({id:wrong.nextId++,kind:'power-conduit',x:2,z:2,orientation:0,footprint:'standard',material:'steel'});
  (wrong.structures[0] as unknown as Record<string,unknown>).bridge=true;expect(validateBridgeTransport(wrong,247,[])).toEqual(['Foundation cannot be a building or packed object.']);
});

test('a real wet motion paused in246 survives migration literally; future bridge commands cannot mutate an old world',()=>{
  const {world:w,pawnId,bridgeCell,bankEast}=bridgeWorkshopV387(32),p=w.pawns[0]!;
  expect(applyCommand(w,{type:'draft',pawnIds:[pawnId],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[pawnId],target:bankEast,queue:false}).ok).toBe(true);
  for(let i=0;i<300&&!(p.motion?.terrainDelay===3&&p.motion.end>w.tick);i++)stepWorld(w);
  expect(p.motion?.terrainDelay).toBe(3);const captured=structuredClone(p.motion);(w as {schemaVersion:number}).schemaVersion=246;
  const old=JSON.stringify(w),current=deserializeWorld(old);expect(current.pawns[0]!.motion).toEqual(captured);expect(current).toEqual({...JSON.parse(old),schemaVersion:247});
  const before=JSON.stringify(w);expect(applyCommand(w,{type:'designate',kind:'build-bridge',...bridgeCell}).ok).toBe(false);expect(applyCommand(w,{type:'area',action:'build-bridge',from:bridgeCell,to:bridgeCell}).affected??0).toBe(0);expect(JSON.stringify(w)).toBe(before);
});

test('same World/same tick uses a true bridge delta, rejects false without adoption, and later disappearance removes the optional field exactly',()=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');w.tiles[i]!.bridge=true;
  const built=structuredClone(encoder.encode(w,0,0));expect(built.kind).toBe('delta');if(built.kind!=='delta')throw Error('Expected incremental bridge delta');expect(built.tiles!.find(t=>t[0]===i)?.[8]).toBe(true);
  const adopted=decoder.adopt(built);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected bridge adoption');expect(adopted.world.tiles[i]).toEqual({terrain:'marsh',bridge:true});const preserved=serializeWorld(adopted.world);
  (w.tiles[i] as unknown as Record<string,unknown>).bridge=false;const falseDelta=structuredClone(encoder.encode(w,0,0));expect(falseDelta.kind).toBe('delta');expect(decoder.adopt(falseDelta).status).toBe('resync');expect(serializeWorld(adopted.world)).toBe(preserved);
  // Reinitialise only the transport after its rejected packet, retaining the
  // same authoritative World. The disappearance itself must be a real delta.
  w.tiles[i]!.bridge=true;const e2=new SnapshotEncoder(),d2=new SnapshotDecoder();expect(d2.adopt(structuredClone(e2.encode(w,0,0))).status).toBe('applied');delete w.tiles[i]!.bridge;
  const gone=structuredClone(e2.encode(w,0,0));expect(gone.kind).toBe('delta');const removed=d2.adopt(gone);expect(removed.status).toBe('applied');if(removed.status!=='applied')throw Error('Expected disappearance');expect(removed.world.tiles[i]).toEqual({terrain:'marsh'});expect(terrainTravelDelay(removed.world,i)).toBe(3);
});

test('old full snapshots and old incremental envelopes refuse future bridge true/false, and actual removal emits a presentation event at its confirmed tick',()=>{
  for(const bridge of [false,true]){
    const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;(w as {schemaVersion:number}).schemaVersion=246;
    const e=new SnapshotEncoder(),d=new SnapshotDecoder();expect(d.adopt(structuredClone(e.encode(w,0,0))).status).toBe('applied');(w.tiles[i] as unknown as Record<string,unknown>).bridge=bridge;
    const delta=structuredClone(e.encode(w,0,0));
    expect(delta.kind).toBe('delta');expect(d.adopt(delta).status).toBe('resync');
    const full=structuredClone(new SnapshotEncoder().encode(w,0,0));expect(new SnapshotDecoder().adopt(full).status).toBe('resync');
  }
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),i=bridgeCell.z*w.width+bridgeCell.x;w.tiles[i]!.bridge=true;
  expect(applyCommand(w,{type:'designate',kind:'remove-bridge',...bridgeCell}).ok).toBe(true);const changes=new PresentationChanges();changes.capture(w);expect(changes.capture(w)).toBe(false);
  expect(removeBridge(w,w.jobs.at(-1)!)).toBe(true);expect(changes.capture(w)).toBe(true);expect(w.events.at(-1)).toMatchObject({tick:w.tick,message:'Pont retiré ; 6 bois récupérés et marais révélé.'});
});

test('secondary destruction preview keeps campaign authority and current pre-flush local arrays while preserving the home map',()=>{
  const {w}=preparedCassandraExpedition(),local=secondaryContext(w)!,home=JSON.stringify({tiles:w.tiles,structures:w.structures,piles:w.piles,pawns:w.pawns});
  const index=local.tiles.findIndex((t,i)=>['grass','soil','rich-soil','gravel'].includes(t.terrain)&&!t.floor&&!t.snowDepth&&!local.resources.some(r=>r.z*local.width+r.x===i)&&!local.pawns.some(p=>p.z*local.width+p.x===i)&&!local.structures.some(s=>s.z*local.width+s.x===i));
  expect(index).toBeGreaterThanOrEqual(0);const cell={x:index%local.width,z:Math.floor(index/local.width)};
  local.tiles=local.tiles.map((t,i)=>i===index?{terrain:'marsh',bridge:true}:t); // Real local producer can replace arrays before flush.
  local.structures=[...local.structures,{id:local.nextId++,kind:'sleeping-spot',...cell,orientation:0,footprint:'standard'}];
  expect(destroyBridge(local,cell,'bomb',35)).toBe(true);expect(local.tiles[index]).toEqual({terrain:'marsh'});expect(local.structures.some(s=>s.kind==='sleeping-spot'&&s.x===cell.x&&s.z===cell.z)).toBe(false);
  flushSecondaryContext(w);expect(JSON.stringify({tiles:w.tiles,structures:w.structures,piles:w.piles,pawns:w.pawns})).toBe(home);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
