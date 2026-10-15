/* PRIVATE static proposal. ROOT-only future opt-in; no run acquired. */
import {test,expect} from '@playwright/test';
import {runProductiveTantrumRecovery} from './productive-tantrum-recovery-driver';
test.use({channel:'chrome'});
test.skip(process.env.PROD_TANTRUM!=='1','ROOT-only opt-in; no default browser allocation.');
test('passive inherited tantrum from88556 with real damage retained',async({page},info)=>{
 expect(process.env.PROD_WRAPPER).toBe('1');
 test.setTimeout((Number(process.env.PROD_BODY_SECONDS??120)+180)*1000);
 await runProductiveTantrumRecovery(page,info);
});
