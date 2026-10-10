import {expect,test} from 'vitest';
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/index';
import {BoxBatches} from '../src/render/BoxBatches';
import {RecreationHints} from '../src/render/RecreationHints';
import {DeepResourceLayer} from '../src/render/DeepResourceLayer';
import {ConstructionPreviewLayer} from '../src/render/ConstructionPreviewLayer';
import {GroundSurfaceTint} from '../src/render/GroundSurfaceTint';
import {SceneRenderCore} from '../src/render/SceneRenderCore';
import {GrowingZoneLayer} from '../src/render/GrowingZoneLayer';
import {RoofLayer} from '../src/render/RoofLayer';
import {AreaPreviewLayer} from '../src/render/AreaPreviewLayer';
import {EMPTY_GROUND_OVERLAYS,GROUND_OVERLAY_RENDER_ORDER,groundOverlayAtlas,groundOverlayPlacements,groundOverlayRect,type GroundOverlayAtlas,type GroundOverlayRect} from '../src/render/ground-overlay-surfaces';
import {televisionWatchCells} from '../src/sim/television-recreation';

function recordsAt(atlas:GroundOverlayAtlas,x:number,z:number,phase:0|1):number[][] {
  const cX=Math.floor(x+.5),cZ=Math.floor(z+.5),b=atlas.bounds;
  if(cX<b.minX||cZ<b.minZ||cX>b.maxX||cZ>b.maxZ)return [];
  const slot=((cZ-b.minZ)*atlas.width+cX-b.minX)*4+phase*2,start=atlas.index[slot]!,count=atlas.index[slot+1]!;
  return Array.from({length:count},(_,i)=>Array.from(atlas.records.slice((start+i)*8,(start+i+1)*8)))
    .filter(r=>x>=r[0]!&&z>=r[1]!&&x<=r[2]!&&z<=r[3]!);
}

test('TV preview and its four rotations publish their actual .8 faces and F32 colours',()=>{
  const world=createWorld(306,32,32),before=structuredClone(world),boxes=new BoxBatches(),hints=new RecreationHints(boxes);
  try{
    for(const orientation of [0,1,2,3] as const){
      const tv={x:16,z:16,orientation};hints.television(world,tv);
      const cells=televisionWatchCells(tv),mesh=hints.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>;
      expect(hints.surfaces).toHaveLength(cells.length);
      const first=hints.surfaces[0]!,cell=cells[0]!,rgb=mesh.geometry.getAttribute('boxColor');
      expect([first.red,first.green,first.blue]).toEqual([rgb.getX(0),rgb.getY(0),rgb.getZ(0)]);
      expect(first.opacity).toBe(Math.fround((mesh.material as THREE.MeshBasicNodeMaterial).opacity));
      const atlas=groundOverlayAtlas(32,32,hints.surfaces,[]);
      expect(recordsAt(atlas,cell.x,cell.z,0)).toHaveLength(1);
      expect(recordsAt(atlas,cell.x+.45,cell.z,0)).toEqual([]);
    }
    const surfaces=hints.surfaces;hints.television(world,{x:16,z:16,orientation:3});expect(hints.surfaces).toBe(surfaces);
    hints.hide();expect(hints.group.visible).toBe(false);expect(world).toEqual(before);
  }finally{boxes.dispose();}
});

test('hot/cold and wide influence producers expose geometry-specific colours without a new rules query',()=>{
  const world=createWorld(306,32,32),boxes=new BoxBatches(),hints=new RecreationHints(boxes);
  world.resources=[];world.structures=[];world.tiles.forEach(tile=>{tile.terrain='soil';});
  try{
    hints.cooler({x:16,z:16},1);expect(hints.surfaces).toHaveLength(2);
    expect(hints.surfaces[0]!.blue).toBeGreaterThan(hints.surfaces[0]!.red);
    expect(hints.surfaces[1]!.red).toBeGreaterThan(hints.surfaces[1]!.blue);
    for(const call of [()=>hints.wind(world,{x:16,z:16,orientation:0}),()=>hints.sunLamp(world,{x:16,z:16})]){
      call();expect(hints.surfaces.length).toBeGreaterThan(0);
      const first=hints.surfaces[0]!;
      expect(first.maxX-first.minX).toBe(1);expect(first.maxZ-first.minZ).toBe(1);expect(first.opacity).toBe(Math.fround(.2));
    }
    hints.update(world,{x:16,z:16});expect(hints.surfaces).toHaveLength(12);
    hints.update(world);expect(hints.group.visible).toBe(false);
  }finally{boxes.dispose();}
});

