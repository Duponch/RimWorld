import {defineConfig} from '@playwright/test';
import base from './playwright.performance-after-demo-v419-native.config';
if(process.env.PERFORMANCE419_NATIVE!=='1'||process.env.GPU420_PREINSTRUMENTED!=='1'||process.env.GPU420_NATIVE==='1')throw Error('ROOT compiled CPU pair requires PERFORMANCE419_NATIVE=1, GPU420_PREINSTRUMENTED=1 and GPU tracker OFF');
if(process.env.PERFORMANCE419_BASE_URL!=='http://127.0.0.1:5418')throw Error('Parent config compatibility URL must be the frozen ref at5418; projects use fixed URLs');
export default defineConfig({...base,fullyParallel:false,workers:1,retries:0,
  metadata:{...base.metadata,phase:'compiled-cpu-pair-v421',gpuTracker:'OFF; existing419 spec never calls gpuWindow',
    comparison:'ref before sparse extension, new after; eight5s windows total; no general FPS or causal guarantee'},
  projects:[
    {name:'ref',use:{...base.use,baseURL:'http://127.0.0.1:5418'}},
    {name:'new',dependencies:['ref'],use:{...base.use,baseURL:'http://127.0.0.1:5419'}},
  ],
});
