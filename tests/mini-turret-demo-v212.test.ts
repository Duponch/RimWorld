import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect,test } from 'vitest';
import { MINI_TURRET_DEMO_ID,MINI_TURRET_DEMO_PATH,prepareMiniTurretDemo } from '../scripts/create-mini-turret-v212-test-save.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { GUN_TURRETS_RESEARCH_COST,RESEARCH_SCALE } from '../src/sim/research.ts';

test('the public scene is an immutable byte-checked preparation, with no gun, service or damage preplayed',()=>{
  const raw=readFileSync(MINI_TURRET_DEMO_PATH,'utf8'),entry=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')).saves.find((v:{id:string})=>v.id===MINI_TURRET_DEMO_ID);
  expect(entry).toBeDefined();expect(createHash('sha256').update(raw).digest('hex')).toBe(entry.sha256);
  const saved=deserializeWorld(raw),prepared=prepareMiniTurretDemo();expect(saved).toEqual(prepared);expect(validateWorld(saved)).toEqual([]);
  expect(serializeWorld(saved)).toBe(raw);expect(saved.tick).toBe(3000);expect(saved.jobs).toEqual([]);expect(saved.projectiles).toBeUndefined();expect(saved.bombWaves).toBeUndefined();
  expect(saved.structures.every(s=>s.kind!=='mini-turret'&&!s.turret&&!s.damage&&!s.breakdown)).toBe(true);
  expect(saved.pawns.every(p=>!p.haul&&!p.bombRefuge&&!p.mental?.crisis&&!p.health?.injuries.length)).toBe(true);
  expect(saved.research?.gunTurrets).toEqual({points:GUN_TURRETS_RESEARCH_COST-2*RESEARCH_SCALE});
  expect(saved.piles.filter(p=>p.item==='steel').reduce((sum,p)=>sum+p.quantity,0)).toBe(110);
  expect(saved.piles.filter(p=>p.item==='component').reduce((sum,p)=>sum+p.quantity,0)).toBe(3);
});
