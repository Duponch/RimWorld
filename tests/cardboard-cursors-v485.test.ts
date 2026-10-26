import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {afterEach,expect,test,vi} from 'vitest';
import {installNativeCardboardCursors,setNativeCursor} from '../src/ui/native-cardboard-cursors';
import {CARDBOARD_CURSOR_ASSETS} from '../src/ui/cardboard-cursor-assets';
import {CURSOR_KINDS} from '../src/ui/tool-cursors';

afterEach(()=>vi.unstubAllGlobals());

function host(){
  const values=new Map<string,string>(),writes:string[]=[];
  const root={dataset:{} as Record<string,string>,style:{setProperty:(key:string,value:string)=>{writes.push(key);values.set(key,value);},removeProperty:(key:string)=>{writes.push(key);values.delete(key);}}} as unknown as HTMLElement;
  return {root,values,writes};
}

test('native installation uses static hardware cursors once, with usable platform fallbacks',()=>{
  vi.stubGlobal('CSS',{supports:()=>false});
  const {root,values,writes}=host();
  installNativeCardboardCursors(root);
  expect(root.dataset.cardboardCursors).toBe('true');
  expect(Object.keys(CARDBOARD_CURSOR_ASSETS)).toEqual(CURSOR_KINDS);
  for(const kind of CURSOR_KINDS){expect(values.get('--cursor-'+kind)).toContain(`/v485/cursors/${kind}.png`);expect(values.get('--cursor-'+kind)).not.toContain('data:');}
  expect(values.get('--cursor-link')).toMatch(/, pointer$/);
  expect(values.get('--cursor-wait')).toMatch(/, wait$/);
  expect(values.get('--cursor-forbidden')).toMatch(/, not-allowed$/);
  expect(writes).toHaveLength(9);
  installNativeCardboardCursors(root);
  expect(writes).toHaveLength(9);
});

test('supporting browsers select a prebuilt density without runtime crop or image readback',()=>{
  vi.stubGlobal('CSS',{supports:()=>true});
  const {root,values}=host();installNativeCardboardCursors(root);
  expect(values.get('--cursor-pointer')).toContain('image-set(');
  expect(values.get('--cursor-pointer')).toContain('pointer.png") 1x');
  expect(values.get('--cursor-pointer')).toContain('pointer@2x.png") 2x');
});

test('same-hit movement does not write styles and leaving UI restores map ownership',()=>{
  const {root,values,writes}=host();
  setNativeCursor(root,undefined);expect(writes).toHaveLength(0);
  setNativeCursor(root,'link');expect(root.dataset.nativeCursor).toBe('link');
  expect(values.get('--native-ui-cursor')).toBe('var(--cursor-link, pointer)');
  setNativeCursor(root,'link');expect(writes).toHaveLength(1);
  setNativeCursor(root,'grabbing');expect(root.dataset.nativeCursor).toBe('grabbing');
  setNativeCursor(root,undefined);expect(root.dataset.nativeCursor).toBeUndefined();expect(values.has('--native-ui-cursor')).toBe(false);
  setNativeCursor(root,undefined);expect(writes).toHaveLength(3);
});

function png(path:string){
  const data=readFileSync(path),width=data.readUInt32BE(16),height=data.readUInt32BE(20),idats:Buffer[]=[];
  expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(data[24]).toBe(8);expect(data[25]).toBe(6);
  for(let at=8;at<data.length;){const n=data.readUInt32BE(at),type=data.subarray(at+4,at+8).toString();if(type==='IDAT')idats.push(data.subarray(at+8,at+8+n));at+=n+12;}
  const rows=inflateSync(Buffer.concat(idats)),stride=width*4,pixels=new Uint8Array(width*height*4);
  const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
    const type=rows[y*(stride+1)]!,value=rows[y*(stride+1)+x+1]!,a=x>=4?pixels[y*stride+x-4]!:0,b=y?pixels[(y-1)*stride+x]!:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]!:0;
    pixels[y*stride+x]=(value+(type===0?0:type===1?a:type===2?b:type===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
  }
  return {data,width,height,alpha:(x:number,y:number)=>pixels[(y*width+x)*4+3]!,pixel:(x:number,y:number)=>pixels.subarray((y*width+x)*4,(y*width+x)*4+4)};
}

test('all nine physical cursors ship small transparent PNGs with matched native densities',()=>{
  let bytes=0;
  for(const kind of CURSOR_KINDS)for(const size of [32,64]){
    const image=png(new URL(`../public/assets/ui/elsewhere/v485/cursors/${kind}${size===64?'@2x':''}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
    expect([image.width,image.height]).toEqual([size,size]);expect(image.data.length).toBeLessThan(24000);bytes+=image.data.length;
    for(const [x,y]of[[0,0],[size-1,0],[0,size-1],[size-1,size-1]])expect(image.alpha(x!,y!)).toBe(0);
    let ink=0,clear=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(image.alpha(x,y)>128)ink++;if(image.alpha(x,y)===0)clear++;}
    expect(ink).toBeGreaterThan(size*size*.12);expect(clear).toBeGreaterThan(size*size*.1);
  }
  expect(bytes).toBeLessThan(180000);
});

test('the new cursor family has beige painted faces rather than the rejected red paint',()=>{
  for(const kind of CURSOR_KINDS){
    const image=png(new URL(`../public/assets/ui/elsewhere/v485/cursors/${kind}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
    let opaque=0,beige=0;
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const [r,g,b,a]=image.pixel(x,y);if(a!<220)continue;opaque++;
      if(r!>=g!&&g!>=b!&&r!-g!<55&&r!>150)beige++;
    }
    expect(beige/opaque,kind).toBeGreaterThan(.65);
  }
});

test('arrow and pointing finger activate at their visible cutout tips, centred cursors stay centred',()=>{
  for(const kind of ['pointer','link'] as const){
    const asset=CARDBOARD_CURSOR_ASSETS[kind],image=png(new URL(`../public/assets/ui/elsewhere/v485/cursors/${kind}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
    const [x,y]=asset.hotspot;expect(y).toBeLessThan(7);
    let nearInk=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&y+dy>=0&&x+dx<32&&y+dy<32&&image.alpha(x+dx,y+dy)>128)nearInk=true;
    expect(nearInk).toBe(true);
  }
  for(const kind of ['wait','text','grab','grabbing','forbidden','resize'] as const)expect(CARDBOARD_CURSOR_ASSETS[kind].hotspot).toEqual([16,16]);
});
