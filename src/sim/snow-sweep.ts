/** Original bounded physical sweep. Call on confirmed ticks only. */
import {clampSnowDepth,snowCategory,snowMeltPerVisit,snowVisitsPerLocalTick,type SnowState} from './snow-rules.ts';
export interface SnowSweepPorts {
  readonly width:number;
  readonly height:number;
  /** Reads physical Tile authority; undefined means zero. */
  depth(index:number):number;
  /** The sole physical writer, preserving every unrelated Tile field. */
  writeDepth(index:number,depth:number):void;
  /** Current terrain/building retention. Roof is a different condition. */
  retains(index:number):boolean;
  roofed(index:number):boolean;
  usesIndoorAir(index:number):boolean;
  temperature(index:number):number;
  snowRate():number;
  /** Own a separate physical route cache only if the product actually has one.
   * Existing operation-local navigation captures need no global invalidation. */
  changed(index:number,oldCategory:number,newCategory:number):void;
}
export interface SnowSweepStats {visited:number;changed:number;categoryChanges:number}
const mix=(v:number):number=>{v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return (v^(v>>>16))>>>0;};
const smooth=(v:number):number=>v*v*(3-2*v);
/** An original five-octave VALUE noise, not Unity/LibNoise Perlin. This explicit
 * adaptation bounds the spatial factor to [.5,1] and never uses World.rng. */
function spatialFactor(seed:number,x:number,z:number):number {
  const value=(gx:number,gz:number)=>mix(seed^Math.imul(gx,0x1f123bb5)^Math.imul(gz,0x5f356495))/0x100000000;
  let sum=0,weight=1,normalizer=0,frequency=.04;
  for(let octave=0;octave<5;octave++){
    const px=x*frequency,pz=z*frequency,gx=Math.floor(px),gz=Math.floor(pz),fx=smooth(px-gx),fz=smooth(pz-gz);
    const top=value(gx,gz)*(1-fx)+value(gx+1,gz)*fx,bottom=value(gx,gz+1)*(1-fx)+value(gx+1,gz+1)*fx;
    sum+=(top*(1-fz)+bottom*fz)*weight;normalizer+=weight;weight*=.5;frequency*=2;
  }
  return Math.max(.5,sum/normalizer);
}
/** One instance per live authority (WeakMap in future World adapter). The count
 * is DERIVED, never serialized. Constructor scans once; own writes maintain it.
 * Every non-sweep writer MUST call writeDepth through the same domain owner. */
export class SnowSweepRuntime {
  private readonly area:number;
  private readonly seed:number;
  private nonzero:number;
  private order?:Uint32Array;
  private factors?:Float64Array;
  private readonly ports:SnowSweepPorts;
  constructor(state:SnowState,ports:SnowSweepPorts){
    this.ports=ports;
    this.area=ports.width*ports.height;this.seed=state.seed;this.nonzero=0;
    for(let i=0;i<this.area;i++)if(ports.depth(i)>0)this.nonzero++;
  }
  private prepare():void {
    if(this.order)return;
    const order=this.order=new Uint32Array(this.area);for(let i=0;i<this.area;i++)order[i]=i;
    // Fixed original shuffle regenerated solely from saved seed/dimensions.
    let rng=this.seed||1;const next=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/0x100000000;};
    for(let i=order.length-1;i>0;i--){const j=Math.floor(next()*(i+1)),v=order[i]!;order[i]=order[j]!;order[j]=v;}
    // Lazy factors: first sweep spreads computation; zero is an impossible factor.
    this.factors=new Float64Array(this.area);
  }
  /** Absolute writer also used for terrain/building removal, clearing and steps.
   * Zero removes the optional field in the adapter. No epsilon truncation. */
  set(index:number,value:number,stats?:SnowSweepStats):void {
    const before=this.ports.depth(index),after=clampSnowDepth(value);if(before===after)return;
    this.ports.writeDepth(index,after);if(!before&&after)this.nonzero++;else if(before&&!after)this.nonzero--;
    const oldCategory=snowCategory(before),newCategory=snowCategory(after);
    this.ports.changed(index,oldCategory,newCategory);
    if(stats){stats.changed++;if(oldCategory!==newCategory)stats.categoryChanges++;}
  }
  /** Exact one-local-tick step. No hidden catch-up, no repeated invocation work.
   * Owner must ensure input has passed shape/phase validation before this call. */
  advance(state:SnowState,tick:number):SnowSweepStats {
    const stats:SnowSweepStats={visited:0,changed:0,categoryChanges:0};
    if(tick===state.lastTick)return stats;
    if(tick!==state.lastTick+1||state.seed!==this.seed)throw new Error('Unconfirmed or discontinuous snow tick');
    const budget=snowVisitsPerLocalTick(this.area),snowRate=this.ports.snowRate();
    if(snowRate<=.001&&!this.nonzero){state.cursor=(state.cursor+budget)%this.area;state.lastTick=tick;return stats;}
    this.prepare();
    for(let visit=0;visit<budget;visit++){
      const index=this.order![state.cursor]!;state.cursor=(state.cursor+1)%this.area;stats.visited++;
      if(!this.ports.retains(index)){this.set(index,0,stats);continue;}
      // Clamp melt BEFORE falling snow. A net delta has different saturation rules.
      this.set(index,this.ports.depth(index)-snowMeltPerVisit(this.ports.temperature(index)),stats);
      if(!this.ports.usesIndoorAir(index)&&!this.ports.roofed(index)&&snowRate>.001){
        let factor=this.factors![index]!;
        if(!factor){factor=spatialFactor(this.seed,index%this.ports.width,Math.floor(index/this.ports.width));this.factors![index]=factor;}
        this.set(index,this.ports.depth(index)+.046*snowRate*factor,stats);
      }
    }
    state.lastTick=tick;return stats;
  }
}
