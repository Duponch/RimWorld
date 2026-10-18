import {createWorld} from '../src/sim/index';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import type {World,Resource} from '../src/sim/types';

export function fixture():World {
 const world=createWorld(911,16,16);
 world.resources=[0,1].map<Resource>(index=>({id:world.nextId++,kind:'berries',x:index+2,z:2,amount:10,growth:.3+index/10,growthTick:world.tick}));
 world.piles=[{id:world.nextId++,kind:'wood',item:'wood',quantity:10,owner:{type:'ground',x:4,z:4}}];
 for(const index of [0,1,2+2*world.width,3+2*world.width])world.tiles[index]={terrain:'soil'};
 return world;
}
export function harness(world:World=fixture()) {
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),reader=new ResidentPresentationAssembler();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,1,checkpoint));
 const send=(checkpoint=false)=>{const result=reader.adopt(packet(checkpoint));if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};
 return {world,w:world,encoder,reader,packet,send};
}
export type Harness=ReturnType<typeof harness>;
