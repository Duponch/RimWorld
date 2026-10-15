/* PRIVATE. ROOT copies this to tests/integration/clinical-survival-v362.spec.ts
 * and driver.ts to clinical-survival-driver-v362.ts only after V361 delivery.
 * No execution/result acquired by this preparation. */
import {test,expect} from '@playwright/test';
import {runClinicalSurvival} from './clinical-survival-driver-v362';
test.use({channel:'chrome'});
test('V362 same campaign, second visitor rescue and ordinary clinical survival',async({page},info)=>{
 test.skip(process.env.V362!=='1','ROOT opt-in; real clinical continuation, never a manufactured recovery.');
 expect(process.env.V362_WRAPPER,'Strict preflight wrapper required before runner cleanup').toBe('1');
 // Load can need90s; observation is separately limited to100–150s plus final
 // ordered conservation. This harness ceiling does not enlarge the game horizon.
 test.setTimeout(270000);
 await runClinicalSurvival(page,info);
});
