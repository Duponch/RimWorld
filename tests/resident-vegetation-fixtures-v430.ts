import type {SnapshotMessage} from '../src/bridge/snapshots';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {residentPublication,readResidentWorkerMessage,type ResidentPublication} from '../src/bridge/resident-protocol';
import type {NaturalVisualDelta} from '../src/bridge/natural-appearance-values';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import type {World} from '../src/sim/types';
import {fixture} from './resident-presentation-fixtures-v427';

export type VegetationEnvelope430=ResidentPublication&{publication:SnapshotMessage<true>;natural:NaturalVisualDelta};
/** Actual encoder, current-value Worker observer, structured clone, fixed lane
 * and assembler. No test-only frame registration or numerical packet oracle. */
export function vegetationHarness(world:World=fixture()) {
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),producer=new WorkerNaturalAppearance(),reader=new ResidentVegetationAssembler();
 const envelope=(checkpoint=false):VegetationEnvelope430=>{
  const view=campaignPresentation(world),publication=encoder.encode(view,0,1,checkpoint),natural=producer.capture(view,publication);
  return structuredClone(residentPublication(publication,natural)) as VegetationEnvelope430;
 };
 const unwrap=(value:VegetationEnvelope430):SnapshotMessage<true>=>{
  const result=readResidentWorkerMessage(value);if(result.type!=='snapshot')throw Error('Expected local publication');return result;
 };
 const packet=(checkpoint=false)=>unwrap(envelope(checkpoint));
 const send=(checkpoint=false):World=>{const result=reader.adopt(packet(checkpoint));if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};
 return {world,w:world,encoder,producer,reader,envelope,unwrap,packet,send};
}
