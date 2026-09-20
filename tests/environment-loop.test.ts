import { expect, test } from 'vitest';
import { environmentUiFixture } from './scenarios/environment-camp';
import { applyCommand, stepWorld } from '../src/sim/engine';
import { serializeWorld, deserializeWorld, validateWorld } from '../src/sim/serialization';
import { windObstructions } from '../src/sim/wind-rules';
import type { Command } from '../src/sim/types';

test('common environment checkpoint pays both buildings, beats fire and chops its wind obstruction before exact continuation',()=>{
  const f=environmentUiFixture(),w=f.world;
  const command=(c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
  expect(validateWorld(w)).toEqual([]);
  command({type:'climate-adopt'});command({type:'order-extinguish',pawnId:f.actorId,fireId:f.fireId});
  for(let n=0;n<300&&w.fires!.items.some(fire=>fire.id===f.fireId);n++)stepWorld(w);
  expect(w.fires!.items).toHaveLength(0);expect(w.fires!.ledger.extinguished).toBe(1);
  command({type:'designate',kind:'heater',...f.heater,material:'steel'});
  command({type:'designate',kind:'wind-turbine',...f.turbine,orientation:1,material:'steel'});
  for(let n=0;n<3000&&w.structures.filter(s=>s.kind==='heater'||s.kind==='wind-turbine').length<2;n++)stepWorld(w);
  const turbine=w.structures.find(s=>s.kind==='wind-turbine'),heater=w.structures.find(s=>s.kind==='heater');
  expect({tick:w.tick,jobs:w.jobs,pawn:w.pawns[0]},'Both paid buildings must finish in the bounded checkpoint.').toMatchObject({jobs:[]});
  expect(turbine).toBeDefined();expect(heater).toBeDefined();expect(windObstructions(w,turbine!)).toEqual([{x:22,z:12}]);
  command({type:'wind-auto-cut',structureId:turbine!.id,enabled:true});
  for(let n=0;n<1000&&w.resources.some(r=>r.id===f.treeId);n++)stepWorld(w);
  expect(w.resources.some(r=>r.id===f.treeId)).toBe(false);expect(validateWorld(w)).toEqual([]);
  const restored=deserializeWorld(serializeWorld(w));for(let n=0;n<40;n++){stepWorld(w);stepWorld(restored);}
  expect(restored).toEqual(w);expect(validateWorld(w)).toEqual([]);
});
