// Historical radius math remains archived; the live renderer uses the V350 fragment mask.
import {expect,test} from 'vitest';
import {DecorOcclusion} from '../src/render/decor-occlusion';
import {WeatherCloudLayer,cloudScreenMask} from '../src/render/WeatherCloudLayer';
import {cloudMaskRadius,cloudMaskRadiusLabel} from '../src/render/cloud-mask';

test('historical V306 cloud radius preference bounds',()=>{
  for(const value of [null,undefined,'',NaN,Infinity,'bad',true,{}])expect(cloudMaskRadius(value)).toBe(.31);
  expect(cloudMaskRadius('0.57')).toBe(.57);
  expect(cloudMaskRadius(-4)).toBe(0);
  expect(cloudMaskRadius(4)).toBe(1);
  expect(cloudMaskRadiusLabel(0)).toBe('Aucun masquage central');
});

test('historical V306 pure circular pixel mask in every aspect ratio',()=>{
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

test('V350 decor toggles keep resident cloud geometry and clocks',()=>{
  const mask=new DecorOcclusion(),layer=new WeatherCloudLayer(undefined,mask);
  try{
    const mesh=layer.mesh,geometry=mesh.geometry,material=mesh.material;
    const matrices=mesh.instanceMatrix.array.slice(),version=mesh.instanceMatrix.version;
    const node=material.maskNode;expect(node).toBe(mask.visibleNode);
    for(const enabled of [false,true,false,true])mask.setEnabled(enabled);
    expect(material.maskNode).toBe(node);
    expect(layer.mesh).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);
    expect(mesh.instanceMatrix.array).toEqual(matrices);expect(mesh.instanceMatrix.version).toBe(version);
  }finally{layer.dispose();}
});
