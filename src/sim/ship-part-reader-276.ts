import {SHIP_REQUIREMENTS_276,isShipOrientation276,type ShipRequirementId276} from './ship-part-content-276.ts';
import type {ShipPartRect276} from './ship-part-geometry-276.ts';
import {isShipPartKind277,shipPartRect277,type ShipPartPose277,type ShipPartKind277} from './ship-casket-graph-277.ts';

/** Call with completed, live local structures only. Jobs, packed furniture and
 * other maps are different owners and must never be supplied as ship parts.
 * Existing world/save guards remain responsible for the full record shape. */
export interface ShipPartSource276 {readonly id:number;readonly kind:string;readonly x:number;readonly z:number;readonly orientation:number;readonly shipCryptosleep277?:{readonly occupant:unknown}}
export interface IndexedShipPart276<T extends ShipPartSource276> {
 readonly id:number;readonly kind:ShipPartKind277;readonly source:T;readonly rect:ShipPartRect276;
}
export interface ShipPartIndex276<T extends ShipPartSource276> {
 readonly parts:readonly IndexedShipPart276<T>[];
 get(id:number):IndexedShipPart276<T>|undefined;
 at(x:number,z:number):IndexedShipPart276<T>|undefined;
}
export type ShipPartIndexResult276<T extends ShipPartSource276>=
 {readonly ok:true;readonly index:ShipPartIndex276<T>}|
 {readonly ok:false;readonly reason:'invalid-map'|'invalid-part'|'duplicate-id'|'overlap';readonly partId?:number};
const integer=(v:number,min=0)=>Number.isSafeInteger(v)&&v>=min;

/** One bounded structure/cell pass at command or inspection time. No terrain
 * walk, cache, mutation, new identity, random draw or clock advancement. */
export function indexShipParts276<T extends ShipPartSource276>(structures:readonly T[],width:number,height:number):ShipPartIndexResult276<T> {
 if(!integer(width,1)||!integer(height,1)||!Number.isSafeInteger(width*height))return {ok:false,reason:'invalid-map'};
 const byId=new Map<number,IndexedShipPart276<T>>(),byCell=new Map<number,IndexedShipPart276<T>>();
 const parts:IndexedShipPart276<T>[]=[];
 for(const source of structures){
  if(!isShipPartKind277(source.kind))continue;
  if(!integer(source.id,1)||!integer(source.x)||!integer(source.z)||!isShipOrientation276(source.orientation))return {ok:false,reason:'invalid-part',partId:source.id};
  if(byId.has(source.id))return {ok:false,reason:'duplicate-id',partId:source.id};
  const rect=shipPartRect277(source as T&ShipPartPose277);
  if(rect.x<0||rect.z<0||rect.x+rect.width>width||rect.z+rect.depth>height)return {ok:false,reason:'invalid-part',partId:source.id};
  const part:IndexedShipPart276<T>=Object.freeze({id:source.id,kind:source.kind,source,rect:Object.freeze(rect)});
  for(let z=rect.z;z<rect.z+rect.depth;z++)for(let x=rect.x;x<rect.x+rect.width;x++){
   const key=z*width+x;if(byCell.has(key))return {ok:false,reason:'overlap',partId:source.id};byCell.set(key,part);
  }
  byId.set(part.id,part);parts.push(part);
 }
 // Mutable maps stay private; the returned index cannot write their entries.
 const index:ShipPartIndex276<T>=Object.freeze({parts:Object.freeze(parts),get:(id:number)=>byId.get(id),
  at:(x:number,z:number)=>integer(x)&&integer(z)&&x<width&&z<height?byCell.get(z*width+x):undefined});
 return {ok:true,index};
}

export type ConnectedShipResult276<T extends ShipPartSource276>=
 {readonly ok:false;readonly reason:'root-not-a-ship-part'}|
 {readonly ok:true;readonly parts:readonly IndexedShipPart276<T>[];readonly partIds:readonly number[]};

