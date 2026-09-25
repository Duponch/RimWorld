/** Core 1.6.4871 room-impressiveness bands, in ascending score order. */
export const IMPRESSION_THRESHOLDS=Object.freeze([20,30,40,50,65,85,120,170,240] as const);
export const IMPRESSION_LABELS=Object.freeze([
  'affreuse','terne','médiocre','convenable','légèrement impressionnante',
  'assez impressionnante','très impressionnante','extrêmement impressionnante',
  'incroyablement impressionnante','merveilleuse',
] as const);

/** Null denotes a Core ThoughtDef stage that cannot produce a memory. */
export const ROOM_MEMORY_OFFSETS=Object.freeze({
  bedroom:Object.freeze([-2,null,1,2,3,4,5,6,7,8] as const),
  barracks:Object.freeze([-7,-5,-4,-3,-2,-1,1,2,3,4] as const),
  dining:Object.freeze([null,null,null,2,3,4,5,6,7,8] as const),
  recreation:Object.freeze([null,null,null,2,3,4,5,6,7,8] as const),
});

/** One local day; corresponds to 60,000 Core ticks. */
export const ROOM_MEMORY_DURATION=6_000;

export interface RoomImpressivenessInput {wealth:number;beauty:number;space:number;cleanliness:number}

function factor(value:number):number {
  if(Math.abs(value)<1)return value;
  return value>0?1+Math.log(value):-1-Math.log(-value);
}

/** Pure translation of RoomStatWorker_Impressiveness.GetScore. */
export function roomImpressiveness({wealth,beauty,space,cleanliness}:RoomImpressivenessInput):number {
  const w=factor(wealth/1500),b=factor(beauty/3),s=factor(space/125);
  const c=factor(1+Math.min(cleanliness,0)/2.5);
  const average=(w+b+s+c)/4,minimum=Math.min(w,b,s,c);
  let score=average*.65+minimum*.35;
  const spaceLimit=s*5;
  if(score>spaceLimit)score=score*.25+spaceLimit*.75;
  return score*100;
}

/** Index into IMPRESSION_LABELS and each room-memory table. */
export function impressionStage(value:number):number {
  for(let i=IMPRESSION_THRESHOLDS.length-1;i>=0;i--)if(value>=IMPRESSION_THRESHOLDS[i]!)return i+1;
  return 0;
}
