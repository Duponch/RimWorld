import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Original anvil, recessed hearth and electrical controls. All pieces join
 * the existing prepared furniture batch. No mesh, animation or fake fuel item
 * is allocated per bench; its complete silhouette stays inside three cells. */
export function smithyParts267(world:Pick<World,'structures'>):Placement[] {
 const parts:Placement[]=[];
 for(const s of world.structures){
  if(s.kind!=='fueled-smithy'&&s.kind!=='electric-smithy')continue;
  const angle=s.orientation*Math.PI/2,c=Math.cos(angle),n=Math.sin(angle);
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>parts.push({key:s.id,targetId:s.id,
   x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,color,ry:angle});
  // A continuous work surface keeps physical item surfaces and previews exact.
  box(0,.80,0,2.88,.14,.88,0x899694);box(0,.18,0,2.60,.10,.70,0x687a78);
  for(const x of [-1.23,1.23])for(const z of [-.30,.30])box(x,.39,z,.13,.78,.13,0x657874);
  box(-.83,.39,0,.58,.67,.57,0x647873);box(-.83,.77,0,.72,.16,.67,0x92a19a);
  // The anvil horn and heel are stepped solids, independent of work/power.
  box(-.83,.98,0,.37,.33,.35,0x61716f);box(-.85,1.18,0,.82,.16,.42,0xadb8af);
  box(-1.24,1.17,0,.22,.11,.29,0x96a69d);box(-1.38,1.16,0,.10,.07,.18,0x82968b);
  box(-.37,.91,-.25,.27,.07,.13,0xc9b994);box(-.28,1.04,-.25,.13,.23,.15,0x687c75);
  // Open opaque lips describe the heater recess without pretending to burn.
  box(.69,.97,.03,.96,.20,.74,0x526862);box(.69,1.08,.03,.74,.03,.54,0x3e504e);
  for(const z of [-.32,.38])box(.69,1.17,z,1.06,.21,.10,0xa9a890);
  for(const x of [.20,1.18])box(x,1.17,.03,.10,.21,.65,0x9a9f8b);
  if(s.kind==='fueled-smithy'){
   box(.69,1.43,.35,.91,.34,.11,0x8e9a87);box(.69,1.63,.31,.68,.07,.19,0xb3b69a);
   box(.69,.53,-.39,.58,.30,.08,0x4e6761);box(.69,.55,-.445,.23,.08,.03,0xb4af85);
   box(1.30,1.04,.08,.19,.36,.25,0x8b9b80);box(1.30,1.25,.08,.16,.08,.19,0xbdb58d);
  }else{
   box(.69,1.39,.35,.90,.26,.12,0x688f8e);box(.69,1.54,.32,.97,.06,.19,0xa4b8a4);
   box(1.31,1.08,0,.20,.46,.56,0x69938f);box(1.31,1.18,-.30,.15,.17,.045,0xb7cfc0);
   box(1.31,.99,-.30,.09,.09,.045,0xd7b98d);box(.91,.49,-.39,.61,.28,.08,0x526e6b);
   for(const x of [.44,.69,.94])box(x,1.12,.03,.055,.04,.45,0x9cb9ac);
  }
 }
 return parts;
}
