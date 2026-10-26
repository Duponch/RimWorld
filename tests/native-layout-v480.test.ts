import {describe,expect,it} from 'vitest';
import type {NativeControl,NativePage,NativeRow} from '../src/ui3d/native-contract';
import {layoutNativePage,NATIVE_UI,type NativeRect,type TextMeasure} from '../src/ui3d/native-layout';

const measure:TextMeasure=(text,size)=>Array.from(text).reduce((sum,char)=>sum+(/\s/.test(char)?.3:/[ilI.,:;!]/.test(char)?.3:.54)*size,0);
const button=(id:string,label=id):NativeControl=>({id,label,onActivate:()=>{}});
const desktop={width:1440,height:1000};
const layout=(page:NativePage,viewport=desktop)=>layoutNativePage(page,viewport,false,measure);
function inside(outer:NativeRect,inner:NativeRect){
  expect(inner.x).toBeGreaterThanOrEqual(outer.x-.01);expect(inner.y).toBeGreaterThanOrEqual(outer.y-.01);
  expect(inner.x+inner.width).toBeLessThanOrEqual(outer.x+outer.width+.01);expect(inner.y+inner.height).toBeLessThanOrEqual(outer.y+outer.height+.01);
}
const architect=(count:number):NativePage=>({id:'architect',title:'Architecte',layout:'architect',width:1420,height:900,rows:[
  {id:'categories',label:'',region:'navigation',controlStyle:'navigation',controls:Array.from({length:7},(_,i)=>button('category-'+i))},
  {id:'catalogue',label:'',region:'catalogue',controlStyle:'tile',controls:Array.from({length:count},(_,i)=>({...button('tool-'+i),icon:'wall'}))},
  {id:'options',label:'Choisir une construction',region:'details',detail:'Le matériau et les options restent associés à la construction.'},
]});

