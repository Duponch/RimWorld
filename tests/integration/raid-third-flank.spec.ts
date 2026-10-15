/* ROOT-only opt-in, actual damaged-door state85961 and a distinct frozen review. */
import {test} from '@playwright/test';
import {runRaidNorthFlank} from './raid-third-flank-driver';
test.use({channel:'chrome'});
test.skip(process.env.RAID3_DEFENSE!=='1','ROOT reviewed raid3 mandate; no default browser allocation.');
test('Real raid3 north opening and counterfire from85961',async({page},info)=>{
 test.setTimeout((Number(process.env.DEFENSE_BODY_SECONDS??120)+180)*1000);
 await runRaidNorthFlank(page,info);
});
