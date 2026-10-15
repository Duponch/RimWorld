/* Private proposal. ROOT-only continuation; no default browser allocation. */
import {test} from '@playwright/test';
import {runRaidThirdContactContinuation} from './raid-third-contact-continuation-driver';
test.use({channel:'chrome'});
test.skip(process.env.RAID3_CONTACT_CONTINUATION!=='1','ROOT reviewed continuation from real86114 required.');
test('Real raid3 inherited contact continuation from86114 retaining anatomy and losses',async({page},info)=>{
 test.setTimeout((Number(process.env.DEFENSE_BODY_SECONDS??120)+180)*1000);
 await runRaidThirdContactContinuation(page,info);
});
