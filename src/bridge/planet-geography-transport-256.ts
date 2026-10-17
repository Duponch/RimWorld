/** The connection carries a large immutable definition once. Warm local-map
 * and globe-only publications contain the same six-scalar planet header and
 * an owner reference, never a second set of 119k geographic columns. */
import {preparePlanetNavigation256} from '../sim/planet-route-256.ts';
import {GeographyEncoder256,GeographyDecoder256,type GeographyPacket256,type PreparedGeography256} from '../sim/world-geography-owner-256.ts';
import {planetGeography256,planetGeographicHeader256,bindPlanetGeography256,type PlanetGeographicHeader256} from '../sim/planet-geography-256.ts';
import type {PlanetState} from '../sim/planet-state.ts';

export interface PlanetGeographyTransport256 {planet:PlanetGeographicHeader256;packet:GeographyPacket256}
type State={schemaVersion:number;planet?:PlanetState};
const own=(v:object,k:string)=>Object.hasOwn(v,k);
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));}
export class PlanetGeographyTransportEncoder256 {
 readonly #geography=new GeographyEncoder256();
 reserveDraftPreview(owner:import('../sim/world-geography-owner-256.ts').CampaignGeography256){return this.#geography.reserveDraftPreview(owner);}
 authorizeDraftPreview(owner:import('../sim/world-geography-owner-256.ts').CampaignGeography256,id:number):void {this.#geography.authorizeDraftPreview(owner,id);}
 discardDraftPreview():void {this.#geography.discardDraftPreview();}
 encode<T extends State>(state:T,checkpoint=false):{state:T;geography?:PlanetGeographyTransport256} {
  const planet=state.planet;
  if(planet?.revision!==3)return {state};
  if(state.schemaVersion<256)throw Error('Geographic owner in historical snapshot');
  const result={...state};delete result.planet;
  return {state:result,geography:{planet:planetGeographicHeader256(planet),packet:this.#geography.encode(planetGeography256(planet),checkpoint)}};
 }
}
declare const transportBrand:unique symbol;
export type PreparedPlanetTransport256<T>={readonly ok:false;readonly reason:string}|{readonly ok:true;readonly state:T;readonly [transportBrand]:true};
/** A preparation is not an adoption. All map/actor/registry guards run before
 * commit. A refusal does not install a geographic definition or advance IDs.
 * There is no restoration in a hot accessor or implicit fallback generation. */
export class PlanetGeographyTransportDecoder256 {
 readonly #geography=new GeographyDecoder256();
 prepareDraftPreview(packet:unknown){return this.#geography.prepareDraftPreview(packet);}
 authorizeDraftPreview(preview:import('../sim/world-geography-owner-256.ts').DraftGeographyPreview256):void {this.#geography.authorizeDraftPreview(preview);}
 discardDraftPreview():void {this.#geography.discardDraftPreview();}
 #pending:{result:object;geography?:PreparedGeography256}|undefined;
 prepare<T extends State>(state:T,envelope:unknown,envelopePresent:boolean,allowReplacement:boolean):PreparedPlanetTransport256<T> {
  this.#pending=undefined;
  const fail=(reason:string):PreparedPlanetTransport256<T>=>Object.freeze({ok:false,reason});
  if(!state||typeof state!=='object'||Array.isArray(state)||!Number.isSafeInteger(state.schemaVersion)||state.schemaVersion<1)return fail('Invalid geographic snapshot state');
  if(!envelopePresent){
   if(state.planet?.revision===3)return fail('Geographic snapshot omitted its connection owner');
   const result=Object.freeze({ok:true,state}) as PreparedPlanetTransport256<T>;this.#pending={result};return result;
  }
  if(state.schemaVersion<256)return fail('Future geographic transport in historical schema');
  if(own(state,'planet'))return fail('Duplicate planetary transport authorities');
  if(!record(envelope)||Reflect.ownKeys(envelope).length!==2||!own(envelope,'planet')||!own(envelope,'packet'))return fail('Invalid geographic transport fields');
  const geographic=this.#geography.prepare(envelope.packet,allowReplacement);
  if(!geographic.ok)return fail(geographic.reason);
  let planet:PlanetState;try{planet=bindPlanetGeography256(envelope.planet as PlanetGeographicHeader256,geographic.owner);if(allowReplacement||record(envelope.packet)&&envelope.packet.kind==='definition')preparePlanetNavigation256(planet);}catch{return fail('Invalid geographic planet header or owner');}
  const result=Object.freeze({ok:true,state:{...state,planet}}) as PreparedPlanetTransport256<T>;
  this.#pending={result,geography:geographic};return result;
 }
 canCommit(result:object):boolean {return this.#pending?.result===result;}
 commit(result:object):boolean {
  const pending=this.#pending;if(!pending||pending.result!==result)return false;
  if(pending.geography&&!this.#geography.commit(pending.geography))return false;
  this.#pending=undefined;return true;
 }
}
