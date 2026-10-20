import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {validShelfSettings} from '../src/sim/shelf-save.ts';
import {validStorageSettings} from '../src/sim/designation.ts';
import {storageAccepts} from '../src/sim/storage-filters.ts';

test('new storage admits brewing products from265; old settings and explicit refusals stay unchanged',()=>{
 const w=deconstructionCamp(1);w.stockpiles=[];
 expect(applyCommand(w,{type:'stockpile',enabled:true,x:15,z:16}).ok).toBe(true);
 const zone=w.stockpiles[0]!;
 for(const item of ['hops','wort','beer'] as const)expect(storageAccepts(zone,item),item).toBe(true);
 const shelf=newShelfStorage([w.nextId++],265),old=newShelfStorage([w.nextId++],264);
 expect(validShelfSettings(shelf.settings,265)).toBe(true);expect(validShelfSettings(shelf.settings,264)).toBe(false);
 expect(validShelfSettings(old.settings,264)).toBe(true);
 for(const item of ['wort','beer'] as const){expect(storageAccepts({...shelf.settings},item)).toBe(true);expect(storageAccepts({...old.settings},item)).toBe(false);}
 const before=structuredClone(old.settings);expect(storageAccepts(old.settings,'beer')).toBe(false);expect(old.settings).toEqual(before);
 expect(applyCommand(w,{type:'stockpile',enabled:true,x:17,z:16,filters:{wood:true,food:true,beer:false,wort:false}}).ok).toBe(true);
 expect(storageAccepts(w.stockpiles[1]!,'beer')).toBe(false);expect(storageAccepts(w.stockpiles[1]!,'wort')).toBe(false);
 expect(validStorageSettings({filters:{wood:true,food:true,beer:true}},264)).toBe(false);
 expect(validStorageSettings({filters:{wood:true,food:true,beer:undefined}},265)).toBe(false);
});
