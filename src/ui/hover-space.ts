/** Geometry only: text metrics and HUD rectangles are captured on UI layout events. */
export interface HoverRect { left:number; top:number; right:number; bottom:number }
export interface HoverSpaceInput {
  bounds:HoverRect;
  dock:HoverRect;
  obstacles:readonly HoverRect[];
  maxWidth:number;
  minWidth:number;
  minHeight:number;
  gap:number;
}
export interface HoverMetric { width:number; height:number }
export interface HoverPlacement extends HoverRect {
  mode:'whole'|'scroll';
  width:number;
  height:number;
  contentHeight:number;
  aboveDock:boolean;
}
export type HoverSpaceDecision =
  | {kind:'placed';placement:HoverPlacement}
  | {kind:'reservation-required';reason:'invalid-input'|'no-readable-region'};
const finite=(...values:number[])=>values.every(Number.isFinite);
const valid=(r:HoverRect)=>finite(r.left,r.top,r.right,r.bottom)&&r.right>r.left&&r.bottom>r.top;
const cross=(a0:number,a1:number,b0:number,b1:number)=>a0<b1&&a1>b0;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function validInput(input:HoverSpaceInput):boolean {
  return valid(input.bounds)&&valid(input.dock)
    &&finite(input.maxWidth,input.minWidth,input.minHeight,input.gap)
    &&input.minWidth>0&&input.minHeight>0&&input.maxWidth>=input.minWidth&&input.gap>=0;
}
/** Rectangles are supplied once per layout event. Expanding obstacles by the
 * measured HUD gap means placements need no separate screen-coordinate offset. */
function spaces(input:HoverSpaceInput):HoverRect[] {
  if(!validInput(input))return [];
  const b=input.bounds;
  const blocked=input.obstacles.filter(valid).map(r=>({
    left:clamp(r.left-input.gap,b.left,b.right),top:clamp(r.top-input.gap,b.top,b.bottom),
    right:clamp(r.right+input.gap,b.left,b.right),bottom:clamp(r.bottom+input.gap,b.top,b.bottom),
  })).filter(valid);
  const lefts=new Set([b.left,...blocked.map(r=>r.right)]);
  const rights=new Set([b.right,...blocked.map(r=>r.left)]);
  const result:HoverRect[]=[],seen=new Set<string>();
  for(const left of lefts)for(const boundary of rights){
    const right=Math.min(boundary,left+input.maxWidth);
    if(right-left<input.minWidth)continue;
    let free:{top:number;bottom:number}[]=[{top:b.top,bottom:b.bottom}];
    for(const obstacle of blocked){
      if(!cross(left,right,obstacle.left,obstacle.right))continue;
      const next:typeof free=[];
      for(const band of free){
        if(!cross(band.top,band.bottom,obstacle.top,obstacle.bottom)){next.push(band);continue;}
        if(band.top<obstacle.top)next.push({top:band.top,bottom:Math.min(band.bottom,obstacle.top)});
        if(band.bottom>obstacle.bottom)next.push({top:Math.max(band.top,obstacle.bottom),bottom:band.bottom});
      }
      free=next;
    }
    for(const band of free){
      if(band.bottom-band.top<input.minHeight)continue;
      const rect={left,top:band.top,right,bottom:band.bottom};
      const key=[rect.left,rect.top,rect.right,rect.bottom].join(':');
      if(!seen.has(key)){seen.add(key);result.push(rect);}
    }
  }
  return result;
}
/** At most four actual text-width probes per changed geometry/text/font key.
 * The adapter measures these widths, caches the heights and restores final styles.
 * Missing a narrower whole fit may select a scroll region; it never implies hiding. */
export function mapHoverProbeWidths(input:HoverSpaceInput):number[] {
  if(!validInput(input))return [];
  const areas=spaces(input),anchor=input.dock.top-input.gap;
  const areaWidth=(r:HoverRect)=>Math.min(input.maxWidth,r.right-r.left);
  const candidates=[input.maxWidth];
  const above=areas.filter(r=>Math.min(r.bottom,anchor)-r.top>=input.minHeight)
    .sort((a,b)=>areaWidth(b)-areaWidth(a)||Math.min(b.bottom,anchor)-b.top-(Math.min(a.bottom,anchor)-a.top));
  if(above[0])candidates.push(areaWidth(above[0]));
  const wide=[...areas].sort((a,b)=>areaWidth(b)-areaWidth(a)||b.bottom-b.top-(a.bottom-a.top));
  if(wide[0])candidates.push(areaWidth(wide[0]));
  const large=[...areas].sort((a,b)=>areaWidth(b)*(b.bottom-b.top)-areaWidth(a)*(a.bottom-a.top));
  if(large[0])candidates.push(areaWidth(large[0]));
  return [...new Set(candidates.filter(width=>width>=input.minWidth))].slice(0,4);
}
/** Whole text above the dock, then whole text in another free region, then a
 * readable scroll region. An impossible viewport asks its owner to reserve space;
 * it does not tell the caller to set hidden/visibility or paint over another HUD. */
