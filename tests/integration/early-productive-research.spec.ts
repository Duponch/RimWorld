/* ROOT opt-in: actual93544 after preserved worker loss; no default browser. */
import {test,expect} from '@playwright/test';
import {runProductiveResearch} from './early-productive-research-driver';
test.use({channel:'chrome'});
test.skip(process.env.PROD_RESEARCH!=='1','ROOT-only opt-in; no default browser allocation.');
test('bounded productive research segment, whole energy goal only in summary',async({page},info)=>{
 test.skip(process.env.PROD_RESEARCH!=='1','ROOT-only opt-in after reviewed worker-loss admission and durable proof mandate');
 expect(process.env.PROD_WRAPPER).toBe('1');
 test.setTimeout((Number(process.env.PROD_BODY_SECONDS??120)+180)*1000);
 await runProductiveResearch(page,info);
});
