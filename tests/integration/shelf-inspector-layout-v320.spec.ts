import { expect,test } from '@playwright/test';

// Geometry fixture using the real shelf policy/content widgets and stylesheet
// order. No simulation or rendering transitions are claimed by this test.
test('shelf controls and physical contents stay clickable with a tall furniture footer',async({page})=>{
  await page.route('**/src/main.ts*',route=>route.fulfill({contentType:'application/javascript; charset=utf-8',body:`
    import {mountStorageControls} from '/src/ui/storage-item-controls.ts';
    import {shelfControlOptions,updateShelfInspection} from '/src/ui/shelf-inspection.ts';
    import '/src/ui/zone-controls.css';
    import '/src/ui/storage-item-controls.css';
    import '/src/style.css';
    import '/src/ui/cell-inspector.css';
    import '/src/ui/visual-identity.css';
    import '/src/ui/site-hud.css';
    document.body.innerHTML='<main id="app"><div class="game-shell"><section id="inspector" class="inspector panel cell-inspector-host stockpile-inspector-host"><div class="cell-summary"><div class="cell-card"><div class="panel-heading cell-heading"><span class="cell-illustration"></span><h2 id="cell-title">Étagère</h2><button id="inspect-close">×</button></div><div id="cell-description">Deux cases. Étagère construite en bois, réglages indépendants et objets accessibles au contact.</div><details class="cell-environment" open><summary>Environnement</summary><p>Pièce couverte, température, propreté, beauté et éclairage du meuble sélectionné.</p><p>Ces informations restent accessibles lorsque le contenu et les réglages sont ouverts.</p></details><div class="zone-actions"><button data-zone-action="copy">Copier les réglages</button><button data-zone-action="paste">Coller les réglages</button></div></div><div class="cell-actions"><button id="cell-deconstruct">Déconstruire</button><button id="cell-uninstall">Désinstaller</button></div></div><div id="cell-storage"><div id="selected-stockpile-items"></div></div></section></div></main>';
    window.changes=[];window.selectedPile=undefined;window.copied=0;window.deconstructed=0;
    const settings={filters:{wood:false,food:false},priority:3};
    const controls=mountStorageControls(document.querySelector('#selected-stockpile-items'),settings,value=>window.changes.push(value),shelfControlOptions);
    controls.element.dataset.shelfControls='400';
    const structure={id:400,kind:'shelf',x:7,z:8,orientation:0,footprint:'standard',shelf:{cells:[401,402],settings:{...settings,capacity:500}}};
    const piles=[403,404,405].map(id=>({id,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x:7,z:8}}));
    updateShelfInspection(document.querySelector('#inspector'),{piles},structure,id=>window.selectedPile=id);
    document.querySelector('[data-zone-action="copy"]').onclick=()=>window.copied++;
    document.querySelector('#cell-deconstruct').onclick=()=>window.deconstructed++;
  `}));
  await page.goto('/');await expect(page.locator('[data-shelf-controls="400"]')).toBeVisible();
  for(const viewport of [{width:2560,height:1440},{width:1920,height:1080},{width:900,height:650}]){
    await page.setViewportSize(viewport);
    const search=page.locator('[data-storage-search]'),wood=page.locator('[data-storage-item="wood"]');
    await search.fill('wood');await wood.scrollIntoViewIfNeeded();
    expect(await wood.evaluate(input=>{const r=input.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===input;})).toBe(true);
    await wood.setChecked(true);await expect(wood).toBeChecked();await wood.setChecked(false);
    await page.locator('[data-storage-priority]').selectOption('5');
    await search.fill('');await expect(page.locator('[data-shelf-slots]')).toHaveText('3 / 6 emplacements occupés');
    for(const id of [403,404,405]){await page.locator(`[data-shelf-pile="${id}"]`).click();expect(await page.evaluate(()=>(window as any).selectedPile)).toBe(id);}
    await page.locator('[data-zone-action="copy"]').click();await page.locator('#cell-deconstruct').click();
  }
  expect(await page.evaluate(()=>(window as any).copied)).toBe(3);expect(await page.evaluate(()=>(window as any).deconstructed)).toBe(3);
});
