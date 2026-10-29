import {expect,test} from 'vitest';
import fs from 'node:fs';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {validateBarriers} from '../src/sim/barrier-save.ts';
import type {Structure} from '../src/sim/types.ts';

const publicSource=()=>deserializeWorld(fs.readFileSync(new URL('./fixtures/ship-parts-v452-earned.json',import.meta.url),'utf8'));
test('a real multi-analyzer destruction keeps its physically lost gold and remains exactly reloadable',()=>{
 const w=publicSource();
 // New diagnostic initial building on the retained PUBLIC map, not a played
 // construction or campaign continuation. No clock, RNG or schema repair.
 const analyzer:Structure={id:w.nextId++,kind:'multi-analyzer',x:2,z:2,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};w.structures.push(analyzer);
 expect(validateWorld(w)).toEqual([]);const input=serializeWorld(w);expect(serializeWorld(deserializeWorld(input))).toBe(input);
 expect(constructionRecipe(analyzer).ingredients).toContainEqual({item:'gold',quantity:20});
 expect(damageStructure(w,analyzer,structureMaxHp(analyzer),'bullet')).toBe(true);
 expect(w.structures.includes(analyzer)).toBe(false);expect(w.destroyed?.lost.gold).toBeGreaterThan(0);
 expect(validateWorld(w)).toEqual([]);const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
test('gold loss admission respects its construction era without opening future ingredients or invalid quantities',()=>{
 const w=publicSource(),before=serializeWorld(w);
 // Direct reader-domain adversaries, not historical Whole Worlds.
 const probe=(version:number,lost:Record<string,number>)=>validateBarriers({...w,destroyed:{count:1,lost}},version);
 expect(probe(123,{gold:20})).toEqual([]);expect(probe(122,{gold:20})).toContain('Invalid destroyed building ledger.');
 for(const amount of [0,-1,.5,Infinity])expect(probe(w.schemaVersion,{gold:amount})).toContain('Invalid destroyed building ledger.');
 expect(probe(w.schemaVersion,{'ai-core':1})).toContain('Invalid destroyed building ledger.');expect(probe(w.schemaVersion,{'unknown-ingredient':1})).toContain('Invalid destroyed building ledger.');
 expect(serializeWorld(w)).toBe(before);
});
