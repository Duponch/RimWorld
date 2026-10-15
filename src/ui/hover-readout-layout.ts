import type {Cell} from '../sim/types';
import {HoverReadoutHold,mapHoverProbeWidths,placeMapHover,sharedHudLimits,type HoverRect,type HoverSpaceInput} from './hover-space';

export type HoverReadoutMode='whole'|'scroll'|'panel';
interface ReadoutPlacement {left:number;top:number;width:number;height:number}
/** Commit the measured width unchanged: rounding it afterwards could wrap an
 * extra line into a whole readout whose pointer input is deliberately disabled.
 * Returning to whole also ends the old reading interaction synchronously. */
export function commitHoverReadoutPlacement(readout:HTMLElement,placement:ReadoutPlacement,mode:HoverReadoutMode,stopReading:()=>void):void {
  if(mode==='whole'){
    const focused=document.activeElement;
    if(focused instanceof HTMLElement&&readout.contains(focused))focused.blur();
    stopReading();
  }
  if(readout.dataset.hoverLayout!==mode)readout.dataset.hoverLayout=mode;
  for(const [key,value] of Object.entries(placement)){
    const pixels=`${value}px`;
    if(readout.style.getPropertyValue(key)!==pixels)readout.style.setProperty(key,pixels);
  }
  readout.tabIndex=mode==='whole'?-1:0;
}

interface HoverLayoutOptions {cell:()=>Cell|null;refresh:()=>void}
/** Layout reads are batched after UI/resize/font events. The caller signals only
 * changed text/visibility; pointer/RAF/snapshot paths perform no measurement. */
