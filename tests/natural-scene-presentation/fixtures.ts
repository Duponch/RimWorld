import {expect} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../../src/bridge/snapshots';
import {readSnapshotChanges,readSnapshotResourceStructure} from '../../src/bridge/snapshot-changes';
import {NaturalResourcePresentation as Reference} from './NaturalResourcePresentation.reference';
import {NaturalResourcePresentation as Candidate} from '../../src/render/NaturalResourcePresentation';
import {createWorld} from '../../src/sim/index';
import {PLANT_LIFE_INTERVAL} from '../../src/sim/plant-life';
import {isResidentCrop} from '../../src/render/flora-presentation';
import type {World,Resource} from '../../src/sim/types';

// Small transport/query fixtures, not a played colony or native MessageEvent.
// Canonical encoder/decoder and journals are real; no fabricated receipt/stamp.
export function camp():World {
  const w=createWorld(233,32,32);w.resources=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));
  const add=(r:Omit<Resource,'id'>)=>w.resources.push({...r,id:w.nextId++});
  add({kind:'tree',species:'oak',x:2,z:3,amount:10,growth:.17,growthTick:0});
  add({kind:'tree',species:'pine',x:3,z:3,amount:10,growth:.29,growthTick:0});
  add({kind:'berries',species:'berry-bush',x:4,z:3,amount:10,growth:.64,growthTick:0});
  add({kind:'wild-plant',species:'grass',x:5,z:3,amount:2,growth:.3,growthTick:0});
  add({kind:'wild-plant',species:'tall-grass',x:6,z:3,amount:2,growth:.4,growthTick:0});
  add({kind:'tree',x:3,z:5,amount:10});
  add({kind:'berries',x:4,z:5,amount:10,growth:.64,growthTick:0});
  add({kind:'rock',stone:'granite',x:5,z:5,amount:10});
  for(const [i,kind]of (['rice','potato','corn','cotton'] as const).entries())
    add({kind,x:10+i,z:5,amount:8,growth:.2,growthTick:0});
  add({kind:'healroot',x:14,z:5,amount:1,growth:.25,growthTick:0});
  return w;
}
export function clock(w:World,tick:number):void {
  w.tick=tick;
  for(const r of w.resources)if(r.plantLife){
    r.plantLife.nextCheck=tick+(r.id-tick%PLANT_LIFE_INTERVAL+PLANT_LIFE_INTERVAL)%PLANT_LIFE_INTERVAL+1;
    r.plantLife.age=Math.max(0,r.plantLife.nextCheck-PLANT_LIFE_INTERVAL-r.plantLife.since);
  }
}
export type SceneResult=ReturnType<Candidate['readScene']>;
export function worldResult(value:SceneResult):value is World {
  return value!==undefined&&'resources' in value;
}
export function transport(w:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const expected=new WeakMap<object,World>();
  const packet=(checkpoint=false):SnapshotMessage<true>=>{
    const p=structuredClone(encoder.encode(w,0,6,checkpoint));expected.set(p,structuredClone(w));return p;
  };
  const accept=(p:SnapshotMessage<true>):World=>{
    const before=structuredClone(p),result=decoder.adopt(p);expect(p).toStrictEqual(before);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    const source=expected.get(p);if(source)expect(result.world).toStrictEqual(source);return result.world;
  };
  return {decoder,encoder,packet,accept,send:(checkpoint=false)=>accept(packet(checkpoint))};
}

export function harness(w:World){
  const t=transport(w),a=new Reference(),b=new Candidate();
  const held:Array<{world:World;before:World;view:World;viewBefore:World;reference:World;referenceBefore:World}>=[];
  const verify=()=>{for(const h of held){expect(h.world).toStrictEqual(h.before);
    expect(h.view).toStrictEqual(h.viewBefore);expect(h.reference).toStrictEqual(h.referenceBefore);}};
  const read=(next:World,reset=false,immutable=true,entry:'scene'|'public'='scene')=>{
    const before=structuredClone(next),expected=a.read(next,reset,immutable);
    const actual=entry==='scene'?b.readScene(next,reset,immutable):b.read(next,reset,immutable);
    expect([...b.changes]).toStrictEqual([...a.changes]);
    for(const [id,v]of b.changes){expect(v.resource).toBe(a.changes.get(id)!.resource);
      if(v.resource)expect(next.resources).toContain(v.resource);}
    if(actual!==undefined&&!worldResult(actual)){
      expect(Object.keys(actual)).toStrictEqual(['changed']);
      expect(actual.changed).toBe(expected!==undefined);
    }else{
      expect(actual).toStrictEqual(expected);
      if(actual&&expected){expect(actual.resources).not.toBe(next.resources);
        expect(actual.resources.map(r=>r.id)).toStrictEqual(next.resources.filter(r=>!isResidentCrop(r)).map(r=>r.id));
        actual.resources.forEach((r,i)=>expect(r).toBe(expected.resources[i]));
        if(immutable&&readSnapshotChanges(next,next))held.push({world:next,before,view:actual,viewBefore:structuredClone(actual),reference:expected,referenceBefore:structuredClone(expected)});}
    }
    expect(next).toStrictEqual(before);verify();return {actual,expected,changes:[...b.changes]};
  };
  return {...t,a,b,read,verify,held,readSnapshotChanges,readSnapshotResourceStructure};
}
