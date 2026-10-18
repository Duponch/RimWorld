import {defineConfig} from '@playwright/test';
// ROOT supplies its separately frozen263 server and real acquired input(s).
// No server/build, scenario preparation, implicit replay or favorable retry.
export default defineConfig({testDir:'./tests/integration',testMatch:'world-target-v263-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:240_000,expect:{timeout:15_000},reporter:[['list']],outputDir:process.env.WORLD_TARGET263_NATIVE_OUTPUT??'tmp/world-foundations/world-target263/native',use:{baseURL:process.env.WORLD_TARGET263_NATIVE_BASE_URL??'http://127.0.0.1:5173',viewport:{width:1440,height:1000},channel:'chrome',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