test('discovered selected ores retain the actual interpolated mesh colour and disappear when context clears',()=>{
  const world=createWorld(306,32,32),layer=new DeepResourceLayer();
  world.structures=[{id:100,kind:'ground-scanner',x:6,z:6,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}},
    {id:101,kind:'deep-drill',x:12,z:12,orientation:0,footprint:'standard',material:'steel'}];
  world.deepResources={adoptedAt:world.tick,rng:1,discoveries:1,cells:[{index:12*32+12,item:'steel',count:300}]};
  try{
    layer.update(world,{selectedId:101});const surface=layer.surfaces[0]!;
    expect([surface.red,surface.green,surface.blue]).toEqual(Array.from(layer.mesh.colorBuffer.array.slice(0,3)));
    expect(surface.opacity).toBe(Math.fround(layer.material.opacity));
    const atlas=groundOverlayAtlas(32,32,[],layer.surfaces);
    expect(recordsAt(atlas,12.42,12,1)).toHaveLength(1);expect(recordsAt(atlas,12.44,12,1)).toEqual([]);
    const old=layer.surfaces;expect(layer.update(world,{selectedId:101})).toBe(false);expect(layer.surfaces).toBe(old);
    layer.update(world,{});expect(layer.mesh.visible).toBe(false);expect(layer.surfaces).toEqual([]);
  }finally{layer.dispose();}
});

test('floor ghosts expose the same three plank faces and valid/invalid colours; furniture is not a floor fill',()=>{
  const world=createWorld(306,32,32),layer=new ConstructionPreviewLayer(),spec={kind:'lay-floor' as const,x:16,z:16,floor:'wood-planks' as const};
  try{
    layer.update(world,[spec],[],false);expect(layer.surfaces).toHaveLength(3);
    const mesh=layer.group.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry>,colour=mesh.geometry.getAttribute('boxColor');
    for(let i=0;i<3;i++)expect([layer.surfaces[i]!.red,layer.surfaces[i]!.green,layer.surfaces[i]!.blue]).toEqual([colour.getX(i),colour.getY(i),colour.getZ(i)]);
    const valid=layer.surfaces[0]!;layer.update(world,[],[spec],false);expect(layer.surfaces[0]!.red).not.toBe(valid.red);
    const atlas=groundOverlayAtlas(32,32,[],layer.surfaces);expect(recordsAt(atlas,16,16,1)).toHaveLength(1);
    layer.update(world,[{kind:'dining-chair',x:16,z:16,orientation:1,material:'wood'}],[],false);expect(layer.surfaces).toBe(EMPTY_GROUND_OVERLAYS);
    layer.hide();const surfaces=layer.surfaces,restore=layer.prepareForCompile();expect(layer.surfaces).toBe(surfaces);restore();expect(layer.surfaces).toBe(surfaces);
  }finally{layer.dispose();}
});

test('atlas clips world boundaries, indexes exact thin contours and keeps translucent ordering in both phases',()=>{
  const red=new THREE.Color(0xff0000),blue=new THREE.Color(0x0000ff),white=new THREE.Color(0xffffff);
  const outside=groundOverlayRect(-1,-1,-.6,-.6,red,.2),wide=groundOverlayRect(-.4,-.4,1.4,.4,red,.2);
  const thin=groundOverlayRect(.416,-.44,.464,-.21,white,1),overlap=groundOverlayRect(-.4,-.4,.4,.4,blue,.4);
  const atlas=groundOverlayAtlas(250,250,[outside,wide,overlap],[thin,thin]);
  expect(atlas.bounds).toEqual({minX:0,minZ:0,maxX:1,maxZ:0});expect(atlas.width).toBe(2);expect(atlas.height).toBe(1);
  expect(recordsAt(atlas,0,0,0).map(r=>r.slice(4,8))).toEqual([[1,0,0,Math.fround(.2)],[0,0,1,Math.fround(.4)]]);
  expect(recordsAt(atlas,.44,-.3,1)).toHaveLength(1);expect(recordsAt(atlas,0,0,1)).toEqual([]);
  expect(recordsAt(atlas,0,1,0)).toEqual([]);
});

test('field textures remain resident and upload only real overlay changes; preview clearing preserves independent layers',()=>{
  const tint=new GroundSurfaceTint(),parts=groundOverlayPlacements([{x:12,z:12,y:.026,sx:.8,sz:.8,color:0x9cbfba}],.48);
  try{
    tint.setZones(250,250,[{placements:[{x:12,z:12,y:0,color:0xff0000}],opacity:.2}],true);
    tint.setOverlays(250,250,parts,[]);
    const sizes=tint as unknown as {overlayIndexSize:{value:THREE.Vector2};overlayRecordsSize:{value:THREE.Vector2}};
    const expectSizes=()=>{
      expect(sizes.overlayIndexSize.value.toArray()).toEqual([tint.overlayIndex.image.width,tint.overlayIndex.image.height]);
      expect(sizes.overlayRecordsSize.value.toArray()).toEqual([tint.overlayRecords.image.width,tint.overlayRecords.image.height]);
    };
    expectSizes();
    const textures=[tint.overlayIndex,tint.overlayRecords],versions=textures.map(t=>t.version),data=textures.map(t=>t.image.data),zone=tint.zones.version;
    tint.setOverlays(250,250,parts.map(p=>({...p})),[]);
    expect(textures.map(t=>t.version)).toEqual(versions);expect(textures.map(t=>t.image.data)).toEqual(data);
    tint.setHover(12,12,1,1,0xffffff,.55);tint.clearPreview();expect(textures.map(t=>t.version)).toEqual(versions);expect(tint.zones.version).toBe(zone);
    tint.setOverlays(250,250,[],[]);expect((tint as unknown as {overlayActive:{value:number}}).overlayActive.value).toBe(0);expectSizes();
    expect(tint.overlayIndex).toBe(textures[0]);expect(tint.overlayRecords).toBe(textures[1]);expect(tint.zones.version).toBe(zone);
  }finally{tint.dispose();}
});

