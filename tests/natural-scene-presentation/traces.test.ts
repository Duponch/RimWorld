import {expect,test} from 'vitest';
import {NaturalResourcePresentation as Reference} from './NaturalResourcePresentation.reference';
import {NaturalResourcePresentation as Candidate} from '../../src/render/NaturalResourcePresentation';
import {camp,transport} from './fixtures';
import type {World,Resource} from '../../src/sim/types';

const sentinel={name:'original Nature getter sentinel'};
type Reader={read(world:World,reset?:boolean,immutable?:boolean):World|undefined;
  readonly changes:ReadonlyMap<number,{resource:Resource|undefined;size:number}>};
type Constructor=new()=>Reader;
type Fixture='proxy'|'hole'|'throw'|'reentrant';

function trace(Constructor:Constructor,entry:'read'|'readScene',fixture:Fixture,warm=false){
  const reader=new Constructor(),tape:string[]=[];let recording=false,fail=fixture==='throw',entered=false;
  const proxy=<T extends object>(target:T,path:string):T=>new Proxy(target,{
    get(t,key,receiver){if(recording)tape.push(path+'.get:'+String(key));return Reflect.get(t,key,receiver);},
    has(t,key){if(recording)tape.push(path+'.has:'+String(key));return Reflect.has(t,key);},
    ownKeys(t){if(recording)tape.push(path+'.ownKeys');return Reflect.ownKeys(t);},
    getOwnPropertyDescriptor(t,key){if(recording)tape.push(path+'.descriptor:'+String(key));return Reflect.getOwnPropertyDescriptor(t,key);},
  });
  if(warm){const source=camp(),native=transport(source).send();reader.read(native,true,true);}
  const raw=camp(),baseGrowth=raw.resources[0]!.growth;
  Object.defineProperty(raw.resources[0]!,'growth',{enumerable:true,configurable:true,get(){
    if(recording)tape.push('original.growth');if(fail)throw sentinel;
    if(fixture==='reentrant'&&!entered){entered=true;reader.read(camp(),true,false);}
    return baseGrowth;
  }});
  raw.resources=raw.resources.map((r,i)=>proxy(r,'resource'+i));
  if(fixture==='hole')raw.resources.length++;
  raw.resources=proxy(raw.resources,'resources');const world=proxy(raw,'world');
  const invoke=(reset=false)=>Reflect.apply((reader as unknown as Record<string,Function>)[entry]!,reader,[world,reset,false]);
  let output:unknown,error:unknown;
  try{recording=true;output=invoke(!warm);}catch(e){error=e;}finally{recording=false;}
  const firstTape=[...tape],firstChanges=[...reader.changes];fail=false;tape.length=0;
  let recovery:unknown,recoveryError:unknown;
  try{recording=true;recovery=invoke();}catch(e){recoveryError=e;}finally{recording=false;}
  return {firstTape,recoveryTape:[...tape],output,error,firstChanges,recovery,recoveryError,changes:[...reader.changes]};
}

test('default mutable readScene and literal read preserve Proxy trace, values and current changes',()=>{
  for(const entry of ['read','readScene'] as const){const a=trace(Reference,'read','proxy'),b=trace(Candidate,entry,'proxy');
    expect(b).toStrictEqual(a);expect(a.firstTape.length).toBeGreaterThan(0);}
});

test('holes and sentinel throws retain exact reads, partial changes and subsequent recovery',()=>{
  for(const fixture of ['hole','throw'] as const)for(const warm of [false,true]){
    const a=trace(Reference,'read',fixture,warm),b=trace(Candidate,'readScene',fixture,warm);
    expect(b.firstTape).toStrictEqual(a.firstTape);expect(b.recoveryTape).toStrictEqual(a.recoveryTape);
    expect(b.firstChanges).toStrictEqual(a.firstChanges);expect(b.changes).toStrictEqual(a.changes);
    expect(b.output).toStrictEqual(a.output);expect(b.recovery).toStrictEqual(a.recovery);
    if(fixture==='throw'){expect(a.error).toBe(sentinel);expect(b.error).toBe(sentinel);expect(b.recoveryError).toBe(a.recoveryError);}
    else{expect(a.error).toBeInstanceOf(TypeError);expect(b.error).toBeInstanceOf(TypeError);
      expect((b.error as Error).message).toBe((a.error as Error).message);
      expect((b.recoveryError as Error).message).toBe((a.recoveryError as Error).message);}
  }
});

test('historical getter reentrance introduces no new scope, callback or mutable read behavior',()=>{
  for(const warm of [false,true]){const a=trace(Reference,'read','reentrant',warm),b=trace(Candidate,'readScene','reentrant',warm);
    expect(b).toStrictEqual(a);}
});
