import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import provenance from './fixtures/novel-v482-active-native.provenance.json';
import {applyCommand} from '../src/sim/engine.ts';
import {deserializeWorld,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

const input=readFileSync(new URL('./fixtures/novel-v482-active-native.json',import.meta.url));
const raw=input.toString('utf8');
function original(){
 expect(createHash('sha256').update(input).digest('hex')).toBe(provenance.saveSHA256);expect(input.length).toBe(provenance.bytes);
 const historical=JSON.parse(raw);expect(historical.schemaVersion).toBe(provenance.schema);
 const w=deserializeWorld(raw),p=w.pawns.find(p=>p.id===provenance.readerId)!,book=w.piles.find(p=>p.id===provenance.bookId)!;
 // The archived native bytes/provenance remain295. Admission changes only the
 // schema number; every acquired field still equals the original campaign.
 const migrated={...historical,schemaVersion:SCHEMA_VERSION};expect(w).toEqual(migrated);
 expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(w.tick).toBe(provenance.tick);expect(p.recreation.task).toMatchObject({activity:'read',stage:'read',phase:'active',manual:true,bookId:provenance.bookId,elapsed:provenance.elapsed});expect(p.readingPolicy295).toBe(2);expect(serializeCampaign(w)).toBe(JSON.stringify(migrated));
 return {w,p,book};
}

test('the real native manual-reading checkpoint clear-orders drops the same original and retains acquired XP, joy and clocks',()=>{
 const {w,p,book}=original(),before={book:structuredClone(book),skills:structuredClone(p.skills),joy:p.recreation.level,tolerance:structuredClone(p.recreation.tolerance),bored:structuredClone(p.recreation.bored),rng:w.rng,nextId:w.nextId,tick:w.tick};
 expect(applyCommand(w,{type:'clear-orders',pawnId:p.id})).toMatchObject({ok:true});
 expect(p.recreation.task).toBeNull();expect(book.owner.type).toBe('ground');expect(w.piles.filter(b=>b.id===provenance.bookId)).toHaveLength(1);
 expect({...book,owner:before.book.owner}).toEqual(before.book);expect(p.skills).toEqual(before.skills);expect(p.recreation.level).toBe(before.joy);expect(p.recreation.tolerance).toEqual(before.tolerance);expect(p.recreation.bored).toEqual(before.bored);
 expect(w.rng).toBe(before.rng);expect(w.nextId).toBe(before.nextId);expect(w.tick).toBe(before.tick);expect(validateWorld(w)).toEqual([]);
 const save=serializeCampaign(w),restored=deserializeWorld(save);expect(serializeCampaign(restored)).toBe(save);expect(restored.piles.find(b=>b.id===provenance.bookId)).toEqual(book);
});

test('clear-orders does not cancel the explicitly derived automatic reading session or drop its physical book',()=>{
 const {w,p,book}=original();
 // Only the provenance-declared automatic boundary differs from native input.
 const task=p.recreation.task;if(task?.activity!=='read')throw Error('Missing original reading task');delete task.manual;p.readingPolicy295=1;
 expect(validateWorld(w)).toEqual([]);const before={task:structuredClone(task),book:structuredClone(book),skills:structuredClone(p.skills),need:structuredClone(p.recreation),rng:w.rng,nextId:w.nextId,tick:w.tick};
 expect(applyCommand(w,{type:'clear-orders',pawnId:p.id})).toMatchObject({ok:true});
 expect(p.recreation.task).toEqual(before.task);expect(p.recreation).toEqual(before.need);expect(book).toEqual(before.book);expect(book.owner).toEqual({type:'pawn',pawnId:provenance.readerId});expect(p.skills).toEqual(before.skills);expect(w.rng).toBe(before.rng);expect(w.nextId).toBe(before.nextId);expect(w.tick).toBe(before.tick);
 expect(validateWorld(w)).toEqual([]);const save=serializeCampaign(w);expect(serializeCampaign(deserializeWorld(save))).toBe(save);
});
