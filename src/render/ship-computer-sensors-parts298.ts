import {isShipComputerSensorsKind298,type ShipComputerSensorsKind298} from '../sim/ship-computer-sensors-content-298';
import type {Structure} from '../sim/types';
import type {Placement} from './primitives';

type Part=readonly[dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number,ry?:number];
type Bounds={readonly width:number;readonly depth:number;readonly height:number};
export const SHIP_COMPUTER_SENSORS_MODEL_BOUNDS_298:Readonly<Record<ShipComputerSensorsKind298,Bounds>>=Object.freeze({
 'ship-computer':Object.freeze({width:1.86,depth:1.86,height:1.60}),
 'ship-sensors':Object.freeze({width:1.86,depth:1.86,height:2.24}),
});
export const shipComputerSensorsModelBounds298=(kind:unknown):Bounds|undefined=>isShipComputerSensorsKind298(kind)?SHIP_COMPUTER_SENSORS_MODEL_BOUNDS_298[kind]:undefined;

// Original painted cardboard forms. These private readonly templates never
// retain a World. All parts use the existing opaque furniture box geometry,
// texture and material; no model owns a light, shader, VFX or frame animation.
const computer:readonly Part[]=[
 [0,.08,0,1.86,.16,1.86,0x8e7658],
 [0,.18,0,1.74,.04,1.74,0xc8c1a6],
 [0,.56,.18,1.64,.70,1.24,0x647e89],
 [0,.96,.24,1.55,.10,1.27,0xb1c0b4],
 [0,1.23,.22,1.48,.44,.91,0x526f7e],
 [0,1.50,.22,1.60,.10,1.03,0xa9bdb4],
 [0,1.58,.22,1.38,.04,.83,0xc7b98d],
 [-.78,.59,.20,.12,.64,1.22,0x9fb3ad],
 [.78,.59,.20,.12,.64,1.22,0x9fb3ad],
 [0,1.21,-.257,1.19,.29,.035,0x304b59],
 [0,1.22,-.281,1.02,.20,.018,0x91b6ae],
 [-.27,1.23,-.294,.29,.025,.01,0xd8d2b5],
 [.21,1.18,-.294,.24,.02,.01,0xd8d2b5],
 [0,.63,-.60,1.57,.14,.58,0xa8b7ac],
 [0,.713,-.60,1.32,.018,.37,0x4a646b],
 [-.42,.730,-.61,.23,.016,.21,0xb5c2b3],
 [-.12,.730,-.61,.23,.016,.21,0xb5c2b3],
 [.18,.730,-.61,.23,.016,.21,0xb5c2b3],
 [.49,.730,-.61,.23,.016,.21,0xc7ac78],
 [-.50,.41,-.458,.31,.25,.035,0x354e5c],
 [-.50,.41,-.482,.18,.14,.018,0xc0a36c],
 [.22,.40,-.458,.38,.055,.035,0xa1b6b0],
 [.22,.54,-.458,.38,.055,.035,0xa1b6b0],
 [0,.28,.818,1.38,.07,.03,0xb5a178],
];
const sensors:readonly Part[]=[
 [0,.08,0,1.86,.16,1.86,0x8e7658],
 [0,.20,0,1.74,.08,1.74,0xb5c1b4],
 [0,.48,0,1.36,.48,1.36,0x607d88],
 [0,.75,0,1.46,.08,1.46,0xa4b7b2],
 [0,1.22,0,.30,.88,.30,0x7f9a9d],
 [-.60,.47,0,.16,.42,1.46,0xc1ae7b],
 [.60,.47,0,.16,.42,1.46,0xc1ae7b],
 [0,.47,-.60,1.46,.42,.16,0x819ca2],
 [0,.47,.60,1.46,.42,.16,0x819ca2],
 [0,1.69,0,.54,.12,.54,0xb8c6b8],
 [0,1.83,0,1.34,.16,1.34,0x6d8c96],
 [0,1.93,0,1.22,.04,1.22,0xabc2b7],
 [-.69,1.91,0,.12,.14,1.50,0xc4b180],
 [.69,1.91,0,.12,.14,1.50,0xc4b180],
 [0,1.91,-.69,1.50,.14,.12,0xc4b180],
 [0,1.91,.69,1.50,.14,.12,0xc4b180],
 [0,1.97,0,1.65,.035,.08,0x4e6b77,Math.PI/4],
 [0,1.97,0,1.65,.035,.08,0x4e6b77,-Math.PI/4],
 [0,2.07,0,.13,.18,.13,0x708b95],
 [0,2.15,0,.32,.18,.32,0xc8af77],
 [-.38,1.96,-.38,.24,.035,.24,0xd2d2b7],
 [.38,1.96,.38,.24,.035,.24,0xd2d2b7],
 [-.38,1.96,.38,.24,.035,.24,0x87aaa7],
 [.38,1.96,-.38,.24,.035,.24,0x87aaa7],
];

/** Called only while the existing furniture batch is rebuilt. Stored North
 * minimum-cell Position puts the exact2x2 center at x+.5,z+.5. No World scan. */
export function shipComputerSensorsParts298(s:Structure):Placement[]{
 if(!isShipComputerSensorsKind298(s.kind))return [];
 const x=s.x+.5,z=s.z+.5,template=s.kind==='ship-computer'?computer:sensors;
 return template.map(([dx,y,dz,sx,sy,sz,color,ry])=>({key:s.id,targetId:s.id,x:x+dx,y,z:z+dz,sx,sy,sz,color,...ry===undefined?{}:{ry}}));
}
