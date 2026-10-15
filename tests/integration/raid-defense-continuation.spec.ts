/* PRIVATE. ROOT adoption: tests/integration/raid-defense-continuation.spec.ts */
import {test} from '@playwright/test';
import {runRaidDefenseContinuation} from './raid-defense-continuation-driver';
test.use({channel:'chrome'});
test('Real raid2 continuation from preserved damaged wall',async({page},info)=>{
 test.skip(process.env.DEFENSE_CONTINUE!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(270000);await runRaidDefenseContinuation(page,info);
});
