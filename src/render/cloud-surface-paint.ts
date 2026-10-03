import * as THREE from 'three/webgpu';

const SIZE=128;
function hash(value:number,salt:number):number {
  let n=Math.imul(value+31,0x1f123bb5)^Math.imul(salt+73,0x5f356495);
  n=Math.imul(n^(n>>>15),0x2c1b3c6d);
  return ((n^(n>>>12))>>>0)/4294967296;
}

/** Original broad brush washes and dry, curved bristle trails, rasterised once
 * into one finished sheet. No paint geometry or animated texture updates. */
export function createCloudPaint():THREE.DataTexture {
  const field=new Float32Array(SIZE*SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
    field[y*SIZE+x]=244+(hash(x+y*SIZE,9)-.5)*12;
  for(let stroke=0;stroke<38;stroke++){
    const x=hash(stroke,11)*SIZE,y=hash(stroke,17)*SIZE;
    const length=28+hash(stroke,23)*70,width=3+hash(stroke,29)*10;
    const bend=(hash(stroke,37)-.5)*28,angle=(hash(stroke,41)-.5)*1.3;
    const c=Math.cos(angle),s=Math.sin(angle),tone=stroke%4===0?255:179+hash(stroke,43)*38;
    for(let step=0;step<=length;step++){
      const t=step/length,across=bend*4*t*(1-t),along=(t-.5)*length;
      const cx=x+along*c-across*s,cy=y+along*s+across*c;
      const radius=width*(.40+.60*Math.sin(t*Math.PI)),bounds=Math.ceil(radius+1);
      for(let py=Math.floor(cy)-bounds;py<=Math.floor(cy)+bounds;py++)
        for(let px=Math.floor(cx)-bounds;px<=Math.floor(cx)+bounds;px++){
          const distance=Math.hypot(px+.5-cx,py+.5-cy)/radius;
          if(distance>=1)continue;
          const xx=(px%SIZE+SIZE)%SIZE,yy=(py%SIZE+SIZE)%SIZE,index=yy*SIZE+xx;
          const grain=.5+hash(index,stroke+53)*.5;
          const bristle=.65+.35*hash(Math.floor((px-cx)*.75),stroke+67);
          const coverage=(1-distance)*(1-distance)*grain*bristle*.22;
          field[index]=field[index]!+(tone-field[index]!)*coverage;
        }
    }
  }
  const bytes=new Uint8Array(SIZE*SIZE*4);
  for(let i=0;i<field.length;i++){
    const pigment=Math.max(155,Math.min(255,Math.round(field[i]!)));
    bytes[i*4]=bytes[i*4+1]=bytes[i*4+2]=pigment;bytes[i*4+3]=255;
  }
  const map=new THREE.DataTexture(bytes,SIZE,SIZE,THREE.RGBAFormat);
  map.name='Clouds — curved dry brush washes on chalk-painted paper';
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;
  return map;
}
