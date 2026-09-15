/** Fractional neutral work, kept as integers without changing historical ticks.
 * Zero is omitted so old saves acquire no fictitious partial work. */
export interface WorkProgress { progress:number; workRemainder?:number }
export const WORK_FRACTIONS=10000;
export const workProgress=(work:WorkProgress):number=>work.progress+(work.workRemainder??0)/WORK_FRACTIONS;
export function setWorkUnits(work:WorkProgress,units:number):void {
  work.progress=Math.floor(units/WORK_FRACTIONS);
  const remainder=units%WORK_FRACTIONS;
  if(remainder)work.workRemainder=remainder;else delete work.workRemainder;
}
export function advanceWork(work:WorkProgress,rate:number):void {
  setWorkUnits(work,work.progress*WORK_FRACTIONS+(work.workRemainder??0)+Math.round(rate*WORK_FRACTIONS));
}
export function resetWork(work:WorkProgress):void {work.progress=0;delete work.workRemainder;}
