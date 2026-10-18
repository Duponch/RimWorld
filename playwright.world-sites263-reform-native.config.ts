import {defineConfig} from '@playwright/test';
// Existing native414 harness and separately frozen263 server supplied by ROOT.
// No server/build, retry, input fallback or journey preparation.
export default defineConfig({testDir:'./tests/integration',testMatch:'world-sites263-reform-native.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:240_000,expect:{timeout:15_000},reporter:[['list']],outputDir:process.env.WORLD_SITES263_REFORM_NATIVE_OUTPUT??'tmp/world-foundations/world-sites263/reform-native',use:{baseURL:process.env.WORLD_TARGET263_NATIVE_BASE_URL??'http://127.0.0.1:5173',viewport:{width:1440,height:1000},channel:'chrome',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{args:['--enable-unsafe-webgpu']}}});
