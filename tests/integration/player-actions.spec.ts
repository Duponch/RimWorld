import { expect, test } from '@playwright/test';
import { perform } from './player-actions';
import { observeErrors, tool, world } from './helpers';

test('pilote : cadre une ressource masquée par Architecte avant de donner son ordre',async({playwright})=>{
  test.setTimeout(30000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    await page.goto('/?e2e&seed=42');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await tool(page,'harvest');
    const target=await page.evaluate(()=>{
      const w=window.__lisiere.world,bounds=document.querySelector('#viewport canvas')!.getBoundingClientRect();
      return w.resources.filter(r=>r.kind==='berries'&&Math.abs(r.x-125)+Math.abs(r.z-125)<=28).find(r=>{
        const p=window.__lisiere.projectCell(r.x,r.z);return document.elementFromPoint(bounds.x+p.x,bounds.y+p.y)?.tagName!=='CANVAS';
      });
    });
    expect(target,'La fixture doit reproduire une cible cachée sous un panneau ou hors cadre.').toBeTruthy();
    await perform(page,{reason:'Approvisionner la facture avec une plante plus éloignée.',command:{type:'designate',kind:'harvest',x:target!.x,z:target!.z}},{value:0});
    expect((await world(page)).jobs.some(j=>j.kind==='harvest'&&j.x===target!.x&&j.z===target!.z)).toBe(true);
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
