/* PRIVATE. ROOT adoption: tests/integration/raid-defense-contact.spec.ts */
import {test} from '@playwright/test';
import {runRaidDefenseContact} from './raid-defense-contact-driver';
test.use({channel:'chrome'});
test('Real contact defense and clinical care from injured74657',async({page},info)=>{
 test.skip(process.env.DEFENSE_CONTACT!=='1','ROOT explicit raid defense mandate, distinct from forbidden V362 continuation.');
 test.setTimeout(270000);await runRaidDefenseContact(page,info);
});
