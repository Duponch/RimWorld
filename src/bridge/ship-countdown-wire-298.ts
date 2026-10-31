/** INTERNAL transport policy. This bound is not a native gameplay rule. */
export const SHIP_FRAME_BATCH_LIMIT_298=512;
export const SHIP_FRAME_MAXIMUM_DELTA_298=0.3333333432674408;
export type ShipControlRequest298=
 |{type:'ship-launch-298';id:number;ownerEpoch:number;computerId:number}
 |{type:'ship-credits-continue-298';id:number;ownerEpoch:number;departureId:number};
export interface ShipFrameRequest298 {type:'ship-frame-298';ownerEpoch:number;generation:number;sequence:number;deltas:number[]}
export interface ShipCancelRequest298 {type:'ship-cancel-298';ownerEpoch:number;generation:number;reason:'menu'|'front'|'transport'}
export type ShipLightRequest298=ShipFrameRequest298|ShipCancelRequest298;
export type ShipRuntimeRequest298=ShipControlRequest298|ShipLightRequest298;
/** Piggybacked on existing replies, never a World/SAVE/Snapshot field. */
export interface ShipOwnerReplyMetadata298 {shipOwnerEpoch298?:number}
export interface ShipFrameAck298 {
 type:'ship-frame-ack-298';ownerEpoch:number;generation:number;sequence:number;
 accepted:boolean;active:boolean;outcome:'waiting'|'departed'|'refused'|'unknown';
 departureId?:number;reason?:string;
}
export interface ShipCountdownState298 {
 type:'ship-countdown-state-298';ownerEpoch:number;generation:number;active:boolean;
 outcome:'cancelled'|'refused'|'unknown';reason?:string;
}
export type ShipRuntimeResponse298=ShipFrameAck298|ShipCountdownState298;
