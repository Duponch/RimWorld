import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {newShelfStorage,shelfStorageCells} from '../src/sim/shelf-storage.ts';
import {cloneLinkedShelfPolicy286,sameLinkedShelfPolicy286,patchLinkedShelfPolicy286,validLinkedShelfPolicy286} from '../src/sim/linked-storage-policy-286.ts';
import {prepareLinkedStorageCommand286,prepareLinkedStorageRemoval286,type LinkedStoragePlanResult286,type LinkedStoragePolicyCommand286} from '../src/sim/linked-storage-plan-286.ts';
import type {LinkedStorageCommand286} from '../src/sim/linked-storage-state-286.ts';
import {validLinkedStorageWorld286} from '../src/sim/linked-storage-save-286.ts';
import type {Structure,World,StorageSettings} from '../src/sim/types.ts';

/** Explicit original furniture preparation on a real current small colony;
 * no built/construction/travel outcome is claimed by this rules fixture. */
function prepared(){
 const w=deconstructionCamp(1);w.stockpiles=[];w.growingZones=[];
 const add=(kind:'shelf'|'small-shelf',x:number):Structure=>{const s:Structure={id:w.nextId++,kind,x,z:10,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage(Array.from({length:kind==='shelf'?2:1},()=>w.nextId++),286)};w.structures.push(s);return s;};
 const a=add('shelf',10),b=add('small-shelf',14),c=add('shelf',18),d=add('small-shelf',22);
 a.shelf!.settings.priority=5;b.shelf!.settings.priority=1;c.shelf!.settings.priority=2;d.shelf!.settings.priority=4;
 return {w,a,b,c,d};
}
function ready(result:LinkedStoragePlanResult286){if(!result.ok)throw Error(result.reason);return result;}
function link(w:World,...s:Structure[]){const p=ready(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:s.map(x=>x.id)}));expect(p.commit()).toBe(true);return p;}
const json=(v:unknown)=>JSON.stringify(v);

test('strict policies preserve presence and isolate every mutable leaf, with ordinary optional clears',()=>{
 const {a}=prepared(),policy=a.shelf!.settings;policy.items={wood:true};policy.quality={min:'normal',max:'excellent'};policy.hitPoints={min:20,max:100};
 const copy=cloneLinkedShelfPolicy286(policy);expect(sameLinkedShelfPolicy286(policy,copy)).toBe(true);
 expect(copy.filters).not.toBe(policy.filters);expect(copy.items).not.toBe(policy.items);expect(copy.quality).not.toBe(policy.quality);expect(copy.hitPoints).not.toBe(policy.hitPoints);
 expect(sameLinkedShelfPolicy286(policy,{...copy,allowFresh:true})).toBe(false);
 expect(validLinkedShelfPolicy286({...copy,allowFresh:undefined})).toBe(false);
 const patch:StorageSettings={quality:undefined,hitPoints:{min:30,max:90},capacity:1},next=patchLinkedShelfPolicy286(policy,patch)!;
 expect(next.capacity).toBe(500);expect(Object.hasOwn(next,'quality')).toBe(false);expect(policy.quality.min).toBe('normal');expect(next.hitPoints).not.toBe(patch.hitPoints);
 let calls=0;const bad=Object.defineProperty({},'priority',{enumerable:true,get(){calls++;return 5;}});
 expect(patchLinkedShelfPolicy286(policy,bad)).toBeUndefined();expect(calls).toBe(0);
});

