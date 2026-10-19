import {knownNotificationTarget256} from '../src/ui/notification-focus';
import {afterEach,expect,test,vi} from 'vitest';
import {MapLabelsOverlay} from '../src/render/MapLabelsOverlay';
afterEach(()=>vi.unstubAllGlobals());
import * as THREE from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {availableNutrition} from '../src/sim/items';
import {ExplorationField256} from '../src/render/ExplorationField256';
import {ExplorationMask256,actorExplorationMaterial256} from '../src/render/ExplorationMask256';
import {mapHoverLines,MapHoverLightCache} from '../src/ui/map-hover-readout';
import {mapCellDetails} from '../src/ui/map-cell-details';
import {mapObjectsAt,mapObjectExists,mapObjectCells} from '../src/ui/map-object-selection';
import {matchingMapObjects,mapObjectGroupCells} from '../src/ui/map-object-group-selection';
import {knownPile256,knownStockCounts256,knownNutrition256} from '../src/ui/exploration-readers-256';
import {itemInformation} from '../src/ui/item-information';
import {readInspectAlerts} from '../src/ui/status-alerts';
import {designationIconInstances} from '../src/render/DesignationIconLayer';
import {UNDISCOVERED_CELL_LABEL_256} from '../src/sim/exploration-visibility-256';
import type {ExplorationMap256} from '../src/sim/exploration-state-256';
/** Prepared UI reader witness only. No factory generation, RAW validity,
 * physical acquisition, simulation step or native render is claimed here. */
function witness(){const w=createWorld(861,32,32);w.site={revision:3,tileId:0,mapSeed:w.seed,biome:'temperate-forest',hilliness:'flat',river:'none',stones:['granite','marble'],coastAngle:null,mutatorCode:0};w.exploration={revision:1};w.tiles=w.tiles.map(()=>({terrain:'soil-natural' as const,fogged:true as const}));w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];return w;}
function small():ExplorationMap256 {return {schemaVersion:256,site:{revision:3},exploration:{revision:1},width:3,height:2,tiles:Array.from({length:6},()=>({terrain:'soil-natural' as const,fogged:true as const}))};}
test('resident primitive field captures same-tick deletion, sparse identity reuse and literal legacy without mutating source',()=>{
 const a=small(),before=structuredClone(a),field=new ExplorationField256();expect(field.adopt(a,true,null)).toBe(true);const data=field.data;expect(field.ranges).toEqual([{start:0,count:12},{start:12,count:12}]);expect(field.known(1,0)).toBe(false);expect(a).toEqual(before);
 expect(field.adopt(a,false,[])).toBe(false);const b={...a,tiles:[...a.tiles]};b.tiles[1]={terrain:'packed-dirt'};expect(field.adopt(b,false,[1])).toBe(true);expect(field.data).toBe(data);expect(field.ranges).toEqual([{start:4,count:4}]);expect(field.known(1,0)).toBe(true);expect(a).toEqual(before);
 delete b.tiles[2]!.fogged;expect(field.adopt(b,false,null)).toBe(true);expect(field.known(2,0)).toBe(true);
 const legacy={...small(),schemaVersion:255,site:{revision:2},exploration:undefined};expect(field.adopt(legacy,false,[])).toBe(true);expect([...field.data].filter((_,i)=>i%4===0)).toEqual([255,255,255,255,255,255]);
});
test('resident data texture/material identities survive changes; solid AND shadow masks compose existing mask exactly once',()=>{
 const mask=new ExplorationMask256(),material=actorExplorationMaterial256(new THREE.MeshStandardNodeMaterial());const texture=mask.map;mask.configure(material);const solid=material.maskNode,shadow=material.maskShadowNode,version=material.version;
 expect(solid).toBeTruthy();expect(shadow).toBeTruthy();mask.configure(material);expect(material.maskNode).toBe(solid);expect(material.maskShadowNode).toBe(shadow);expect(material.version).toBe(version);
 const w=witness();mask.adopt(w,true,null);expect(mask.map).toBe(texture);expect(mask.field.enabled).toBe(true);const firstRanges=[...texture.updateRanges];delete w.tiles[1]!.fogged;mask.adopt(w,false,[1]);expect(texture.updateRanges.length).toBeGreaterThan(firstRanges.length);expect(mask.map).toBe(texture);expect(material.maskNode).toBe(solid);expect(material.maskShadowNode).toBe(shadow);
 texture.onUpdate?.(texture);expect(texture.updateRanges).toEqual([]);mask.dispose();material.dispose();
});
test('undiscovered readout returns before light/room/object access, including mineral and prospective road grounds',()=>{
 const w=witness();w.tiles[1]={terrain:'rock',ore:'jade',stone:'granite',fogged:true};w.tiles[2]={terrain:'packed-dirt',fogged:true};
 Object.defineProperty(w,'resources',{get(){throw Error('hidden objects read');},configurable:true});
 for(const x of [1,2]){expect(mapHoverLines(w,{x,z:0})).toEqual([UNDISCOVERED_CELL_LABEL_256]);expect(mapCellDetails(w,{x,z:0},1)).toBeNull();expect(new MapHoverLightCache().lightAt(w,{x,z:0},0)).toBe(0);}
});
test('hidden coordinates/IDs/multi-select reveal no ore or Thing; actual partly-known footprint remains selectable',()=>{
 const w=witness();w.structures.push({id:400,kind:'table',x:4,z:4,orientation:0,footprint:'standard'});w.tiles[2]={terrain:'rock',ore:'gold',fogged:true};
 expect(mapObjectsAt(w,{x:2,z:0})).toEqual([]);expect(knownNotificationTarget256(w,{key:'test',kind:'object',object:{kind:'rock',id:2},cell:{x:2,z:0}})).toBe(false);expect(mapObjectExists(w,{kind:'rock',id:2})).toBe(false);expect(matchingMapObjects(w,{kind:'rock',id:2},()=>true)).toEqual([]);
 expect(mapObjectCells(w,{kind:'structure',id:400})).toEqual([]);expect(mapObjectGroupCells(w,[{kind:'structure',id:400}])).toEqual([[]]);
 const cells=importedFootprint(w.structures[0]!);delete w.tiles[cells[0]!.z*w.width+cells[0]!.x]!.fogged;
 expect(mapObjectExists(w,{kind:'structure',id:400})).toBe(true);expect(mapObjectGroupCells(w,[{kind:'structure',id:400}])[0]).toEqual(cells);
});
test('Mine uses only generic intentional sprite over fog; unknown plant orders and object targets stay hidden',()=>{
 const w=witness();w.tiles[33]={terrain:'rock',ore:'uranium',fogged:true};const base={orientation:0 as const,footprint:'standard' as const,status:'pending' as const,reservedBy:null,progress:0,escrow:{wood:0,food:0}};
 w.jobs.push({...base,id:601,kind:'mine',x:1,z:1},{...base,id:602,kind:'chop',x:2,z:1});
 const instances=designationIconInstances(w);expect(instances).toEqual([{x:1,y:3.2,z:1,icon:0}]);expect(mapObjectExists(w,{kind:'job',id:601})).toBe(false);expect(mapObjectsAt(w,{x:1,z:1})).toEqual([]);
});
test('unknown ground quantities and incident targets are absent; genuine own held quantities and legacy nutrition remain',()=>{
 const w=witness(),person=w.pawns[0]!;w.piles.push({id:701,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x:1,z:1}},{id:702,kind:'food',item:'berries',quantity:20,owner:{type:'ground',x:2,z:1}},{id:703,kind:'food',item:'berries',quantity:3,owner:{type:'pawn',pawnId:person.id}});
 expect(knownPile256(w,w.piles[0]!)).toBe(false);expect(knownStockCounts256(w).get('wood')).toBeUndefined();expect(knownStockCounts256(w).get('berries')).toBe(3);expect(knownNutrition256(w)).toBeCloseTo(.15);expect(itemInformation(w.piles[0]!,w)).toEqual({title:UNDISCOVERED_CELL_LABEL_256,description:'',rows:[]});
 w.resources.push({id:704,kind:'rice',x:1,z:2,amount:1,growth:.5,blight:{since:0,severity:.1,lastHarmTick:0,nextCheck:200,rng:3}});expect(readInspectAlerts(w)['inspect-blight']).toBeUndefined();delete w.tiles[65]!.fogged;expect(readInspectAlerts(w)['inspect-blight']?.targets).toHaveLength(1);
 delete w.exploration;expect(knownNutrition256(w)).toBe(availableNutrition(w));expect(itemInformation(w.piles[0]!,w).title).toBe('Bois');
});
import {footprintCells as importedFootprint} from '../src/sim/definitions';

