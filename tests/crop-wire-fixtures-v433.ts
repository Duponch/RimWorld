import {SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {readResidentWorkerMessage,readResidentNaturalSidecar} from '../src/bridge/resident-protocol';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {createWorld} from '../src/sim/engine';
import type {World} from '../src/sim/types';

export function fixture():World {
 const world=createWorld(433,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.structures=[];world.growingZones=[];
 for(let i=0;i<3;i++)world.resources.push({id:world.nextId++,kind:'rice',x:5+i,z:5,amount:8,growth:.12345678901234568+i*.1,growthTick:world.tick});
 world.resources.push({id:world.nextId++,kind:'berries',x:8,z:6,amount:10,growth:.6,growthTick:world.tick});return world;
}
export function wireHarness(world=fixture()){
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),producer=new WorkerNaturalAppearance(),reader=new ResidentVegetationAssembler();
 const packet=(checkpoint=false)=>{const view=campaignPresentation(world),publication=encoder.encode(view,0,1,checkpoint),natural=producer.capture(view,publication),value=readResidentWorkerMessage(structuredClone({type:'resident-publication',version:2,publication,natural}));if(value.type!=='snapshot')throw Error('Expected snapshot');return value;};
 const send=(checkpoint=false)=>{const result=reader.adopt(packet(checkpoint));if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};return{world,encoder,producer,reader,packet,send};
}
