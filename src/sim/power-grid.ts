import type { Structure } from './types.ts';

/** Nominal roles do not depend on production, fuel or stored energy. */
export const isPowerConduit=(kind:unknown):boolean=>kind==='power-conduit';
export const isPowerTransmitter=(kind:unknown):boolean=>kind==='wood-generator'||kind==='solar-generator'||kind==='battery'||kind==='power-conduit'||kind==='power-switch';
export const isPowerConnector=(kind:unknown):boolean=>kind==='standing-lamp'||kind==='cooler'||kind==='electric-stove';

/** A stopped generator remains a wire. Only the physical switch opens the grid;
 * its requested state lives in a job and cannot affect this query. */
export const transmitsPowerNow=(s:Structure):boolean=>isPowerTransmitter(s.kind)&&(s.kind!=='power-switch'||s.power?.switchOn!==false);
export const allowsWireConnection=(kind:unknown):boolean=>isPowerTransmitter(kind)&&kind!=='power-switch';

/** True means the two footprints cannot coexist. A conduit can share a cell
 * with a wall, door or consumer, but never with another transmitter. V85 rejects
 * replacing a conduit by a transmitter until that replacement is conservative. */
export function sharesConstructionLayer(aKind:unknown,bKind:unknown):boolean {
  if(isPowerConduit(aKind))return isPowerTransmitter(bKind);
  if(isPowerConduit(bKind))return isPowerTransmitter(aKind);
  return true;
}
