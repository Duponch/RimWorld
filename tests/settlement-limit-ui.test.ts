import {expect,test,vi} from 'vitest';
import {createSettlementLimitPreference,readSettlementLimit,settlementLimit,type SettlementLimit} from '../src/ui/settlement-limit-settings';
test('global colony count is bounded1–5 and a refused initial stored request never becomes active',async()=>{
 for(const value of [null,undefined,'',0,6,1.5,true,'2.0','5x'])expect(settlementLimit(value)).toBe(1);expect(settlementLimit('5')).toBe(5);expect(readSettlementLimit(()=>{throw Error('Storage unavailable');})).toBe(1);
 const store=vi.fn(()=>true),confirm=vi.fn(async()=>{throw Error('ACK refusé');}),pref=createSettlementLimitPreference({initial:5,confirm,store,changed:()=>{}});
 expect(pref.value).toBe(1);await expect(pref.initialize()).rejects.toThrow('ACK refusé');expect(pref.value).toBe(1);expect(pref.pending).toBe(false);expect(store).not.toHaveBeenCalled();expect(confirm).toHaveBeenCalledExactlyOnceWith(5);
});
test('a global count waits for ACK, shares the replacement barrier and preserves the last confirmed count on refusal',async()=>{
 let accept!:(value:unknown)=>void;const confirm=vi.fn(()=>new Promise(r=>{accept=r;})),store=vi.fn(()=>true),pref=createSettlementLimitPreference({initial:4,confirm,store,changed:()=>{}}),initial=pref.initialize(),barrier=pref.whenSettled();
 expect(pref.value).toBe(1);expect(pref.pending).toBe(true);expect(pref.whenSettled()).toBe(barrier);await expect(pref.set(2)).rejects.toThrow('attend');expect(confirm).toHaveBeenCalledTimes(1);accept(undefined);expect(await initial).toBe(true);await barrier;expect(pref.value).toBe(4);expect(store).not.toHaveBeenCalled();
 confirm.mockImplementation(async()=>{throw Error('Transport refusé');});await expect(pref.set(2)).rejects.toThrow('Transport refusé');expect(pref.value).toBe(4);expect(store).not.toHaveBeenCalled();await expect(pref.set(8 as SettlementLimit)).rejects.toThrow('une et cinq');
});
test('storage failure does not invent rollback of an acknowledged global count',async()=>{
 const confirm=vi.fn(async()=>undefined),pref=createSettlementLimitPreference({initial:1,confirm,store:()=>{throw Error('Quota');},changed:()=>{}});await pref.initialize();expect(await pref.set(3)).toBe(false);expect(pref.value).toBe(3);expect(pref.pending).toBe(false);expect(confirm).toHaveBeenLastCalledWith(3);
});