test('GPU quantities follow scalar adoption revision even at same tick; ordinary RAF keeps its resident label index',()=>{
 const context={setTransform:vi.fn(),clearRect:vi.fn(),strokeText:vi.fn(),fillText:vi.fn(),measureText:(text:string)=>({width:7*text.length})},canvas={width:0,height:0,getContext:()=>context};
 vi.stubGlobal('document',{createElement:()=>canvas});vi.stubGlobal('window',{devicePixelRatio:1});
 const overlay=new MapLabelsOverlay(),camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,100);camera.position.set(4,16,4);camera.lookAt(4,0,4);camera.updateProjectionMatrix();
 const w=witness();w.piles=[{id:801,kind:'wood',item:'wood',quantity:2,owner:{type:'ground',x:4,z:4}}];
 overlay.draw(w,camera,120,800,600,1);expect(overlay['chunks'].flatMap(c=>c.entries)).toEqual([]);expect(overlay.mesh.geometry.instanceCount).toBe(0);delete w.tiles[132]!.fogged;
 overlay.draw(w,camera,120,800,600,2);expect(overlay['chunks'].flatMap(c=>c.entries).map(e=>({x:e.x,y:e.y,z:e.z,label:e.label,pileId:e.pileId}))).toEqual([{x:4,y:.32,z:4,label:'2',pileId:801}]);expect(overlay.mesh.geometry.instanceCount).toBe(1);
 const anchor=overlay.mesh.geometry.getAttribute('labelAnchor');if(!(anchor instanceof THREE.BufferAttribute))throw Error('Expected label anchor');const version=anchor.version,index=overlay['chunks'];
 const next={...w,tick:w.tick+1};Object.defineProperty(next,'tiles',{get(){throw Error('RAF must not scan/re-read fog cells');}});
 overlay.draw(next,camera,120,800,600,2);expect(overlay['chunks']).toBe(index);expect(overlay.mesh.geometry.getAttribute('labelAnchor')).toBe(anchor);expect(anchor.version).toBe(version);overlay.dispose();
});
