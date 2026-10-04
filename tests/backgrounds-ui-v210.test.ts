import { afterEach, expect, test, vi } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { previewBackgroundSkills } from '../src/sim/background-generation.ts';
import {
  backgroundInspectionRows, backgroundRestrictionRows, backgroundSkillSummary, backgroundSummary,
  createBackgroundInspection, updateBackgroundInspection, updateBackgroundSkillControl, updateBackgroundWorkControl,
} from '../src/ui/background-inspection.ts';

/** Small DOM double for focus/disabled ownership. Native tooltip positioning
 * and actual keyboard/pointer delivery remain browser checks. */
class ElementFixture {
  children:ElementFixture[]=[];parentElement:ElementFixture|null=null;
  dataset:Record<string,string>={};attributes=new Map<string,string>();
  className='';hidden=false;tabIndex=-1;disabled=false;value='';private text='';
  classList={toggle:(name:string,on:boolean)=>{const classes=new Set(this.className.split(' ').filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');}};
  set textContent(value:string){this.text=value;this.children=[];}
  get textContent():string{return this.text+this.children.map(child=>child.textContent).join('');}
  set innerHTML(_value:string){throw Error('Snapshot presentation must use textContent.');}
  append(...children:ElementFixture[]):void{for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children:ElementFixture[]):void{this.text='';this.children=[];this.append(...children);}
  setAttribute(name:string,value:string):void{this.attributes.set(name,value);}
  getAttribute(name:string):string|null{return this.attributes.get(name)??null;}
  hasAttribute(name:string):boolean{return this.attributes.has(name);}
  removeAttribute(name:string):void{this.attributes.delete(name);}
  querySelector<T=ElementFixture>(selector:string):T|null{
    const matches=(node:ElementFixture):boolean=>{
      if(selector.startsWith('.'))return node.className.split(' ').includes(selector.slice(1));
      const attr=/^\[data-([a-z-]+)\]$/.exec(selector);
      return !!attr&&Object.hasOwn(node.dataset,attr[1]!.replace(/-([a-z])/g,(_,letter:string)=>letter.toUpperCase()));
    };
    for(const child of this.children){if(matches(child))return child as T;const nested=child.querySelector<T>(selector);if(nested)return nested;}
    return null;
  }
}
const html=(element:ElementFixture):HTMLElement=>element as unknown as HTMLElement;
const select=(element:ElementFixture):HTMLSelectElement=>element as unknown as HTMLSelectElement;
afterEach(()=>vi.unstubAllGlobals());

test('old people have an explicit unknown past, with no synthetic story, gains or incapacity',()=>{
  const pawn=createWorld(210,16,16).pawns[0]!,before=JSON.stringify(pawn);
  expect(backgroundSummary(pawn)).toBe('Passé non renseigné');
  expect(backgroundInspectionRows(pawn)).toEqual([]);expect(backgroundRestrictionRows(pawn)).toEqual([]);
  vi.stubGlobal('document',{createElement:()=>new ElementFixture()});
  const parent=new ElementFixture();createBackgroundInspection(html(parent));updateBackgroundInspection(html(parent),pawn);
  expect(parent.querySelector<ElementFixture>('[data-background-unknown]')!.hidden).toBe(false);
  expect(parent.querySelector<ElementFixture>('[data-background-stories]')!.hidden).toBe(true);
  expect(parent.querySelector<ElementFixture>('[data-background-restrictions]')!.hidden).toBe(true);
  expect(parent.textContent).toContain('Passé non renseigné');expect(JSON.stringify(pawn)).toBe(before);
});

test('recorded childhood/adulthood show original descriptions, birth gains and concrete restrictions',()=>{
  const pawn=createWorld(211,16,16).pawns[0]!;
  pawn.background={childhood:'quiet-child',adulthood:'researcher'};
  const rows=backgroundInspectionRows(pawn),restrictions=backgroundRestrictionRows(pawn);
  expect(rows.map(row=>row.phase)).toEqual(['Enfance','Adulte']);
  expect(rows[0]!.tooltip.body).toContain('rejetait toute violence');
  expect(rows[1]!.tooltip.rows).toContainEqual({label:'Gains à la création',value:'Intellectuel +5'});
  expect(restrictions.map(row=>row.label)).toEqual(expect.arrayContaining(['Chasse','Combat','Transport','Nettoyage']));
  expect(restrictions.some(row=>row.label==='Patient'||row.label==='Repos au lit')).toBe(false);
  vi.stubGlobal('document',{createElement:()=>new ElementFixture()});
  const parent=new ElementFixture();createBackgroundInspection(html(parent));updateBackgroundInspection(html(parent),pawn);
  const stories=parent.querySelector<ElementFixture>('[data-background-stories]')!;
  expect(stories.children.every(row=>row.tabIndex===0&&row.hasAttribute('data-tooltip'))).toBe(true);
  const first=stories.children[0];updateBackgroundInspection(html(parent),pawn);expect(stories.children[0]).toBe(first);
  delete pawn.background;updateBackgroundInspection(html(parent),pawn);
  expect(stories.hidden).toBe(true);expect(parent.querySelector<ElementFixture>('[data-background-unknown]')!.hidden).toBe(false);
});

test('disabled work keeps its saved priority and exposes its cause on a keyboard-focusable cell',()=>{
  const pawn=createWorld(212,16,16).pawns[0]!;pawn.background={childhood:'school-child',adulthood:'researcher'};
  pawn.priorities.haul=4;const before=JSON.stringify(pawn);
  const cell=new ElementFixture(),control=new ElementFixture();cell.append(control);control.value='4';control.setAttribute('aria-label','Priorité Transport Ada');
  updateBackgroundWorkControl(select(control),pawn,'haul');
  expect(control.disabled).toBe(true);expect(control.value).toBe('4');expect(cell.tabIndex).toBe(0);
  expect(cell.getAttribute('aria-label')).toContain('Chercheur');expect(cell.getAttribute('aria-disabled')).toBe('true');
  expect(cell.hasAttribute('data-tooltip')).toBe(true);expect(JSON.stringify(pawn)).toBe(before);
  delete pawn.background;updateBackgroundWorkControl(select(control),pawn,'haul');
  expect(control.disabled).toBe(false);expect(control.value).toBe('4');expect(cell.hasAttribute('tabindex')).toBe(false);
  expect(cell.getAttribute('aria-disabled')).toBeNull();expect(cell.hasAttribute('data-tooltip')).toBe(false);
});

test('an unusable skill remains inspectable without presenting its raw level as usable or erasing XP',()=>{
  const pawn=createWorld(213,16,16).pawns[0]!;pawn.background={childhood:'quiet-child',adulthood:'medic'};
  const row=new ElementFixture(),notice=new ElementFixture();notice.className='skill-availability';row.tabIndex=0;row.append(notice);
  const before=JSON.stringify(pawn.skills);
  updateBackgroundSkillControl(html(row),pawn,'shooting',pawn.skills.shooting,'Tir 8/20 · Passion','Apprentissage ordinaire');
  expect(row.tabIndex).toBe(0);expect(row.getAttribute('aria-disabled')).toBe('true');
  expect(row.getAttribute('aria-label')).toContain('Niveau enregistré, non utilisable');expect(notice.textContent).toBe('Indisponible');
  expect(notice.hidden).toBe(false);expect(JSON.stringify(pawn.skills)).toBe(before);
  delete pawn.background;updateBackgroundSkillControl(html(row),pawn,'shooting',pawn.skills.shooting,'Tir 8/20 · Passion','Apprentissage ordinaire');
  expect(notice.hidden).toBe(true);expect(row.getAttribute('aria-disabled')).toBeNull();expect(row.getAttribute('aria-label')).toBeNull();
});

test('offer skill text uses the real birth preview once and labels unusable records explicitly',()=>{
  const background={childhood:'workshop-child',adulthood:'builder'} as const;
  const skills=previewBackgroundSkills(0,background),before=JSON.stringify(skills);
  expect(backgroundSkillSummary(skills,{background})).toContain('Construction 15');
  expect(backgroundSummary({background})).toContain('Adulte : Bâtisseur');expect(JSON.stringify(skills)).toBe(before);
  const pacifist={background:{childhood:'quiet-child',adulthood:'medic'}} as const;
  const preview=previewBackgroundSkills(0,pacifist.background);
  expect(backgroundSkillSummary(preview,pacifist)).toContain('Tir indisponible (niveau enregistré 8)');
});
