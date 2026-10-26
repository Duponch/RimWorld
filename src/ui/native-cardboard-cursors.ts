import {CARDBOARD_CURSOR_ASSETS} from './cardboard-cursor-assets';
import type {CursorKind} from './tool-cursors';
import type {Tool} from './layout';

const FALLBACK:Readonly<Record<CursorKind,string>>={pointer:'default',link:'pointer',wait:'wait',zoom:'zoom-in',text:'text',grab:'grab',grabbing:'grabbing',forbidden:'not-allowed',resize:'nwse-resize'};
const installed=new WeakSet<HTMLElement>();
const densities=new WeakMap<HTMLElement,boolean>();
type MapGesture='pointer'|'grab'|'grabbing';
type OrderSurface=Readonly<Record<MapGesture,readonly [string,string]>>;
const orderSurfaces=new Map<Tool,Promise<OrderSurface>>();
const cursorImages=new Map<MapGesture,Promise<HTMLImageElement>>();
let painter:Promise<typeof import('../ui3d/native-action-icons')>|undefined;

function cursorImage(kind:MapGesture):Promise<HTMLImageElement>{
  let result=cursorImages.get(kind);
  if(!result){result=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Curseur carton indisponible : '+kind));image.src=`/assets/ui/elsewhere/v485/cursors/${kind}@2x.png`;});cursorImages.set(kind,result);}
  return result;
}

/** Uses the very same deterministic icon painter as the native action button.
 * The small physical arrow/hand remains distinct from the selected order. */
export function paintNativeOrderCursor(ctx:CanvasRenderingContext2D,tool:Tool,gesture:MapGesture,image:CanvasImageSource,density:number,drawIcon:typeof import('../ui3d/native-action-icons')['drawNativeActionIcon']):void{
  ctx.setTransform(density,0,0,density,0,0);
  ctx.clearRect(0,0,40,40);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,0,0,16,16);
  drawIcon(ctx,tool,26,26,11,'#261e18','#f4ecda');
}

/** Lazy, once per distinct tool: two hardware densities and both pan gestures.
 * No generation runs on pointermove, a frame, or reselection of a cached tool. */
export function syncNativeMapToolCursor(root:HTMLElement,viewport:HTMLElement,tool:Tool):void{
  if(tool==='select'||root.dataset.cardboardCursors!=='true')return;
  let result=orderSurfaces.get(tool);
  if(!result){
    result=(async()=>{
      painter??=import('../ui3d/native-action-icons');
      const [{drawNativeActionIcon},images]=await Promise.all([painter,Promise.all((['pointer','grab','grabbing'] as const).map(kind=>cursorImage(kind)))]);
      const surfaces={} as Record<MapGesture,[string,string]>;
      for(const [index,gesture]of(['pointer','grab','grabbing'] as const).entries()){
        const output: string[]=[];
        for(const density of [1,2]){
          const canvas=viewport.ownerDocument.createElement('canvas');canvas.width=canvas.height=40*density;
          const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas de curseur indisponible.');
          paintNativeOrderCursor(ctx,tool,gesture,images[index]!,density,drawNativeActionIcon);output.push(canvas.toDataURL('image/png'));
        }
        surfaces[gesture]=[output[0]!,output[1]!];
      }
      return surfaces;
    })();
    orderSurfaces.set(tool,result);
  }
  void result.then(surfaces=>{
    for(const gesture of ['pointer','grab','grabbing'] as const){
      const [one,two]=surfaces[gesture],image=densities.get(root)?`image-set(url("${one}") 1x, url("${two}") 2x)`:`url("${one}")`;
      const hotspot=gesture==='pointer'?CARDBOARD_CURSOR_ASSETS.pointer.hotspot.map(n=>Math.round(n/2)):[8,8];
      const property=`--cursor-tool-${tool}${gesture==='pointer'?'':'-'+gesture}`;
      const value=`${image} ${hotspot[0]} ${hotspot[1]}, ${gesture==='pointer'?'crosshair':gesture}`;
      if(root.style.getPropertyValue(property)!==value)root.style.setProperty(property,value);
    }
  }).catch(()=>{ /* The beige arrow/hand remains usable if image/canvas loading fails. */ });
}

/** The nine base OS cursors use prebuilt PNG densities without a JS decode or
 * canvas pass at installation. Order composites above are painted lazily once
 * per tool; neither path adds a following sprite, scene object or frame loop. */
export function installNativeCardboardCursors(root:HTMLElement):void{
  if(installed.has(root))return;
  installed.add(root);
  const highDensity=typeof CSS!=='undefined'&&CSS.supports('cursor','image-set(url("data:image/png;base64,AA==") 1x) 1 1, default');
  densities.set(root,highDensity);
  for(const kind of Object.keys(CARDBOARD_CURSOR_ASSETS) as CursorKind[]){
    const asset=CARDBOARD_CURSOR_ASSETS[kind],base=`/assets/ui/elsewhere/v485/cursors/${kind}`;
    const image=highDensity?`image-set(url("${base}.png") 1x, url("${base}@2x.png") 2x)`:`url("${base}.png")`;
    root.style.setProperty(`--cursor-${kind}`,`${image} ${asset.hotspot[0]} ${asset.hotspot[1]}, ${FALLBACK[kind]}`);
  }
  root.dataset.cardboardCursors='true';
}

/** Undefined restores map/tool/drag ownership. A same-kind hover does not write
 * styles or attributes again. The stage supplies the semantics of its real hit. */
export function setNativeCursor(root:HTMLElement,kind:CursorKind|undefined):void{
  if(root.dataset.nativeCursor===kind)return;
  if(kind===undefined){delete root.dataset.nativeCursor;root.style.removeProperty('--native-ui-cursor');return;}
  root.dataset.nativeCursor=kind;
  root.style.setProperty('--native-ui-cursor',`var(--cursor-${kind}, ${FALLBACK[kind]})`);
}
