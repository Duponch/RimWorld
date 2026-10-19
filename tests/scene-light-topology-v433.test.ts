import {expect,test} from 'vitest';
import {SceneLightTopology} from '../src/render/SceneLightTopology';
import {RoomTopologyCache} from '../src/sim/room-topology';
import {EnvironmentLightField} from '../src/render/EnvironmentLightField';
import {newDoorState} from '../src/sim/door-rules';
import {harness} from './resident-presentation-fixtures-v427';

test('closed light topology follows exact confirmed barriers, skipped packets, overlaps and epochs',()=>{
  const h=harness(),w=h.world,prepared=new SceneLightTopology(),raw=new RoomTopologyCache();
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[
    {id:w.nextId++,kind:'wall',x:8,z:8,material:'wood',orientation:0,footprint:'standard'},
    {id:w.nextId++,kind:'door',x:8,z:8,material:'wood',orientation:0,footprint:'standard',door:newDoorState(w.tick)},
  ];
  const field=new EnvironmentLightField(prepared),literal=new EnvironmentLightField();
  const check=(v:typeof w)=>{
    const got=prepared.read(v),want=raw.read(v);
    for(let z=0;z<v.height;z++)for(let x=0;x<v.width;x++)expect(got.at(x,z)).toEqual(want.at(x,z));
    field.update(v);literal.update(v);expect(field.data).toEqual(literal.data);expect(field.bounds).toEqual(literal.bounds);
    return got;
  };
  let v=h.send(),first=check(v);
  w.tick++;w.structures[1]!.door!.open=true;v=h.send();expect(check(v)).toBe(first);
  w.tiles[30]!.snowDepth=.2;h.send();w.tiles[31]!.terrain='rock';v=h.send();check(v);
  w.tiles[31]!.terrain='grass';w.structures.reverse();v=h.send();check(v);
  w.structures[0]!.x=7;v=h.send();check(v);
  w.structures.push({id:w.nextId++,kind:'electric-crematorium',x:4,z:4,material:'steel',orientation:0,footprint:'standard'});check(h.send());
  w.structures[2]!.orientation=1;check(h.send());
  w.structures.splice(0,1);check(h.send());check(h.send(true));
  // Public mutable and repeated references always return to full recapture.
  const mutable=structuredClone(h.send());check(mutable);mutable.tiles[42]!.terrain='rock';check(mutable);
});

test('local checks skip full terrain reads but missing journal history recaptures',()=>{
  const h=harness(),reader=new SceneLightTopology();h.world.structures=[];
  reader.read(h.send());h.world.tick++;const next=h.send();
  let reads=0;const actual=next.tiles;
  next.tiles=new Proxy(actual,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
  reader.read(next);expect(reads).toBe(0);
  const raw=structuredClone({...next,tiles:actual});raw.tiles[7]!.terrain='rock';
  expect(reader.read(raw).at(7,0)?.kind).toBe('solid');
});
