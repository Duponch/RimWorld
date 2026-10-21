/** Core1.6.4871 rev590 gift valuation, derived from the observed scalar rules.
 * Caller supplies summed SELL value, not a rounded silver payment. This is the
 * requested gift gain only; faction eligibility/natural goodwill/clamp and the
 * relation transition belong to the actual diplomatic transaction. */
const f32=Math.fround;
const curve=(goodwill:number):number=>goodwill<=0?1:goodwill>=75?.25:f32(1+f32(-.75*f32(goodwill/75)));
const validGoodwill=(v:number):boolean=>Number.isInteger(v)&&v>=-100&&v<=100;

export function diplomaticGiftGain274(goodwill:number,value:number):number {
 if(!validGoodwill(goodwill)||!Number.isFinite(value)||value<0)return 0;
 return postProcess(goodwill,f32(f32(value)/40));
}
/** Exact native aggregation divides each Tradeable's Float32 SELL amount by40
 * before adding it to a Float32 base. Use this entry point for multiple lines;
 * dividing one aggregated monetary total can cross a final integer boundary. */
export function diplomaticGiftGainFromBase274(goodwill:number,baseGoodwill:number):number {
 if(!validGoodwill(goodwill)||!Number.isFinite(baseGoodwill)||baseGoodwill<0)return 0;
 return postProcess(goodwill,f32(baseGoodwill));
}
function postProcess(goodwill:number,baseGoodwill:number):number {
 let remaining=baseGoodwill,gained=0;
 // A factor never below1/4 guarantees the200 cap at raw800. This also handles
 // finite caller amounts overflowing Float32 without an unbounded iteration.
 if(remaining>=800)return 200;
 // From75 onward the curve is constant1/4. Complete quarters add exactly1/16
 // below the200 cap, and scaling the Float32 remainder by1/4 is exact too.
 // The identical final Float32 value needs no quarter-by-quarter replay.
 if(goodwill>=75)return Math.trunc(Math.min(200,f32(remaining*.25)));
 // Every complete quarter yields at least1/16. The native200 ceiling is
 // therefore reached within3200 steps even for an enormous finite basket.
 const quarters=Math.min(3200,Math.floor(remaining*4));
 for(let step=0;step<quarters;step++){
  const at=Math.min(f32(goodwill+gained),100);
  gained=f32(gained+f32(.25*curve(at)));
  remaining=f32(remaining-.25);
  if(gained>=200)return 200;
 }
 const at=Math.min(f32(goodwill+gained),100);
 return Math.trunc(Math.min(200,f32(gained+f32(remaining*curve(at)))));
}
