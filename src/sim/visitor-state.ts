import { TICKS_PER_DAY,type Cell,type MaterialPile,type Pawn } from './types.ts';

export type VisitorPhase='arriving'|'staying'|'leaving';
export type VisitorKind='traveler'|'visitor';
export interface VisitorState {group:number;role:'traveler'|'visitor'|'trader';phase:VisitorPhase;goal:Cell|null;personalFoodIds:number[]}
export interface VisitorGroup {id:number;kind:VisitorKind;members:number[];entry:Cell;spot:Cell;phase:VisitorPhase;startedAt:number;arrivedAt:number|null;durationCore:number;hostile:boolean;reason?:'timeout'|'danger'|'hostile'|'blocked'}
/** Frozen departure evidence, not a simulated world population. */
export interface VisitorDeparture {group:number;tick:number;pawn:Pawn;items:MaterialPile[];packed?:import('./furniture-rules.ts').PackedFurniture[]}
export interface VisitorAgenda {rng:number;cycle:number;last:number;pending:number[]}
export interface VisitorCalendar {profile:'cassandra-visitors-v1';adoptedAt:number;rng:number;serial:number;introAt:number|null;traveler:VisitorAgenda;visitor:VisitorAgenda;groups:VisitorGroup[];departed:VisitorDeparture[]}
export const VISITOR_YEAR=60*TICKS_PER_DAY;
export const VISITOR_INTERVAL=100;
export const INTRO_VISITOR_TICK=2.5*TICKS_PER_DAY;
export const VISITOR_FLOWS=Object.freeze({traveler:{minimum:TICKS_PER_DAY,count:6,spacing:TICKS_PER_DAY},visitor:{minimum:3*TICKS_PER_DAY,count:4,spacing:5*TICKS_PER_DAY}});
export function visitorRandom(s:{rng:number}):number {let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}

/** Same yearly opportunity counts, 1,000-Core-tick buckets and forward spacing
 * as the reference. The private PRNG deliberately is not RimWorld's RNG. */
export function prepareVisitorCycle(a:VisitorAgenda,kind:VisitorKind):void {
  const rule=VISITOR_FLOWS[kind],start=rule.minimum+a.cycle*VISITOR_YEAR;
  for(let attempt=0;attempt<101;attempt++) {
    const times=Array.from({length:rule.count},()=>start+Math.floor(visitorRandom(a)*VISITOR_YEAR/VISITOR_INTERVAL)*VISITOR_INTERVAL).sort((x,y)=>x-y);
    for(let i=0;i<times.length;i++)times[i]=Math.max(times[i]!,i?times[i-1]!+rule.spacing:a.last+rule.spacing);
    if(times.at(-1)!>start+VISITOR_YEAR)continue;
    a.pending=times;a.last=times.at(-1)!;return;
  }
  throw new Error('Cannot schedule neutral visitor opportunities.');
}
export function newVisitorAgenda(seed:number,kind:VisitorKind,tick:number):VisitorAgenda {
  const a:VisitorAgenda={rng:((seed^(kind==='traveler'?0x88a1641:0x88b4371))>>>0)||1,cycle:0,last:-VISITOR_YEAR,pending:[]};
  // Explicit adoption discards past opportunities, never a catch-up arrival.
  do {prepareVisitorCycle(a,kind);a.pending=a.pending.filter(t=>t>tick);if(!a.pending.length)a.cycle++;}while(!a.pending.length);
  return a;
}
export function consumeVisitorOpportunity(a:VisitorAgenda,kind:VisitorKind,tick:number):boolean {
  const due=a.pending[0]===tick;
  while(a.pending[0]!<=tick){a.pending.shift();if(!a.pending.length){a.cycle++;prepareVisitorCycle(a,kind);}}
  return due;
}

const VISIT_POINTS=[[45,0],[50,1],[100,1],[200,.25],[300,.1],[500,0]] as const;
const TRAVEL_POINTS=[[40,0],[50,1],[100,1],[200,.5],[300,.1],[500,0]] as const;
/** Inverse area sampling of the definition's piecewise linear density. */
export function visitorPoints(rng:{rng:number},kind:VisitorKind):number {
  const curve=kind==='visitor'?VISIT_POINTS:TRAVEL_POINTS;
  let area=0;for(let i=1;i<curve.length;i++)area+=(curve[i]![0]-curve[i-1]![0])*(curve[i]![1]+curve[i-1]![1])/2;
  let target=visitorRandom(rng)*area;
  for(let i=1;i<curve.length;i++){
    const [x0,y0]=curve[i-1]!,[x1,y1]=curve[i]!,dx=x1-x0,area=dx*(y0+y1)/2;
    if(target>area){target-=area;continue;}
    const slope=(y1-y0)/dx;
    return x0+(Math.abs(slope)<1e-12?target/y0:2*target/(y0+Math.sqrt(Math.max(0,y0*y0+2*slope*target))));
  }
  return 500;
}
