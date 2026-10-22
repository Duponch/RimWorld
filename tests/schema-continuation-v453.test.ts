import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {EARNED_SHIP_SHA276} from './scenarios/ship-casket-v453.ts';
import type {World} from '../src/sim/types.ts';

test('V453 migrates the whole actually earned276 ship by number only',()=>{
 const text=readFileSync(new URL('./fixtures/ship-parts-v452-earned.json',import.meta.url),'utf8');
 expect(createHash('sha256').update(text).digest('hex')).toBe(EARNED_SHIP_SHA276);
 const original=JSON.parse(text),current=deserializeWorld(text);
 expect(current).toEqual({...original,schemaVersion:277});expect(validateWorld(current)).toEqual([]);
 expect(serializeWorld(deserializeWorld(serializeWorld(current)))).toBe(serializeWorld(current));
});

test('V453 ordinary active physiology continues equally before any new suspension',()=>{
 const current=createWorld(42,64,64),previous=structuredClone(current);
 (previous as unknown as {schemaVersion:number}).schemaVersion=276;
 // Both use their actual original map and active actors. No held actor or
 // substitute validation world is manufactured for this continuation check.
 expect(validateWorld(current)).toEqual([]);
 stepWorld(current,80);stepWorld(previous as World,80);
 expect(previous).toEqual({...current,schemaVersion:276});
 expect(validateWorld(current)).toEqual([]);
});
