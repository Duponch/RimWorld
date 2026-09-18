import type { Cell } from './types.ts';

export interface SlowInterval { start:number; end:number }
export interface TravelSegment { from:Cell; to:Cell; start:number; end:number; terrainDelay?:number; speedFactor?:number; stagger?:SlowInterval[]; stuns?:SlowInterval[] }
export interface PresentationSegment extends TravelSegment { edgeStart?:number; fromFraction?:number; toFraction?:number }
export const TRAVEL_TICKS=3;
export const edgeLength=(a:Cell,b:Cell):number=>Math.hypot(b.x-a.x,b.z-a.z);
export const neutralTravelDuration=(m:TravelSegment):number=>TRAVEL_TICKS*edgeLength(m.from,m.to)/(m.speedFactor??1)+(m.terrainDelay??0);
/** Core pays at least total edge cost / 450 each tick, even while staggered. */
export const staggerTravelFactor=(m:TravelSegment):number=>Math.min(1,Math.max(.17,neutralTravelDuration(m)/45));

/** Union future windows, retaining elapsed portions: earlier positions cannot
 * change when an impact extends the tail of the current edge. */
export function mergeSlowIntervals(intervals:readonly SlowInterval[]):SlowInterval[] {
  const out:SlowInterval[]=[];
  for(const span of [...intervals].sort((a,b)=>a.start-b.start)) {
    const last=out.at(-1);
    if(last&&span.start<=last.end)last.end=Math.max(last.end,span.end);
    else out.push({...span});
  }
  return out;
}

/** Piecewise constant pace, continuous distance, same original grid edge.
 * Pieces are built on mutation/publication, never by a per-pawn GPU shader. */
export function travelPieces(m:TravelSegment):PresentationSegment[] {
  if(!m.stagger?.length&&!m.stuns?.length)return [m];
  const total=neutralTravelDuration(m),slow=staggerTravelFactor(m),pieces:PresentationSegment[]=[];
  const boundaries=[...new Set([m.start,...(m.stagger??[]).flatMap(s=>[s.start,s.end]),...(m.stuns??[]).flatMap(s=>[s.start,s.end])])].filter(t=>t>=m.start).sort((a,b)=>a-b);
  boundaries.push(Infinity);let paid=0;
  for(let i=0;i<boundaries.length-1&&paid<total;i++) {
    const start=boundaries[i]!,limit=boundaries[i+1]!;
    const halted=m.stuns?.some(s=>s.start<=start&&s.end>start);
    const factor=halted?0:m.stagger?.some(s=>s.start<=start&&s.end>start)?slow:1;
    const cost=factor?Math.min(total-paid,(limit-start)*factor):0,end=factor?start+cost/factor:limit;
    pieces.push({from:m.from,to:m.to,start,end,edgeStart:m.start,fromFraction:paid/total,toFraction:(paid+cost)/total});paid+=cost;
  }
  return pieces;
}
export const travelEnd=(m:TravelSegment):number=>m.stagger?.length||m.stuns?.length?travelPieces(m).at(-1)!.end:m.start+neutralTravelDuration(m);

export function validSlowIntervals(value:unknown,version:number,start:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<57||!Array.isArray(value)||!value.length||value.length>451)return false;
  let previous=start-1;
  return value.every(s=>{
    if(!s||typeof s!=='object'||Object.keys(s).some(k=>k!=='start'&&k!=='end')||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<start||s.start>tick||s.end<=s.start||s.start<=previous||!Number.isSafeInteger(s.end*10)||s.end>tick+9.5)return false;
    previous=s.end;return true;
  });
}

export function validStunIntervals(value:unknown,version:number,start:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<59||!Array.isArray(value)||!value.length||value.length>4096)return false;
  let previous=start-1;
  return value.every(s=>{
    if(!s||typeof s!=='object'||Object.keys(s).some(k=>k!=='start'&&k!=='end')||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<start||s.start>tick||s.end<=s.start||s.start<=previous||!Number.isSafeInteger(s.end*10)||s.end>tick+4.5)return false;
    previous=s.end;return true;
  });
}