export function placeMapHover(input:HoverSpaceInput,metrics:readonly HoverMetric[]):HoverSpaceDecision {
  if(!validInput(input))return {kind:'reservation-required',reason:'invalid-input'};
  const available=spaces(input),anchor=input.dock.top-input.gap;
  const actual=metrics.filter(m=>finite(m.width,m.height)&&m.width>=input.minWidth&&m.width<=input.maxWidth&&m.height>0);
  type Scored={p:HoverPlacement;score:readonly number[]};
  const choices:Scored[]=[];
  for(const area of available)for(const metric of actual){
    if(metric.width>area.right-area.left)continue;
    const left=clamp(input.dock.left,area.left,area.right-metric.width);
    const aboveHeight=Math.min(area.bottom,anchor)-area.top;
    if(metric.height<=aboveHeight){
      const bottom=Math.min(area.bottom,anchor);
      choices.push({p:{left,top:bottom-metric.height,right:left+metric.width,bottom,width:metric.width,height:metric.height,contentHeight:metric.height,mode:'whole',aboveDock:true},score:[0,anchor-bottom,Math.abs(left-input.dock.left),-metric.width]});
    }
    const room=area.bottom-area.top;
    if(metric.height<=room){
      const bottom=clamp(anchor,area.top+metric.height,area.bottom);
      choices.push({p:{left,top:bottom-metric.height,right:left+metric.width,bottom,width:metric.width,height:metric.height,contentHeight:metric.height,mode:'whole',aboveDock:bottom<=anchor},score:[1,Math.abs(anchor-bottom),Math.abs(left-input.dock.left),-metric.width]});
    }else if(room>=input.minHeight){
      choices.push({p:{left,top:area.top,right:left+metric.width,bottom:area.bottom,width:metric.width,height:room,contentHeight:metric.height,mode:'scroll',aboveDock:area.bottom<=anchor},score:[2,-metric.width*room,Math.abs(anchor-area.bottom),Math.abs(left-input.dock.left)]});
    }
  }
  const compare=(a:Scored,b:Scored)=>{
    for(let i=0;i<a.score.length;i++){const d=a.score[i]!-b.score[i]!;if(d!==0)return d;}
    return a.p.top-b.p.top||a.p.left-b.p.left;
  };
  choices.sort(compare);
  return choices[0]?{kind:'placed',placement:choices[0].p}:{kind:'reservation-required',reason:'no-readable-region'};
}

/** Only the existing scrolling surfaces surrender height. The inspector footer
 * and dossier tabs remain outside the page's flex shrink. */
export function sharedHudLimits(input:{resource:HoverRect;headingHeight:number;dock:HoverRect;inspector?:HoverRect;inspectorMinimum:number;inspectorGap:number;gap:number}):{inspectorMaxHeight?:number;resourceMaxHeight?:number;crowded:boolean}{
  const {resource,dock,inspector,gap}=input;
  if(!valid(resource)||!valid(dock)||!finite(gap,input.headingHeight,input.inspectorMinimum,input.inspectorGap)||gap<0||input.inspectorGap<0)return {crowded:false};
  if(!cross(resource.left,resource.right,dock.left,dock.right))return {crowded:false};
  const minimum=Math.max(1,input.headingHeight);
  if(inspector&&valid(inspector)){
    // Positions may still reflect the prior cap while observers are delivering.
    // Only the inspector's anchored bottom, dock height and declared gap enter
    // the reservation. Never infer spacing from two independently moved tops.
    const separation=input.inspectorGap;
    const available=inspector.bottom-resource.top-minimum-gap-(dock.bottom-dock.top)-separation;
    const inspectorMaxHeight=Math.max(input.inspectorMinimum,available);
    return {inspectorMaxHeight,resourceMaxHeight:Math.max(minimum,inspector.bottom-inspectorMaxHeight-separation-(dock.bottom-dock.top)-resource.top-gap),crowded:available<input.inspectorMinimum};
  }
  return {resourceMaxHeight:Math.max(minimum,dock.top-resource.top-gap),crowded:dock.top-resource.top-gap<minimum};
}

/** Presentation-only hold. A canvas pointerleave still clears the renderer's
 * hover; the readout may retain that exact cell only while being read. */
export class HoverReadoutHold<T>{
  private value:T|undefined;
  get retained():T|undefined{return this.value;}
  enter(cell:T|undefined):void{if(cell!==undefined)this.value=cell;}
  release():boolean{const had=this.value!==undefined;this.value=undefined;return had;}
}
