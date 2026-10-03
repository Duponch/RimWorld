import { expect,test } from 'vitest';
import { newApparelState } from '../src/sim/apparel-rules';
import { newWeaponState } from '../src/sim/equipment-rules';
import type { MaterialPile } from '../src/sim/types';
import { itemInformation } from '../src/ui/item-information';
import { filterObjectInformationRows,type ObjectInformationInput,type ObjectInformationRow } from '../src/ui/object-information';

const value=(view:ObjectInformationInput,label:string,category?:string)=>view.rows.find(row=>row.label===label&&(!category||row.category===category))?.value;
const rows:ReadonlyArray<ObjectInformationRow>=Object.freeze([
  Object.freeze({category:'Général',label:'Qualité',value:'excellent',description:'Qualité de cette instance équipée.'}),
  Object.freeze({category:'Protection',label:'Chaleur',value:'35 %',description:'Protection localisée après qualité.'}),
  Object.freeze({category:'Isolation',label:'Froid',value:'1.2 °C',description:'Isolation après facteur de qualité.'}),
]);

test('object search ignores accents and case and requires every term across the real row fields',()=>{
  expect(filterObjectInformationRows(rows,'  GENERAL   equipee  ')).toEqual([rows[0]]);
  expect(filterObjectInformationRows(rows,'CHALÉUR qualité 35')).toEqual([rows[1]]);
  expect(filterObjectInformationRows(rows,'isolation 1.2')).toEqual([rows[2]]);
  expect(filterObjectInformationRows(rows,'protection 1.2')).toEqual([]);
  expect(filterObjectInformationRows(rows,'qualite absent')).toEqual([]);
});

test('empty search preserves order and row identities without mutating the source',()=>{
  const before=JSON.stringify(rows);
  const result=filterObjectInformationRows(rows,' \t\n ');
  expect(result).toEqual(rows);expect(result).not.toBe(rows);
  for(let index=0;index<rows.length;index++)expect(result[index]).toBe(rows[index]);
  filterObjectInformationRows(rows,'qualite');
  expect(JSON.stringify(rows)).toBe(before);expect(Object.isFrozen(rows)).toBe(true);
});

test('a real textile garment shows its material protection, insulation, anatomy and normal instance condition',()=>{
  const shirt:MaterialPile={id:1,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:7},apparel:newApparelState('cloth-shirt')};
  const before=JSON.stringify(shirt),view=itemInformation(shirt);
  expect(view.title).toBe('Chemise en tissu (normal)');
  expect(value(view,'Qualité')).toBe('normal');expect(value(view,'Points de vie')).toBe('100 / 100');
  expect(value(view,'Tranchant','Protection')).toBe('7 %');expect(value(view,'Contondant','Protection')).toBe('0 %');expect(value(view,'Chaleur','Protection')).toBe('4 %');
  expect(value(view,'Froid','Isolation')).toBe('4.7 °C');expect(value(view,'Chaleur','Isolation')).toBe('1.8 °C');
  expect(value(view,'Parties couvertes')).toContain('Torse');expect(value(view,'Parties couvertes')).toContain('Bras gauche');expect(value(view,'Parties couvertes')).not.toContain('Main gauche');
  expect(JSON.stringify(shirt)).toBe(before);
});

test('excellent damaged apparel keeps its own HP and quality factors without scaling protection by wear',()=>{
  const vest:MaterialPile={id:2,kind:'apparel',item:'flak-vest',quantity:1,owner:{type:'ground',x:8,z:9},
    apparel:{...newApparelState('flak-vest'),quality:'excellent',hitPoints:71}};
  Object.freeze(vest.owner);Object.freeze(vest.apparel);Object.freeze(vest);
  const before=JSON.stringify(vest),view=itemInformation(vest);
  expect(view.title).toBe('Gilet pare-balles (excellent)');expect(value(view,'Points de vie')).toBe('71 / 200');
  expect(value(view,'Tranchant','Protection')).toBe('130 %');expect(value(view,'Contondant','Protection')).toBe('47 %');expect(value(view,'Chaleur','Protection')).toBe('35 %');
  expect(value(view,'Froid','Isolation')).toBe('1.2 °C');expect(value(view,'Chaleur','Isolation')).toBe('0.0 °C');
  expect(view.rows.find(row=>row.label==='Tranchant')!.description).toContain('base 100 % × qualité 1.3');
  const intact={...vest,apparel:{...vest.apparel!,hitPoints:200}};
  expect(itemInformation(intact).rows.filter(row=>row.category==='Protection'||row.category==='Isolation'))
    .toEqual(view.rows.filter(row=>row.category==='Protection'||row.category==='Isolation'));
  expect(JSON.stringify(vest)).toBe(before);
});

test('nutrition is per consumed unit and supported mass explicitly belongs to commercial expeditions',()=>{
  const food:MaterialPile={id:3,kind:'food',item:'survival-meal',quantity:4,owner:{type:'inventory',pawnId:7}};
  const before=JSON.stringify(food),view=itemInformation(food);
  expect(value(view,'Quantité')).toBe('4');expect(value(view,'Limite de pile')).toBe('10');expect(value(view,'Nutrition')).toBe('0.9');expect(value(view,'Masse unitaire')).toBe('0.3 kg');
  expect(view.rows.find(row=>row.label==='Masse unitaire')!.description).toContain('expéditions commerciales');
  expect(view.rows.find(row=>row.label==='Masse unitaire')!.description).toContain('ne limite pas le transport ordinaire');
  expect(view.rows.some(row=>/capacité|charge maximale/i.test(row.label))).toBe(false);
  const simple:MaterialPile={...food,item:'simple-meal'};
  expect(value(itemInformation(simple),'Nutrition')).toBe('0.9');expect(value(itemInformation(simple),'Masse unitaire')).toBeUndefined();
  const wood:MaterialPile={id:4,kind:'wood',item:'wood',quantity:12,owner:{type:'ground',x:1,z:1}};
  expect(value(itemInformation(wood),'Nutrition')).toBeUndefined();expect(value(itemInformation(wood),'Masse unitaire')).toBeUndefined();
  expect(JSON.stringify(food)).toBe(before);
});

test('weapon information reads real weapon HP with the correct item maximum and leaves ownership and metadata intact',()=>{
  const knife:MaterialPile={id:5,kind:'weapon',item:'plasteel-knife',quantity:1,owner:{type:'equipment',pawnId:7},
    weapon:{...newWeaponState('plasteel-knife'),quality:'good',hitPoints:279},damage:99};
  Object.freeze(knife.owner);Object.freeze(knife.weapon);Object.freeze(knife);
  const before=JSON.stringify(knife),view=itemInformation(knife);
  expect(view.title).toBe('Couteau en plastacier');expect(value(view,'Qualité')).toBe('bon');expect(value(view,'Points de vie')).toBe('279 / 280');expect(value(view,'Masse unitaire')).toBe('0.5 kg');
  expect(view.rows.some(row=>row.category==='Protection'||row.category==='Isolation')).toBe(false);
  const revolver:MaterialPile={id:6,kind:'weapon',item:'revolver',quantity:1,owner:{type:'ground',x:2,z:3},weapon:newWeaponState('revolver')};
  expect(value(itemInformation(revolver),'Points de vie')).toBe('100 / 100');expect(value(itemInformation(revolver),'Masse unitaire')).toBe('1.4 kg');
  expect(JSON.stringify(knife)).toBe(before);
});
