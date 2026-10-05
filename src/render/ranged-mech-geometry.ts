import { mechanicalGeometry,type ScytherVisualPart } from './scyther-geometry';
import type { MechanoidKind } from '../sim/mechanoid-definition';

type Point=readonly [number,number,number];
const shell=0xb5bdad,joint=0x617777,sensor=0xb99675,cannon=0x77888a;

/** Original slender biped with a forward cannon; eighteen shared boxes. */
export const LANCER_VISUAL_PARTS:readonly ScytherVisualPart[]=Object.freeze([
  {part:'torso',bone:0,size:[.44,.63,.33],center:[0,1.16,0],pivot:[0,0,0],color:shell},
  {part:'torso',bone:0,size:[.27,.26,.15],center:[0,1.17,-.22],pivot:[0,0,0],color:joint},
  {part:'neck',bone:0,size:[.14,.18,.14],center:[0,1.52,.03],pivot:[0,0,0],color:joint},
  {part:'head',bone:5,size:[.29,.28,.29],center:[0,1.73,.04],pivot:[0,1.52,.03],color:shell},
  {part:'left-eye',bone:5,size:[.05,.05,.02],center:[-.075,1.76,.194],pivot:[0,1.52,.03],color:sensor},
  {part:'right-eye',bone:5,size:[.05,.05,.02],center:[.075,1.76,.194],pivot:[0,1.52,.03],color:sensor},
  {part:'torso',bone:0,size:[.17,.17,.61],center:[0,1.24,.44],pivot:[0,0,0],color:cannon},
  {part:'torso',bone:0,size:[.20,.20,.09],center:[0,1.24,.77],pivot:[0,0,0],color:joint},
  ...([-1,1] as const).flatMap(side=>{
    const name=side===-1?'left':'right',arm=side===-1?1:2,leg=side===-1?3:4;
    const shoulder:Point=[side*.30,1.38,0],hip:Point=[side*.15,.87,0];
    return [
      {part:`${name}-shoulder`,bone:arm,size:[.18,.18,.20],center:shoulder,pivot:shoulder,color:joint},
      {part:`${name}-arm`,bone:arm,size:[.13,.47,.14],center:[side*.34,1.09,.06],pivot:shoulder,color:shell},
      {part:`${name}-hand`,bone:arm,size:[.17,.15,.19],center:[side*.37,.81,.12],pivot:shoulder,color:joint},
      {part:`${name}-leg`,bone:leg,size:[.16,.66,.18],center:[side*.15,.48,0],pivot:hip,color:shell},
      {part:`${name}-foot`,bone:leg,size:[.22,.13,.33],center:[side*.15,.10,.09],pivot:hip,color:joint},
    ] satisfies ScytherVisualPart[];
  }),
]);

/** Original low four-legged chassis, separate clinical chains, twenty boxes. */
export const PIKEMAN_VISUAL_PARTS:readonly ScytherVisualPart[]=Object.freeze([
  {part:'torso',bone:0,size:[.73,.35,.79],center:[0,.80,0],pivot:[0,0,0],color:shell},
  {part:'torso',bone:0,size:[.43,.17,.51],center:[0,.56,0],pivot:[0,0,0],color:joint},
  {part:'neck',bone:0,size:[.15,.14,.17],center:[0,1.03,.08],pivot:[0,0,0],color:joint},
  {part:'head',bone:5,size:[.31,.25,.30],center:[0,1.22,.12],pivot:[0,1.03,.08],color:shell},
  {part:'left-eye',bone:5,size:[.05,.045,.025],center:[-.08,1.24,.283],pivot:[0,1.03,.08],color:sensor},
  {part:'right-eye',bone:5,size:[.05,.045,.025],center:[.08,1.24,.283],pivot:[0,1.03,.08],color:sensor},
  {part:'torso',bone:0,size:[.15,.14,.89],center:[0,.91,.65],pivot:[0,0,0],color:cannon},
  {part:'torso',bone:0,size:[.19,.18,.08],center:[0,.91,1.12],pivot:[0,0,0],color:joint},
  ...(['front','rear'] as const).flatMap(end=>([-1,1] as const).flatMap(side=>{
    const name=side===-1?'left':'right',z=end==='front'?.27:-.27;
    const bone=end==='front'?(side===-1?3:4):(side===-1?6:7),pivot:Point=[side*.35,.72,z];
    return [
      {part:`${name}-${end}-leg`,bone,size:[.23,.19,.24],center:pivot,pivot,color:joint},
      {part:`${name}-${end}-leg`,bone,size:[.13,.48,.15],center:[side*.49,.39,z],pivot,color:shell},
      {part:`${name}-${end}-foot`,bone,size:[.30,.12,.28],center:[side*.53,.10,z+.035],pivot,color:joint},
    ] satisfies ScytherVisualPart[];
  })),
]);

export function rangedMechGeometry(kind:Exclude<MechanoidKind,'scyther'>,capacity:number,partIndex:(id:string)=>number) {
  return mechanicalGeometry(kind==='lancer'?LANCER_VISUAL_PARTS:PIKEMAN_VISUAL_PARTS,capacity,partIndex);
}
