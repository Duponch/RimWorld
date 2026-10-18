import type {Response,CampaignOnlyMessage} from './protocol';
import type {SnapshotMessage} from './snapshots';
import type {NaturalVisualDelta} from './natural-appearance-values';

/** Fixed presentation Worker only. No flag on a public SnapshotMessage grants
 * resident admission or a prepared-appearance capability. */
export interface ResidentPublication {
 readonly type:'resident-publication';readonly version:2;
 readonly publication:SnapshotMessage<true>|CampaignOnlyMessage;
 readonly natural:NaturalVisualDelta|null;
}
const naturalSidecars=new WeakMap<object,unknown>();
export function residentPublication(message:Response,natural?:NaturalVisualDelta):Response|ResidentPublication {
 if(message.type==='snapshot'){
  if(!natural)throw Error('Missing fixed Worker natural appearance');
  return {type:'resident-publication',version:2,publication:message,natural};
 }
 return message.type==='campaign-only'?{type:'resident-publication',version:2,publication:message,natural:null}:message;
}
/** @internal Read-only packet association established only by the fixed lane. */
export function readResidentNaturalSidecar(packet:SnapshotMessage<true>|CampaignOnlyMessage):unknown {return naturalSidecars.get(packet);}
export function readResidentWorkerMessage(value:unknown):Response {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid resident Worker message');
 const row=value as Record<string,unknown>,type=Object.getOwnPropertyDescriptor(row,'type');
 if(!type||!('value' in type)||!type.enumerable)throw Error('Invalid resident Worker discriminator');
 if(type.value==='snapshot'||type.value==='campaign-only')throw Error('Public publication on resident Worker lane');
 if(type.value!=='resident-publication')return value as Response;
 const keys=Reflect.ownKeys(row);
 if(keys.length!==4||keys.some(k=>typeof k!=='string'||!['type','version','publication','natural'].includes(k)
  ||Object.getOwnPropertyDescriptor(row,k)?.enumerable!==true||!Object.hasOwn(Object.getOwnPropertyDescriptor(row,k)!,'value')))throw Error('Invalid resident publication envelope');
 if(row.version!==2||!row.publication||typeof row.publication!=='object'||Array.isArray(row.publication))throw Error('Unsupported resident publication');
 const publication=row.publication as Record<string,unknown>,kind=Object.getOwnPropertyDescriptor(publication,'type');
 if(!kind||!Object.hasOwn(kind,'value')||kind.enumerable!==true||kind.value!=='snapshot'&&kind.value!=='campaign-only')throw Error('Invalid resident publication kind');
 if(kind.value==='campaign-only'&&row.natural!==null)throw Error('Natural appearance without local map');
 naturalSidecars.set(publication,row.natural);
 return publication as unknown as Response;
}
