import * as THREE from 'three/webgpu';
import type {WeatherKind} from '../sim/weather-definitions';
import {PALETTE,drawHandBlob,drawHandRect,drawMarkerLine,seededRandom,type CardboardPiece} from './prototype-art';

export type NativeWeatherIcon='sun'|'moon'|'eclipse'|'fog'|'rain'|'dry-storm'|'rain-storm'|'snow';
export function nativeWeatherIcon(kind:WeatherKind,daylight:boolean,eclipse=false):NativeWeatherIcon {
  if(eclipse)return 'eclipse';
  if(kind==='clear')return daylight?'sun':'moon';
  if(kind==='snow-gentle'||kind==='snow-hard')return 'snow';
  if(kind==='dry-thunderstorm')return 'dry-storm';
  if(kind==='rainy-thunderstorm')return 'rain-storm';
  if(kind==='rain'||kind==='foggy-rain')return 'rain';
  return 'fog';
}
type Point=readonly [number,number];
const cloud:readonly Point[]=[[8,57],[5,47],[11,37],[23,34],[29,22],[40,18],[54,23],[62,17],[75,22],[81,34],[91,38],[95,49],[90,59],[72,62],[31,62]];
const drop=(x:number,y:number):readonly Point[]=>[[x+5,y],[x+9,y+12],[x+6,y+17],[x+1,y+14],[x,y+9]];
const snow=(x:number,y:number):readonly Point[]=>[[x,y-7],[x+2,y-2],[x+7,y],[x+2,y+2],[x,y+7],[x-2,y+2],[x-7,y],[x-2,y-2]];
const bolt:readonly Point[]=[[51,55],[39,76],[49,76],[44,94],[65,68],[54,68],[63,55]];
function outline(points:readonly Point[],width:number,height:number):THREE.Shape {
  const shape=new THREE.Shape();
  points.forEach(([x,y],index)=>{const px=(x/100-.5)*width,py=(.5-y/100)*height;if(index===0)shape.moveTo(px,py);else shape.lineTo(px,py);});
  shape.closePath();return shape;
}
/** The silhouette is actual cut/extruded geometry, not an image of a weather
 * symbol on a rectangular plate. All components share one mesh and texture. */