describe('cardboard UI proportions and record flow · V480',()=>{
  it('uses bottom-bar-sized Architect cards instead of stretching every cell across its region',()=>{
    const box=layout(architect(7)),nav=box.rows[0]!.controls,tiles=box.rows[1]!.controls;
    expect(box.width).toBe(1180);expect(box.height).toBe(476);
    expect(nav).toHaveLength(7);expect(nav.every(c=>c.height===96&&c.width>=90&&c.width<=100)).toBe(true);
    expect(nav.filter(c=>c.y===nav[0]!.y)).toHaveLength(2);
    expect(tiles.filter(c=>c.y===tiles[0]!.y)).toHaveLength(6);
    expect(tiles.every(c=>c.height===104&&c.width>=96&&c.width<=104)).toBe(true);
    expect(tiles[1]!.x-tiles[0]!.x-tiles[0]!.width).toBe(10);
    for(const region of Object.values(box.regions))inside({x:0,y:0,width:box.width,height:box.height},region);
    expect(box.regions.navigation!.contentHeight).toBe(414);
    expect(box.regions.catalogue!.contentHeight).toBe(218);
  });

  it('reflows compact catalogues and their lower options without an off-page region',()=>{
    for(const viewport of[{width:960,height:800},{width:760,height:800},{width:700,height:800},{width:400,height:800},{width:400,height:400}]){
      const box=layout(architect(32),viewport);
      for(const region of Object.values(box.regions))inside({x:0,y:0,width:box.width,height:box.height},region);
      const controls=box.rows[1]!.controls;
      expect(controls.map(c=>c.control.id)).toEqual(Array.from({length:32},(_,i)=>'tool-'+i));
      expect(controls.every(c=>c.height===104&&c.width<=104)).toBe(true);
      expect(box.contentHeight).toBeGreaterThan(box.body.height);
      if(box.width<850){const cat=box.regions.catalogue!,details=box.regions.details!;expect(details.x).toBe(cat.x);expect(details.y).toBe(cat.y+cat.height+10);}
    }
  });

  it('keeps every map action on one strip and reserves horizontal extent only on small screens',()=>{
    const controls=Array.from({length:12},(_,i)=>({...button('zone-'+i),icon:'zones'}));
    const page:NativePage={id:'map-tools-zones',title:'Zones',layout:'palette',palette:'zones',width:600,rows:[{id:'actions',label:'',region:'catalogue',controlStyle:'icon',controls}]};
    for(const viewport of[desktop,{width:960,height:800},{width:400,height:800}]){
      const box=layout(page,viewport),actual=box.rows[0]!.controls;
      expect(box.height).toBe(46);expect(new Set(actual.map(c=>c.y))).toEqual(new Set([0]));
      expect(actual.map(c=>c.control)).toEqual(controls);expect(actual.every(c=>c.width>=42&&c.width<=48&&c.height===46)).toBe(true);
      if(viewport.width>=960){expect(actual.every(c=>c.width===48)).toBe(true);for(const control of actual)inside(box.body,control);expect(box.width).toBe(642);}
      else expect(box.regions.catalogue!.contentWidth).toBeGreaterThan(box.body.width);
    }
  });

  it('keeps identical pawn sheet, tabs and footer bounds across all seven dossiers',()=>{
    const tabs:NativeRow={id:'pawn-tabs',label:'',region:'navigation',controls:['Journal','Matériel','Social','Bio','Besoins','Santé','Prisonnier'].map(label=>button(label))};
    const actions=['Mobiliser','Effacer les ordres','Travail','Fermer'].map(label=>button(label));
    const boxes=['journal','gear','social','bio','needs','health','prisoner'].map((tab,index)=>layout({id:'inspect-pawn-8-'+tab,title:'Eden',subtitle:tab,portrait:{url:'data:,',label:'Eden'},layout:'inspector',width:400+index*20,height:400+index*15,rows:[tabs,...Array.from({length:index*12},(_,i)=>({id:'fact-'+i,label:'Fait du dossier '+i,detail:'Toutes les informations restent conservées dans leur section.'}))],actions}));
    for(const box of boxes){
      expect([box.width,box.height,box.header]).toEqual([700,620,40]);
      expect(box.body.height).toBe(426);expect(box.inspectorParts).toEqual(boxes[0]!.inspectorParts);
      for(const control of box.actions)inside(box.inspectorParts!.actions,{...control,y:control.y+box.header});
      for(const control of box.rows[0]!.controls)inside(box.inspectorParts!.tabs,{...control,y:control.y+box.header});
      expect(box.actions.map(c=>c.control)).toEqual(actions);
    }
    expect(boxes.at(-1)!.contentHeight).toBeGreaterThan(boxes.at(-1)!.body.height);
  });

  it('fits all twelve Bio bars at both qualified viewport sizes with the larger type scale',()=>{
    const rows:NativeRow[]=[{id:'pawn-tabs',label:'',controls:['Journal','Matériel','Social','Bio','Besoins','Santé'].map(label=>button(label))},
      {id:'heading-bio-skills',label:'Compétences',emphasis:'heading',column:1},
      ...Array.from({length:12},(_,i)=>({id:'skill-'+i,label:'Compétence '+i,column:1 as const,meter:{value:12,max:20,secondary:{value:50,max:100}}}))];
    for(const viewport of[desktop,{width:960,height:800}]){
      const box=layout({id:'inspect-pawn-bio',title:'Ada',layout:'inspector',portrait:{url:'data:,',label:'Ada'},rows},viewport),skills=box.rows.filter(r=>r.row.id.startsWith('skill-'));
      expect(box.width).toBe(700);expect(box.height).toBe(viewport.height===800?600:620);
      expect(skills).toHaveLength(12);expect(skills.every(r=>r.height===30&&r.top+r.height<=box.body.height)).toBe(true);
      expect(skills.at(-1)!.top+skills.at(-1)!.height).toBe(388);expect(NATIVE_UI.body).toBe(14);expect(NATIVE_UI.line).toBe(20);
    }
  });

  it('keeps quota and policy actions beside the information they affect with a protected text lane',()=>{
    const rows:NativeRow[]=[{id:'quota',label:'Lièvre',value:'12 animaux · limite ∞',detail:'Adultes 4 ♂ / 5 ♀ · jeunes 2 / 1 · gestantes 0',presentation:'record',controls:[button('quota-edit','Quotas')]},
      {id:'policy',label:'Politique médicale',controls:[{...button('policy-edit','Médicaments industriels ou inférieurs'),select:{value:'all',options:[{value:'all',label:'Tous'}],onChange:()=>{}}}]}];
    const box=layout({id:'animals-example',title:'Animaux',width:900,rows});
    for(const row of box.rows){
      expect(row.inlineActions).toBe(true);expect(row.controls).toHaveLength(1);
      expect(row.controls[0]!.x).toBeGreaterThanOrEqual(row.x+row.textWidth+13.99);
      expect(row.controlTop).toBe(6);expect(row.height).toBeGreaterThanOrEqual(row.controls[0]!.height+12);
      expect(row.labelLines.join(' ')).toBe(row.row.label);
    }
    expect(box.rows[0]!.valueLines.join(' ')).toBe(rows[0]!.value);expect(box.rows[0]!.detailLines.join(' ')).toBe(rows[0]!.detail);
  });
  it('prints a selected policy once while retaining its complete value and dropdown choices',()=>{
    const value='Médicaments industriels ou inférieurs',select={...button('care',value),select:{value:'industrial',options:[{value:'industrial',label:value}],onChange:()=>{}}};
    const row:NativeRow={id:'care-policy',label:'Politique médicale',value,compact:true,controls:[select]};
    const box=layout({id:'care',title:'Santé',width:700,rows:[row]}).rows[0]!;
    expect(box.inlineActions).toBe(true);expect(box.valueLines).toEqual([]);expect(box.labelWidth).toBe(box.textWidth);
    expect(box.labelLines).toEqual(['Politique médicale']);expect(box.row.value).toBe(value);
    expect(box.controls[0]!.control.select!.options[0]!.label).toBe(value);
  });
});