test('create uses the first effective policy, changes only actual differing cells, and allocates no ThingID or randomness',()=>{
 const {w,a,b}=prepared(),before=json(w),ids=[...a.shelf!.cells,...b.shelf!.cells],nextId=w.nextId,rng=w.rng;
 const p=ready(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,b.id]}));
 expect(json(w)).toBe(before);expect(p.changedCellIds).toEqual(b.shelf!.cells);expect(p.noop).toBe(false);expect(p.current()).toBe(true);expect(p.commit()).toBe(true);expect(p.commit()).toBe(false);
 const g=w.linkedStorage286!.groups[0]!;expect(g.memberIds).toEqual([a.id,b.id]);expect(g.originMapId).toBe(0);expect(g.settings.priority).toBe(5);
 expect(b.shelf!.linked286!.independent.priority).toBe(1);expect(b.shelf!.settings.priority).toBe(5);
 expect(a.shelf!.settings).not.toBe(g.settings);expect(b.shelf!.settings).not.toBe(g.settings);expect(a.shelf!.settings.filters).not.toBe(b.shelf!.settings.filters);
 expect([...a.shelf!.cells,...b.shelf!.cells]).toEqual(ids);expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(validLinkedStorageWorld286(w)).toBe(true);
});

test('joining moves only selected members, dissolves a singleton, and never restores hidden preferences',()=>{
 const {w,a,b,c,d}=prepared();link(w,a,b);link(w,c,d);const destination=a.shelf!.linked286!.groupId,source=c.shelf!.linked286!.groupId;
 const p=link(w,b,c);expect(p.changedCellIds).toEqual(c.shelf!.cells);
 expect(w.linkedStorage286!.groups.map(g=>g.id)).toEqual([destination]);expect(w.linkedStorage286!.groups[0]!.memberIds).toEqual([a.id,b.id,c.id]);
 expect(d.shelf!.linked286).toBeUndefined();expect(d.shelf!.settings.priority).toBe(2);expect(c.shelf!.linked286!.independent.priority).toBe(2);expect(c.shelf!.linked286!.groupId).not.toBe(source);
 const unlink=ready(prepareLinkedStorageCommand286(w,{type:'shelf-unlink',structureId:c.id}));expect(unlink.changedCellIds).toEqual([]);expect(unlink.commit()).toBe(true);
 expect(c.shelf!.settings.priority).toBe(5);expect(Object.hasOwn(c.shelf!,'linked286')).toBe(false);expect(validLinkedStorageWorld286(w)).toBe(true);
});

test('same-group link and equal patch are exact noops; rename and unlink preserve cargo and effective policy',()=>{
 const {w,a,b}=prepared();link(w,a,b);const before=json(w),registry=w.linkedStorage286,settings=a.shelf!.settings;
 const commands:(LinkedStorageCommand286|LinkedStoragePolicyCommand286)[]=[{type:'shelf-link',structureIds:[b.id,a.id]},{type:'shelf-policy',structureId:b.id,settings:{priority:5}}];
 for(const command of commands){
  const p=ready(prepareLinkedStorageCommand286(w,command));expect(p.noop).toBe(true);expect(p.writes).toEqual([]);expect(p.changedCellIds).toEqual([]);expect(p.commit()).toBe(true);expect(json(w)).toBe(before);expect(w.linkedStorage286).toBe(registry);
 }
 const rename=ready(prepareLinkedStorageCommand286(w,{type:'shelf-group-rename',structureId:a.id,name:'  Réserve commune  '}));expect(rename.changedCellIds).toEqual([]);expect(rename.commit()).toBe(true);expect(w.linkedStorage286!.groups[0]!.name).toBe('Réserve commune');expect(a.shelf!.settings).toBe(settings);
 const unlink=ready(prepareLinkedStorageCommand286(w,{type:'shelf-unlink',structureId:a.id}));expect(unlink.commit()).toBe(true);expect(w.linkedStorage286!.groups).toEqual([]);expect(w.linkedStorage286!.nextId).toBe(2);
 for(const s of[a,b]){expect(s.shelf!.linked286).toBeUndefined();expect(s.shelf!.settings.priority).toBe(5);}expect(validLinkedStorageWorld286(w)).toBe(true);
});

