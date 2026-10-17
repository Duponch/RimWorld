import {expect,test} from 'vitest';
import {generateWorld} from '../src/sim/generation';
import {addGroundMaterial,depositMaterialPart,transferPile} from '../src/sim/materials';
import {copyPileCondition} from '../src/sim/pile-condition';
import {materialAllowedForPlayer256,setMaterialForbidden256,validMaterialPermission256,applyMaterialPermission256} from '../src/sim/material-permission-256';
import {applyCommand} from '../src/sim/engine';
import {automaticallyHaulable} from '../src/sim/mining-rules';
import {eggAllowedForPlayer256} from '../src/sim/animal-egg-permission-v256';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import type {MaterialPile} from '../src/sim/types';

test('ordinary future permission is descriptor-strict, while specialized fields keep their own authority',()=>{
 const source:MaterialPile={id:1,item:'steel',kind:'steel',quantity:5,owner:{type:'ground',x:2,z:2}};
 setMaterialForbidden256(source,true);expect(source.forbidden).toBe(true);expect(validMaterialPermission256(source,256)).toBe(true);expect(validMaterialPermission256(source,255)).toBe(false);
 expect(copyPileCondition(source)).toEqual({forbidden:true});expect(automaticallyHaulable(source)).toBe(false);expect(eggAllowedForPlayer256(source)).toBe(false);
 const absent={...source};delete absent.forbidden;Object.defineProperty(absent,'forbidden',{value:undefined,enumerable:true,configurable:true});expect(validMaterialPermission256(absent,256)).toBe(false);
 let reads=0;Object.defineProperty(absent,'forbidden',{get(){reads++;return true;},enumerable:true,configurable:true});expect(validMaterialPermission256(absent,256)).toBe(false);expect(reads).toBe(0);
 const egg:MaterialPile={id:2,item:'turkey-egg-unfertilized',kind:'food',quantity:1,owner:{type:'ground',x:2,z:3}};setMaterialForbidden256(egg,true);expect(egg.eggForbidden).toBe(true);expect(Object.hasOwn(egg,'forbidden')).toBe(false);
});

test('a real command at the same tick changes only permission; full/save/delta preserve it and a refused future packet stays atomic',()=>{
 // Prepared ordinary32 fixture, not a Core geographic generation claim.
 const w=generateWorld(81872,32,32);w.resources=[];w.structures=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));
 addGroundMaterial(w,'steel',10,{x:12,z:12},'steel');const pile=w.piles[0]!,id=pile.id,tick=w.tick,rng=w.rng,nextId=w.nextId;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Prepared initial snapshot refused');const beforeDelta=structuredClone(first.world);
 expect(applyCommand(w,{type:'material-forbid',pileId:id,forbidden:true}).ok).toBe(true);expect(w.piles[0]).toBe(pile);expect([pile.id,pile.quantity,w.tick,w.rng,w.nextId]).toEqual([id,10,tick,rng,nextId]);
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 const malformedCommand={type:'material-forbid' as const,pileId:id,forbidden:false};Object.defineProperty(malformedCommand,'type',{value:'egg-forbid',enumerable:true});expect(applyMaterialPermission256(w,malformedCommand).ok).toBe(false);expect(serializeWorld(w)).toBe(saved);
 const second=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(second.status).toBe('applied');if(first.status!=='applied'||second.status!=='applied')throw Error('Prepared ordinary snapshot refused');
 expect(beforeDelta.piles[0]!.forbidden).toBeUndefined();expect(second.world.piles[0]!.forbidden).toBe(true);
 const malformed=JSON.parse(saved);malformed.schemaVersion=255;expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow();expect(w.piles[0]).toBe(pile);
 expect(applyCommand(w,{type:'material-forbid',pileId:id,forbidden:false}).ok).toBe(true);expect(Object.hasOwn(pile,'forbidden')).toBe(false);expect(materialAllowedForPlayer256(pile)).toBe(true);
});

test('a physical split keeps the flag; a real absorption keeps destination permission instead of manufacturing auto-Allow',()=>{
 const w=generateWorld(81873,32,32);w.resources=[];w.structures=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));
 addGroundMaterial(w,'steel',10,{x:12,z:12},'steel');const source=w.piles[0]!;setMaterialForbidden256(source,true);
 expect(depositMaterialPart(w,source,{x:13,z:12},3)).toBe(true);const split=w.piles.find(p=>p!==source)!;expect(source.quantity).toBe(7);expect(split.quantity).toBe(3);expect(split.id).not.toBe(source.id);expect(split.forbidden).toBe(true);
 setMaterialForbidden256(split,false);expect(transferPile(w,source,{type:'ground',x:13,z:12})).toBe(true);expect(w.piles).toHaveLength(1);expect(w.piles[0]).toBe(split);expect(split.quantity).toBe(10);expect(Object.hasOwn(split,'forbidden')).toBe(false);
});
