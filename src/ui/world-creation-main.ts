import type {WorldCreationCallbacks256,WorldCreationTicket256} from './world-creation-contract';
/** Main owns replacement lifecycle. The callback must verify the still-live
 * draft ticket before retaining its worker; load/recover keep their restart. */
export function createMainWorldCreationCallbacks256(backend:WorldCreationCallbacks256,main:{replaceConfirmedDraft:(ticket:WorldCreationTicket256,operation:()=>Promise<void>)=>Promise<void>;afterCreated:()=>void}):WorldCreationCallbacks256{
 return {
  generate:(request,context)=>backend.generate(request,context),
  confirmSite:request=>backend.confirmSite(request),
  async start(ticket,party,context){await main.replaceConfirmedDraft(ticket,()=>backend.start(ticket,party,context));main.afterCreated();},
 };
}
