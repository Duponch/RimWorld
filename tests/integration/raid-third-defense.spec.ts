/* ROOT-only opt-in, actual raid3 state85531 and a distinct frozen review. */
import {test} from '@playwright/test';
import {runRaidDefense} from './raid-third-defense-driver';
test.use({channel:'chrome'});
test.skip(process.env.RAID3_DEFENSE!=='1','ROOT reviewed raid3 mandate; no default browser allocation.');
test('Real raid3 defense from85531 with protected civilians and rifle',async({page},info)=>{
 test.setTimeout((Number(process.env.DEFENSE_BODY_SECONDS??120)+180)*1000);
 await runRaidDefense(page,info);
});
