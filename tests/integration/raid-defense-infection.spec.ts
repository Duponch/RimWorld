/* PRIVATE. ROOT adoption: tests/integration/raid-defense-infection.spec.ts */
import {test} from '@playwright/test';
import {runRaidDefenseInfection} from './raid-defense-infection-driver';
test.use({channel:'chrome'});
test('Real existing infection and inherited contact care from74727',async({page},info)=>{
 test.skip(process.env.DEFENSE_INFECTION!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(300000);await runRaidDefenseInfection(page,info);
});
