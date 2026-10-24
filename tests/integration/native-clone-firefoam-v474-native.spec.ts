import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

// Opt-in before the page fixture, matching the existing native integration suites.
test.skip(process.env.NATIVE_CLONE474_NATIVE!=='1','ROOT opt-in only; separately frozen Vite source server required.');
test('V474: seven real Worker clone contracts, without a game renderer',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
 let report:unknown;
 try{
  await page.route('**/__native_clone_v474',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Native clone contracts</title>'}));
  await page.goto('/__native_clone_v474');
  report=await page.evaluate(async()=>{
   const source='/tests/integration/native-clone-firefoam-v474-browser.ts';
   return await (await import(/* @vite-ignore */source)).runBrowserContracts();
  });
 }catch(error){report={status:'failed',error:String(error)};}
 await writeFile(info.outputPath('contracts.json'),JSON.stringify({report,errors},null,2)+'\n');
 expect(errors).toEqual([]);
 expect(report).toMatchObject({status:'passed',tests:7,renderer:false});
});
