import {defineConfig} from '@playwright/test';
import {isAbsolute} from 'node:path';
import {writeFileSync} from 'node:fs';
import {foundationPerformanceProbeSource420} from './tests/integration/performance-after-demo-v419';
// Emission via Playwright's existing TS transform, e.g. --list, never a browser.
if(process.env.GPU420_EMIT_PROBE){if(!isAbsolute(process.env.GPU420_EMIT_PROBE))throw Error('Absolute private GPU420_EMIT_PROBE required');writeFileSync(process.env.GPU420_EMIT_PROBE,JSON.stringify(foundationPerformanceProbeSource420()));}
const enabled=process.env.GPU420_NATIVE==='1',output=process.env.GPU420_OUTPUT,baseURL=process.env.GPU420_BASE_URL;
if(enabled&&(!output||!isAbsolute(output)||!baseURL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(baseURL)))throw Error('ROOT must supply absolute bounded GPU420_OUTPUT and frozen local QA GPU420_BASE_URL; no server/factory is started');
export default defineConfig({testDir:'./tests/integration',testMatch:'gpu-timestamp-v420-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:300_000,expect:{timeout:12_000},reporter:[['list']],outputDir:output??'tmp/gpu-timestamp-v420/not-opted-in',use:{baseURL:baseURL??'http://127.0.0.1:5173',viewport:{width:1440,height:1000},deviceScaleFactor:1,channel:'chrome',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
