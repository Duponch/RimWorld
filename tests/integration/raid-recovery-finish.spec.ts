import {test} from '@playwright/test';
import {runRaidRecoveryFinish} from './raid-recovery-finish-driver';
test.use({channel:'chrome'});
test.skip(process.env.DEFENSE_RECOVERY_FINISH!=='1','ROOT explicit observation mandate only.');
test('Real inherited wall finishes after care75443',async({page},info)=>{test.setTimeout(300000);await runRaidRecoveryFinish(page,info);});
