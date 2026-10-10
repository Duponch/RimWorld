import * as THREE from 'three/webgpu';

/** Finite resident meshes. Every authored part uses the same mesh in the world
 * and in its portrait; outlines are geometry, not a texture decoration. */
export const ITEM_SHAPES=['item-log','item-round','item-nugget','item-disc','item-leaf','item-shirt','item-pants','item-coat','item-vest','item-helmet','item-ingot'] as const;
export type ItemShape=typeof ITEM_SHAPES[number];

const outlines:Partial<Record<ItemShape,readonly (readonly [number,number])[]>>={
  'item-leaf':[[0,-.5],[.32,-.18],[.5,.12],[.18,.5],[-.18,.5],[-.5,.12],[-.32,-.18]],
  'item-shirt':[[-.18,-.5],[-.08,-.40],[.08,-.40],[.18,-.5],[.5,-.28],[.38,-.02],[.23,-.13],[.23,.5],[-.23,.5],[-.23,-.13],[-.38,-.02],[-.5,-.28]],
  'item-pants':[[-.36,-.5],[.36,-.5],[.42,.5],[.09,.5],[0,-.04],[-.09,.5],[-.42,.5]],
  'item-coat':[[-.17,-.5],[-.07,-.4],[.07,-.4],[.17,-.5],[.5,-.25],[.39,.04],[.25,-.06],[.34,.5],[.06,.5],[0,.20],[-.06,.5],[-.34,.5],[-.25,-.06],[-.39,.04],[-.5,-.25]],
  'item-vest':[[-.28,-.5],[-.08,-.29],[.08,-.29],[.28,-.5],[.4,-.27],[.3,-.04],[.31,.5],[-.31,.5],[-.3,-.04],[-.4,-.27]],
};

function outlineGeometry(outline:readonly (readonly [number,number])[]):THREE.BufferGeometry {
  const points=outline.map(([x,z])=>new THREE.Vector2(x,z));
  const faces=THREE.ShapeUtils.triangulateShape(points,[]),positions:number[]=[];
  const vertex=(i:number,y:number)=>{const p=outline[i]!;positions.push(p[0],y,p[1]);};
  for(const [a,b,c] of faces){vertex(a!,.5);vertex(c!,.5);vertex(b!,.5);vertex(a!,-.5);vertex(b!,-.5);vertex(c!,-.5);}
  for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;vertex(i,-.5);vertex(i,.5);vertex(j,.5);vertex(i,-.5);vertex(j,.5);vertex(j,-.5);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i]!+.5,positions[i+2]!+.5]:[]),2));
  geometry.computeVertexNormals();return geometry;
}

export function createItemGeometry(shape:ItemShape):THREE.BufferGeometry {
  let geometry:THREE.BufferGeometry;
  const outline=outlines[shape];
  if(outline)geometry=outlineGeometry(outline);
  else if(shape==='item-round')geometry=new THREE.SphereGeometry(.5,6,3);
  else if(shape==='item-helmet'){
    geometry=new THREE.SphereGeometry(.5,8,3,0,Math.PI*2,0,Math.PI/2);
    geometry.translate(0,-.25,0);geometry.scale(1,2,1);
  }else if(shape==='item-nugget'){
    geometry=new THREE.IcosahedronGeometry(.5,0);
    const position=geometry.getAttribute('position');
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      const radius=1+.17*Math.sin(x*11+y*7-z*5);
      position.setXYZ(i,x*radius,y*radius,z*radius);
    }
    geometry.computeVertexNormals();
  }else if(shape==='item-log'||shape==='item-disc'){
    geometry=new THREE.CylinderGeometry(shape==='item-log'?.43:.5,.5,1,8,1,false);
    if(shape==='item-log'){
      geometry.rotateZ(Math.PI/2);
      const p=geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+.035*Math.sin(p.getX(i)*4));
      geometry.computeVertexNormals();
    }
  }else{
    geometry=new THREE.BoxGeometry(1,1,1);
    const p=geometry.getAttribute('position');
    for(let i=0;i<p.count;i++)if(p.getY(i)>0)p.setXYZ(i,p.getX(i)*.72,p.getY(i),p.getZ(i)*.72);
    geometry.computeVertexNormals();
  }
  if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
