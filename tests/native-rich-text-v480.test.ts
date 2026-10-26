import {describe,expect,it} from 'vitest';
import {createWorld} from '../src/sim/index';
import {createNativeTextLexicon,DEFAULT_NATIVE_TEXT_LEXICON,NATIVE_TEXT_STYLES,tokenizeNativeText,wrapNativeRichText,type NativeRichLine,type NativeTextEntity} from '../src/ui3d/native-rich-text';
import {nativeTextEntitiesFor} from '../src/ui3d/native-text-entities';

const source=(lines:readonly NativeRichLine[])=>lines.map(line=>line.spans.map(span=>span.text).join('')+(line.separator??'')).join('');
const measure=(text:string,bold:boolean)=>Array.from(text).reduce((sum,letter)=>sum+(letter===' '?3:bold?7.5:6.5),0);
const marked=(text:string,entities:readonly NativeTextEntity[]=[])=>tokenizeNativeText(text,createNativeTextLexicon(entities)).filter(span=>span.kind!=='plain');

describe('native semantic text keeps prose neutral and actual entities distinct',()=>{
 it('does not infer people from capitals, and does not colour a name inside a larger word',()=>{
  const text='Jour de repos. Adaline regarde. Ada reste près de l’arbre.';
  const spans=tokenizeNativeText(text,createNativeTextLexicon([{text:'Ada',kind:'person'}]));
  expect(spans.map(span=>span.text).join('')).toBe(text);
  expect(spans.filter(span=>span.kind!=='plain')).toEqual([{text:'Ada',kind:'person'}]);
  expect(tokenizeNativeText('Couverture et Composition ordinaires.',DEFAULT_NATIVE_TEXT_LEXICON)).toEqual([{text:'Couverture et Composition ordinaires.',kind:'plain'}]);
 });

 it('uses longest explicit labels, case-insensitive whitespace and escaped punctuation',()=>{
  const text='Éden porte 1 × REPAS\u202fsimple. A+B arrive ; le repas reste froid.';
  const entities:NativeTextEntity[]=[{text:'Éden',kind:'person'},{text:'A+B',kind:'person'},{text:'Repas',kind:'item'},{text:'Repas simple',kind:'item'}];
  const spans=tokenizeNativeText(text,createNativeTextLexicon(entities));
  expect(spans.map(span=>span.text).join('')).toBe(text);
  expect(spans.filter(span=>span.kind==='person').map(span=>span.text)).toEqual(['Éden','A+B']);
  expect(spans.filter(span=>span.kind==='item').map(span=>span.text)).toEqual(['REPAS\u202fsimple','repas']);
  expect(spans.filter(span=>span.kind==='action').map(span=>span.text)).toEqual(['porte']);
 });

 it('prioritises an actual person name over an object label with the same spelling',()=>{
  for(const entities of [
   [{text:'Robin',kind:'item'},{text:'Robin',kind:'person'}],
   [{text:'Robin',kind:'person'},{text:'Robin',kind:'item'}],
  ] as NativeTextEntity[][])expect(marked('Robin a mangé 1 repas.',entities)).toEqual([
   {text:'Robin',kind:'person'},{text:'a mangé',kind:'action'},{text:'1',kind:'value'},
  ]);
 });

 it('recognises localised values and units without taking digits from identifiers',()=>{
  const text='Patrimoine 20\u202f653,98 argent ; +24 % ; −3,5 °C ; 100/100 ; 12h55 ; V479 ; x-2 ; ∞.';
  const spans=tokenizeNativeText(text);
  expect(spans.map(span=>span.text).join('')).toBe(text);
  expect(spans.filter(span=>span.kind==='value').map(span=>span.text)).toEqual(['20\u202f653,98 argent','+24 %','−3,5 °C','100','100','12h55','∞']);
  expect(marked('Le modèle A12 et 1er restent des libellés.')).toEqual([]);
 });

 it('keeps warnings explicit while ordinary action prose uses a separate ink',()=>{
  expect(marked('Ordre annulé ; Gaël commence puis termine.')).toEqual([
   {text:'Ordre annulé',kind:'warning'},{text:'commence',kind:'action'},{text:'termine',kind:'action'},
  ]);
  expect(NATIVE_TEXT_STYLES.plain.bold).toBe(false);
  expect(new Set(Object.values(NATIVE_TEXT_STYLES).map(style=>style.color)).size).toBe(6);
 });

 it('reuses a lexicon for a stable entity array without storing a World in it',()=>{
  const entities:readonly NativeTextEntity[]=[{text:'Ada',kind:'person'}],first=createNativeTextLexicon(entities);
  expect(createNativeTextLexicon(entities)).toBe(first);
  expect(createNativeTextLexicon([{text:'Noé',kind:'person'}])).not.toBe(first);
  expect(tokenizeNativeText('Ada et Noé',first).filter(span=>span.kind==='person').map(span=>span.text)).toEqual(['Ada']);
 });
});

