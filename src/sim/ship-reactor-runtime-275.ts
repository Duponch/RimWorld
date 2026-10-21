import {isSchema275OrLater} from './schema-compatibility-257.ts';
import {isShipPartKind276} from './ship-part-content-276.ts';
import {indexShipParts276,connectedShipParts276} from './ship-part-reader-276.ts';
import {validShipHullBuilding276} from './ship-part-save-276.ts';
import {shipReactorEndCore275,isShipReactor275,validShipReactorCommand275,validShipReactorState275,type ShipReactor275,type ShipReactorCommand275,type ShipReactorState275} from './ship-reactor-state-275.ts';
import {validShipReactorBuilding275} from './ship-reactor-save-275.ts';
import type {World,CommandResult} from './types.ts';

export type ShipReactorStartPlan275={ok:false;reason:string}|{ok:true;reactorIds:readonly number[];current():boolean;commit():boolean};
export type ShipReactorStartView275={ok:false;reason:string}|{ok:true;reactorIds:number[]};
const fail=(reason:string):Extract<ShipReactorStartPlan275,{ok:false}>=>({ok:false,reason});
const coreNow=(w:World):number|undefined=>Number.isSafeInteger(w.tick)&&w.tick>=0&&Number.isSafeInteger(w.tick*10)?w.tick*10:undefined;

/** At command time only: adjacency from the completed parts' actual cells.
 * No terrain walk or graph work on a physical/render frame. */
function connectedHibernating(w:World,id:number):ShipReactor275[]|undefined {
 const now=coreNow(w);if(!isSchema275OrLater(w.schemaVersion)||now===undefined)return;
 for(const s of w.structures)if(isShipPartKind276(s.kind)
  &&(!validShipReactorBuilding275(s,w.schemaVersion,w,now)||!validShipHullBuilding276(s,w.schemaVersion,w)))return;
 const built=indexShipParts276(w.structures,w.width,w.height);if(!built.ok||built.index.get(id)?.kind!=='ship-reactor')return;
 const connected=connectedShipParts276(built.index,id);if(!connected.ok)return;
 return connected.parts.map(p=>p.source).filter(isShipReactor275).filter(s=>!Object.hasOwn(s,'shipReactor275'));
}

/** Capture original edges too: replacing a nested component at equal value
 * cannot make an old prepared transaction current again. */
function originalSeal(v:object):()=>boolean {
 const keys=Reflect.ownKeys(v),proto=Object.getPrototypeOf(v),extensible=Object.isExtensible(v);
 const fields=keys.map(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return {k,d,child:d.value&&typeof d.value==='object'?originalSeal(d.value):undefined};});
 return ()=>Object.getPrototypeOf(v)===proto&&Object.isExtensible(v)===extensible&&Reflect.ownKeys(v).length===keys.length&&fields.every(({k,d,child})=>{
  const next=Object.getOwnPropertyDescriptor(v,k);return !!next&&next.value===d.value&&next.enumerable===d.enumerable&&next.writable===d.writable&&next.configurable===d.configurable&&next.get===d.get&&next.set===d.set&&(!child||child());
 });
}

/** Pure inspection/confirmation preview; no prepared transaction or mutation. */
export function readShipReactorStart275(w:World,reactorId:number):ShipReactorStartView275 {
 const selected=connectedHibernating(w,reactorId),now=coreNow(w);
 if(!selected||now===undefined)return {ok:false,reason:'Réacteur stellaire réel introuvable ou invalide.'};
 if(!selected.length)return {ok:false,reason:'Toutes les pièces reliées de ce réacteur ont déjà démarré.'};
 if(shipReactorEndCore275(now)===undefined)return {ok:false,reason:'L’échéance du réacteur dépasse l’horloge conservable.'};
 return {ok:true,reactorIds:selected.map(s=>s.id)};
}

/** Pure preview/preflight. No colonist job, electricity gate, resource, ID,
 * PRNG draw or clock advancement belongs to the native activation gizmo. */
