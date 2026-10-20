import {describe,expect,it} from 'vitest';
import {RoomBeautyInspection} from '../src/ui/room-beauty-inspection';
import {RoomQualityCapture} from '../src/sim/room-quality';
import {RoomTopologyCache} from '../src/sim/room-topology';
import {addFilth} from '../src/sim/filth';
import {sowDaylily} from '../src/sim/flower-pot';
import type {Cell,Job,Structure,World} from '../src/sim/types';
import {roomCamp} from './scenarios/rooms';

const left={x:13,z:13},right={x:17,z:13},distant={x:25,z:25};
function building(world:World,kind:Structure['kind'],cell:Cell,extra:Partial<Structure>={}):Structure {
  const result:Structure={id:world.nextId++,kind,...cell,orientation:0,footprint:'standard',...extra};
  world.structures.push(result);return result;
}
function frame(world:World,cell:Cell):Job {
  const result:Job={id:world.nextId++,kind:'table',...cell,orientation:0,footprint:'standard',construction:'frame',
    status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
  world.jobs.push(result);return result;
}
function fixture(){
  const world=roomCamp(),topologies=new RoomTopologyCache(),inspection=new RoomBeautyInspection();
  world.resources=[];world.piles=[];world.packed=[];world.jobs=[];delete world.filth;
  const read=(cell:Cell=left)=>{
    const before=JSON.stringify(world),topology=topologies.read(world);
    const actual=inspection.read(world,topology,cell);
    expect(actual).toEqual(new RoomQualityCapture(world,topology).room(cell));
    expect(JSON.stringify(world)).toBe(before);
    return actual!;
  };
  return {world,topologies,inspection,read};
}

describe('V439 — inspected room contributions stay local and current',()=>{
  it('ignores distant changes to floors, roofs, furniture, filth, piles, trees and frames',()=>{
    const {world,inspection,read}=fixture(),first=read(),tick=world.tick;
    world.tiles[distant.z*world.width+distant.x]!.floor='marble-tile';
    world.roofing={constructed:[distant.z*world.width+distant.x],build:[],remove:[],cursor:0};
    building(world,'table',distant,{material:'wood',quality:'good'});
    addFilth(world,distant,'blood');
    world.piles.push({id:world.nextId++,kind:'chunk',item:'slag-steel-chunk',quantity:1,owner:{type:'ground',...distant}});
    world.resources.push({id:world.nextId++,kind:'tree',...distant,amount:100});
    frame(world,distant);
    expect(read()).toBe(first);expect(inspection.rebuilds).toBe(1);expect(world.tick).toBe(tick);
    world.tiles=world.tiles.slice();
    expect(read()).toBe(first);expect(inspection.rebuilds).toBe(1);
  });

  it('observes floor, bridge and roof edits in place at a constant tick',()=>{
    const {world,inspection,read}=fixture(),first=read(),tile=world.tiles[left.z*world.width+left.x]!,tick=world.tick;
    tile.floor='marble-tile';const floored=read();expect(floored).not.toBe(first);expect(floored.wealth).toBeGreaterThan(first.wealth);
    tile.bridge=true;const bridged=read();expect(bridged.wealth).toBeGreaterThan(floored.wealth);
    // Coverage changes can leave every score equal, but remain a consumed input.
    world.roofing={constructed:[],build:[],remove:[],cursor:0};
    const beforeRoof=read();world.roofing.constructed.push(left.z*world.width+left.x);
    const roofed=read();expect(roofed).not.toBe(beforeRoof);expect(read()).toBe(roofed);
    expect(inspection.rebuilds).toBe(4);expect(world.tick).toBe(tick);
  });

  it('distinguishes slag from another chunk and ground from held ownership without multiplying stack quantity',()=>{
    const {world,read}=fixture(),first=read();
    const pile:World['piles'][number]={id:world.nextId++,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',...left}};
    world.piles.push(pile);const chunk=read();expect(chunk.total).toBe(first.total-4);expect(chunk.space).toBeLessThan(first.space);
    pile.item='slag-steel-chunk';const slag=read();expect(slag.total).toBe(chunk.total-4);expect(slag).not.toBe(chunk);
    pile.quantity=5;expect(read()).toBe(slag);
    pile.owner={type:'inventory',pawnId:world.pawns[0]!.id};const held=read();expect(held.total).toBe(first.total);expect(held.space).toBe(first.space);
  });

  it('tracks local quality, damage, living flowers and filth while preserving oracle addition order',()=>{
    const {world,read}=fixture(),first=read();
    const pot=building(world,'flower-pot',left,{material:'marble-blocks',quality:'good',flower:{allowSow:true,plant:sowDaylily(world.tick)}});
    const flower=read();expect(flower.total).toBeGreaterThan(first.total);
    pot.quality='legendary';const quality=read();expect(quality.wealth).toBeGreaterThan(flower.wealth);
    pot.damage=70;const damaged=read();expect(damaged.wealth).toBeLessThan(quality.wealth);
    pot.flower={...pot.flower!,plant:{...pot.flower!.plant!,hitPoints:0}};const deadFlower=read();expect(deadFlower.total).toBeLessThan(damaged.total);
    addFilth(world,left,'blood');const dirty=read();expect(dirty.cleanliness).toBeLessThan(deadFlower.cleanliness);
    world.structures.reverse();read();
  });

  it('uses current World when selecting another enclosure with unchanged topology',()=>{
    const {world,inspection,topologies,read}=fixture(),leftBefore=read(),topology=topologies.read(world);
    const current={...world,structures:world.structures.slice()};
    building(current,'table',right,{material:'wood',quality:'good'});
    expect(topologies.read(current)).toBe(topology);
    const other=inspection.read(current,topology,right)!;
    expect(other).toEqual(new RoomQualityCapture(current,topology).room(right));
    expect(other.wealth).toBeGreaterThan(new RoomQualityCapture(world,topology).room(right)!.wealth);
    const restored=inspection.read(world,topology,left)!;expect(restored).toEqual(leftBefore);
    expect(inspection.rebuilds).toBe(3);
  });

  it('tracks interior trees, frames, packed objects and shared doorway or diagonal boundary contributions',()=>{
    const {world,read}=fixture(),first=read();
    world.resources.push({id:world.nextId++,kind:'tree',...left,amount:100});
    const tree=read();expect(tree.space).toBeLessThan(first.space);
    const job=frame(world,{x:12,z:14});const framed=read();expect(framed.space).toBeLessThan(tree.space);
    job.construction='blueprint';const blueprint=read();expect(blueprint.space).toBe(tree.space);
    world.packed.push({building:{id:world.nextId++,kind:'stool',...distant,orientation:0,footprint:'standard'},owner:{type:'ground',...left}});
    const packed=read();expect(packed.total).toBe(blueprint.total-4);
    addFilth(world,{x:15,z:15},'vomit');const doorway=read();expect(doorway.cleanliness).toBeLessThan(packed.cleanliness);
    // A diagonal corner wall contributes its beauty, but is not a cardinal
    // doorway and contributes no cleanliness. Filth cannot be placed on walls.
    const corner=building(world,'wall',{x:10,z:10},{material:'wood'}),woodCorner=read();
    expect(woodCorner.cleanliness).toBe(doorway.cleanliness);
    corner.material='marble-blocks';const boundary=read();expect(boundary.total).toBe(woodCorner.total+1);
    expect(boundary.cleanliness).toBe(woodCorner.cleanliness);
    world.structures=world.structures.filter(s=>!(s.x===11&&s.z===10));expect(read()).toBeNull();
  });
});
