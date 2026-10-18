import {defineConfig} from '@playwright/test';
import {isAbsolute} from 'node:path';
const active=process.env.FINAL_DEMO263_FINALIZE_NATIVE==='1',output=process.env.FINAL_DEMO263_FINALIZE_OUTPUT,baseURL=process.env.FINAL_DEMO263_FINALIZE_BASE_URL;
if(active&&(!output||!isAbsolute(output)||!baseURL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(baseURL)))throw Error('ROOT absolute bounded C output and frozen local server URL are required; no implicit server');
export default defineConfig({testDir:'./tests/integration',testMatch:'final-demonstration263-finalize1730-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:150_000,expect:{timeout:10_000},reporter:[['list']],outputDir:output??'tmp/final-demo263/finalize-not-opted-in',use:{baseURL:baseURL??'http://127.0.0.1:5173',viewport:{width:1440,height:1000},channel:'chrome',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
