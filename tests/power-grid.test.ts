import { expect, test } from 'vitest';
import { miningCamp } from './scenarios/mining';
import { allowsWireConnection, isPowerConnector, isPowerTransmitter, sharesConstructionLayer, transmitsPowerNow } from '../src/sim/power-grid';
import { bestPowerParent, connectedPowerGroups, PowerTopologyCache, validPowerParent } from '../src/sim/power-topology';
import type { Orientation, Structure, StructureKind, World } from '../src/sim/types';

function part(w:World,id:number,kind:StructureKind,x:number,z:number,orientation:Orientation=0):Structure {
  const s:Structure={id,kind,x,z,orientation,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
  w.structures.push(s);return s;
}

test('cardinal bridge switches split a network while unpowered generators, batteries and their consumers retain physical connections',()=>{
  const w=miningCamp(0);w.structures=[];
  const generator=part(w,100,'wood-generator',2,2),left=part(w,101,'power-conduit',4,3);
  const bridge=part(w,102,'power-switch',5,3),right=part(w,103,'power-conduit',6,3);
  const battery=part(w,104,'battery',7,3),diagonal=part(w,105,'power-conduit',8,5);
  const lamp=part(w,106,'standing-lamp',11,3);lamp.power!.parentId=battery.id;
  const cache=new PowerTopologyCache(),joined=cache.read(w);
  expect(joined.groups).toEqual([[100,101,102,103,104],[105]]);
  expect(connectedPowerGroups(w,joined).map(group=>group.map(s=>s.id))).toEqual([[100,101,102,103,104,106],[105]]);
  expect(bestPowerParent(joined,lamp)).toBe(diagonal.id); // a NEW connection prefers distance² 13 over 16
  expect(lamp.power!.parentId).toBe(battery.id); // the existing, still-valid parent is retained
  expect(isPowerTransmitter(generator.kind)).toBe(true);
  expect(transmitsPowerNow(generator)).toBe(true); // power.on=false does not remove a wire
  expect(transmitsPowerNow(battery)).toBe(true);
  expect(validPowerParent(joined,{x:5,z:3},bridge.id)).toBe(false); // no remote wire to a switch
  expect(joined.wireParents.has(bridge.id)).toBe(false);

  bridge.power!.switchOn=false;
  const separated=cache.read(w);
  expect(separated.groups).toEqual([[100,101],[103,104],[105]]);
  expect(separated.cells.has(3*w.width+5)).toBe(false);
  expect(validPowerParent(separated,lamp,battery.id)).toBe(true); // attached to a now isolated island
  expect(connectedPowerGroups(w,separated).map(group=>group.map(s=>s.id))).toEqual([[100,101],[103,104,106],[105]]);
  expect(joined.groups).toEqual([[100,101,102,103,104],[105]]); // previous capture remains immutable

  // A real second path bypasses the open switch; diagonal contact alone never did.
  for(const [id,x,z] of [[110,4,4],[111,4,5],[112,5,5],[113,6,5],[114,6,4]])part(w,id!,'power-conduit',x!,z!);
  expect(cache.read(w).groups).toEqual([[100,101,103,104,110,111,112,113,114],[105]]);
  w.structures=w.structures.filter(s=>s!==left&&s!==right);
  expect(cache.read(w).groups).toEqual([[100],[104,110,111,112,113,114],[105]]);
  expect(diagonal.power!.parentId).toBe(null);
});

test('connector search uses square range and real transmitter footprints, with spatial ties and retained network exclusions',()=>{
  const w=miningCamp(0);w.structures=[];
  const conduit=part(w,210,'power-conduit',10,10),battery=part(w,220,'battery',24,10,2);
  const cache=new PowerTopologyCache(),topology=cache.read(w);
  expect(bestPowerParent(topology,{x:4,z:4})).toBe(conduit.id); // corner of square, beyond radius 6
  expect(validPowerParent(topology,{x:16,z:10},conduit.id)).toBe(true);
  expect(validPowerParent(topology,{x:17,z:10},conduit.id)).toBe(false); // no inherited 2x2 source extension
  expect(bestPowerParent(topology,{x:17,z:10})).toBe(null);
  expect(validPowerParent(topology,{x:24,z:3},battery.id)).toBe(true); // head z10, secondary cell z9
  expect(validPowerParent(topology,{x:24,z:2},battery.id)).toBe(false);
  expect(validPowerParent(topology,{x:24,z:17},battery.id)).toBe(false);

  const ties=miningCamp(0);ties.structures=[];
  part(ties,400,'power-conduit',8,10);part(ties,300,'power-conduit',12,10);
  part(ties,200,'power-switch',10,10); // closest object, deliberately not a connector parent
  const tied=new PowerTopologyCache().read(ties);
  expect(bestPowerParent(tied,{x:10,z:10})).toBe(400); // x ordering, not smallest ID
  expect(bestPowerParent(tied,{x:10,z:10},new Set([400]))).toBe(300);
  expect(bestPowerParent(tied,{x:10,z:10},new Set([400,300]))).toBe(null);

  const historical=miningCamp(0);historical.structures=[];
  const source=part(historical,500,'wood-generator',8,8);
  const legacy=new PowerTopologyCache().read(historical);
  expect(validPowerParent(legacy,{x:15,z:15},source.id)).toBe(true);
  expect(bestPowerParent(legacy,{x:15,z:15})).toBe(source.id);
  expect(validPowerParent(legacy,{x:16,z:9},source.id)).toBe(false);

  const solarWorld=miningCamp(0);solarWorld.structures=[];
  const solar=part(solarWorld,510,'solar-generator',8,8);
  const solarTopology=new PowerTopologyCache().read(solarWorld);
  expect(solarTopology.cells.size).toBe(16);
  expect(solarTopology.footprints.get(solar.id)).toEqual({minX:8,maxX:11,minZ:8,maxZ:11});
  expect(validPowerParent(solarTopology,{x:17,z:17},solar.id)).toBe(true);
  expect(bestPowerParent(solarTopology,{x:17,z:17})).toBe(solar.id);
  expect(validPowerParent(solarTopology,{x:18,z:11},solar.id)).toBe(false);
  part(solarWorld,511,'power-conduit',12,10);
  part(solarWorld,512,'power-conduit',12,12); // diagonal from occupied (11,11), no connection
  expect(new PowerTopologyCache().read(solarWorld).groups).toEqual([[510,511],[512]]);
});

test('topology captures only transmitting geometry and binds fresh structures after snapshot replacement',()=>{
  const w=miningCamp(0);w.structures=[];
  const generator=part(w,600,'wood-generator',4,4),bridge=part(w,601,'power-switch',6,5);
  const lamp=part(w,602,'standing-lamp',7,5);lamp.power!.parentId=generator.id;
  const cache=new PowerTopologyCache(),initial=cache.read(w);
  generator.power!.on=true;generator.power!.switchOn=false;
  lamp.power!.on=true;lamp.power!.switchOn=false;
  expect(cache.read(w)).toBe(initial);
  expect(cache.rebuilds).toBe(1);
  const copy=structuredClone(w);
  expect(cache.read(copy)).toBe(initial);
  const groups=connectedPowerGroups(copy,initial);
  expect(groups[0]![0]).toBe(copy.structures[0]);
  expect(groups[0]![0]).not.toBe(generator);
  expect(groups[0]![2]).toBe(copy.structures[2]);
  bridge.power!.switchOn=false;
  const opened=cache.read(w);
  expect(opened).not.toBe(initial);expect(cache.rebuilds).toBe(2);
  bridge.power!.switchOn=true;
  expect(cache.read(w).groups).toEqual(initial.groups);
  w.structures=w.structures.filter(s=>s!==generator);
  const removed=cache.read(w);
  expect(validPowerParent(removed,lamp,generator.id)).toBe(false);
  expect(bestPowerParent(removed,lamp)).toBe(null); // only a switch remains
});

test('conduit coexistence is symmetric, does not turn buildings into wires and never permits two transmitters on one cell',()=>{
  for(const consumer of ['standing-lamp','cooler','electric-stove']) {
    expect(isPowerConnector(consumer)).toBe(true);expect(isPowerTransmitter(consumer)).toBe(false);
  }
  for(const kind of ['wall','door','bed','standing-lamp','cooler','electric-stove','fueled-stove']) {
    expect(sharesConstructionLayer('power-conduit',kind),kind).toBe(false);
    expect(sharesConstructionLayer(kind,'power-conduit'),kind).toBe(false);
    expect(sharesConstructionLayer('power-switch',kind),kind).toBe(true);
  }
  for(const kind of ['power-conduit','power-switch','wood-generator','battery','solar-generator']) {
    expect(isPowerTransmitter(kind),kind).toBe(true);expect(isPowerConnector(kind),kind).toBe(false);
    expect(sharesConstructionLayer('power-conduit',kind),kind).toBe(true);
    expect(sharesConstructionLayer(kind,'power-conduit'),kind).toBe(true);
    expect(allowsWireConnection(kind),kind).toBe(kind!=='power-switch');
  }
  expect(sharesConstructionLayer('wall','door')).toBe(true);
  expect(isPowerTransmitter('unknown')).toBe(false);
});