describe('native styled wrapping retains information and punctuation',()=>{
 it('preserves every character, consecutive spaces and CRLF paragraph breaks',()=>{
  const text='Eden,  a mangé 1 × Repas simple.\r\n\r\nDeuxième  information : +24 %.';
  const spans=tokenizeNativeText(text,createNativeTextLexicon([{text:'Eden',kind:'person'},{text:'Repas simple',kind:'item'}]));
  const lines=wrapNativeRichText(spans,94,measure);
  expect(source(lines)).toBe(text);
  expect(lines.length).toBeGreaterThan(3);
  expect(lines.filter(line=>line.breakAfter==='newline').map(line=>line.separator)).toEqual(['\r\n','\r\n']);
  expect(lines.every(line=>line.width<=94)).toBe(true);
  expect(lines.some(line=>line.spans[0]?.text.startsWith(','))).toBe(false);
  expect(lines.flatMap(line=>line.spans).some(span=>span.kind==='person'&&span.text==='Eden')).toBe(true);
 });

 it('splits a long token and keeps the following closing punctuation attached where space permits',()=>{
  const text='ÉléonoreTrèsLongueSansEspace et Ada, ici.';
  const spans=tokenizeNativeText(text,createNativeTextLexicon([{text:'Ada',kind:'person'}]));
  const lines=wrapNativeRichText(spans,48,measure);
  expect(source(lines)).toBe(text);expect(lines.every(line=>line.width<=48)).toBe(true);
  expect(lines.some(line=>line.spans.map(span=>span.text).join('').trimEnd().endsWith('Ada,'))).toBe(true);
 });

 it('represents a final newline and an empty page without dropping their line',()=>{
  const final=wrapNativeRichText(tokenizeNativeText('Information\n'),200,measure);
  expect(final).toHaveLength(2);expect(final[0]!.breakAfter).toBe('newline');expect(final[1]!.spans).toEqual([]);
  expect(source(final)).toBe('Information\n');expect(wrapNativeRichText([],100,measure)).toEqual([{spans:[],width:0,breakAfter:'end'}]);
 });
});

describe('actual native page entities',()=>{
 it('shares static labels and rebuilds only the labels whose actual names change',()=>{
  const world=createWorld(480311,16,16);world.pawns[0]!.name='Éloïse';world.campaignPeople=[];
  const before=JSON.stringify(world),entities=nativeTextEntitiesFor(world),lexicon=createNativeTextLexicon(entities);
  expect(JSON.stringify(world)).toBe(before);expect(nativeTextEntitiesFor(world)).toBe(entities);
  expect(entities.some(entity=>entity.kind==='item'&&entity.text==='Repas simple')).toBe(true);
  expect(entities.some(entity=>entity.kind==='item'&&entity.text==='Lit')).toBe(true);
  expect(marked('Éloïse porte un Repas simple.',entities)).toContainEqual({text:'Éloïse',kind:'person'});
  world.tick++;expect(nativeTextEntitiesFor(world)).toBe(entities);
  world.pawns[0]!.name='Maëlle';const renamed=nativeTextEntitiesFor(world);
  expect(renamed).not.toBe(entities);
  expect(tokenizeNativeText('Éloïse et Maëlle',createNativeTextLexicon(renamed)).filter(span=>span.kind==='person').map(span=>span.text)).toEqual(['Maëlle']);
  expect(tokenizeNativeText('Éloïse',lexicon)).toEqual([{text:'Éloïse',kind:'person'}]);
 });
});
