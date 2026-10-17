import {ancientMonumentCells256,isAncientMonumentKind256} from '../sim/ancient-monument-props-256';
import type {Structure,World} from '../sim/types';
import {buildingMaterialColor} from './building-material-color';
import type {Placement} from './primitives';

/** Original chalk/low-poly shapes; authored only at furniture adoption. The
 * existing batch owns matrices, colors, targets, shadows and resident capacity. */
export function ancientMonumentPartsForStructure256(s:Structure):Placement[]{
 if(!isAncientMonumentKind256(s.kind))return [];
 const cells=ancientMonumentCells256(s.kind,s,s.orientation);
 const x=cells.reduce((n,c)=>n+c.x,0)/cells.length,z=cells.reduce((n,c)=>n+c.z,0)/cells.length;
 const angle=s.orientation*Math.PI/2,c=Math.cos(angle),n=Math.sin(angle);
 const body=buildingMaterialColor(s.material,0xa38a66)??0xa38a66;
 const dark=shade(body,.68),light=shade(body,1.08),parts:Placement[]=[];
 const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color=body)=>parts.push({
  targetId:s.id,key:s.id,x:x+dx*c+dz*n,y,z:z+dz*c-dx*n,sx,sy,sz,ry:angle,color});
 switch(s.kind){
  case 'column':
   box(0,.09,0,.88,.18,.88);box(0,.24,0,.66,.12,.66,light);
   box(0,1.10,0,.42,1.60,.42);box(0,1.92,0,.64,.12,.64,light);box(0,2.05,0,.86,.14,.86);
   break;
  case 'urn':
   box(0,.06,0,.48,.12,.48,dark);box(0,.25,0,.58,.30,.58);
   box(0,.45,0,.46,.14,.46,light);box(0,.57,0,.26,.14,.26,dark);
   box(0,.66,0,.40,.08,.40,light);box(0,.73,0,.14,.08,.14);
   break;
  case 'stele-large':case 'stele-grand': {
   const grand=s.kind==='stele-grand',f=grand?1.48:1;
   box(0,.11,0,1.86*f,.22,1.86*f,dark);box(0,.28,0,1.64*f,.12,1.64*f,light);
   box(0,.94*f,0,1.23*f,1.27*f,.60*f);box(0,1.63*f,0,1.38*f,.16,.78*f,light);
   // A geometric relief, not a fabricated saved author, narrative or quality.
   box(0,.98*f,-.312*f,.18*f,.62*f,.045,dark);
   box(0,1.11*f,-.34*f,.62*f,.12*f,.045,light);
   for(const dx of [-.36,.36])box(dx*f,.74*f,-.34*f,.13*f,.22*f,.045,light);
   break;
  }
  case 'sarcophagus':
   box(0,.10,0,.90,.20,1.88,dark);box(0,.35,0,.78,.30,1.72);
   box(0,.55,0,.94,.12,1.92,light);box(0,.65,0,.68,.08,1.65);
   box(0,.71,-.39,.24,.04,.24,dark);box(0,.71,.15,.09,.04,.54,dark);
   break;
 }
 return parts;
}
export function ancientMonumentParts256(world:Pick<World,'structures'>):Placement[]{
 return world.structures.flatMap(ancientMonumentPartsForStructure256);
}
function shade(color:number,factor:number):number{
 const channel=(shift:number)=>Math.min(255,Math.round(((color>>shift)&255)*factor));
 return channel(16)<<16|channel(8)<<8|channel(0);
}
