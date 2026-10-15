/* PRIVATE. ROOT adoption: tests/integration/raid-recovery-continuation.spec.ts */
import {test} from '@playwright/test';
import {runRaidRecoveryContinuation} from './raid-recovery-continuation-driver';
test.use({channel:'chrome'});
test.skip(process.env.DEFENSE_RECOVERY_CONTINUATION!=='1','ROOT explicit recovery mandate only; no default browser allocation.');
test('Real continued care nutrition and shelter from preserved75094',async({page},info)=>{
 test.skip(process.env.DEFENSE_RECOVERY_CONTINUATION!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(300000);await runRaidRecoveryContinuation(page,info);
});