test('a real packed member receives policy but adds no old footprint destinations; independent mirrors never alias',()=>{
 const {w,a,b,c}=prepared();link(w,a,b,c);
 // Declared packaging of the same original, not a second building or a played
 // uninstall: its actual packed owner is enough for this cold rules contract.
 w.structures=w.structures.filter(s=>s!==c);w.packed.push({building:c,owner:{type:'ground',x:5,z:5}});
 const cells=[...a.shelf!.cells,...b.shelf!.cells],before=json(w.packed[0]!.owner),patch={priority:2,items:{wood:true}};
 const p=ready(prepareLinkedStorageCommand286(w,{type:'shelf-policy',structureId:a.id,settings:patch}));expect(p.changedCellIds).toEqual(cells);expect(p.commit()).toBe(true);
 expect(c.shelf!.settings.priority).toBe(2);expect(json(w.packed[0]!.owner)).toBe(before);expect(w.structures.flatMap(shelfStorageCells).map(cell=>cell.id)).not.toEqual(expect.arrayContaining(c.shelf!.cells));
 patch.items.wood=false;expect(c.shelf!.settings.items!.wood).toBe(true);expect(c.shelf!.settings.items).not.toBe(a.shelf!.settings.items);expect(validLinkedStorageWorld286(w)).toBe(true);
});

test('lifecycle removal dissolves exactly its group while physical ownership stays with its caller',()=>{
 const {w,a,b,c,d}=prepared();link(w,a,b);link(w,c,d);const originalStructures=w.structures,remainingGroup=c.shelf!.linked286!.groupId;
 const p=ready(prepareLinkedStorageRemoval286(w,[a.id]));expect(p.changedCellIds).toEqual([]);expect(p.commit()).toBe(true);expect(w.structures).toBe(originalStructures);expect(w.structures.includes(a)).toBe(true);
 expect(a.shelf!.linked286).toBeUndefined();expect(b.shelf!.linked286).toBeUndefined();expect(b.shelf!.settings.priority).toBe(5);expect(w.linkedStorage286!.groups.map(g=>g.id)).toEqual([remainingGroup]);expect(validLinkedStorageWorld286(w)).toBe(true);
});

test('whole operation refuses an immutable last member or invalid selection without allocating or changing earlier members',()=>{
 const {w,a,b,c}=prepared();link(w,a,b,c);Object.freeze(c.shelf!);const before=json(w);
 expect(prepareLinkedStorageCommand286(w,{type:'shelf-policy',structureId:a.id,settings:{priority:1}}).ok).toBe(false);expect(json(w)).toBe(before);
 expect(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,a.id]}).ok).toBe(false);
 expect(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,w.nextId+100]}).ok).toBe(false);expect(json(w)).toBe(before);
});

test('stale identity, deep policy, desired write, and player authority all invalidate before the first write',()=>{
 for(const mutate of ['identity','policy','write','authority']as const){
  const {w,a,b}=prepared(),p=ready(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,b.id]}));
  if(mutate==='identity')w.structures[w.structures.indexOf(b)]={...b};
  if(mutate==='policy')b.shelf!.settings.filters.wood=false;
  if(mutate==='write')p.writes[0]!.key='unexpected';
  if(mutate==='authority')a.factionId=null;
  const before=json(w);expect(p.current()).toBe(false);expect(p.commit()).toBe(false);expect(json(w)).toBe(before);expect(w.linkedStorage286).toBeUndefined();
 }
});

test('future/historical worlds and accessor commands cannot enter the current linked-storage rules',()=>{
 for(const schemaVersion of[285,287]){const {w,a,b}=prepared();Object.assign(w,{schemaVersion});const before=json(w);expect(prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,b.id]}).ok).toBe(false);expect(json(w)).toBe(before);}
 const {w,a}=prepared();let calls=0;const command={type:'shelf-unlink' as const,structureId:a.id};Object.defineProperty(command,'type',{enumerable:true,get(){calls++;return 'shelf-unlink';}});
 expect(prepareLinkedStorageCommand286(w,command).ok).toBe(false);expect(calls).toBe(0);
});
