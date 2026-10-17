import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {preparedNativeFreight413} from './helpers/group-freight-v413.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index.ts';
import {testOutputPath,writeTestFileSync} from './test-output.ts';

test.skipIf(process.env.GROUP_FREIGHT_413_PREPARE!=='1')('ROOT only: export and validate the declared unplayed native258 freight input BEFORE browser',()=>{
 const {root,manifest}=preparedNativeFreight413();
 // Keep the actual attempted preparation even if a subsequent guard rejects it.
 writeTestFileSync('artifacts/group-freight-v413/native-input-unvalidated.json',JSON.stringify(root));
 expect(validateWorld(root)).toEqual([]);expect(root.worldGroups!.groups).toEqual([]);expect(root.tick).toBe(0);
 const raw=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 manifest.fixtureSHA256=createHash('sha256').update(raw).digest('hex');
 writeTestFileSync('artifacts/group-freight-v413/native-input.json',raw);
 writeTestFileSync('artifacts/group-freight-v413/native-input-manifest.json',JSON.stringify(manifest,null,2));
 console.info(JSON.stringify({rawValidated:true,input:testOutputPath('artifacts/group-freight-v413/native-input.json'),manifest:testOutputPath('artifacts/group-freight-v413/native-input-manifest.json'),sha256:manifest.fixtureSHA256}));
});
