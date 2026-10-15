/* PRIVATE. ROOT adoption: tests/integration/raid-defense-flank.spec.ts */
import {test} from '@playwright/test';
import {runRaidDefenseFlank} from './raid-defense-flank-driver';
test.use({channel:'chrome'});
test('Real critical-wall flank from preserved74567',async({page},info)=>{
 test.skip(process.env.DEFENSE_FLANK!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(270000);await runRaidDefenseFlank(page,info);
});