test('the real scene bridge propagates visible producer surfaces and clears hints without erasing selected contours',()=>{
  const tint=new GroundSurfaceTint(),boxes=new BoxBatches(),hints=new RecreationHints(boxes),world=createWorld(306,32,32);
  const white=groundOverlayRect(11.416,11.56,11.464,11.79,new THREE.Color(0xffffff),1);
  // Use the actual bridge without constructing a browser/renderer. Producers
  // and field are real; only unrelated camera/runtime services are absent.
  const scene=Object.assign(Object.create(SceneRenderCore.prototype) as Record<string,unknown>,{
    world,preparing:false,surfaceTint:tint,groundOverlayInputs:[],recreationHints:hints,
    turretPreviewVisible:false,turretTintSurfaces:EMPTY_GROUND_OVERLAYS,
    deepResources:{mesh:{visible:false},surfaces:EMPTY_GROUND_OVERLAYS},
    constructionPreview:{surfaces:EMPTY_GROUND_OVERLAYS},objectSelection:{visible:true},objectTintSurfaces:[white],
  }) as unknown as {refreshGroundOverlays():void};
  try{
    hints.television(world,{x:12,z:12,orientation:0});scene.refreshGroundOverlays();
    const initial=tint.overlayRecords.version;
    scene.refreshGroundOverlays();expect(tint.overlayRecords.version).toBe(initial);
    const atlas=groundOverlayAtlas(32,32,hints.surfaces,[white]);expect(recordsAt(atlas,12,14,0)).toHaveLength(1);
    hints.hide();scene.refreshGroundOverlays();expect(tint.overlayRecords.version).toBeGreaterThan(initial);
    const indices=Array.from(tint.overlayIndex.image.data!);
    expect(indices.filter((_,i)=>i%4===1).every(v=>v===0)).toBe(true);
    expect(indices.filter((_,i)=>i%4===3).some(v=>v>0)).toBe(true);
  }finally{tint.dispose();boxes.dispose();}
});

test('actual overlay leaves keep a deterministic shared order without changing unrelated batches or groups',()=>{
  const world=createWorld(306,32,32),boxes=new BoxBatches(),growing=new GrowingZoneLayer(boxes),roof=new RoofLayer(),hints=new RecreationHints(boxes),ghost=new ConstructionPreviewLayer(),deep=new DeepResourceLayer(),area=new AreaPreviewLayer();
  const group=new THREE.Group(),unrelated=new THREE.Group();
  world.roofing={build:[16*32+16],remove:[],constructed:[],cursor:0};
  world.growingZones=[];
  const core=Object.assign(Object.create(SceneRenderCore.prototype) as Record<string,unknown>,{world,boxes,storageGroup:group,tool:'home'}) as unknown as {buildStorage(value:typeof world):void};
  try{
    core.buildStorage(world);growing.update(world,true);roof.update(world,boxes,false,true);hints.television(world,{x:16,z:16,orientation:0});
    boxes.set(unrelated,'unrelated-ground-overlay',[{x:2,z:2,y:0}],'overlay',false);
    const leaf=(owner:THREE.Group,name:string)=>owner.children.find(child=>child.name===name)!;
    expect(leaf(group,'storage-cells').renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.storage);
    expect(leaf(growing.group,'growing-borders').renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.growing);
    expect(leaf(group,'storage-home').renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.home);
    expect(leaf(roof.areas,'roof-areas').renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.roof);
    expect(leaf(hints.group,'recreation-places').renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.hints);
    expect(area.mesh.renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.area);expect(deep.mesh.renderOrder).toBe(GROUND_OVERLAY_RENDER_ORDER.deep);
    expect(ghost.group.children.every(mesh=>mesh.renderOrder===GROUND_OVERLAY_RENDER_ORDER.ghost)).toBe(true);
    expect([group,growing.group,roof.areas,hints.group].every(owner=>owner.renderOrder===0)).toBe(true);
    expect(leaf(unrelated,'unrelated-ground-overlay').renderOrder).toBe(0);
    const surface=roof.areaSurfaces[0]!,atlas=groundOverlayAtlas(32,32,roof.areaSurfaces,[]);
    expect(surface.maxX-surface.minX).toBeCloseTo(.98);expect(recordsAt(atlas,16.48,16,0)).toHaveLength(1);expect(recordsAt(atlas,16.495,16,0)).toEqual([]);
  }finally{ghost.dispose();deep.dispose();area.dispose();roof.dispose();boxes.dispose();}
});
