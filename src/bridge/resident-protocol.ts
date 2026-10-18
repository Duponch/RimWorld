import type {Response,CampaignOnlyMessage} from './protocol';
import type {SnapshotMessage} from './snapshots';

/** A separate fixed Worker entry emits this lane. This is a transport version,
 * not permission attached to a public SnapshotMessage. The public client and
 * SnapshotDecoder never select their refusal frontier from a packet flag. */
export interface ResidentPublication {
 readonly type:'resident-publication';
 readonly version:1;
 readonly publication:SnapshotMessage<true>|CampaignOnlyMessage;
}
export function residentPublication(message:Response):Response|ResidentPublication {
 return message.type==='snapshot'||message.type==='campaign-only'
  ? {type:'resident-publication',version:1,publication:message}:message;
}
/** Invoked only by the closed MAIN client paired with presentation.worker. */
export function readResidentWorkerMessage(value:unknown):Response {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid resident Worker message');
 const row=value as Record<string,unknown>;
 const type=Object.getOwnPropertyDescriptor(row,'type');
 if(!type||!('value' in type)||!type.enumerable)throw Error('Invalid resident Worker discriminator');
 if(type.value==='snapshot'||type.value==='campaign-only')throw Error('Public publication on resident Worker lane');
 if(type.value!=='resident-publication')return value as Response;
 const keys=Reflect.ownKeys(row);
 if(keys.length!==3||keys.some(k=>typeof k!=='string'||!['type','version','publication'].includes(k)
  ||Object.getOwnPropertyDescriptor(row,k)?.enumerable!==true||!Object.hasOwn(Object.getOwnPropertyDescriptor(row,k)!,'value')))throw Error('Invalid resident publication envelope');
 if(row.version!==1||!row.publication||typeof row.publication!=='object'||Array.isArray(row.publication))throw Error('Unsupported resident publication');
 const publication=row.publication as Record<string,unknown>;
 const discriminator=Object.getOwnPropertyDescriptor(publication,'type');
 if(!discriminator||!Object.hasOwn(discriminator,'value')||discriminator.enumerable!==true
  ||discriminator.value!=='snapshot'&&discriminator.value!=='campaign-only')throw Error('Invalid resident publication kind');
 return publication as unknown as Response;
}
