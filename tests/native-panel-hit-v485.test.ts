import {describe,expect,it,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeStage} from '../src/ui3d/NativeStage';
import type {NativeControl,NativePage} from '../src/ui3d/native-contract';
import type {CardboardPiece} from '../src/ui3d/prototype-art';

interface Hit {piece:CardboardPiece;control?:NativeControl;region?:{x:number;y:number;width:number;height:number}}
interface StageAccess {
  page:NativePage;
  pageGroup:THREE.Group;
  pageBackdrop:CardboardPiece;
  hits:Map<THREE.Mesh,Hit>;
  insetControls:Map<CardboardPiece,Hit[]>;
  dropdown:{pieces:CardboardPiece[]}|undefined;
  hit(x:number,y:number,includeAllUi?:boolean):Hit|undefined;
}

function fixture(modal=true){
  // Real CPU geometry/raycasts, including the thick tilted panel face. No Stage
  // constructor, DOM, renderer, graphics device or mocked hit implementation.
  const width=1200,height=800,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,width/height,.1,100);
  camera.position.set(0,0,8);camera.lookAt(0,0,0);scene.add(camera);
  const pageGroup=new THREE.Group();scene.add(pageGroup);
  const meshes:THREE.Mesh[]=[],pieces:CardboardPiece[]=[],stage=Object.create(NativeStage.prototype) as StageAccess;
  Object.assign(stage,{closed:false,worldVisible:true,frontVisible:false,standalone:false,width,height,displayScale:1,
    scene,camera,pointer:new THREE.Vector2(),raycaster:new THREE.Raycaster(),stats:{raycasts:0},hoverPose:undefined,
    page:{id:'formation',title:'Former une caravane',rows:[],modal},pageGroup,hits:new Map(),insetControls:new Map(),
    art:{interactiveMeshes:meshes},dropdown:undefined});
  const add=(id:string,w:number,h:number,options:{x?:number;y?:number;z?:number;depth?:number;parent?:THREE.Object3D;control?:NativeControl}={})=>{
    const piece=new THREE.Group() as CardboardPiece,depth=options.depth??0;
    const mesh=new THREE.Mesh(depth?new THREE.BoxGeometry(w,h,depth):new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial());
    if(depth)mesh.position.z=depth/2;piece.add(mesh);
    Object.assign(piece.userData,{nativeId:id,w,h,depth,mesh,interactiveMeshes:[mesh],tooltip:id});mesh.userData.widgetGroup=piece;
    piece.position.set(options.x??0,options.y??0,options.z??0);(options.parent??pageGroup).add(piece);
    stage.hits.set(mesh,{piece,control:options.control});meshes.push(mesh);pieces.push(piece);return piece;
  };
  const backdrop=add('page:formation',8.2,6,{depth:.046});
  // The actual page seed2003 produces these rotations. On its left, the front
  // face is above z=.025 even though a row hint at that z belongs to this page.
  backdrop.rotation.set(-.016,.008,0);stage.pageBackdrop=backdrop;
  const at=(x:number,y:number,z=0,includeAllUi=false)=>{
    scene.updateMatrixWorld(true);const p=new THREE.Vector3(x,y,z).project(camera);
    return stage.hit((p.x+1)*width/2,(1-p.y)*height/2,includeAllUi);
  };
  const close=()=>{for(const mesh of meshes){mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();}};
  return {stage,scene,pageGroup,add,at,close,backdrop,pieces};
}

