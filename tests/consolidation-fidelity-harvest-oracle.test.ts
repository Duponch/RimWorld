import { expect,test } from 'vitest';
import { HarvestPotentialLedger } from './scenarios/harvest-potential-ledger.ts';

test('failed harvest debits independently observed potential, without hiding inventory losses',()=>{
  const ledger=new HarvestPotentialLedger([{id:23,kind:'berries',amount:10}]);
  const initial=18+10,physical=18,potentialAfter=0;
  ledger.record(23,0);
  expect(physical+potentialAfter+ledger.lost).toBe(initial);
  expect(physical-1+potentialAfter+ledger.lost).not.toBe(initial);
  ledger.record(23,0);expect(ledger.lost).toBe(10);
});

test('blocked output commits nothing and positive or bonus yields are accounted separately',()=>{
  const ledger=new HarvestPotentialLedger([{id:1,kind:'berries',amount:10},{id:2,kind:'berries',amount:10}]);
  ledger.record(1,null);expect(ledger.lost).toBe(0);
  ledger.record(1,10);expect(ledger.lost).toBe(0);
  ledger.record(2,11);expect(ledger.lost).toBe(-1);
  expect(21+ledger.lost).toBe(20);
});
