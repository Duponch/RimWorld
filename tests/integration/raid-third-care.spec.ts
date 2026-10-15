/* Private proposal, ROOT-only adoption and controls. */
import {test} from '@playwright/test';
import {runRaidThirdCare} from './raid-third-care-driver';
test.use({channel:'chrome'});
test.skip(process.env.RAID3_CARE!=='1','ROOT reviewed care mandate from exact issue86133 required.');
test('Real raid3 care and medical rest from86133 retaining anatomy and losses',async({page},info)=>{
 test.setTimeout((Number(process.env.DEFENSE_BODY_SECONDS??150)+180)*1000);
 await runRaidThirdCare(page,info);
});
