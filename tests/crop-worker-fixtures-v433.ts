import {SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {residentPublication,readResidentWorkerMessage} from '../src/bridge/resident-protocol';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import type {World} from '../src/sim/types';
/** Real fixed-lane encoder, sidecar, transport clone and product assembler. */
export function cropHarness(world:World){
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),producer=new WorkerNaturalAppearance(),reader=new ResidentVegetationAssembler();
 const packet=(checkpoint=false)=>{const view=campaignPresentation(world),publication=encoder.encode(view,0,1,checkpoint),natural=producer.capture(view,publication),value=readResidentWorkerMessage(structuredClone(residentPublication(publication,natural)));if(value.type!=='snapshot')throw Error('Expected snapshot');return value;};
 const send=(checkpoint=false)=>{const result=reader.adopt(packet(checkpoint));if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};
 return {world,encoder,producer,reader,packet,send};
}
