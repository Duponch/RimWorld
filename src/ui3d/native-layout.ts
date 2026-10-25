import type {NativeControl,NativeControlStyle,NativePage,NativeRow} from './native-contract';

/** CSS-pixel design tokens; neither browser layout nor DPR changes the model. */
export const NATIVE_UI={body:13,small:12,title:18,line:18,padding:12,gap:8,button:32,tab:32,scrollbar:10,bottom:82} as const;
export type NativeRegion='navigation'|'catalogue'|'details'|'graph';
export interface NativeRect {x:number;y:number;width:number;height:number}
/** Region y is absolute in the page. Row/control y remains relative to header. */
export interface NativeRegionBox extends NativeRect {contentHeight:number;contentWidth?:number}
export interface NativeControlBox extends NativeRect {control:NativeControl;style:NativeControlStyle}
export interface NativeInspectorParts {sheet:NativeRect;tabs:NativeRect;summary:NativeRect;actions:NativeRect}
export interface NativeRowBox {
  row:NativeRow;x:number;top:number;width:number;height:number;labelWidth:number;
  controlTop:number;controlHeight:number;controlColumns:number;detailLines:string[];
  labelLines:string[];valueLines:string[];matrix:boolean;controls:NativeControlBox[];
}
export interface NativePageBox {
  x:number;y:number;width:number;height:number;header:number;footer:number;body:NativeRect;
  contentHeight:number;rows:NativeRowBox[];layout:NonNullable<NativePage['layout']>;
  regions:Partial<Record<NativeRegion,NativeRegionBox>>;actions:NativeControlBox[];
  inspectorParts?:NativeInspectorParts;
}
export type TextMeasure=(text:string,size:number,bold?:boolean)=>number;
export function wrapNativeText(text:string,width:number,measure:TextMeasure,size=13):string[]{
  const lines:string[]=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      const next=line?line+' '+word:word;
      if(line&&measure(next,size)>width){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
  }
  return lines;
}
function naturalWidth(control:NativeControl,measure:TextMeasure,style:NativeControlStyle):number {
  if(style==='icon')return 48;
  if(style==='navigation')return 200;
  if(style==='tab')return Math.max(64,Math.min(120,measure(control.label,13,true)+20));
  if(!control.select&&!control.caption&&/^[↶↷×+−-]$/u.test(control.label))return 32;
  return Math.max(64,Math.min(220,measure(control.label,13,true)+24+(control.icon?24:0)+(control.select?16:0)));
}
/** Text actions use intrinsic width. Only named matrices and tile grids fill cells. */
export function flowNativeControls(controls:readonly NativeControl[],rect:NativeRect,measure:TextMeasure,style:NativeControlStyle='button',tileColumnLimit?:number):{controls:NativeControlBox[];height:number}{
  const boxes:NativeControlBox[]=[];
  if(!controls.length)return {controls:boxes,height:0};
  const gap=style==='icon'?6:style==='tile'?12:style==='navigation'?9:NATIVE_UI.gap;
  if(style==='navigation'){
    controls.forEach((control,index)=>boxes.push({control,style:control.presentation??style,x:rect.x,y:rect.y+index*(54+gap),width:rect.width,height:54}));
    return {controls:boxes,height:controls.length*54+(controls.length-1)*gap};
  }
  if(style==='tile'){
    const fit=rect.width>=460?4:rect.width>=340?3:rect.width>=220?2:1;
    const columns=Math.min(fit,Math.max(1,tileColumnLimit??fit));
    const width=(rect.width-gap*(columns-1))/columns,height=148;
    controls.forEach((control,index)=>boxes.push({control,style:control.presentation??style,x:rect.x+(index%columns)*(width+gap),y:rect.y+Math.floor(index/columns)*(height+gap),width,height}));
    return {controls:boxes,height:Math.ceil(controls.length/columns)*(height+gap)-gap};
  }
  let x=rect.x,y=rect.y,lineHeight=0;
  for(const control of controls){
    const actualStyle=control.presentation??style,width=Math.min(rect.width,naturalWidth(control,measure,actualStyle));
    const height=actualStyle==='icon'?46:actualStyle==='tab'?NATIVE_UI.tab:control.caption?40:NATIVE_UI.button;
    if(x>rect.x&&x+width>rect.x+rect.width+.01){x=rect.x;y+=lineHeight+gap;lineHeight=0;}
    boxes.push({control,style:actualStyle,x,y,width,height});x+=width+gap;lineHeight=Math.max(lineHeight,height);
  }
  return {controls:boxes,height:y-rect.y+lineHeight};
}
function rowBox(row:NativeRow,x:number,top:number,width:number,measure:TextMeasure,table:boolean,tileColumnLimit?:number):NativeRowBox {
  const matrix=!!row.compact&&!!row.controls?.length&&table;
  const isTabs=row.controlStyle==='tab'||row.id==='pawn-tabs'||row.id==='health-tabs';
  const labelWidth=row.labelWidth??(matrix?104:Math.min(180,width*.43));
  let labelLines=wrapNativeText(row.label,row.value||row.input||row.meter?labelWidth:width,measure,13);
  const valueLines=row.value?wrapNativeText(row.value,Math.max(60,width-labelWidth-8),measure,13):[];
  const detailLines=row.detail?wrapNativeText(row.detail,width,measure,12):[];
  let height=Math.max(22,Math.max(labelLines.length,valueLines.length)*NATIVE_UI.line+4);
  let controlTop=0,controlHeight:number=NATIVE_UI.button,controlColumns=row.controls?.length??0,controls:NativeControlBox[]=[];
  if(row.emphasis==='heading')height=row.id==='heading-bio-skills'?22:28;
  if(row.columns)height=44;
  else if(matrix){
    height=row.controls!.some(control=>control.caption)?44:38;controlHeight=height-4;controlTop=2;
    const tail=row.value?142:0,left=x+104,available=Math.max(1,width-104-tail),gap=4;
    const cell=(available-gap*(controlColumns-1))/controlColumns;
    controls=row.controls!.map((control,index)=>({control,style:control.presentation??'button',x:left+index*(cell+gap),y:top+2,width:Math.max(1,cell),height:controlHeight}));
  }else if(row.meter)height=row.meter.secondary?28:row.dense?19:26;
  else if(row.input){
    height=Math.max(32,labelLines.length*18+4);controlHeight=26;controlTop=2;
    const count=row.controls?.length??0,left=x+width-Math.max(0,count*28-2);
    controls=(row.controls??[]).map((control,index)=>({control,style:control.presentation??'button',x:left+index*28,y:top+2,width:26,height:26}));
  }
  else if(row.controls?.length){
    const onlyButtons=!row.label&&!row.value&&!row.detail||isTabs;
    const plainFlow=onlyButtons&&!!row.controlStyle;
    const inline=!row.detail&&(!!row.compact||row.controls.length<=2&&measure(row.label,13)<width*.35&&row.controls.every(control=>naturalWidth(control,measure,'button')<width*.3));
    if(onlyButtons||inline){
      if(row.label&&!onlyButtons)labelLines=wrapNativeText(row.label,labelWidth-5,measure,13);
      controlTop=isTabs||plainFlow?0:2;
    }else controlTop=height+detailLines.length*16+8;
    const left=inline&&row.label&&!onlyButtons?x+labelWidth+6:x;
    const flow=flowNativeControls(row.controls,{x:left,y:top+controlTop,width:Math.max(1,width-(left-x)),height:0},measure,isTabs?'tab':row.controlStyle??'button',tileColumnLimit);
    controls=flow.controls;controlHeight=controls[0]?.height??NATIVE_UI.button;
    controlColumns=controls.filter(control=>control.y===controls[0]?.y).length;
    height=isTabs||plainFlow?flow.height:Math.max(labelLines.length*18+4,controlTop+flow.height+(onlyButtons?6:8));
  }
  if(detailLines.length&&!row.controls?.length)height+=detailLines.length*16+4;
  return {row,x,top,width,height,labelWidth,controlTop,controlHeight,controlColumns,detailLines,labelLines,valueLines,matrix,controls};
}
const requestedWidth=(page:NativePage,fallback:number)=>page.width?(page.width>20?page.width:page.width*100):fallback;
function regionRows(page:NativePage,regions:Partial<Record<NativeRegion,NativeRegionBox>>,header:number,measure:TextMeasure,tileColumnLimit?:number):NativeRowBox[]{
  const rows:NativeRowBox[]=[],tops:Partial<Record<NativeRegion,number>>={};
  for(const row of page.rows){
    const key=row.region??'details',region=regions[key];if(!region)continue;
    const top=tops[key]??0,usableWidth=Math.max(24,region.width-12);
    if(key==='graph'&&row.graphNode){
      const node=row.graphNode,nodeTop=region.y-header+node.y,x=region.x+node.x;
      const box=rowBox(row,x,nodeTop,node.width,measure,false);box.width=node.width;box.height=node.height;
      box.controls=(row.controls??[]).map((control,index)=>({control,style:index===0?'research':'icon',x:index===0?x:x+node.width-24,y:index===0?nodeTop:nodeTop+node.height-26,width:index===0?node.width:22,height:index===0?node.height:19}));
      rows.push(box);region.contentHeight=Math.max(region.contentHeight,node.y+node.height);continue;
    }
    const box=rowBox(row,region.x,region.y-header+top,usableWidth,measure,false,tileColumnLimit);rows.push(box);
    tops[key]=top+box.height;region.contentHeight=tops[key]!;
  }
  return rows;
}
function structuredPage(page:NativePage,viewport:{width:number;height:number},measure:TextMeasure,layout:'architect'|'research'):NativePageBox {
  const pad=12,gap=14,width=Math.max(280,Math.min(requestedWidth(page,layout==='architect'?1420:1190),viewport.width-32));
  const header=48,bottom=NATIVE_UI.bottom+12;
  let height=Math.max(180,Math.min(page.height??(layout==='architect'?900:720),viewport.height-(layout==='architect'?254:214)));
  const body:NativeRect={x:pad,y:header,width:width-pad*2,height:height-header-pad};
  const regions:Partial<Record<NativeRegion,NativeRegionBox>>={};
  if(layout==='architect'){
    const navWidth=Math.min(viewport.width>1280?222:viewport.width>980?196:154,Math.max(96,width*.3));
    regions.navigation={x:pad,y:header,width:navWidth,height:body.height,contentHeight:0};
    const catalogueX=pad+navWidth+gap,remaining=width-pad-catalogueX;
    if(width<740){
      const detailsHeight=Math.min(190,Math.max(110,body.height*.29)),catalogueHeight=Math.max(48,body.height-detailsHeight-10);
      regions.catalogue={x:catalogueX,y:header,width:remaining,height:catalogueHeight,contentHeight:0};
      regions.details={x:catalogueX,y:header+catalogueHeight+10,width:remaining,height:detailsHeight,contentHeight:0};
    }else{
      const detailsWidth=viewport.width>1280?258:viewport.width>980?226:194;
      regions.catalogue={x:catalogueX,y:header,width:remaining-detailsWidth-gap,height:body.height,contentHeight:0};
      regions.details={x:width-pad-detailsWidth,y:header,width:detailsWidth,height:body.height,contentHeight:0};
    }
  }else{
    const sidebar=Math.min(viewport.width>760?260:220,Math.max(120,width*.4));
    const graphX=pad+sidebar+12,graphWidth=Math.max(60,width-pad-graphX);
    regions.details={x:pad,y:header,width:sidebar,height:body.height,contentHeight:0};
    regions.navigation={x:graphX,y:header,width:graphWidth,height:32,contentHeight:0};
    regions.graph={x:graphX,y:header+38,width:graphWidth,height:Math.max(50,body.height-38),contentHeight:page.research?.height??815,contentWidth:page.research?.width??850};
  }
  const tileColumnLimit=viewport.width<=760?2:viewport.width<=980?3:4;
  const rows=regionRows(page,regions,header,measure,tileColumnLimit);
  // On three-column workbenches the longest real column determines the sheet.
  // Keep the already bounded stacked layout on small screens; changing its
  // body height would otherwise also move the lower options region.
  if(layout==='architect'&&width>=740){
    const content=Math.max(0,...Object.values(regions).map(region=>region.contentHeight));
    const compactHeight=Math.max(180,header+pad+content);
    if(compactHeight<height){height=compactHeight;for(const region of Object.values(regions))region.height=height-header-pad;}
  }
  const primary=regions[layout==='architect'?'catalogue':'details']!;
  return {x:12,y:viewport.height-bottom-height,width,height,header,footer:pad,body:{x:primary.x,y:primary.y,width:primary.width,height:primary.height},contentHeight:primary.contentHeight,rows,layout,regions,actions:[]};
}
/** Keep the dossier above its tabs and the portrait/action strip below them. */
function inspectorPage(page:NativePage,viewport:{width:number;height:number},measure:TextMeasure):NativePageBox {
  const width=Math.max(220,Math.min(requestedWidth(page,580),viewport.width-32)),pad=NATIVE_UI.padding,header=34;
  const bodyX=pad,contentWidth=width-pad*2-12,tabsRow=page.rows.find(row=>row.id==='pawn-tabs')!;
  const tabsBox=rowBox(tabsRow,bodyX,0,contentWidth,measure,false);
  const rows:NativeRowBox[]=[];let top=0,left=0,right=0,columns=false;
  for(const row of page.rows){
    if(row===tabsRow)continue;
    if(row.column!==undefined&&!columns){columns=true;left=right=top;}
    else if(row.column===undefined&&columns){columns=false;top=Math.max(left,right);}
    const ratio=page.columnRatio??.5,columnWidth=columns?(row.column===1?contentWidth*(1-ratio)-5:contentWidth*ratio-5):contentWidth;
    const x=bodyX+(columns&&row.column===1?contentWidth*ratio+5:0),rowTop=columns?(row.column===1?right:left):top;
    const box=rowBox(row,x,rowTop,columnWidth,measure,false);rows.push(box);
    if(columns){if(row.column===1)right+=box.height;else left+=box.height;}else top+=box.height;
  }
  const contentHeight=Math.max(top,left,right),bottom=NATIVE_UI.bottom+10;
  const stripWidth=width-pad*2,summaryWidth=Math.min(width<=540?188:width<=600?218:240,Math.max(100,stripWidth*.42));
  const actionsX=pad+summaryWidth+12,actionsWidth=Math.max(64,width-pad-actionsX),cellWidth=Math.max(24,(actionsWidth-8)/2);
  const actions:NativeControlBox[]=[];let actionTop=4;
  for(let index=0;index<(page.actions?.length??0);index+=2){
    const pair=(page.actions??[]).slice(index,index+2);let rowHeight=32;
    for(let column=0;column<pair.length;column++){
      const control=pair[column]!,style=control.presentation??'button',buttonWidth=Math.min(cellWidth,naturalWidth(control,measure,style));
      const textWidth=Math.max(12,buttonWidth-24-(control.icon?24:0)-(control.select?16:0));
      const height=wrapNativeText(control.label,textWidth,measure,13).length>1?40:32;
      actions.push({control,style,x:actionsX+column*(cellWidth+8),y:actionTop,width:buttonWidth,height});rowHeight=Math.max(rowHeight,height);
    }
    actionTop+=rowHeight+8;
  }
  const stripHeight=Math.max(88,actions.length?actionTop-4:0);
  const legacyActionFlow=flowNativeControls(page.actions??[],{x:pad,y:0,width:stripWidth,height:0},measure);
  const legacyFooter=page.actions?.length?legacyActionFlow.height+8:10;
  const legacyMax=Math.max(150,Math.min(page.height??520,viewport.height-bottom-130));
  // Removing the old in-body tabs preserves the former visible dossier extent.
  // The extra height is confined to the separated tabs and action/portrait strip.
  const legacyHeader=page.subtitle?58:42;
  const bodyCapacity=Math.max(40,legacyMax-legacyHeader-legacyFooter-tabsBox.height);
  const bodyHeight=Math.max(40,Math.min(contentHeight,bodyCapacity));
  const sheet:NativeRect={x:0,y:0,width,height:header+bodyHeight+8};
  const tabs:NativeRect={x:pad,y:sheet.height+4,width:contentWidth,height:tabsBox.height};
  const stripY=tabs.y+tabs.height+4;
  const summary:NativeRect={x:pad,y:stripY,width:summaryWidth,height:stripHeight};
  const actionRect:NativeRect={x:actionsX,y:stripY,width:actionsWidth,height:stripHeight};
  const height=stripY+stripHeight,footer=height-header-bodyHeight;
  const tabsTop=tabs.y-header;
  if(tabsBox.row.region!=='navigation')tabsBox.row={...tabsRow,region:'navigation'};
  tabsBox.top=tabsTop;tabsBox.controls=tabsBox.controls.map(control=>({...control,y:control.y+tabsTop}));
  actions.forEach(control=>control.y+=stripY-header);
  return {x:12,y:viewport.height-bottom-height,width,height,header,footer,body:{x:bodyX,y:header,width:contentWidth,height:bodyHeight},contentHeight,rows:[tabsBox,...rows],layout:'inspector',regions:{navigation:{...tabs,contentHeight:tabs.height}},actions,inspectorParts:{sheet,tabs,summary,actions:actionRect}};
}
export function layoutNativePage(page:NativePage,viewport:{width:number;height:number},front:boolean,measure:TextMeasure):NativePageBox {
  const layout=page.layout??(front?'front':page.id.startsWith('inspect-')?'inspector':['work','schedule','animals','wildlife','assign','history'].includes(page.id)?'table':'dialog');
  if(layout==='architect'||layout==='research')return structuredPage(page,viewport,measure,layout);
  if(layout==='inspector'&&page.portrait&&page.rows.some(row=>row.id==='pawn-tabs'))return inspectorPage(page,viewport,measure);
  if(layout==='palette'){
    const x=Math.min(128,Math.max(12,viewport.width-120)),width=Math.max(48,Math.min(requestedWidth(page,600),viewport.width-x-16));
    const rows:NativeRowBox[]=[];let top=0;
    for(const row of page.rows){const box=rowBox(row,0,top,width,measure,false);rows.push(box);top+=box.height;}
    const height=Math.max(46,top),body={x:0,y:0,width,height};
    return {x,y:viewport.height-NATIVE_UI.bottom-12-height-(page.palette==='orders'?54:0),width,height,header:0,footer:0,body,contentHeight:height,rows,layout,regions:{catalogue:{...body,contentHeight:height}},actions:[]};
  }
  let requested=requestedWidth(page,layout==='inspector'?580:layout==='tools'?310:front?760:680);
  if(page.id==='menu')requested=328;if(page.id==='history')requested=548;if(page.id==='animals')requested=738;
  const width=Math.max(220,Math.min(requested,viewport.width-32)),pad=NATIVE_UI.padding;
  const visual=page.visual?Math.min(330,width*.42):0,contentWidth=width-pad*2-(visual?visual+10:0)-12,bodyX=pad+visual+(visual?10:0);
  const header=page.portrait||page.subtitle?58:42;
  const actionFlow=flowNativeControls(page.actions??[],{x:pad,y:0,width:width-pad*2,height:0},measure);
  const footer=page.actions?.length?actionFlow.height+8:10;
  const rows:NativeRowBox[]=[];let top=0,left=0,right=0,columns=false;
  for(const row of page.rows){
    if(row.column!==undefined&&!columns){columns=true;left=right=top;}
    else if(row.column===undefined&&columns){columns=false;top=Math.max(left,right);}
    const ratio=page.columnRatio??.5,columnWidth=columns?(row.column===1?contentWidth*(1-ratio)-5:contentWidth*ratio-5):contentWidth;
    const x=bodyX+(columns&&row.column===1?contentWidth*ratio+5:0),rowTop=columns?(row.column===1?right:left):top;
    const box=rowBox(row,x,rowTop,columnWidth,measure,layout==='table');rows.push(box);
    if(columns){if(row.column===1)right+=box.height;else left+=box.height;}else top+=box.height;
  }
  const contentHeight=Math.max(top,left,right),bottom=front?20:NATIVE_UI.bottom+10;
  const maxHeight=Math.max(150,Math.min(page.height??(front?760:layout==='inspector'?520:layout==='tools'?520:640),viewport.height-bottom-(front?20:130)));
  const height=Math.min(maxHeight,Math.max(header+footer+40,header+contentHeight+footer+8,page.visual?440:0));
  const actions=actionFlow.controls.map(control=>({...control,y:height-header-footer+4+control.y}));
  const x=front?(viewport.width-width)/2:12,y=front?(viewport.height-height)/2:viewport.height-bottom-height;
  return {x,y,width,height,header,footer,body:{x:bodyX,y:header,width:contentWidth,height:height-header-footer},contentHeight,rows,layout,regions:{},actions};
}
