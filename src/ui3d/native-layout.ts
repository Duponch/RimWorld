import type {NativePage,NativeRow} from './native-contract';

/** CSS-pixel design tokens, independent of the camera, DPR and DOM layout. */
export const NATIVE_UI={body:13,small:11.5,title:17,line:17,padding:12,gap:6,button:26,tab:28,scrollbar:10,bottom:82} as const;
export interface NativeRowBox {row:NativeRow;x:number;top:number;width:number;height:number;labelWidth:number;controlTop:number;controlHeight:number;controlColumns:number;detailLines:string[];labelLines:string[];valueLines:string[];matrix:boolean;}
export interface NativePageBox {x:number;y:number;width:number;height:number;header:number;footer:number;body:{x:number;y:number;width:number;height:number};contentHeight:number;rows:NativeRowBox[];layout:NonNullable<NativePage['layout']>;}
export type TextMeasure=(text:string,size:number,bold?:boolean)=>number;
export function wrapNativeText(text:string,width:number,measure:TextMeasure,size=13):string[]{
 const lines:string[]=[];
 for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){const next=line?`${line} ${word}`:word;if(line&&measure(next,size)>width){lines.push(line);line=word;}else line=next;}lines.push(line);}
 return lines;
}
function rowBox(row:NativeRow,x:number,top:number,width:number,measure:TextMeasure,table:boolean):NativeRowBox {
 const matrix=!!row.compact&&!!row.controls?.length&&table;
 const labelWidth=row.labelWidth??(matrix?104:Math.min(180,width*.43));
 let labelLines=wrapNativeText(row.label,row.value||row.input||row.meter?labelWidth:width,measure,13);
 const valueLines=row.value?wrapNativeText(row.value,Math.max(60,width-labelWidth-8),measure,13):[];
 const detailLines=row.detail?wrapNativeText(row.detail,width,measure,12):[];
 let height=Math.max(20,Math.max(labelLines.length,valueLines.length)*17+3),controlTop=0,controlHeight=26,controlColumns=row.controls?.length??0;
 if(row.emphasis==='heading')height=24;
 if(row.columns)height=38;
 else if(matrix){height=row.controls?.some(c=>c.caption)?40:30;controlHeight=height-4;}
 else if(row.meter)height=row.meter.secondary?28:row.dense?19:26;
 else if(row.input){height=Math.max(30,labelLines.length*17+3);controlHeight=24;}
 else if(row.controls?.length){
  const onlyButtons=!row.label&&!row.value&&!row.detail||row.id==='pawn-tabs'||row.id==='health-tabs';
  const inline=!!row.compact&&!row.detail||row.controls.length<=2&&!row.detail&&measure(row.label,13)<width*.35&&row.controls.every(c=>measure(c.label,13)+24<width*.3);
  if(onlyButtons||inline){if(row.label&&!onlyButtons)labelLines=wrapNativeText(row.label,labelWidth-5,measure,13);height=Math.max(30,labelLines.length*17+3);controlTop=2;}else{controlTop=height+detailLines.length*16;controlHeight=row.controls.some(c=>c.icon)?48:26;height=controlTop+controlHeight+5;}
  if(!matrix&&!row.compact){const available=inline&&row.label&&!onlyButtons?width-labelWidth-4:width;controlColumns=Math.min(row.controls.length,Math.max(1,Math.floor((available+5)/(row.controls.some(c=>c.icon)?76:100))));height+=Math.max(0,Math.ceil(row.controls.length/controlColumns)-1)*(controlHeight+5);}
 }
 if(detailLines.length&&!row.controls?.length)height+=detailLines.length*16+2;
 return {row,x,top,width,height,labelWidth,controlTop,controlHeight,controlColumns,detailLines,labelLines,valueLines,matrix};
}
export function layoutNativePage(page:NativePage,viewport:{width:number;height:number},front:boolean,measure:TextMeasure):NativePageBox {
 const layout=page.layout??(front?'front':page.id.startsWith('inspect-')?'inspector':['work','schedule','animals','wildlife','assign','history'].includes(page.id)?'table':'dialog');
 let requested=page.width?(page.width>20?page.width:page.width*100):layout==='inspector'?580:layout==='tools'?310:front?760:680;
 if(page.id==='menu')requested=328;
 if(page.id==='history')requested=548;
 if(page.id==='animals')requested=738;
 const width=Math.max(220,Math.min(requested,viewport.width-32)),pad=NATIVE_UI.padding;
 const visual=page.visual?Math.min(330,width*.42):0;
 const contentWidth=width-pad*2-(visual?visual+10:0)-12,bodyX=pad+visual+(visual?10:0);
 const header=page.portrait?58:page.subtitle?58:40;
 const footer=page.actions?.length?Math.max(36,Math.ceil(page.actions.length/Math.max(1,Math.floor((width-24)/110)))*32+8):10;
 const rows:NativeRowBox[]=[];let top=0,left=0,right=0,columns=false;
 for(const row of page.rows){
  if(row.column!==undefined&&!columns){columns=true;left=right=top;}
  const ratio=page.columnRatio??.5;
  const columnWidth=columns?(row.column===1?contentWidth*(1-ratio)-5:contentWidth*ratio-5):contentWidth;
  const x=bodyX+(columns&&row.column===1?contentWidth*ratio+5:0);
  const rowTop=columns?(row.column===1?right:left):top;
  const box=rowBox(row,x,rowTop,columnWidth,measure,layout==='table');rows.push(box);
  if(columns){if(row.column===1)right+=box.height;else left+=box.height;}else top+=box.height;
 }
 const contentHeight=Math.max(top,left,right),bottom=front?20:NATIVE_UI.bottom+10;
 const maxHeight=Math.max(150,Math.min(page.height??(front?760:layout==='inspector'?520:layout==='tools'?520:640),viewport.height-bottom-(front?20:130)));
 const height=Math.min(maxHeight,Math.max(header+footer+40,header+contentHeight+footer+8,page.visual?440:0));
 const x=front?(viewport.width-width)/2:12,y=front?(viewport.height-height)/2:viewport.height-bottom-height;
 return {x,y,width,height,header,footer,body:{x:bodyX,y:header,width:contentWidth,height:height-header-footer},contentHeight,rows,layout};
}
