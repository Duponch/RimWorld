import {describe,expect,it,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeStage} from '../src/ui3d/NativeStage';
import {flowNativeControls,layoutNativePage,wrapNativeCardText,type NativeRect,type TextMeasure} from '../src/ui3d/native-layout';
import type {NativeControl,NativePage} from '../src/ui3d/native-contract';
import type {CardboardPiece} from '../src/ui3d/prototype-art';

const measure:TextMeasure=(text,size)=>Array.from(text).length*size*.52;
const inside=(outer:NativeRect,inner:NativeRect)=>{expect(inner.x).toBeGreaterThanOrEqual(outer.x-.01);expect(inner.y).toBeGreaterThanOrEqual(outer.y-.01);expect(inner.x+inner.width).toBeLessThanOrEqual(outer.x+outer.width+.01);expect(inner.y+inner.height).toBeLessThanOrEqual(outer.y+outer.height+.01);};
const card=(label='Le village aux arbres blancs'):NativeControl=>{const caption='3 colons · 250 × 250 · Colonie jouée',description='Une description complète qui reste lisible.\nObserver les mêmes personnes et leurs biens.\nProvenance du parcours conservée.';return {id:'load-card',label,caption,description,hint:[label,caption,description].join('\n'),presentation:'card',onActivate:vi.fn()};};
const secondary=():NativeControl=>({id:'download-card',label:'Télécharger cette colonie',presentation:'icon',icon:'load',onActivate:vi.fn()});

describe('complete painted native load-card layout · V485',()=>{
 it('keeps a bounded full-row card while retaining all paragraphs in its model and tooltip',()=>{
  for(const width of [820,600,320]){
   const main=card(),download=secondary(),rect={x:14,y:24,width,height:0},flow=flowNativeControls([main,download],rect,measure,'card');
   expect(flow.controls).toHaveLength(2);const big=flow.controls[0]!,inset=flow.controls[1]!;expect(big.control).toBe(main);expect(big.width).toBe(width);expect(big.x).toBe(rect.x);inside(big,inset);
   expect(big.height).toBeGreaterThan(76);expect(big.height).toBeLessThanOrEqual(160);expect(main.description?.split('\n')).toHaveLength(3);for(const paragraph of main.description!.split('\n'))expect(main.hint).toContain(paragraph);expect(inset.width).toBeGreaterThanOrEqual(32);
   const shorter=flowNativeControls([{...main,description:'Court.'},download],rect,measure,'card');expect(big.height).toBeGreaterThan(shorter.controls[0]!.height);
  }
 });
 it('wraps names at normal glyph size but bounds the visible card instead of painting the entire provenance',()=>{
  const name='UneTrèsLongueColonieSansEspaces'.repeat(7),lines=wrapNativeCardText(name,190,measure,15);
  expect(lines.length).toBeGreaterThan(4);expect(lines.join('')).toBe(name);expect(lines.every(line=>measure(line,15)<=190)).toBe(true);
  const provenance='La provenance intégrale, les mêmes personnes et les mêmes biens sont conservés. '.repeat(30),base=card(name),main={...base,description:provenance,hint:[name,base.caption,provenance].join('\n')},flow=flowNativeControls([main,secondary()],{x:0,y:0,width:280,height:0},measure,'card');
  expect(flow.controls[0]!.height).toBeLessThanOrEqual(160);expect(flow.controls[0]!.control.label).toBe(name);expect(flow.controls[0]!.control.description).toBe(provenance);expect(flow.controls[0]!.control.hint).toContain(name);expect(flow.controls[0]!.control.hint).toContain(provenance);
 });
 it('shows at least five ordinary cards in an800px screen without hiding their actions or data',()=>{
  const description='Une colonie jouée et vérifiée.\nLe même inventaire reste conservé.',records=Array.from({length:12},(_,i)=>({id:'ordinary-'+i,label:'',controlStyle:'card' as const,controls:[{...card('Colonie '+i),id:'ordinary-load-'+i,caption:'3 colons · 250 × 250',description,hint:'Colonie '+i+'\n3 colons · 250 × 250\n'+description},{...secondary(),id:'ordinary-download-'+i}]}));
  const page:NativePage={id:'front-tests',title:'Colonies de test',rows:records,actions:[{id:'front-back',label:'Retour',onActivate:vi.fn()}]},box=layoutNativePage(page,{width:960,height:800},true,measure),fullyVisible=box.rows.filter(row=>row.top>=0&&row.top+row.height<=box.body.height);
  expect(fullyVisible.length).toBeGreaterThanOrEqual(5);expect(box.rows.map(row=>row.row.id)).toEqual(records.map(row=>row.id));for(const row of fullyVisible){expect(row.controls.find(c=>c.style==='card')!.height).toBeLessThanOrEqual(160);inside(row.controls.find(c=>c.style==='card')!,row.controls.find(c=>c.style==='icon')!);expect(row.row.controls![0]!.description).toBe(description);}
 });
 it('keeps Return and all download insets inside the frame while retaining every scrollable record',()=>{
  const records=Array.from({length:12},(_,i)=>({id:'record-'+i,label:'',controlStyle:'card' as const,controls:[{...card(),id:'load-'+i}, {...secondary(),id:'download-'+i}]}));
  const page:NativePage={id:'front-tests',title:'Colonies de test',rows:records,actions:[{id:'front-back',label:'Retour',onActivate:vi.fn()}]};
  for(const viewport of [{width:1440,height:1000},{width:960,height:800},{width:480,height:322}]){
   const box=layoutNativePage(page,viewport,true,measure);inside({x:0,y:0,...viewport},box);expect(box.rows.map(row=>row.row.id)).toEqual(records.map(row=>row.id));expect(box.contentHeight).toBeGreaterThan(box.body.height);
   for(const row of box.rows){const main=row.controls.find(c=>c.style==='card')!,inset=row.controls.find(c=>c.style==='icon')!;inside(main,inset);expect(main.width).toBe(row.width);}
   for(const action of box.actions)inside({x:0,y:0,width:box.width,height:box.height},{...action,y:box.header+action.y});expect(box.actions.map(c=>c.control.id)).toContain('front-back');
  }
 });
});

