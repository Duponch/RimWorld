import type {Response,CampaignOnlyMessage} from './protocol';
import type {SnapshotMessage} from './snapshots';
import type {NaturalVisualDelta} from './natural-appearance-values';
import type {ResidentAuxiliaryDelta,ResidentAuxiliaryPublication} from './resident-auxiliary-sections';

/** Fixed presentation Worker only. No flag on a public SnapshotMessage grants
 * resident admission or a prepared-appearance capability. */
export interface ResidentPublication {
 readonly type:'resident-publication';readonly version:2;
 readonly publication:SnapshotMessage<true>|CampaignOnlyMessage;
 readonly natural:NaturalVisualDelta|null;
}
const naturalSidecars=new WeakMap<object,unknown>();
const auxiliarySidecars=new WeakMap<object,unknown>();
export interface ResidentAuxiliaryEnvelope {
 /** v3 is still private/unpublished: auxiliary may contain the exact ordered
  * filth section. Missing filth selects explicit literal legacy handling. */
 readonly type:'resident-publication';readonly version:3;readonly publication:ResidentAuxiliaryPublication;
 readonly natural:NaturalVisualDelta;readonly auxiliary:ResidentAuxiliaryDelta;
}
export function residentPublication(message:Response,natural?:NaturalVisualDelta):Response|ResidentPublication;
export function residentPublication(message:ResidentAuxiliaryPublication,natural:NaturalVisualDelta,auxiliary:ResidentAuxiliaryDelta):ResidentAuxiliaryEnvelope;
export function residentPublication(message:Response|ResidentAuxiliaryPublication,natural?:NaturalVisualDelta,auxiliary?:ResidentAuxiliaryDelta):Response|ResidentPublication|ResidentAuxiliaryEnvelope {
 if(message.type==='snapshot'){
  if(!natural)throw Error('Missing fixed Worker natural appearance');
  if(auxiliary)return {type:'resident-publication',version:3,publication:message as ResidentAuxiliaryPublication,natural,auxiliary};
  return {type:'resident-publication',version:2,publication:message as SnapshotMessage<true>,natural};
 }
 return message.type==='campaign-only'?{type:'resident-publication',version:2,publication:message,natural:null}:message;
}
/** @internal Read-only packet association established only by the fixed lane. */
export function readResidentNaturalSidecar(packet:SnapshotMessage<true>|CampaignOnlyMessage):unknown {return naturalSidecars.get(packet);}
/** @internal This association is granted only by the fixed v3 envelope reader. */
export function readResidentAuxiliarySidecar(packet:SnapshotMessage<true>):unknown {return auxiliarySidecars.get(packet);}
export function readResidentWorkerMessage(value:unknown):Response {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid resident Worker message');
 const row=value as Record<string,unknown>,type=Object.getOwnPropertyDescriptor(row,'type');
 if(!type||!('value' in type)||!type.enumerable)throw Error('Invalid resident Worker discriminator');
 if(type.value==='snapshot'||type.value==='campaign-only')throw Error('Public publication on resident Worker lane');
 if(type.value!=='resident-publication')return value as Response;
 const keys=Reflect.ownKeys(row);
 const version=Object.getOwnPropertyDescriptor(row,'version');
 if(!version||!Object.hasOwn(version,'value')||!version.enumerable)throw Error('Invalid resident publication version');
 const fields=version.value===3?['type','version','publication','natural','auxiliary']:['type','version','publication','natural'];
 if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k)
  ||Object.getOwnPropertyDescriptor(row,k)?.enumerable!==true||!Object.hasOwn(Object.getOwnPropertyDescriptor(row,k)!,'value')))throw Error('Invalid resident publication envelope');
 if(row.version!==2&&row.version!==3||!row.publication||typeof row.publication!=='object'||Array.isArray(row.publication))throw Error('Unsupported resident publication');
 const publication=row.publication as Record<string,unknown>,kind=Object.getOwnPropertyDescriptor(publication,'type');
 if(!kind||!Object.hasOwn(kind,'value')||kind.enumerable!==true||kind.value!=='snapshot'&&kind.value!=='campaign-only')throw Error('Invalid resident publication kind');
 if(kind.value==='campaign-only'&&row.natural!==null)throw Error('Natural appearance without local map');
 if(row.version===3){if(kind.value!=='snapshot')throw Error('Auxiliary sections without local map');auxiliarySidecars.set(publication,row.auxiliary);}
 naturalSidecars.set(publication,row.natural);
 return publication as unknown as Response;
}
