/** A first incident producer, not the complete storyteller. Its private stream
 * prevents repeated UI inspection from consuming terrain/combat randomness. */
export interface ArrivalOffer { id:number; openedAt:number; expiresAt:number; name:string; profile:0|1|2 }
export interface ArrivalState {
  profile:'camp-arrivals-v1'; rng:number; nextCheck:number; serial:number;
  accepted:number; declined:number; expired:number; pending?:ArrivalOffer;
}
export type ArrivalCommand={type:'enable-arrivals'}|{type:'answer-arrival';offerId:number;accept:boolean};
export const ARRIVAL_NAMES=['Lina','Émile','Sacha','Inès','Jules','Camille','Nora','Basile','Lou','Yanis','Alix','Maël'] as const;
export function arrivalRandom(state:Pick<ArrivalState,'rng'>):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/4294967296;
}
