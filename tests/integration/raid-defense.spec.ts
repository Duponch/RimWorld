/* PRIVATE. ROOT adoption: tests/integration/raid-defense.spec.ts */
import {test} from '@playwright/test';
import {runRaidDefense} from './raid-defense-driver';
test.use({channel:'chrome'});
test('Real raid2 defense, civilian refuge and actual rifle line',async({page},info)=>{
 test.skip(process.env.DEFENSE!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(270000);await runRaidDefense(page,info);
});
