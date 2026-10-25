import {afterEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three/webgpu';
import type {ItemId} from '../src/sim/items';
import type {StatusAlert} from '../src/ui/status-alerts';
import {NativeHudCards} from '../src/ui3d/native-hud';
import {PALETTE, PrototypeCardboardArt, type CardboardPiece} from '../src/ui3d/prototype-art';

type Command=unknown[];
const surfaces=new WeakMap<HTMLCanvasElement,Command[]>();
class ImageFixture {
  onload:(()=>void)|null=null;
  onerror:(()=>void)|null=null;
  complete=false;
  naturalWidth=0;
  src='';
}
function installPaint():void {
  const methods=new Set(['clearRect','fillRect','strokeRect','save','restore','beginPath','moveTo','lineTo','closePath','fill','stroke','arc','translate','rotate','scale','fillText','strokeText','drawImage','setLineDash']);
  vi.stubGlobal('Image',ImageFixture);
  vi.stubGlobal('document',{createElement:(tag:string)=>{
    if(tag!=='canvas')throw new Error(`Unexpected native element ${tag}`);
    const commands:Command[]=[],state=new Map<PropertyKey,unknown>(),stack:Array<Map<PropertyKey,unknown>>=[];
    const context=new Proxy({}, {
      get(_target,key){
        if(key==='measureText')return (text:string)=>({width:text.length*7});
        if(typeof key==='string'&&methods.has(key))return (...args:unknown[])=>{
          commands.push([key,...args]);
          if(key==='save')stack.push(new Map(state));
          if(key==='restore'){state.clear();for(const [name,value] of stack.pop()??[])state.set(name,value);}
        };
        return state.get(key);
      },
      set(_target,key,value:unknown){state.set(key,value);commands.push(['set',key,value]);return true;}
    });
    const canvas={width:0,height:0,getContext:()=>context} as unknown as HTMLCanvasElement;
    surfaces.set(canvas,commands);return canvas;
  }});
}
type TestAlert=StatusAlert&{domain?:{severity:'danger'|'warning'}};
interface HudAccess {
  resources:Array<{item:ItemId;stock:number;ground:number;carried:number;inventory:number;equipped:number;delivered:number}>;
  alerts:TestAlert[];
  resourceImages:Map<ItemId,ImageFixture>;
  refreshResources():void;
  refreshAlerts():void;
}
function fixture(){
  installPaint();
  const art=new PrototypeCardboardArt(),root=new THREE.Group(),showPage=vi.fn();
  const anchors={topCenter:new THREE.Group(),topLeft:new THREE.Group(),topRight:new THREE.Group(),bottomRight:new THREE.Group()};
  root.add(...Object.values(anchors));
  const hud=new NativeHudCards(art,anchors,{selectPawn:vi.fn(),speed:vi.fn(),showPage});
  const access=hud as unknown as HudAccess;
  const piece=(id:string):CardboardPiece=>{
    let found:CardboardPiece|undefined;
    root.traverse(object=>{if(object.userData.nativeId===id)found=object as CardboardPiece;});
    if(!found)throw new Error(`Missing ${id}`);return found;
  };
  const resources=(rows:Array<[ItemId,number]>)=>{
    access.resources=rows.map(([item,stock])=>({item,stock,ground:stock,carried:0,inventory:0,equipped:0,delivered:0}));
    access.refreshResources();
  };
  const alerts=(rows:TestAlert[])=>{access.alerts=rows;access.refreshAlerts();};
  return {art,hud,access,root,piece,resources,alerts,showPage,close:()=>{hud.dispose();art.dispose();}};
}
const ink=(piece:CardboardPiece)=>surfaces.get(piece.userData.canvas)!;
const front=(piece:CardboardPiece)=>(Array.isArray(piece.userData.mesh.material)?piece.userData.mesh.material[0]:piece.userData.mesh.material) as THREE.Material;
const disposed=(resource:THREE.BufferGeometry|THREE.Material|THREE.Texture)=>{const spy=vi.fn();resource.addEventListener('dispose',spy);return spy;};
const alert=(key:string,text:string):TestAlert=>({key,text,targets:[]});

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('retained native HUD resources',()=>{
  it('changes only affected ink and preserves canvases, GPU resources, hit meshes and hover state',()=>{
    const f=fixture();
    try{
      f.resources([['wood',10],['steel',20]]);
      const wood=f.piece('hud:resource:wood'),steel=f.piece('hud:resource:steel');
      const identities=[wood.userData.canvas,wood.userData.texture,wood.userData.mesh.geometry,front(wood)];
      const releases=identities.slice(1).map(resource=>disposed(resource as THREE.Texture|THREE.BufferGeometry|THREE.Material));
      const woodVersion=wood.userData.texture.version,steelVersion=steel.userData.texture.version;
      wood.userData.hoverVal=.75;ink(wood).length=0;
      f.resources([['wood',11],['steel',20]]);
      expect(f.piece('hud:resource:wood')).toBe(wood);
      expect([wood.userData.canvas,wood.userData.texture,wood.userData.mesh.geometry,front(wood)]).toEqual(identities);
      expect(wood.userData.texture.version).toBe(woodVersion+1);
      expect(steel.userData.texture.version).toBe(steelVersion);
      expect(wood.userData.hoverVal).toBe(.75);
      expect(f.art.interactiveMeshes).toContain(wood.userData.mesh);
      expect(ink(wood).some(command=>command[0]==='fillText'&&command[1]==='11')).toBe(true);
      expect(wood.userData.tooltip).toContain('11 comptabilisé');
      for(const release of releases)expect(release).not.toHaveBeenCalled();
      const revision=f.art.revision;
      f.resources([['wood',11],['steel',20]]);
      expect(f.art.revision).toBe(revision);
      wood.userData.onClick?.();
      expect(f.showPage.mock.lastCall?.[0].rows.find((row:{id:string})=>row.id==='item-wood').value).toBe('11 comptabilisé(s)');
    }finally{f.close();}
  });

  it('keeps branch controls live and releases disappeared rows and changed positional seeds once',()=>{
    const f=fixture();
    try{
      f.resources([['wood',10],['steel',20]]);
      const branch=f.piece('hud:resource:raw-resources'),wood=f.piece('hud:resource:wood'),steel=f.piece('hud:resource:steel');
      const woodReleased=disposed(wood.userData.texture),steelReleased=disposed(steel.userData.texture);
      branch.userData.onClick?.();
      expect(f.piece('hud:resource:raw-resources')).toBe(branch);
      expect(branch.userData.tooltip).toBe('Déplier Ressources brutes');
      expect(woodReleased).toHaveBeenCalledTimes(1);expect(steelReleased).toHaveBeenCalledTimes(1);
      expect(f.art.interactiveMeshes).not.toContain(wood.userData.mesh);
      branch.userData.onClick?.();
      const restoredWood=f.piece('hud:resource:wood'),woodSeed=restoredWood.userData.seed;
      f.resources([['wood',10]]);
      // A shifted index changes the literal brush seed; it must not inherit the
      // previous row's texture/hand jitter merely to preserve object identity.
      expect(f.piece('hud:resource:wood').userData.seed).not.toBe(woodSeed);
      expect(f.piece('hud:resource:wood')).not.toBe(restoredWood);
      f.resources([]);
      expect(f.piece('hud:resource:empty').userData.tooltip).toContain('Stocks connus');
    }finally{f.close();}
  });

  it('retains page controls when only quantities change and refreshes their page actions',()=>{
    const f=fixture();
    try{
      f.hud.setViewport(1440,228,.01); // Three rows per page.
      f.resources([['wood',10],['steel',20],['gold',30],['silver',40]]);
      const next=f.piece('hud:resource:next'),previous=f.piece('hud:resource:previous');
      const nextVersion=next.userData.texture.version;
      f.resources([['wood',11],['steel',20],['gold',30],['silver',40]]);
      expect(f.piece('hud:resource:next')).toBe(next);
      expect(f.piece('hud:resource:previous')).toBe(previous);
      expect(next.userData.texture.version).toBe(nextVersion);
      next.userData.onClick?.();
      expect(ink(f.piece('hud:resource:previous')).some(command=>command[0]==='fillText'&&command[1]==='‹ 2/2')).toBe(true);
      f.piece('hud:resource:previous').userData.onClick?.();
      expect(f.piece('hud:resource:raw-resources')).toBeDefined();
    }finally{f.close();}
  });

  it('image completion repaints current records with current values and becomes inert on disposal',()=>{
    const f=fixture();
    try{
      f.resources([['wood',10]]);
      const image=f.access.resourceImages.get('wood')!,late=image.onload!;
      f.resources([['wood',12]]);
      const wood=f.piece('hud:resource:wood');ink(wood).length=0;
      image.complete=true;image.naturalWidth=24;late();
      expect(ink(wood).some(command=>command[0]==='drawImage'&&command[1]===image)).toBe(true);
      expect(ink(wood).some(command=>command[0]==='fillText'&&command[1]==='12')).toBe(true);
      f.resources([]);
      const revision=f.art.revision;late();expect(f.art.revision).toBe(revision);
      f.hud.dispose();const closedRevision=f.art.revision;late();
      expect(f.art.revision).toBe(closedRevision);expect(image.onload).toBeNull();
    }finally{f.close();}
  });
});

describe('retained native HUD alerts',()=>{
  it('rebinds current alert details without painting unchanged ink, and repaints severity on the same card',()=>{
    const f=fixture();
    try{
      f.alerts([alert('notice','Message court')]);
      const card=f.piece('hud:alert:notice'),all=f.piece('hud:alerts:all'),version=card.userData.texture.version,allVersion=all.userData.texture.version,revision=f.art.revision;
      f.alerts([{...alert('notice','Message court'),tooltip:{title:'Titre actuel',body:'Détails actuels'}}]);
      expect(f.piece('hud:alert:notice')).toBe(card);expect(f.art.revision).toBe(revision);
      card.userData.onClick?.();
      expect(f.showPage.mock.lastCall?.[0].rows).toContainEqual({id:'body',label:'Détails actuels'});
      f.alerts([{...alert('notice','Message court'),domain:{severity:'danger'}}]);
      expect(f.piece('hud:alert:notice')).toBe(card);
      expect(card.userData.texture.version).toBe(version+1);
      expect(ink(card)).toContainEqual(['set','fillStyle',PALETTE.terracotta]);
      expect(all.userData.texture.version).toBe(allVersion);
    }finally{f.close();}
  });

  it('repaints equal-sized text from live records and releases only removed/resized/reseeded cards',()=>{
    const f=fixture();
    try{
      f.alerts([alert('notice','Message court'),alert('other','Autre message')]);
      const card=f.piece('hud:alert:notice'),other=f.piece('hud:alert:other'),otherVersion=other.userData.texture.version;
      const identities=[card.userData.texture,card.userData.canvas,front(card),card.userData.mesh.geometry];
      ink(card).length=0;
      f.alerts([alert('notice','Message neuf!'),alert('other','Autre message')]);
      expect(f.piece('hud:alert:notice')).toBe(card);
      expect([card.userData.texture,card.userData.canvas,front(card),card.userData.mesh.geometry]).toEqual(identities);
      expect(ink(card).some(command=>command[0]==='fillText'&&command[1]==='Message neuf!')).toBe(true);
      expect(card.userData.tooltip).toBe('Message neuf!');expect(other.userData.texture.version).toBe(otherVersion);
      const release=disposed(card.userData.texture),otherRelease=disposed(other.userData.texture);
      f.alerts([alert('notice','Un message devenu bien plus long et donc redimensionné'),alert('other','Autre message')]);
      expect(release).toHaveBeenCalledTimes(1);expect(f.piece('hud:alert:other')).toBe(other);
      f.alerts([alert('other','Autre message')]);
      expect(otherRelease).toHaveBeenCalledTimes(1);expect(f.piece('hud:alert:other').userData.seed).toBe(53);
      expect(f.art.interactiveMeshes).not.toContain(card.userData.mesh);
    }finally{f.close();}
  });

  it('matches freshly painted ink after retention and maintains overflow count and cleanup',()=>{
    const f=fixture(),g=fixture();
    try{
      const rows=Array.from({length:5},(_,index)=>alert(`notice-${index}`,`Message ${index}`));
      f.alerts(rows);const first=f.piece('hud:alert:notice-0'),all=f.piece('hud:alerts:all');
      expect(all.visible).toBe(true);
      ink(first).length=0;
      const next=[alert('notice-0','Nouveau 0'),...rows.slice(1)];f.alerts(next);g.alerts(next);
      expect(ink(first)).toEqual(ink(g.piece('hud:alert:notice-0')));
      const version=all.userData.texture.version;
      f.alerts(next.slice(0,4));expect(all.visible).toBe(false);expect(all.userData.texture.version).toBe(version+1);
      expect(ink(all).some(command=>command[0]==='fillText'&&command[1]==='4 alertes · tout voir')).toBe(true);
      const releases=[first.userData.texture,front(first),first.userData.mesh.geometry,first.userData.shadowMesh.geometry].map(disposed);
      f.alerts([]);for(const release of releases)expect(release).toHaveBeenCalledTimes(1);
      f.hud.dispose();for(const release of releases)expect(release).toHaveBeenCalledTimes(1);
    }finally{f.close();g.close();}
  });
});
