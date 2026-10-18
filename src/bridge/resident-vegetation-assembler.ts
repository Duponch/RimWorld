import type {World} from '../sim/types';
import type {CampaignOnlyMessage} from './protocol';
import type {SnapshotMessage,SnapshotAdoption} from './snapshots';
import {ResidentPresentationAssembler} from './resident-presentation-assembler';
import {readResidentNaturalSidecar} from './resident-protocol';
import {PreparedNaturalFrameOwner,type PreparedNaturalDraft} from './prepared-natural-frame';

/** Only the fixed v2 lane reaches this adapter. Public admission and saves keep
 * their literal readers. Nothing is stamped until the whole base transaction
 * (including urgent metadata/geography/native owners) has succeeded. */
export class ResidentVegetationAssembler extends ResidentPresentationAssembler {
 private readonly natural=new PreparedNaturalFrameOwner();
 override adopt(packet:SnapshotMessage<true>,acceptExtra?:(world:World)=>boolean):SnapshotAdoption {
  let draft:PreparedNaturalDraft|undefined;
  const result=super.adopt(packet,world=>{
   draft=this.natural.prepare(world,packet,readResidentNaturalSidecar(packet));
   return !!draft&&(!acceptExtra||acceptExtra(world));
  });
  if(result.status==='applied'){
   if(!draft)throw Error('Missing admitted natural frame');
   this.natural.commit(result.world,draft);
  }
  return result;
 }
 override adoptCampaignOnly(packet:CampaignOnlyMessage,acceptExtra?:(world:World)=>boolean):ReturnType<ResidentPresentationAssembler['adoptCampaignOnly']> {
  const result=super.adoptCampaignOnly(packet,world=>readResidentNaturalSidecar(packet)===null&&(!acceptExtra||acceptExtra(world)));
  if(result.status==='applied')this.natural.clear();return result;
 }
}
