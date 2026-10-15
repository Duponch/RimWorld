/* PRIVATE proposal: exact actual retreat issue89523 + distinct ROOT review required. No authored run/result. */
import {test,expect} from '@playwright/test';
import {runProductiveResearch} from './early-productive-research-driver';
test.use({channel:'chrome'});
test.skip(process.env.PROD_RESEARCH!=='1','ROOT-only opt-in; no default browser allocation.');
test('bounded productive research segment, whole energy goal only in summary',async({page},info)=>{
 test.skip(process.env.PROD_RESEARCH!=='1','ROOT-only opt-in after actual named north retreat review and new mandate');
 expect(process.env.PROD_WRAPPER).toBe('1');
 test.setTimeout((Number(process.env.PROD_BODY_SECONDS??120)+180)*1000);
 await runProductiveResearch(page,info);
});
