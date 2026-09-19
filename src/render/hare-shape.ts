type Vector3Tuple = [number,number,number];
export interface HarePart {size:Vector3Tuple;center:Vector3Tuple;bone:number;pivot:Vector3Tuple;color:number}

/** Shared silhouette for the GPU rig and its physical corpse. */
export const HARE_PARTS:readonly HarePart[]=(()=>{
  const parts:HarePart[]=[];
  const part=(size:Vector3Tuple,center:Vector3Tuple,bone:number,pivot:Vector3Tuple,color:number)=>parts.push({size,center,bone,pivot,color});
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
  return parts;
})();
