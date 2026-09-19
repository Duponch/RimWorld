import * as THREE from 'three/webgpu';

/** Small quadruped rig, four rigid bones in a single instanced draw. */
export function hareGeometry(capacity:number):THREE.InstancedBufferGeometry {
  const data:number[]=[];
  function part(size:number[],at:number[],bone:number,pivot:number[],color:number) {
    const g=new THREE.BoxGeometry(...size as [number,number,number]).toNonIndexed(),p=g.getAttribute('position'),n=g.getAttribute('normal'),c=new THREE.Color(color);
    for(let i=0;i<p.count;i++)data.push(p.getX(i)+at[0]!,p.getY(i)+at[1]!,p.getZ(i)+at[2]!,n.getX(i),n.getY(i),n.getZ(i),c.r,c.g,c.b,bone,...pivot);
    g.dispose();
  }
  part([.32,.3,.49],[0,.26,-.05],0,[0,0,0],0xa49c80);
  part([.24,.24,.26],[0,.42,.24],3,[0,.33,.13],0xb6aa8c);
  part([.16,.12,.17],[0,.36,.4],3,[0,.33,.13],0xd3c6a5);
  part([.14,.14,.15],[0,.28,-.34],0,[0,0,0],0xdad0b6);
  for(const side of [-1,1]) {
    part([.07,.31,.065],[side*.075,.68,.22],3,[0,.33,.13],0xb1a083);
    part([.034,.21,.012],[side*.075,.69,.26],3,[0,.33,.13],0xc19583);
    part([.019,.035,.04],[side*.126,.455,.30],3,[0,.33,.13],0x302d29);
    part([.105,.12,.24],[side*.15,.08,-.16],1,[0,.16,-.13],0x91896f);
    part([.065,.18,.1],[side*.105,.13,.17],2,[0,.21,.13],0xa79c81);
  }
  const g=new THREE.InstancedBufferGeometry(),v=new THREE.InterleavedBuffer(new Float32Array(data),13);
  for(const [name,size,offset] of [['position',3,0],['normal',3,3],['color',3,6],['boneId',1,9],['bindPivot',3,10]] as const)g.setAttribute(name,new THREE.InterleavedBufferAttribute(v,size,offset));
  for(const name of ['aFrom','aTo','aTravel','aAnimal'])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount=0;return g;
}
