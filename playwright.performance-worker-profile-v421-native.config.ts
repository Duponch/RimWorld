import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
import {isAbsolute,resolve,relative} from 'node:path';
const enabled=process.env.PROFILE421_WORKER_NATIVE==='1',output=process.env.PROFILE421_WORKER_OUTPUT,baseURL=process.env.PERFORMANCE419_BASE_URL;
if(enabled){
 if(!output||!isAbsolute(output)||!/^C:[\\/]/i.test(output)||!baseURL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(baseURL))throw Error('ROOT supplies a NEW dedicated absolute C output and frozen local compiled QA URL; no server is started');
 if(process.env.GPU420_PREINSTRUMENTED!=='1'||process.env.GPU420_NATIVE==='1')throw Error('Worker profile requires the existing compiled419 metrics, GPU tracker OFF');
 const privateRoot='C:/Users/ebsaf/.codex/visualizations/2026/10/04/01a10830-d046-7a40-90d2-80c77ae1b692',delta=relative(resolve(privateRoot),resolve(output));
 if(!delta||delta.startsWith('..')||isAbsolute(delta))throw Error('Output must be a bounded child of this task private C root');
 // Playwright may load this config again inside its worker after creating the
 // output root. Only the initial runner rejects a pre-existing destination.
 if(process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('Choose a NEW output path; preserve prior artifacts');
}
export default defineConfig({testDir:'./tests/integration',testMatch:'performance-worker-profile-v421-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:300_000,expect:{timeout:12_000},reporter:[['list']],outputDir:output??'tmp/performance-worker-profile-v421/not-opted-in',use:{baseURL:baseURL??'http://127.0.0.1:5419',viewport:{width:1440,height:1000},deviceScaleFactor:1,channel:'chrome',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
