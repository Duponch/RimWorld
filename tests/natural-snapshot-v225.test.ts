import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {readSnapshotChanges} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentation as Reference} from './scenarios/natural-presentation-baseline-v224';
import {terrainTileChanges} from '../src/render/terrain-state';
import {createWorld,stepWorld} from '../src/sim/index';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import {deserializeWorld} from '../src/sim/serialization';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import type {World} from '../src/sim/types';

function harness(world:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const reference=new Reference(),candidate=new NaturalResourcePresentation();
  const views:{last?:World}={};
  const send=(replacement=false)=>{
    const result=decoder.adopt(structuredClone(encoder.encode(world,0,6,replacement)));
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.status).toBe('applied');
    expect(result.world).toStrictEqual(world);return result.world;
  };
  const read=(next:World,reset=false,immutable=true)=>{
    const before=JSON.stringify(next),expected=reference.read(next,reset,immutable),actual=candidate.read(next,reset,immutable);
    expect(actual===undefined).toBe(expected===undefined);
    expect(actual?.resources).toStrictEqual(expected?.resources);
    expect([...candidate.changes]).toStrictEqual([...reference.changes]);
    if(actual)views.last=actual;
    expect(JSON.stringify(next)).toBe(before);return candidate.changes.size;
  };
  return {send,read,views};
}

test('confirmed sparse edits, skipped revisions and same-tick commands retain natural shape order',()=>{
  const world=createWorld(225,32,32),{send,read}=harness(world);
  const initial=send();read(initial,true);
  const tree=world.resources.find(r=>r.kind==='tree')!;
  tree.species='oak'; // Growth belongs to a real flora plant, not a legacy inert tree.
  tree.growth=.11;tree.growthTick=world.tick;
  const skipped=send();
  tree.x=(tree.x+1)%world.width;
  const final=send();
  expect(readSnapshotChanges(initial,final)?.resourceIndices).toContain(world.resources.indexOf(tree));
  expect(read(final)).toBeGreaterThan(0);
  tree.amount+=1;read(send());
  expect(readSnapshotChanges(skipped,final)).toBeDefined();
  world.resources.reverse();read(send());
  world.resources=world.resources.filter(r=>r.id!==tree.id);read(send());
});

test('crop classification changes and mutable callers preserve the complete value fallback',()=>{
  const world=createWorld(225,32,32),{send,read}=harness(world);read(send(),true);
  const tree=world.resources.find(r=>r.kind==='tree')!;
  tree.kind='rice';delete tree.species;read(send());
  tree.kind='tree';tree.species='oak';read(send());
  const mutable=structuredClone(world);read(mutable,false,false);
  mutable.resources[0]!.x=(mutable.resources[0]!.x+1)%mutable.width;read(mutable,false,false);
  read(send());read(send(true),true);
  const beforeGap=send();read(beforeGap);
  world.resources[0]!.amount++;
  for(let i=0;i<65;i++)send();
  const afterGap=send();expect(readSnapshotChanges(beforeGap,afterGap)).toBeUndefined();read(afterGap);
});

test('silent patches update current references without borrowing a previous view array',()=>{
  const world=createWorld(226,32,32),{send,read,views}=harness(world);read(send(),true);
  const first=views.last!,firstValue=structuredClone(first);
  const [silent,visible]=world.resources.filter(r=>r.kind==='tree');
  expect(silent).toBeDefined();expect(visible).toBeDefined();
  silent!.amount++;expect(read(send())).toBe(0);
  visible!.species='oak';visible!.growth=.1;visible!.growthTick=world.tick;
  const changed=send();expect(read(changed)).toBeGreaterThan(0);
  expect(views.last!.resources.find(r=>r.id===silent!.id)).toBe(changed.resources.find(r=>r.id===silent!.id));
  expect(first).toStrictEqual(firstValue);
  const exposed=views.last!;exposed.resources.reverse();exposed.resources.pop();
  visible!.growth=.8;const next=send();expect(read(next)).toBeGreaterThan(0);
  expect(views.last!.resources.map(r=>r.id)).toStrictEqual(next.resources.filter(r=>!['rice','potato','corn','cotton'].includes(r.kind)).map(r=>r.id));
});

test('confirmed plants enter and leave the timed partition and retain exact leaf expiry',()=>{
  const world=createWorld(227,32,32),tree=world.resources.find(r=>r.kind==='tree')!;
  tree.species='oak';tree.growth=1;tree.growthTick=world.tick;expect(adoptSiteClimate(world)).toBe(true);
  const {send,read}=harness(world);read(send(),true);
  const at=(tick:number)=>{
    world.tick=tick;
    for(const r of world.resources)if(r.plantLife){
      const life=r.plantLife;
      while(life.nextCheck<=tick)life.nextCheck+=PLANT_LIFE_INTERVAL;
      life.age=Math.max(0,life.nextCheck-PLANT_LIFE_INTERVAL-life.since);
    }
  };
  tree.growth=.1;read(send());
  tree.growth=1;read(send());
  const phase=(tree.id+1)%PLANT_LIFE_INTERVAL;at(phase);tree.plantLife!.leaflessAt=phase;
  read(send());at(phase+5999);read(send());at(phase+6000);expect(read(send())).toBeGreaterThan(0);
  delete tree.plantLife!.leaflessAt;const final=send();read(final);
  read({...final,tick:final.tick+1});
});

test('terrain journals compose intervening edits exactly and retain unknown/mutable fallbacks',()=>{
  const world=createWorld(225,32,32),{send}=harness(world),initial=send();
  world.tiles[3]!.terrain='grass';send();world.tiles[5]!.terrain='soil';const final=send();
  const expected=final.tiles.flatMap((tile,i)=>initial.tiles[i]!==tile?[i]:[]);
  expect(terrainTileChanges(initial,final,true)).toStrictEqual(expected);
  const clone=structuredClone(final);expect(readSnapshotChanges(initial,clone)).toBeUndefined();
  expect(terrainTileChanges(initial,clone)).toStrictEqual(clone.tiles.map((_,i)=>i));
});

test('real corrected Aulnes continuation retains every natural change and accepted World',async()=>{
  const world=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v224/les-aulnes-sieges.json','utf8')));
  const {send,read}=harness(world);read(send(),true);
  let changed=0;
  for(let tick=0;tick<48;tick++){
    stepWorld(world);const next=send();
    if(tick%3===2)changed+=read(next);
  }
  // The comparison covers both silent plant-life patches and any visible work.
  expect(Number.isSafeInteger(changed)).toBe(true);
});
