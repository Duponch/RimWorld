import {expect,test} from 'vitest';
import {sealRemovalOriginal259,removalWritesMutable259,removalWritesApplied259,type MapRemovalWrite259} from '../src/sim/map-removal-writes-259';
test('only the declared area/bed writes cross phases; original health and actor links remain sealed',()=>{
 const health={tick:100},person={mapAreas:{revision:1,assignments:[{mapId:0,areaId:20}]},allowedAreaId:20,health,mapBed:{revision:1,mapId:0,bedId:30},bedId:null as number|null},holder={humans:[person]},next={revision:1,assignments:[]};
 const areas:MapRemovalWrite259[]=[{object:person,key:'mapAreas',present:true,value:next},{object:person,key:'allowedAreaId',present:false}],beds:MapRemovalWrite259[]=[{object:person,key:'mapBed',present:false},{object:person,key:'bedId',present:true,value:null}],seal=sealRemovalOriginal259(holder,areas,beds);
 expect(removalWritesMutable259([...areas,...beds])).toBe(true);expect(seal(0)).toBe(true);expect(seal(1)).toBe(false);
 person.mapAreas=next;delete (person as Partial<typeof person>).allowedAreaId;expect(removalWritesApplied259(areas)).toBe(true);expect(seal(0)).toBe(false);expect(seal(1)).toBe(true);expect(seal(2)).toBe(false);
 delete (person as Partial<typeof person>).mapBed;expect(seal(2)).toBe(true);person.health={tick:100};expect(seal(2)).toBe(false);person.health=health;expect(seal(2)).toBe(true);
 holder.humans[0]={...person};expect(seal(2)).toBe(false);
});
test('preflight refuses immutable writes and does not read a forged accessor',()=>{
 const actor=Object.defineProperty({},'mapAreas',{value:{revision:1,assignments:[]},writable:false,enumerable:true,configurable:true}),writes:MapRemovalWrite259[]=[{object:actor,key:'mapAreas',present:true,value:{revision:1,assignments:[]}}];expect(removalWritesMutable259(writes)).toBe(false);
 let reads=0;const forged=Object.defineProperty({},'health',{get(){reads++;throw Error('no read');},enumerable:true});expect(()=>sealRemovalOriginal259(forged,[],[])).toThrow(/data-only/);expect(reads).toBe(0);
});
