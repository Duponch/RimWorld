import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {deserializeWorld,validateWorld} from '../src/sim/serialization.ts';

const historical=()=>JSON.parse(readFileSync('public/test-saves/v124/rencontre.json','utf8'));

test('V124 social gathering migrates to V125 without invented disputes or fights',()=>{
  const raw=historical();
  expect(raw.schemaVersion).toBe(124);
  const world=deserializeWorld(JSON.stringify(raw));
  expect(SCHEMA_VERSION).toBe(125);
  expect(world).toEqual({...raw,schemaVersion:125});
  expect(validateWorld(world)).toEqual([]);
  expect(world.pawns.every(p=>!p.social?.fight&&!(p.social?.memories.some(m=>m.kind==='slight'||m.kind==='insult')))).toBe(true);
});

test('a save claiming V124 cannot smuggle a V125 social fight or insult',()=>{
  const old=historical(),[a,b]=old.pawns;
  a.social={rng:1,memories:[{otherId:b.id,kind:'insult',at:old.tick,offset:-15}]};
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 124/);
  a.social={rng:1,memories:[],fight:{opponentId:b.id,startedAt:old.tick}};
  b.social={rng:2,memories:[],fight:{opponentId:a.id,startedAt:old.tick}};
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 124/);
});
