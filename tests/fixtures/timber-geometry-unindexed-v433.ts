import * as THREE from 'three/webgpu';

type Point=readonly [number,number,number];

/** Literal pre-indexing authored generator. SHA256 of its full source is in source-bases.json. */
export function createUnindexedTimberGeometry(roof: boolean): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [];
  const color = new THREE.Color();
  function quad(a: Point, b: Point, c: Point, d: Point, outward: Point, tint: number, uvRect:readonly [number,number,number,number]=[0,1,0,1]): void {
    const ab = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const ac = new THREE.Vector3(c[0]-a[0], c[1]-a[1], c[2]-a[2]);
    const direction = ab.cross(ac).dot(new THREE.Vector3(...outward));
    const corners=[a,b,c,d] as const;
    const order=direction>=0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
    color.setHex(tint);
    const [u0,u1,v0,v1]=uvRect;
    const uv = [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(let i=0;i<6;i++) {
      const vertex=order[i]!;
      positions.push(...corners[vertex]!);normals.push(...outward);colors.push(color.r,color.g,color.b);uvs.push(...uv[vertex]!);
    }
  }
  function box(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,tint:number):void {
    const shade=(factor:number)=>new THREE.Color(tint).multiplyScalar(factor).getHex();
    quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],tint);
    quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],shade(.91));
    quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],shade(.86));
    quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],shade(.88));
    quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],shade(1.1));
    quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],shade(.7));
  }
  if(roof) {
    // One edge plank, instanced only where a wall borders open space. A low
    // straight base keeps its join watertight; the uneven inset top and four
    // bevels soften the silhouette without additional per-cell objects.
    box(-.5,.5,-.055,.018,.405,.56,0xaa8050);
    const a:Point=[-.478,.055,.421],b:Point=[.483,.055,.418];
    const c:Point=[.478,.055,.545],d:Point=[-.482,.055,.541];
    quad(a,b,c,d,[0,1,0],0xd6ab72);
    quad([-.5,.018,.56],[.5,.018,.56],c,d,[0,0,1],0xbb8e59);
    quad([.5,.018,.405],[-.5,.018,.405],a,b,[0,0,-1],0xb88a55);
    quad([.5,.018,.56],[.5,.018,.405],b,c,[1,0,0],0xb28350);
    quad([-.5,.018,.405],[-.5,.018,.56],d,a,[-1,0,0],0xb28350);
  } else {
    // A single broad plank covers each cell face. Three unequal height bands
    // gently bend its edge, while two bevel facets round each vertical corner.
    // The bevels stay inside the cell and every face reaches its exact corner.
    // Adjacent cells share that boundary instead of leaving a translucent slot
    // or overlapping outward-bowed boards.
    box(-.47,.47,0,.94,-.47,.47,0x725238);
    const boardTints=[0xb18858,0xa77d4e,0xb68b58,0xa57c4d];
    const levels=[
      {y:0,sway:0,depth:.49},
      {y:.32,sway:-.018,depth:.5},
      {y:.67,sway:.013,depth:.491},
      {y:.967,sway:-.011,depth:.5},
    ];
    for(let face=0;face<4;face++) {
      const sign=face%2===0?1:-1,alongX=face<2;
      const p=(u:number,depth:number,y:number):Point=>alongX?[u,y,sign*depth]:[sign*depth,y,u];
      const outward:Point=alongX?[0,0,sign]:[sign,0,0];
      const side:Point=alongX?[1,0,0]:[0,0,1];
      const tint=new THREE.Color(boardTints[face]!).multiplyScalar(face===1||face===3?.94:1).getHex();
      const dark=new THREE.Color(tint).multiplyScalar(.77).getHex();
      const light=new THREE.Color(tint).multiplyScalar(.87).getHex();
      for(let band=0;band<levels.length-1;band++) {
        const a=levels[band]!,b=levels[band+1]!;
        const frontL=(v:typeof a)=>-.445+v.sway,frontR=(v:typeof a)=>.445+v.sway;
        quad(p(frontL(a),a.depth,a.y),p(frontR(a),a.depth,a.y),p(frontR(b),b.depth,b.y),p(frontL(b),b.depth,b.y),outward,tint,[.05,.95,a.y,b.y]);
        quad(p(-.5,.5,a.y),p(frontL(a),a.depth,a.y),p(frontL(b),b.depth,b.y),p(-.5,.5,b.y),[-side[0],0,-side[2]],dark,[0,.05,a.y,b.y]);
        quad(p(frontR(a),a.depth,a.y),p(.5,.5,a.y),p(.5,.5,b.y),p(frontR(b),b.depth,b.y),side,light,[.95,1,a.y,b.y]);
      }
    }
    // One softly bevelled cap per cell, lower than the overhanging edge rail.
    box(-.5,.5,.944,.961,-.5,.5,0xcfa36b);
    const low=.961,high=.982,edge=.5,top=.464,cap=0xd6ac72;
    quad([-top,high,top],[top,high,top],[top,high,-top],[-top,high,-top],[0,1,0],cap);
    quad([-edge,low,edge],[edge,low,edge],[top,high,top],[-top,high,top],[0,0,1],cap);
    quad([edge,low,-edge],[-edge,low,-edge],[-top,high,-top],[top,high,-top],[0,0,-1],cap);
    quad([edge,low,edge],[edge,low,-edge],[top,high,-top],[top,high,top],[1,0,0],cap);
    quad([-edge,low,-edge],[-edge,low,edge],[-top,high,top],[-top,high,-top],[-1,0,0],cap);
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  result.computeBoundingBox();result.computeBoundingSphere();
  return result;
}