export function installHoverReadoutLayout(shell:HTMLElement,options:HoverLayoutOptions){
  const readout=shell.querySelector<HTMLElement>('#map-hover-readout')!;
  const resources=shell.querySelector<HTMLElement>('.resource-list')!;
  const inspector=shell.querySelector<HTMLElement>('#inspector')!;
  const dock=shell.querySelector<HTMLElement>('.map-tools-dock')!;
  const viewport=shell.querySelector<HTMLElement>('#viewport')!;
  const hold=new HoverReadoutHold<Cell>();
  let queued=false,lastKey='',inside=false;
  const probe=document.createElement('aside');probe.className='map-hover-layout-probe';probe.setAttribute('aria-hidden','true');
  Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',visibility:'hidden',pointerEvents:'none',height:'auto',maxHeight:'none',boxSizing:'border-box',padding:'6px',border:'0',overflowY:'scroll',scrollbarGutter:'stable',overflowWrap:'anywhere'});
  shell.append(probe);
  const set=(node:HTMLElement,key:string,value:string)=>{if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);};
  const remove=(node:HTMLElement,key:string)=>{if(node.style.getPropertyValue(key))node.style.removeProperty(key);};
  // Retire legacy runtime heights as well as their removed writers/readers.
  remove(shell,'--hover-inspector-height');remove(shell,'--map-tools-height');
  const release=()=>{if(hold.release())options.refresh();};
  const visible=(node:HTMLElement)=>!node.hidden&&node.getClientRects().length>0;
  const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;layout();});};
  const fixed=[...shell.querySelectorAll<HTMLElement>('#colonists,.corner-tools,#alerts,.time-panel,.main-tabs,#pause-banner,#notice,.diagnostics,#map-cell-details,.management-panel')];
  const local=(node:HTMLElement,bounds:DOMRect):HoverRect=>{const r=node.getBoundingClientRect();return {left:r.left-bounds.left,top:r.top-bounds.top,right:r.right-bounds.left,bottom:r.bottom-bounds.top};};
  function layout():void{
    if(!shell.isConnected||!visible(shell)){
      remove(shell,'--hud-inspector-max-height');remove(shell,'--hud-map-tools-bottom');remove(resources,'--hud-resource-max-height');return;
    }
    const bounds=shell.getBoundingClientRect(),dockStyle=getComputedStyle(dock),gap=Math.max(4,parseFloat(dockStyle.rowGap)||8);
    const declaredInspectorGap=parseFloat(dockStyle.getPropertyValue('--hud-inspector-gap'));
    const inspectorGap=Number.isFinite(declaredInspectorGap)?Math.max(0,declaredInspectorGap):10;
    const summary=resources.querySelector<HTMLElement>('.resource-ledger-group:not([hidden])>.resource-ledger-heading');
    const heading=summary?.getBoundingClientRect().height??29;
    // This task is the sole geometry writer. Reserve from anchored bottom,
    // stable CSS gap and dock height; never feed a lagged dock pose into cap.
    const hasResources=visible(resources),hasDock=visible(dock),hasInspector=visible(inspector);
    let minimum=0;
    if(hasResources&&hasDock){
      if(hasInspector){
        minimum=Math.min(inspector.getBoundingClientRect().height,64);
        const page=inspector.querySelector<HTMLElement>('.colonist-inspector-pages');
        if(page){
          const scroll=page.parentElement!,style=getComputedStyle(scroll),pageStyle=getComputedStyle(page);
          minimum=(parseFloat(pageStyle.minHeight)||0)+[...scroll.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&node!==page&&visible(node)).reduce((sum,node)=>sum+node.getBoundingClientRect().height,0)
            +(Math.max(0,scroll.children.length-1))*(parseFloat(style.rowGap)||0);
        }
      }
      const limits=sharedHudLimits({resource:local(resources,bounds),headingHeight:heading,dock:local(dock,bounds),...hasInspector?{inspector:local(inspector,bounds)}:{},inspectorMinimum:minimum,inspectorGap,gap});
      if(limits.inspectorMaxHeight!==undefined)set(shell,'--hud-inspector-max-height',`${Math.floor(limits.inspectorMaxHeight)}px`);else remove(shell,'--hud-inspector-max-height');
    }else remove(shell,'--hud-inspector-max-height');
    // Commit cap -> inspector pose -> dock pose synchronously, even if the
    // resource ledger is empty/hidden. No historical observer writes heights.
    if(hasDock&&hasInspector){
      const actual=local(inspector,bounds);
      set(shell,'--hud-map-tools-bottom',`${bounds.height-actual.top+inspectorGap}px`);
    }else remove(shell,'--hud-map-tools-bottom');
    if(hasResources&&hasDock){
      const final=local(dock,bounds),resource=local(resources,bounds);
      const cap=sharedHudLimits({resource,headingHeight:heading,dock:final,inspectorMinimum:minimum,inspectorGap,gap}).resourceMaxHeight;
      if(cap!==undefined)set(resources,'--hud-resource-max-height',`${Math.floor(cap)}px`);else remove(resources,'--hud-resource-max-height');
    }else remove(resources,'--hud-resource-max-height');
    if(!visible(readout))return;
    const obstacles:HoverRect[]=[];
    const add=(node:HTMLElement)=>{if(visible(node))obstacles.push(local(node,bounds));};
    fixed.forEach(add);add(resources);
    for(const node of dock.querySelectorAll<HTMLElement>('.map-tools-heading,.map-tools-tray'))add(node);
    if(visible(inspector)){
      if(inspector.classList.contains('colonist-inspector-host'))inspector.querySelectorAll<HTMLElement>('.colonist-inspector-pages,.colonist-inspector-tabs button,.colonist-inspector-summary,.colonist-inspector-actions').forEach(add);
      else add(inspector);
    }
    // The contextual menu belongs to body rather than the game shell.
    document.querySelectorAll<HTMLElement>('.order-menu').forEach(add);
    const font=getComputedStyle(readout),fontSize=parseFloat(font.fontSize)||13,lineHeight=parseFloat(font.lineHeight)||fontSize*1.35;
    const tabs=shell.querySelector<HTMLElement>('.main-tabs'),bottom=tabs&&visible(tabs)?local(tabs,bounds).top-gap:bounds.height-gap;
    const useful={left:gap,top:gap,right:bounds.width-gap,bottom};
    const maxWidth=Math.max(1,Math.min(560,useful.right-useful.left));
    const input:HoverSpaceInput={bounds:useful,dock:visible(dock)?local(dock,bounds):{left:gap,top:bottom,right:gap+1,bottom:bottom+1},obstacles,maxWidth,minWidth:Math.min(maxWidth,fontSize*12+12),minHeight:lineHeight+12,gap};
    const key=JSON.stringify([input,readout.textContent,font.font,font.letterSpacing,lineHeight]);
    if(key===lastKey)return;lastKey=key;
    probe.style.font=font.font;probe.style.lineHeight=font.lineHeight;probe.style.letterSpacing=font.letterSpacing;
    probe.replaceChildren(...[...readout.children].map(node=>node.cloneNode(true)));
    const metrics=mapHoverProbeWidths(input).map(width=>{probe.style.width=`${width}px`;return {width,height:Math.ceil(probe.getBoundingClientRect().height)};});
    const result=placeMapHover(input,metrics);
    // At sub-HUD viewport sizes an explicit reading panel remains visible and
    // scrollable above the HUD. Never replace insufficient space by hidden text.
    const panel=result.kind!=='placed';
    const placement=result.kind==='placed'?result.placement:{left:useful.left,top:useful.top,width:maxWidth,height:Math.max(lineHeight+12,(useful.bottom-useful.top)/2),mode:'scroll' as const};
    const mode=panel?'panel':placement.mode;
    commitHoverReadoutPlacement(readout,{left:placement.left,top:placement.top,width:placement.width,height:placement.height},mode,()=>{inside=false;release();});
  }
  const resize=new ResizeObserver(schedule);
  [shell,resources,inspector,dock,...fixed].forEach(node=>resize.observe(node));
  // Visibility and dossier selection can move the dock without resizing it.
  // Observe only those owners, not a general HUD subtree or simulation content.
  const inspectorChildren=new Set<HTMLElement>();
  const watchInspector=()=>{
    const next=new Set(inspector.querySelectorAll<HTMLElement>('.colonist-inspector-pages,.colonist-inspector-tabs,.colonist-inspector-footer'));
    for(const node of inspectorChildren)if(!next.has(node)){resize.unobserve(node);inspectorChildren.delete(node);}
    for(const node of next)if(!inspectorChildren.has(node)){inspectorChildren.add(node);resize.observe(node);}
  };
  const visibility=new MutationObserver(()=>{watchInspector();schedule();});
  [inspector,dock,...fixed].forEach(node=>visibility.observe(node,{attributes:true,attributeFilter:['hidden','class','style'],...node===inspector?{childList:true}:{}}));
  watchInspector();
  const menuObserver=new MutationObserver(schedule);
  const menus=new Set<HTMLElement>();
  const watchMenus=()=>{document.querySelectorAll<HTMLElement>('.order-menu').forEach(node=>{if(!menus.has(node)){menus.add(node);resize.observe(node);menuObserver.observe(node,{attributes:true,attributeFilter:['hidden','style','class']});}});};
  // OrderMenu's root is resident, created before this installer.
  watchMenus();
  shell.addEventListener('pointerout',event=>{
    if(readout.hidden||readout.dataset.hoverLayout==='whole'||!(event.target instanceof Node)||!viewport.contains(event.target)||!(event.relatedTarget instanceof Node)||!readout.contains(event.relatedTarget))return;
    const cell=options.cell();if(cell)hold.enter({...cell});inside=true;
  },true);
  readout.addEventListener('pointerenter',()=>{inside=true;});
  readout.addEventListener('pointerleave',()=>{inside=false;if(!readout.contains(document.activeElement))release();});
  readout.addEventListener('focusin',()=>{if(readout.dataset.hoverLayout==='whole')return;const cell=options.cell();if(cell)hold.enter({...cell});});
  readout.addEventListener('focusout',()=>queueMicrotask(()=>{if(!inside&&!readout.contains(document.activeElement))release();}));
  readout.addEventListener('keydown',event=>{
    if(readout.dataset.hoverLayout==='whole')return;
    if(event.key==='Escape'){inside=false;release();readout.blur();return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key))event.stopPropagation();
  });
  readout.addEventListener('wheel',event=>{if(readout.dataset.hoverLayout!=='whole')event.stopPropagation();},{passive:true});
  document.addEventListener('toggle',event=>{if(event.target instanceof HTMLDialogElement&&event.target.open)release();schedule();},true);
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
  window.addEventListener('blur',()=>{inside=false;release();});
  document.fonts.addEventListener('loadingdone',schedule);
  schedule();
  return {get retainedCell(){return hold.retained;},changed:schedule,resume(){inside=false;release();},reset(){inside=false;release();lastKey='';schedule();}};
}