/** Native meaning: completed edifices touching a cardinal perimeter cell.
 * Electrical parents/conduits, diagonal corners and proximity do not connect. */
export function connectedShipParts276<T extends ShipPartSource276>(index:ShipPartIndex276<T>,rootId:number):ConnectedShipResult276<T> {
 const root=index.get(rootId);if(!root)return {ok:false,reason:'root-not-a-ship-part'};
 const queue=[root],seen=new Set([root.id]);
 const visit=(x:number,z:number)=>{const next=index.at(x,z);if(next&&!seen.has(next.id)){seen.add(next.id);queue.push(next);}};
 for(let i=0;i<queue.length;i++){
  const r=queue[i]!.rect;
  for(let x=r.x;x<r.x+r.width;x++){visit(x,r.z-1);visit(x,r.z+r.depth);}
  for(let z=r.z;z<r.z+r.depth;z++){visit(r.x-1,z);visit(r.x+r.width,z);}
 }
 // Stable public/confirmation ordering, independent of structure-array order.
 queue.sort((a,b)=>a.id-b.id);
 return {ok:true,parts:Object.freeze(queue),partIds:Object.freeze(queue.map(part=>part.id))};
}

export type ShipPartCounts276=Readonly<Record<ShipRequirementId276,number>>;
export interface ShipRequirementView276 {readonly id:ShipRequirementId276;readonly label:string;readonly required:number;readonly present:number;readonly missing:number}
export type ShipAssemblyReport276<T extends ShipPartSource276>=
 Extract<ConnectedShipResult276<T>,{ok:false}>|
 {readonly ok:true;readonly partIds:readonly number[];readonly parts:readonly IndexedShipPart276<T>[];
  readonly counts:ShipPartCounts276;readonly requirements:readonly ShipRequirementView276[];
  readonly missing:readonly ShipRequirementView276[];readonly occupiedCaskets:number;readonly launchImplemented:false};

/** Counts are a player report, never a launch permission. Computer and sensors
 * stay at0; completed spatial holders report only their confirmed occupancy. */
export function readShipAssembly276<T extends ShipPartSource276>(index:ShipPartIndex276<T>,rootId:number):ShipAssemblyReport276<T> {
 const connected=connectedShipParts276(index,rootId);if(!connected.ok)return connected;
 const counts={beam:0,engine:0,reactor:0,computer:0,sensors:0,casket:0};
 for(const part of connected.parts){
  if(part.kind==='ship-beam')counts.beam++;else if(part.kind==='ship-engine')counts.engine++;else if(part.kind==='ship-reactor')counts.reactor++;else counts.casket++;
 }
 const requirements=SHIP_REQUIREMENTS_276.map(row=>Object.freeze({...row,present:counts[row.id],missing:Math.max(0,row.required-counts[row.id])}));
 return Object.freeze({ok:true as const,partIds:connected.partIds,parts:connected.parts,counts:Object.freeze(counts),
  requirements:Object.freeze(requirements),missing:Object.freeze(requirements.filter(row=>row.missing>0)),
  occupiedCaskets:connected.parts.filter(part=>part.kind==='ship-cryptosleep-casket'&&part.source.shipCryptosleep277?.occupant!=null).length,launchImplemented:false as const});
}

export type ReactorPhaseReader276<T extends ShipPartSource276>=(source:T)=>'hibernating'|'starting'|'running';
/** Adapter seam for the existing validated275 component. Existing dates and
 * phase guards stay authoritative; new bridge kinds acquire no lifecycle. */
export function connectedHibernatingReactorIds276<T extends ShipPartSource276>(connected:Extract<ConnectedShipResult276<T>,{ok:true}>,readPhase:ReactorPhaseReader276<T>):readonly number[] {
 return Object.freeze(connected.parts.filter(part=>part.kind==='ship-reactor'&&readPhase(part.source)==='hibernating').map(part=>part.id));
}