export function prepareShipReactorStart275(w:World,reactorId:number,confirmedIds?:readonly number[]):ShipReactorStartPlan275 {
 const selected=connectedHibernating(w,reactorId),now=coreNow(w);
 if(!selected||now===undefined)return fail('Réacteur stellaire réel introuvable ou invalide.');
 if(!selected.length)return fail('Toutes les pièces reliées de ce réacteur ont déjà démarré.');
 const ids=selected.map(s=>s.id);
 if(confirmedIds&&(confirmedIds.length!==ids.length||confirmedIds.some((id,i)=>id!==ids[i])))return fail('Les réacteurs reliés ont changé : confirmez à nouveau le démarrage.');
 const end=shipReactorEndCore275(now);if(end===undefined)return fail('L’échéance du réacteur dépasse l’horloge conservable.');
 if(selected.some(s=>!Object.isExtensible(s)))return fail('Le réacteur ne peut pas recevoir son état de démarrage.');
 const array=w.structures,originals=[...array],version=w.schemaVersion,tick=w.tick,width=w.width,height=w.height,nextId=w.nextId;
 const parts=array.filter(s=>isShipPartKind276(s.kind)),seals=parts.map(originalSeal);let used=false;
 const current=()=>!used&&w.schemaVersion===version&&w.tick===tick&&w.width===width&&w.height===height&&w.nextId===nextId&&w.structures===array
  &&array.length===originals.length&&originals.every((s,i)=>array[i]===s)&&array.filter(s=>isShipPartKind276(s.kind)).length===parts.length
  &&seals.every(s=>s())&&selected.every(s=>Object.isExtensible(s)&&!('shipReactor275'in s))
  &&(()=>{const current=connectedHibernating(w,reactorId);return !!current&&current.length===selected.length&&current.every((s,i)=>s===selected[i]);})();
 return {ok:true,reactorIds:Object.freeze([...ids]),current,commit:()=>{
  if(!current())return false;
  const states:ShipReactorState275[]=selected.map(()=>({state:'starting',startCore:now,endCore:end}));
  used=true;for(let i=0;i<selected.length;i++)selected[i]!.shipReactor275=states[i]!;
  return true;
 }};
}

export function applyShipReactorCommand275(w:World,c:ShipReactorCommand275):CommandResult {
 if(!validShipReactorCommand275(c,w.schemaVersion,w.nextId))return {ok:false,code:'invalid-command',reason:'Commande de démarrage du réacteur invalide.'};
 const plan=prepareShipReactorStart275(w,c.reactorId,c.reactorIds);
 if(!plan.ok)return {ok:false,code:'invalid-command',reason:plan.reason};
 return plan.commit()?{ok:true,affected:plan.reactorIds.length}:{ok:false,code:'invalid-command',reason:'Le démarrage du réacteur a changé avant confirmation.'};
}

/** One structure pass per physical step. Absolute dates stay unchanged. No
 * load/adoption call is allowed to produce this actual lifecycle transition. */
export interface ShipReactorAdvance275 {completed:number;starting:boolean;completedReactorIds:number[]}
export function advanceShipReactors275(w:World):ShipReactorAdvance275 {
 if(!isSchema275OrLater(w.schemaVersion))return {completed:0,starting:false,completedReactorIds:[]};const now=coreNow(w);if(now===undefined)throw Error('Invalid actual ship reactor clock');
 const ready:{id:number;state:ShipReactorState275}[]=[];let starting=false;
 for(const s of w.structures)if(isShipReactor275(s)&&Object.hasOwn(s,'shipReactor275')){
  const state=s.shipReactor275;
  if(!state||!validShipReactorState275(state,state.state==='starting'?Math.min(now,state.endCore):now))throw Error('Invalid actual ship reactor before its physical step');
  if(state.state==='starting'){
   if(now>state.endCore){const d=Object.getOwnPropertyDescriptor(state,'state');if(!d?.writable)throw Error('Actual ship reactor state is not writable');ready.push({id:s.id,state});}
   else starting=true;
  }
 }
 for(const {state} of ready)state.state='running';return {completed:ready.length,starting,completedReactorIds:ready.map(r=>r.id)};
}
