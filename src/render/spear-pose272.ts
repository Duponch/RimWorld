import type Node from 'three/src/nodes/core/Node.js';
import {vec3,normalLocal,cos,sin} from 'three/tsl';

/** One rigid pose in the existing hands; confirmed shaft swing, butt push or
 * point thrust share the same native/cached/shadow transform and normals. */
export function spearPositionNode272(along:Node<'float'>,across:Node<'float'>,depth:Node<'float'>,reach:Node<'float'>,activity:Node<'float'>,striking:Node<'bool'>){
 const rest=vec3(across.add(.28),along.mul(.70).add(.77),depth.add(.12));
 const swing=activity.equal(11),butt=activity.equal(12),point=activity.equal(13),active=striking.and(swing.or(butt).or(point));
 const angle=reach.mul(.75).sub(.40),c=cos(angle),s=sin(angle),n=normalLocal.toVar();
 const sweptNormal=vec3(n.y.mul(c).sub(n.x.mul(s)),n.z,n.x.mul(c).negate().sub(n.y.mul(s)));
 normalLocal.assign(active.select(swing.select(sweptNormal,vec3(n.x,n.z,butt.select(n.y.negate(),n.y))),vec3(n.x,n.y.div(.70),n.z)).normalize());
 const thrust=vec3(across.add(.23),depth.add(.88),butt.select(along.negate(),along).add(.52).add(reach.mul(.30)));
 const sweep=vec3(along.mul(c).sub(across.mul(s)).add(.23),depth.add(.88),across.mul(c).negate().sub(along.mul(s)).add(.49));
 return active.select(swing.select(sweep,thrust),rest);
}
