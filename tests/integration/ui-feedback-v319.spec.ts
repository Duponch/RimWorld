import { expect, test } from '@playwright/test';
import { testOutputPath } from '../test-output';

declare global {
  interface Window {
    __uiFeedback: {
      updateLegacy(title: string): void;
      updateCustom(): void;
      updateSvg(): void;
      insertDynamic(): void;
      updateLedger(): void;
      dispose(): void;
    };
  }
}

/** Isolated real-DOM lifecycle fixture: no world, renderer or accelerated
 * timer. The colony/HUD integration remains the separate native game path. */
test('V319 feedback: delayed resources, one custom title and editable-only text selection', async ({ page }) => {
  await page.route('**/__ui-feedback-v319', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta charset="utf-8">
    <style>body{margin:24px;--ink:#182820;--forest:#245640;--line:#ccc}button{margin:10px;padding:10px}.resource-list{width:260px}#empty{width:300px;height:45px}</style>
    <div id="app"><section class="resource-list" title="Ressources ancêtre"><div id="resources"><div class="resource"><strong id="food">0</strong></div></div><div id="food-items"></div></section></div>
    <section id="ancestor" title="Explication héritée"><button id="legacy" title="Ancienne explication">Contrôle ancien</button><button id="inherited">Ancêtre seulement</button></section>
    <button id="custom" title="Doublon natif" aria-describedby="existing-description">Contrôle riche</button><span id="existing-description">Description existante</span>
    <svg width="180" height="70"><rect id="svg-owner" x="10" y="10" width="120" height="50" fill="green"><title>Case du globe</title></rect></svg>
    <div id="dynamic"></div><p id="copy">Texte du HUD glissé</p><input id="input" value="Nom modifiable"><textarea id="textarea">Note modifiable</textarea>
    <div id="editable" contenteditable="true"><span>Édition libre</span><span id="locked" contenteditable="false">Verrouillé</span></div>
    <input id="readonly" readonly value="Lecture seule"><div id="empty"></div>
    <script type="module">
      import {installTooltips,setTooltip} from '/src/ui/tooltip.ts';
      import {installTextSelectionGuard} from '/src/ui/text-selection.ts';
      import {createResourceLedger} from '/src/ui/resource-ledger.ts';
      const disposeTips=installTooltips(document.body),disposeSelection=installTextSelectionGuard(document.body);
      const ledger=createResourceLedger(document.body); ledger.update(new Map([['wood',20],['rice',30]]));
      setTooltip(document.querySelector('#custom'),{title:'Fiche riche',body:'Texte sûr <b>sans HTML</b>'});
      window.__uiFeedback={
        updateLegacy(title){document.querySelector('#legacy').title=title;document.querySelector('#ancestor').title='Ancêtre actualisé';},
        updateCustom(){document.querySelector('#custom').title='Doublon réinjecté';setTooltip(document.querySelector('#custom'),{title:'Fiche riche actualisée',body:'Contenu courant'});},
        updateSvg(){document.querySelector('#svg-owner title').textContent='Case du globe actualisée';},
        insertDynamic(){document.querySelector('#dynamic').innerHTML='<button id="dynamic-button" title="Ajout tardif">Nouveau bouton</button>';},
        updateLedger(){ledger.update(new Map([['wood',21],['rice',30]]));},
        dispose(){disposeTips();disposeSelection();}
      };
    </script>` }));
  await page.goto('/__ui-feedback-v319');
  await page.waitForFunction(() => !!window.__uiFeedback);
  const tip = page.locator('#game-tooltip');
  await expect(page.locator('[title]')).toHaveCount(0);
  await expect(page.locator('#svg-owner title')).toHaveText('');
  await expect(page.locator('#svg-owner')).toHaveAttribute('aria-label', 'Case du globe');

  const resource = page.locator('.resource[data-item="wood"]');
  await resource.hover(); await page.waitForTimeout(700); await expect(tip).toBeHidden();
  await page.locator('#empty').hover(); await page.waitForTimeout(1200); await expect(tip).toBeHidden();
  await resource.hover(); await expect(tip).toBeVisible(); await expect(tip).toContainText('Bois');
  await page.locator('#empty').hover();
  await page.locator('.resource-ledger-heading').filter({ hasText: 'Ressources brutes' }).hover();
  await page.waitForTimeout(700); await expect(tip).toBeHidden();
  await expect(tip).toBeVisible(); await expect(tip).toContainText('20 unités');
  await page.evaluate(() => window.__uiFeedback.updateLedger());
  await expect(tip).toContainText('21 unités'); await expect(page.locator('[title]')).toHaveCount(0);
  const heading=page.locator('[data-resource-category="raw-resources"]>.resource-ledger-heading');
  await heading.click(); await page.waitForTimeout(300); await expect(tip).toBeHidden();
  await heading.click(); await resource.hover(); await expect(tip).toContainText('Bois');
  await page.locator('#empty').click(); await heading.focus(); await expect(tip).toContainText('21 unités');
  await page.keyboard.press('Escape'); await page.locator('#empty').click();

  await page.locator('#legacy').hover(); await expect(tip).toContainText('Ancienne explication');
  await page.evaluate(() => window.__uiFeedback.updateLegacy('Explication actualisée'));
  await expect(tip).toContainText('Explication actualisée'); await expect(page.locator('[title]')).toHaveCount(0);
  await page.locator('#empty').hover(); await expect(page.locator('[title]')).toHaveCount(0);
  await page.locator('#inherited').hover(); await expect(tip).toContainText('Ancêtre actualisé');
  await page.locator('#custom').focus(); await expect(tip).toContainText('Texte sûr <b>sans HTML</b>');
  await expect(tip.locator('b')).toHaveCount(0);
  await page.evaluate(() => window.__uiFeedback.updateCustom()); await expect(tip).toContainText('Contenu courant');
  await expect(page.locator('[title]')).toHaveCount(0); await expect(tip).toHaveCount(1);
  await page.keyboard.press('Escape'); await expect(tip).toBeHidden();
  await expect(page.locator('#custom')).toHaveAttribute('aria-describedby', 'existing-description');
  await page.locator('#empty').click();
  await page.locator('#svg-owner').hover(); await expect(tip).toContainText('Case du globe');
  await page.evaluate(() => window.__uiFeedback.updateSvg()); await expect(tip).toContainText('Case du globe actualisée');
  await expect(page.locator('#svg-owner title')).toHaveText('');
  await expect(page.locator('#svg-owner')).toHaveAttribute('aria-label', 'Case du globe actualisée');
  await page.evaluate(() => window.__uiFeedback.insertDynamic());
  await expect(page.locator('#dynamic-button')).not.toHaveAttribute('title');
  await page.locator('#dynamic-button').focus(); await expect(tip).toContainText('Ajout tardif');

  const starts = await page.evaluate(() => {
    const selectors=['#copy','#legacy','#readonly','#input','#textarea','#editable span','#locked'];
    return selectors.map(selector => {
      const element=document.querySelector(selector)!;
      return { selector, allowed:element.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true})), style:getComputedStyle(element).userSelect };
    });
  });
  expect(starts.filter(row => ['#copy','#legacy','#readonly','#locked'].includes(row.selector)).every(row => !row.allowed && row.style==='none')).toBe(true);
  expect(starts.filter(row => ['#input','#textarea','#editable span'].includes(row.selector)).every(row => row.allowed && row.style==='text')).toBe(true);
  await page.locator('#input').focus(); await page.keyboard.press('Control+a'); await page.keyboard.type('Nouveau nom');
  await expect(page.locator('#input')).toHaveValue('Nouveau nom');
  await page.locator('#textarea').focus(); await page.keyboard.press('Control+a'); await page.keyboard.type('Nouvelle note');
  await expect(page.locator('#textarea')).toHaveValue('Nouvelle note');
  await page.locator('#empty').click(); await page.keyboard.press('Control+a');
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('');
  await page.screenshot({ path:testOutputPath('artifacts/ui-feedback-v319.png') });
  await page.evaluate(() => window.__uiFeedback.dispose());
  await expect(tip).toHaveCount(0);
  expect(await page.locator('#copy').evaluate(element => element.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true})))).toBe(true);
});
