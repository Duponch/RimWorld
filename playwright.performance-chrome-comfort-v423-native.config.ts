import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
import {isAbsolute,resolve,relative} from 'node:path';
import base from './playwright.performance-after-demo-v419-native.config';
if(process.env.PERFORMANCE419_NATIVE!=='1'||process.env.GPU420_PREINSTRUMENTED!=='1'||process.env.GPU420_NATIVE==='1')throw Error('ROOT compiled ABBA requires PERFORMANCE419_NATIVE=1, GPU420_PREINSTRUMENTED=1 and GPU tracker OFF');
if(process.env.PERFORMANCE419_BASE_URL!=='http://127.0.0.1:5418')throw Error('Parent compatibility URL must be frozen baseline5418; projects have fixed URLs');
const output=process.env.PERFORMANCE419_OUTPUT;
const privateRoot='C:/Users/ebsaf/.codex/visualizations/2026/10/04/01a10830-d046-7a40-90d2-80c77ae1b692';
if(!output||!isAbsolute(output))throw Error('ROOT supplies a NEW dedicated absolute private C output');
const delta=relative(resolve(privateRoot),resolve(output));
if(!delta||delta.startsWith('..')||isAbsolute(delta))throw Error('Output must be a bounded child of this task private C root');
// Playwright reloads config in workers after creating outputDir; reject only at runner entry.
if(process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('Choose a NEW output path; preserve prior artifacts');
export default defineConfig({...base,testMatch:'performance-chrome-comfort-v423-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:600_000,
 metadata:{...base.metadata,phase:'compiled-chrome-comfort-abba-v423',profilers:'CPU MAIN OFF; Worker OFF; GPU tracker OFF',
  comparison:'ref1 -> candidate1 -> candidate2 -> ref2;16 five-second windows, eight x1; two original inputs per project, no general FPS or causal guarantee'},
 projects:[
  {name:'ref1',use:{...base.use,baseURL:'http://127.0.0.1:5418'}},
  {name:'candidate1',dependencies:['ref1'],use:{...base.use,baseURL:'http://127.0.0.1:5419'}},
  {name:'candidate2',dependencies:['candidate1'],use:{...base.use,baseURL:'http://127.0.0.1:5419'}},
  {name:'ref2',dependencies:['candidate2'],use:{...base.use,baseURL:'http://127.0.0.1:5418'}},
 ],
});
