import {defineConfig} from '@playwright/test';
import {isAbsolute} from 'node:path';
const enabled=process.env.PERFORMANCE419_NATIVE==='1',output=process.env.PERFORMANCE419_OUTPUT,baseURL=process.env.PERFORMANCE419_BASE_URL;
if(enabled&&(!output||!isAbsolute(output)||!baseURL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(baseURL)))throw Error('ROOT must supply absolute bounded PERFORMANCE419_OUTPUT and frozen local DEV PERFORMANCE419_BASE_URL; no server/factory is started');
export default defineConfig({testDir:'./tests/integration',testMatch:'performance-after-demo-v419-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:300_000,expect:{timeout:12_000},reporter:[['list']],outputDir:output??'tmp/performance-after-demo-v419/not-opted-in',use:{baseURL:baseURL??'http://127.0.0.1:5173',viewport:{width:1440,height:1000},deviceScaleFactor:1,channel:'chrome',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
