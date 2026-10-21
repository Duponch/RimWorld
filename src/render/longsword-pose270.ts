import type Node from 'three/src/nodes/core/Node.js';
import {vec3,normalLocal,cos,sin} from 'three/tsl';

/** The same rigid transform and inverse-transpose normal serve native, cached
 * and shadow graphs. Only a confirmed tool may leave the resting attachment. */
export function longswordPositionNode270(along:Node<'float'>,across:Node<'float'>,depth:Node<'float'>,reach:Node<'float'>,activity:Node<'float'>,striking:Node<'bool'>){
 const rest=vec3(across.add(.28),along.mul(.82).add(.70),depth.add(.12));
 const handle=activity.equal(8),tip=activity.equal(9),edge=activity.equal(10),active=striking.and(handle.or(tip).or(edge));
 const angle=reach.mul(.8).sub(.4),c=cos(angle),s=sin(angle),n=normalLocal.toVar();
 const edgeNormal=vec3(n.y.mul(c).sub(n.x.mul(s)),n.z,n.x.mul(c).negate().sub(n.y.mul(s)));
 normalLocal.assign(active.select(edge.select(edgeNormal,vec3(n.x,n.z,handle.select(n.y.negate(),n.y))),vec3(n.x,n.y.div(.82),n.z)).normalize());
 const forward=vec3(across.add(.23),depth.add(.86),handle.select(along.negate(),along).add(.44).add(reach.mul(.27)));
 const sweep=vec3(along.mul(c).sub(across.mul(s)).add(.23),depth.add(.89),across.mul(c).negate().sub(along.mul(s)).add(.47));
 return active.select(edge.select(sweep,forward),rest);
}
