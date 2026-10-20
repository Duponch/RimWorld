import type Node from 'three/src/nodes/core/Node.js';
import {vec3,float,normalLocal} from 'three/tsl';

/** Identical rigid translation in native, cached and shadow position graphs.
 * Only the confirmed tool selects head-first or handle-first presentation. */
export function macePositionNode269(along:Node<'float'>,across:Node<'float'>,depth:Node<'float'>,reach:Node<'float'>,activity:Node<'float'>,striking:Node<'bool'>){
 const rest=vec3(across.add(.28),along.mul(.82).add(.70),depth.add(.12));
 const head=activity.equal(6),handle=activity.equal(7);
 const active=striking.and(head.or(handle)),normal=normalLocal.toVar();
 normalLocal.assign(active.select(vec3(normal.x,normal.z,head.select(normal.y,normal.y.negate())),vec3(normal.x,normal.y.div(.82),normal.z)).normalize());
 const attack=vec3(across.add(.23),depth.add(.85).add(head.select(reach.mul(-.08),float(0))),head.select(along,along.negate()).add(.44).add(reach.mul(.22)));
 return active.select(attack,rest);
}