describe('native physical page backdrop hit fallback V485',()=>{
  it('reaches the actual left text hint and its own input through a thicker tilted backdrop',()=>{
    const f=fixture();
    try{
      const hint=f.add('row-hint:formation-pile-37557',7.72,.48,{z:.025});
      const inputControl:NativeControl={id:'formation-pile-37557',label:'Quantité',onActivate:vi.fn()};
      const input=f.add('formation-pile-37557',.3,.24,{x:-3,y:0,z:.005,depth:.044,control:inputControl});
      expect(f.at(-3.5,0,.025)?.piece).toBe(hint);
      expect(f.at(-3,0,.049)?.piece).toBe(input);
      expect(f.at(-3,0,.049)?.control).toBe(inputControl);
      // Growing/rotating the same cardboard must not require a guessed Z lift.
      f.backdrop.scale.x=1.7;f.backdrop.rotation.y=.025;
      expect(f.at(-3.5,0,.025)?.piece).toBe(hint);
      expect(f.at(-3,0,.049)?.piece).toBe(input);
    }finally{f.close();}
  });

  it('keeps the physical backdrop as an occlusion barrier for HUD and another page in both modes',()=>{
    const f=fixture(false);
    try{
      const hud=f.add('hud:under-panel',12,7,{z:-.3,parent:f.scene});
      const oldPage=new THREE.Group();f.scene.add(oldPage);
      f.add('row-hint:stale-page',2,2,{x:1,y:1,z:-.1,parent:oldPage});
      for(const modal of [false,true])for(const includeAllUi of [false,true]){
        f.stage.page.modal=modal;
        expect(f.at(1,1,0,includeAllUi)?.piece).toBe(f.backdrop);
      }
      f.stage.page.modal=false;
      expect(f.at(4.6,0,-.3)?.piece).toBe(hud);
      f.stage.page.modal=true;
      expect(f.at(4.6,0,-.3)).toBeUndefined();
      expect(f.at(4.6,0,-.3,true)?.piece).toBe(hud);
      // An actually nearer external surface keeps its previous priority.
      f.stage.page.modal=false;
      const foreground=f.add('hud:in-front',.5,.5,{x:1,y:1,z:.4,parent:f.scene});
      expect(f.at(1,1,.4)?.piece).toBe(foreground);
    }finally{f.close();}
  });

  it('does not recover hidden or clipped row hints through the cardboard barrier',()=>{
    const f=fixture();
    try{
      const clip=new THREE.ClippingGroup();clip.enabled=true;
      clip.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),2.5)];f.pageGroup.add(clip);
      const hint=f.add('row-hint:formation-pile-37557',7.72,.48,{z:.025,parent:clip});
      expect(f.at(-3.5,0,.025)?.piece).toBe(f.backdrop);
      expect(f.at(-1,0,.025)?.piece).toBe(hint);
      hint.visible=false;
      expect(f.at(-1,0,.025)?.piece).toBe(f.backdrop);
      hint.visible=true;clip.visible=false;
      expect(f.at(-1,0,.025)?.piece).toBe(f.backdrop);
    }finally{f.close();}
  });

  it('preserves inset, dropdown option and dropdown empty-paper priorities without changing page context',()=>{
    const f=fixture(false);
    try{
      const original=f.stage.page,primary:NativeControl={id:'record-load',label:'Charger',onActivate:vi.fn()},
        secondary:NativeControl={id:'record-download',label:'Télécharger',onActivate:vi.fn()};
      const card=f.add('record-load',2,1,{z:.2,depth:.044,control:primary});
      f.stage.insetControls.set(card,[{piece:card,control:secondary,region:{x:.4,y:-.3,width:.4,height:.4}}]);
      expect(f.at(.6,-.1,.244)?.control).toBe(secondary);
      expect(f.at(-.6,0,.244)?.control).toBe(primary);
      const popup=f.add('select-popup',1.6,1,{z:.7,parent:f.scene}),option:NativeControl={id:'select-option:priority:1',label:'1',onActivate:vi.fn()},
        optionPiece=f.add(option.id,1.4,.3,{y:.2,z:.8,parent:f.scene,control:option});
      f.stage.dropdown={pieces:[popup,optionPiece]};f.stage.page.modal=true;
      expect(f.at(0,.2,.8)?.control).toBe(option);
      // Only pageBackdrop is deferred. Empty popup paper blocks the card below.
      expect(f.at(0,-.3,.7)?.piece).toBe(popup);
      expect(f.stage.page).toBe(original);
      expect(primary.onActivate).not.toHaveBeenCalled();expect(secondary.onActivate).not.toHaveBeenCalled();expect(option.onActivate).not.toHaveBeenCalled();
    }finally{f.close();}
  });
});
