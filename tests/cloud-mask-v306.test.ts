import {expect,test} from 'vitest';
import {WeatherCloudLayer,cloudScreenMask} from '../src/render/WeatherCloudLayer';
import {cloudMaskRadius,cloudMaskRadiusLabel} from '../src/render/cloud-mask';

test('cloud preference bounds keep the historical default and allow disabling the hole',()=>{
  for(const value of [null,undefined,'',NaN,Infinity,'bad',true,{}])expect(cloudMaskRadius(value)).toBe(.31);
  expect(cloudMaskRadius('0.57')).toBe(.57);
  expect(cloudMaskRadius(-4)).toBe(0);
  expect(cloudMaskRadius(4)).toBe(1);
  expect(cloudMaskRadiusLabel(0)).toBe('Aucun masquage central');
});

test('changing cloud radius preserves a circular pixel mask in every aspect ratio',()=>{
  for(const [width,height] of [[2560,1440],[900,1600],[900,900]]){
    const cx=width/2,cy=height/2,short=Math.min(width,height);
    expect(cloudScreenMask(cx,cy,width,height,0)).toBe(1);
    for(const radius of [.1,.31,.7]){
      expect(cloudScreenMask(cx,cy,width,height,radius)).toBe(0);
      expect(cloudScreenMask(cx+short*(radius+.04),cy,width,height,radius)).toBeCloseTo(.5);
      expect(cloudScreenMask(cx,cy+short*(radius+.04),width,height,radius)).toBeCloseTo(.5);
      expect(cloudScreenMask(cx+short*(radius+.08),cy,width,height,radius)).toBeCloseTo(1);
    }
  }
});

test('cloud radius changes only its uniform and keeps resident geometry and clocks',()=>{
  const layer=new WeatherCloudLayer();
  try{
    const mesh=layer.mesh,geometry=mesh.geometry,material=mesh.material;
    const matrices=mesh.instanceMatrix.array.slice(),version=mesh.instanceMatrix.version;
    for(const radius of [0,.1,1,.31])layer.setClearRadius(radius);
    expect(layer.mesh).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);
    expect(mesh.instanceMatrix.array).toEqual(matrices);expect(mesh.instanceMatrix.version).toBe(version);
  }finally{layer.dispose();}
});
