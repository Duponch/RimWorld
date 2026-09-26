import type Node from 'three/src/nodes/core/Node.js';
import { attribute, float, mix, vec3 } from 'three/tsl';
import { BODY_PROPORTIONS } from './pawn-appearance-shape';

/** Applied equally to vertices and rigid-bone pivots, before pose animation. */
export function pawnMorph(point:Node<'vec3'>) {
  const bone=attribute('boneId','float'),dye=attribute('dye','float'),shape=attribute('aShape','vec4');
  const factor=(column:number)=>BODY_PROPORTIONS.reduce<Node<'float'>>((v,row,i)=>shape.x.equal(i).select(float(row[column]!),v),float(1));
  const shoulder=factor(0),waist=factor(1),hip=factor(2),depth=factor(3);
  const torso=mix(waist,shoulder,point.y.sub(.76).div(.20).clamp(0,1));
  const legs=bone.greaterThanEqual(4),arms=bone.greaterThanEqual(2).and(bone.lessThanEqual(3));
  const head=bone.equal(1),narrow=shape.y.mod(6).greaterThanEqual(3),jaw=shape.y.mod(3);
  const lower=point.y.lessThan(1.18);
  const headWidth=narrow.select(float(.87),float(1)).mul(shape.y.greaterThanEqual(6).select(float(.97),float(1)))
    .mul(lower.select(jaw.equal(1).select(float(.84),jaw.equal(2).select(float(1.12),float(1))),float(1)));
  const body=vec3(point.x.mul(legs.select(hip,arms.select(shoulder,torso))),point.y,point.z.mul(depth));
  const shaped=head.select(vec3(point.x.mul(headWidth),point.y,point.z),body);
  // Weapons preserve their dimensions, with only their holster shifted outwards.
  const weapon=dye.equal(-1).or(dye.equal(-4)).or(dye.equal(-5));
  return weapon.select(vec3(point.x.add(shoulder.sub(1).mul(.205)),point.y,point.z),shaped);
}

export function hiddenAppearancePart() {
  const dye=attribute('dye','float'),shape=attribute('aShape','vec4');
  const hair=dye.greaterThanEqual(100).and(dye.lessThan(200));
  const beard=dye.greaterThanEqual(200);
  const mask=hair.select(shape.z,shape.w),index=hair.select(dye.sub(100),dye.sub(200));
  // The indices are small exact integers; outside those parts use exponent zero.
  const visible=mask.div(float(2).pow(index.clamp(0,14))).floor().mod(2).greaterThan(.5);
  return hair.or(beard).and(visible.not());
}
