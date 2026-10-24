import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const enabled=process.env.NATIVE_CLONE474_NATIVE==='1';
const baseURL=process.env.NATIVE_CLONE474_BASE_URL,output=process.env.NATIVE_CLONE474_OUTPUT;
if(enabled){
 if(!baseURL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(baseURL)||!output||!isAbsolute(output))throw Error('ROOT supplies frozen localhost NATIVE_CLONE474_BASE_URL and a new absolute NATIVE_CLONE474_OUTPUT; no server is started');
 if(process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('Choose a new output directory; preserve prior native contract reports');
}
export default defineConfig({
 testDir:'./tests/integration',testMatch:'native-clone-firefoam-v474-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:450000,
 reporter:[['list']],outputDir:output??'tmp/native-clone-v474/not-opted-in',
 use:{baseURL:baseURL??'http://127.0.0.1:5175',channel:'chromium',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--mute-audio']}},
});
