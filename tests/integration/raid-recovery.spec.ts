/* PRIVATE. ROOT adoption: tests/integration/raid-recovery.spec.ts */
import {test} from '@playwright/test';
import {runRaidRecovery} from './raid-recovery-driver';
test.use({channel:'chrome'});
test.skip(process.env.DEFENSE_RECOVERY!=='1','ROOT explicit recovery mandate only; no default browser allocation.');
test('Real care nutrition and shelter from preserved74950',async({page},info)=>{
 test.skip(process.env.DEFENSE_RECOVERY!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(300000);await runRaidRecovery(page,info);
});