export function nativeWeatherOutline(icon:NativeWeatherIcon,width=.66,height=.66):THREE.Shape[] {
  let parts:readonly (readonly Point[])[];
  if(icon==='sun'){
    const rays:Point[]=Array.from({length:24},(_,index)=>{const angle=index*Math.PI/12-Math.PI/2,radius=index%2?31:46;return [50+Math.cos(angle)*radius,50+Math.sin(angle)*radius] as const;});parts=[rays];
  }else if(icon==='moon')parts=[[[66,7],[43,11],[22,25],[11,46],[14,67],[28,85],[48,93],[70,87],[55,80],[44,66],[41,48],[47,27]]];
  else if(icon==='eclipse')parts=[Array.from({length:16},(_,index)=>[50+Math.cos(index*Math.PI/8)*42,50+Math.sin(index*Math.PI/8)*42] as const)];
  else if(icon==='snow')parts=[cloud,snow(23,79),snow(51,85),snow(78,76)];
  else if(icon==='rain')parts=[cloud,drop(20,70),drop(47,73),drop(74,69)];
  else if(icon==='dry-storm')parts=[cloud,bolt];
  else if(icon==='rain-storm')parts=[cloud,bolt,drop(18,71),drop(77,71)];
  else parts=[cloud,[[9,73],[74,72],[80,77],[13,79]],[[24,87],[89,84],[92,89],[26,92]]];
  return parts.map(points=>outline(points,width,height));
}
export const nativeWeatherColor=(icon:NativeWeatherIcon):string=>icon==='sun'?PALETTE.ochre:icon==='eclipse'?PALETTE.slateBlue:icon==='moon'?PALETTE.creamPaper:'#c9d2cd';
function polygon(ctx:CanvasRenderingContext2D,points:readonly Point[],fill:string,stroke=PALETTE.inkDark,lineWidth=1.7):void {
  ctx.beginPath();points.forEach(([x,y],index)=>index===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();
}
export function drawNativeWeatherIcon(ctx:CanvasRenderingContext2D,icon:NativeWeatherIcon,width:number,height:number,rng=seededRandom(48009)):void {
  ctx.save();ctx.scale(width/100,height/100);ctx.lineCap='round';ctx.lineJoin='round';
  if(icon==='sun'){
    drawHandBlob(ctx,50,50,25,'#edc45e',PALETTE.inkDark,2,rng);
    for(let ray=0;ray<12;ray++){const angle=ray*Math.PI/6;drawMarkerLine(ctx,50+Math.cos(angle)*32,50+Math.sin(angle)*32,50+Math.cos(angle)*41,50+Math.sin(angle)*41,PALETTE.inkDark,1.8,rng);}
  }else if(icon==='moon'){
    drawMarkerLine(ctx,23,47,29,66,'#cfb979',1.6,rng);drawMarkerLine(ctx,31,28,41,23,'#cfb979',1.6,rng);
  }else if(icon==='eclipse'){
    drawHandBlob(ctx,50,50,35,'#e6c16d',PALETTE.inkDark,1.8,rng);drawHandBlob(ctx,54,48,28,'#374852',PALETTE.inkDark,1.4,rng);
  }else{
    polygon(ctx,cloud,'#e8e6d7');drawMarkerLine(ctx,18,52,84,52,'#98aeb2',2,rng);
    if(icon==='rain'||icon==='rain-storm')for(const x of icon==='rain'?[20,47,74]:[18,77])polygon(ctx,drop(x,icon==='rain'&&x===47?73:70),'#5e849a');
    if(icon==='snow')for(const[x,y]of [[23,79],[51,85],[78,76]]){drawMarkerLine(ctx,x-5,y,x+5,y,PALETTE.inkDark,1.6,rng);drawMarkerLine(ctx,x,y-5,x,y+5,PALETTE.inkDark,1.6,rng);}
    if(icon==='dry-storm'||icon==='rain-storm')polygon(ctx,bolt,'#e7b956');
    if(icon==='fog'){drawMarkerLine(ctx,13,76,75,75,'#6b8588',3,rng);drawMarkerLine(ctx,29,89,87,87,'#6b8588',3,rng);}
  }
  ctx.restore();
}

/** Numbers and transport glyphs are marker strokes, never font characters. */
export function drawNativeSpeedIcon(ctx:CanvasRenderingContext2D,width:number,height:number,speed:0|1|3|6,active:boolean,rng=seededRandom(48031)):void {
  ctx.save();ctx.scale(width/48,height/37);ctx.lineCap='round';ctx.lineJoin='round';
  const ink=PALETTE.inkDark,fill=active?'#fff8e7':ink;
  drawHandBlob(ctx,24,18.5,13.7,PALETTE.creamPaper,ink,1.1,rng);
  if(speed===0){drawHandRect(ctx,17,10,4.8,17,ink,ink,1,rng);drawHandRect(ctx,26,10,4.8,17,ink,ink,1,rng);}
  else if(speed===1)polygon(ctx,[[19,9],[33,18],[19,28],[18,21]],fill,ink,1.4);
  else{
    drawMarkerLine(ctx,12,15,19,23,ink,1.7,rng);drawMarkerLine(ctx,19,15,12,23,ink,1.7,rng);
    const path:readonly Point[]=speed===3?[[24,10],[34,10],[35,14],[29,18],[34,20],[35,25],[31,28],[24,26]]:[[34,10],[28,11],[24,17],[24,24],[28,28],[34,26],[35,21],[32,18],[25,19]];
    for(let index=1;index<path.length;index++)drawMarkerLine(ctx,path[index-1]![0],path[index-1]![1],path[index]![0],path[index]![1],ink,2.1,rng);
  }
  ctx.restore();
}

export interface NativeHudButtonPose {x:number;y:number;z:number;rx:number;ry:number;rz:number;shadowX:number;shadowY:number;shadowZ:number}
/** Shared with NativeStage so hover/press never overwrites the persistent lift. */
export function nativeHudButtonPose(piece:CardboardPiece):NativeHudButtonPose {
  const ud=piece.userData,active=THREE.MathUtils.clamp(Number(ud.nativeActivePose??Number(ud.active)),0,1),hover=ud.hoverVal,activeLift=active*.065,hoverLift=hover*.085,press=ud.pressVal*.05,offset=.022+(activeLift+hoverLift)*.35;
  return {x:ud.basePos.x,y:ud.basePos.y+active*.045+hover*.03,z:ud.basePos.z+activeLift+hoverLift-press,rx:ud.baseRot.x-active*.1-hover*.14,ry:ud.baseRot.y+hover*.12,rz:ud.baseRot.z+hover*.035,shadowX:offset,shadowY:-offset*1.15,shadowZ:-.012-(activeLift+hoverLift)*.6};
}
export function applyNativeHudButtonPose(piece:CardboardPiece):boolean {
  const pose=nativeHudButtonPose(piece),shadow=piece.userData.shadowMesh;
  if(piece.position.x===pose.x&&piece.position.y===pose.y&&piece.position.z===pose.z&&piece.rotation.x===pose.rx&&piece.rotation.y===pose.ry&&piece.rotation.z===pose.rz&&shadow.position.x===pose.shadowX&&shadow.position.y===pose.shadowY&&shadow.position.z===pose.shadowZ)return false;
  piece.position.set(pose.x,pose.y,pose.z);piece.rotation.set(pose.rx,pose.ry,pose.rz);shadow.position.set(pose.shadowX,pose.shadowY,pose.shadowZ);return true;
}