type Hit={piece:CardboardPiece;control?:NativeControl;region?:NativeRect};
type Harness=Record<string,unknown>&{hit(x:number,y:number):Hit|undefined;pointerDown(event:PointerEvent):void;pointerUp(event:PointerEvent):void};
function hitFixture(){
 const main=card('La colonie originale'),download=secondary(),boxes=flowNativeControls([main,download],{x:0,y:0,width:600,height:0},measure,'card').controls,big=boxes[0]!,small=boxes[1]!;
 const scene=new THREE.Scene(),group=new THREE.Group(),piece=new THREE.Group() as CardboardPiece,geometry=new THREE.BoxGeometry(big.width*.01,big.height*.01,.046),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(geometry,material);piece.add(mesh);group.add(piece);scene.add(group);
 Object.assign(piece.userData,{w:big.width*.01,h:big.height*.01,depth:.046,nativeId:main.id,mesh,interactiveMeshes:[mesh],pressVal:0});mesh.userData.widgetGroup=piece;
 const camera=new THREE.PerspectiveCamera(42,1440/1000,.1,100);camera.position.z=7.5;camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 // This is the actual renderer's card→inset conversion. The event assertions
 // below exercise NativeStage's real raycast and pointer dispatch methods.
 const inset:Hit={piece,control:download,region:{x:(small.x-big.x-big.width/2)*.01,y:(big.y+big.height/2-small.y-small.height)*.01,width:small.width*.01,height:small.height*.01}},primary:Hit={piece,control:main};
 const stage=Object.create(NativeStage.prototype) as Harness;
 Object.assign(stage,{closed:false,worldVisible:true,frontVisible:false,standalone:false,width:1440,height:1000,displayScale:1,scene,camera,pointer:new THREE.Vector2(),raycaster:new THREE.Raycaster(),stats:{raycasts:0},art:{interactiveMeshes:[mesh]},hits:new Map([[mesh,primary]]),insetControls:new WeakMap([[piece,[inset]]]),page:{id:'front-tests',modal:true,rows:[]},pageGroup:group,pageBox:{x:100,y:100,width:1200,height:800},pagePieces:[piece],pageControls:[primary,inset],moving:new Set(),down:null,activationSerial:0,pendingActions:0,lastPointer:{x:720,y:500},options:{onError:vi.fn(),onActivate:vi.fn()},clearHint:vi.fn(),setPointerOverUi:vi.fn(),gesture:vi.fn(),invalidate:vi.fn(),updatePointerCursor:vi.fn()});
 const point=(x:number,y:number)=>{const v=new THREE.Vector3((x-big.width/2)*.01,(big.height/2-y)*.01,.023).applyMatrix4(piece.matrixWorld).project(camera);return {x:(v.x+1)*720,y:(1-v.y)*500};};
 const event=(p:{x:number;y:number})=>({clientX:p.x,clientY:p.y,pointerId:1,button:0,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()} as unknown as PointerEvent);
 const click=(p:{x:number;y:number})=>{stage.pointerDown(event(p));stage.pointerUp(event(p));};
 return {stage,main,download,big,small,piece,point,event,click,close:()=>{geometry.dispose();material.dispose();}};
}
describe('native load-card secondary hit ownership · V485',()=>{
 it('dispatches an inset click only to download, and a body click only to load',async()=>{
  const f=hitFixture();try{
   for(const [x,y]of [[f.small.x+2,f.small.y+2],[f.small.x+f.small.width-2,f.small.y+2],[f.small.x+2,f.small.y+f.small.height-2],[f.small.x+f.small.width-2,f.small.y+f.small.height-2]]){const p=f.point(x!,y!);expect(f.stage.hit(p.x,p.y)?.control?.id).toBe(f.download.id);}
   f.click(f.point(f.small.x+f.small.width/2,f.small.y+f.small.height/2));await Promise.resolve();expect(f.download.onActivate).toHaveBeenCalledOnce();expect(f.main.onActivate).not.toHaveBeenCalled();
   f.click(f.point(30,30));await Promise.resolve();expect(f.main.onActivate).toHaveBeenCalledOnce();expect(f.download.onActivate).toHaveBeenCalledOnce();
  }finally{f.close();}
 });
 it('cancels a release across the inset boundary and never falls through a disabled download to loading',async()=>{
  const f=hitFixture();try{
   const down=f.point(f.small.x+1,f.small.y+f.small.height/2),up=f.point(f.small.x-1,f.small.y+f.small.height/2);f.stage.pointerDown(f.event(down));f.stage.pointerUp(f.event(up));await Promise.resolve();expect(f.main.onActivate).not.toHaveBeenCalled();expect(f.download.onActivate).not.toHaveBeenCalled();
   f.download.disabled=true;f.click(f.point(f.small.x+f.small.width/2,f.small.y+f.small.height/2));await Promise.resolve();expect(f.main.onActivate).not.toHaveBeenCalled();expect(f.download.onActivate).not.toHaveBeenCalled();
  }finally{f.close();}
 });
});
