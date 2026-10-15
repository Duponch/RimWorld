/* ROOT-only opt-in, actual breached-shelter risk state85990 and a distinct frozen review. */
import {test} from '@playwright/test';
import {runRaidThirdContact} from './raid-third-contact-driver';
test.use({channel:'chrome'});
test.skip(process.env.RAID3_CONTACT!=='1','ROOT reviewed raid3 mandate; no default browser allocation.');
test('Real raid3 breach and contact defense from85990 retaining losses',async({page},info)=>{
 test.setTimeout((Number(process.env.DEFENSE_BODY_SECONDS??120)+180)*1000);
 await runRaidThirdContact(page,info);
});
