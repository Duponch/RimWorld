import type { Cell, Job, Pawn, World } from '../sim/types';

/** Exact authored edge primitives, without JSON work at admission. */
export function confirmedRouteEdgeSignature(m:Pawn['motion']):string {
  if(!m)return '';
  const spans=(items:typeof m.stagger)=>[items?.length??0,...(items??[]).flatMap(s=>[s.start,s.end])].join(',');
  return [m.from.x,m.from.z,m.to.x,m.to.z,m.start,m.end,m.terrainDelay??'',m.speedFactor??'',
    m.animalFlight?1:0,m.snowEntryPending?1:0,spans(m.stagger),spans(m.stuns)].join('|');
}

export interface ConfirmedIntentRoute {
  readonly pawnId:number;
  readonly origin:Readonly<Cell>;
  readonly edgeSignature:string;
  readonly cells:readonly Readonly<Cell>[];
}
/** References belong to snapshots already admitted by the closed MAIN client.
 * No World is reconstructed. Consumers accept intention fields separately from
 * the executed surface/poses. Physical Job fields are never consulted by the
 * intention producer, even though records share immutable snapshot storage. */
export interface ConfirmedIntentFields {
  readonly jobs:readonly Job[];
  readonly growingZones:World['growingZones'];
  readonly stockpiles:World['stockpiles'];
  readonly home:World['home'];
  readonly snowClearArea:World['snowClearArea'];
  readonly allowedAreas:World['allowedAreas'];
  readonly roofBuild:readonly number[];
  readonly roofRemove:readonly number[];
  readonly routes:readonly ConfirmedIntentRoute[];
}
