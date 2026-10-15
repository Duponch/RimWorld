import {expect,test} from 'vitest';
import {mapHoverProbeWidths,placeMapHover,sharedHudLimits,type HoverRect,type HoverSpaceInput} from '../src/ui/hover-space';
const intersects=(a:HoverRect,b:HoverRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const expand=(r:HoverRect,gap:number)=>({left:r.left-gap,top:r.top-gap,right:r.right+gap,bottom:r.bottom+gap});

test.each([[1280,720],[1600,900],[1920,1080],[1024,768]])('V380 full resource ledger, dossier and open dock leave a separate readable hover region at %sx%s',(width,height)=>{
  // Layout contract examples, not native measurements. Resource and dossier
  // metrics include a tall dossier, its fixed tabs/footer and a wrapped tray.
  const gap=8,resource={left:18,top:18,right:234,bottom:height-132},inspector={left:10,top:145,right:730,bottom:height-58};
  const dock={left:12,top:height-48-(inspector.bottom-inspector.top)-24-154,right:Math.min(720,width-250),bottom:height-48-(inspector.bottom-inspector.top)-24};
  const limits=sharedHudLimits({resource,headingHeight:29,dock,inspector,inspectorMinimum:300,inspectorGap:14,gap});
  expect(limits.crowded).toBe(false);
  const actualInspector={...inspector,top:inspector.bottom-Math.min(inspector.bottom-inspector.top,limits.inspectorMaxHeight!)};
  const actualDock={...dock,top:dock.top+actualInspector.top-inspector.top,bottom:dock.bottom+actualInspector.top-inspector.top};
  const actualResource={...resource,bottom:resource.top+limits.resourceMaxHeight!};
  expect(actualResource.bottom+gap).toBeLessThanOrEqual(actualDock.top+.001);
  const obstacles=[actualResource,actualDock,actualInspector,{left:247,top:14,right:width-236,bottom:104},{left:width-234,top:height-290,right:width-15,bottom:height-52}];
  const input:HoverSpaceInput={bounds:{left:8,top:8,right:width-8,bottom:height-56},dock:actualDock,obstacles,maxWidth:560,minWidth:168,minHeight:30,gap};
  const widths=mapHoverProbeWidths(input);expect(widths.length).toBeLessThanOrEqual(4);
  const result=placeMapHover(input,widths.map(width=>({width,height:width>=350?84:138})));
  expect(result.kind).toBe('placed');if(result.kind!=='placed')return;
  expect(result.placement.left).toBeGreaterThanOrEqual(8);expect(result.placement.bottom).toBeLessThanOrEqual(height-56);
  for(const obstacle of obstacles)expect(intersects(result.placement,expand(obstacle,gap))).toBe(false);
});

test('V380 long content keeps every line in a free scroll region; returning room selects whole text',()=>{
  const input:HoverSpaceInput={bounds:{left:0,top:0,right:800,bottom:500},dock:{left:0,top:420,right:210,bottom:500},obstacles:[{left:0,top:0,right:210,bottom:500},{left:600,top:0,right:800,bottom:500}],maxWidth:380,minWidth:180,minHeight:30,gap:8};
  const result=placeMapHover(input,[{width:360,height:1000}]);expect(result.kind).toBe('placed');
  if(result.kind==='placed'){expect(result.placement.mode).toBe('scroll');expect(result.placement.contentHeight).toBe(1000);expect(result.placement.height).toBeLessThan(1000);}
  const short=placeMapHover(input,[{width:360,height:80}]);expect(short.kind==='placed'&&short.placement.mode).toBe('whole');
  const blocked=placeMapHover({...input,obstacles:[input.bounds]},[{width:360,height:80}]);expect(blocked.kind).toBe('reservation-required');
});

test('V380 resource height cap is released when dock occupies another horizontal band; impossible footprints are explicit',()=>{
  const resource={left:18,top:18,right:234,bottom:600};
  expect(sharedHudLimits({resource,headingHeight:29,dock:{left:300,top:20,right:500,bottom:120},inspectorMinimum:300,inspectorGap:14,gap:8})).toEqual({crowded:false});
  const result=sharedHudLimits({resource,headingHeight:29,dock:{left:12,top:10,right:600,bottom:164},inspector:{left:10,top:178,right:730,bottom:350},inspectorMinimum:300,inspectorGap:14,gap:8});
  expect(result.crowded).toBe(true);expect(result.inspectorMaxHeight).toBe(300);
});


test('V380 r03 cap ignores stale inspector top and dock position, retaining one fixed declared separation',()=>{
  const resource={left:12,top:12,right:236,bottom:600},bottom=626;
  const inputs=[
    {inspectorTop:169,dockTop:39,dockBottom:139},
    {inspectorTop:149,dockTop:59,dockBottom:159},
    {inspectorTop:169,dockTop:59,dockBottom:159},
    {inspectorTop:149,dockTop:39,dockBottom:139},
  ];
  const expected=bottom-resource.top-29-8-100-10;
  for(const old of inputs){
    const limits=sharedHudLimits({resource,headingHeight:29,
      dock:{left:12,top:old.dockTop,right:720,bottom:old.dockBottom},
      inspector:{left:12,top:old.inspectorTop,right:732,bottom},inspectorMinimum:300,inspectorGap:10,gap:8});
    expect(limits.inspectorMaxHeight).toBe(expected);
    expect(limits.resourceMaxHeight).toBe(29);
    expect(limits.crowded).toBe(false);
  }
});
