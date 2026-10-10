/** Directed ownership and writer checks; no GPU or GAME qualification. */
import {test,expect} from 'vitest';
import {renderGroup} from 'three/tsl';
import {PawnLayer} from '../src/render/PawnLayer';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {localTimeSeconds} from '../src/bridge/clock-rate';
import {createWorld} from '../src/sim/index';
const pawnKeys=['time','travelTime','blend','cargoTime'] as const;
const owned=(node:any)=>{expect(node.getGroup()).toBe(renderGroup);const d=Object.getOwnPropertyDescriptor(node,'value');expect(d).toBeDefined();expect(d!.get).toBeUndefined();expect(d!.set).toBeUndefined();expect(d!.value).toBe(node.value);};

test('the four Pawn nodes retain separate ownership and plain writable scalar values',()=>{
  const a=new PawnLayer(),b=new PawnLayer();
  try{expect(new Set(pawnKeys.flatMap(k=>[a[k],b[k]])).size).toBe(8);
    for(const [i,k] of pawnKeys.entries()){owned(a[k]);owned(b[k]);a[k].value=i+.25;b[k].value=i+40.75;expect(a[k].value).toBe(i+.25);expect(b[k].value).toBe(i+40.75);}
  }finally{a.dispose();b.dispose();}
});

test('real Pawn travel and cargo writers preserve their distinct origins and do not alter World',()=>{
  const world=createWorld(42,32,32),before=JSON.stringify(world),layer=new PawnLayer(),timeline=new MotionTimeline();
  try{layer.update(world,.375,true);layer.time.value=2.25;layer.blend.value=.375;timeline.tick=1024.75;layer.updateTravel(world,timeline);layer.presentCargo(1031.5,world);
    expect(layer.travelTime.value).toBe(localTimeSeconds(1024.75,1024));expect(layer.time.value).toBe(2.25);expect(layer.blend.value).toBe(.375);expect(layer.cargoTime.value).toBe(localTimeSeconds(1031.5,1024));
    expect(JSON.stringify(world)).toBe(before);for(const k of pawnKeys)owned(layer[k]);
  }finally{layer.dispose();}
});

test('Wildlife shares only its travel clock while every species retains its own time and blend',()=>{
  const a=new WildlifeLayer(),b=new WildlifeLayer();
  try{const ar=(a as any).rigs,br=(b as any).rigs;expect(ar.length).toBeGreaterThan(1);owned(a.travelTime);owned(b.travelTime);expect(a.travelTime).not.toBe(b.travelTime);
    expect(new Set([...ar,...br].flatMap((r:any)=>[r.time,r.blend])).size).toBe(4*ar.length);
    for(const r of ar){expect(r.travelTime).toBe(a.travelTime);owned(r.time);owned(r.blend);}
    for(const r of br){expect(r.travelTime).toBe(b.travelTime);owned(r.time);owned(r.blend);}
  }finally{a.dispose();b.dispose();}
});

test('Wildlife real update reads its own clock and optional Pawn scalars without aliasing nodes',()=>{
  const world=createWorld(42,32,32),before=JSON.stringify(world),wild=new WildlifeLayer(),pawns=new PawnLayer(),timeline=new MotionTimeline();
  try{timeline.tick=2051.5;pawns.time.value=1.25;pawns.blend.value=.625;wild.update(world,timeline,true,pawns);
    expect(wild.travelTime.value).toBe(localTimeSeconds(2051.5,2048));
    for(const r of (wild as any).rigs){expect(r.time.value).toBe(1.25);expect(r.blend.value).toBe(.625);expect(r.time).not.toBe(pawns.time);expect(r.blend).not.toBe(pawns.blend);}
    timeline.tick=2052.25;wild.update(world,timeline,false);
    for(const r of (wild as any).rigs){expect(r.time.value).toBe(localTimeSeconds(2052.25)%(2*Math.PI));expect(r.blend.value).toBe(1);}
    expect(pawns.time.value).toBe(1.25);expect(pawns.blend.value).toBe(.625);expect(JSON.stringify(world)).toBe(before);
  }finally{wild.dispose();pawns.dispose();}
});
