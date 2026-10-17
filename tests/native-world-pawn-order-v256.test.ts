import {expect,test} from 'vitest';
import {constructNativeWorldPawnOrder256,validNativeWorldPawnOrder256,restoreNativeWorldPawnOrder256,passNativeWorldPawnOrder256,removeNativeWorldPawnOrder256,destroyNativeWorldPawnOrder256,mothballNativeWorldPawnOrder256,captureNativeWorldPawnFinderIds256} from '../src/sim/native-world-pawn-order-256.ts';
const born=()=>constructNativeWorldPawnOrder256({atCore:0,atAbsCore:7200000,firstThingId:100});
const abc=()=>[100,101,102].reduce((s,id)=>passNativeWorldPawnOrder256(s,id,false),born());

test('the native slot hole is reused instead of appending or sorting survivors',()=>{
 const initial=abc(),removed=removeNativeWorldPawnOrder256(initial,101),added=passNativeWorldPawnOrder256(removed,103,false);
 expect(removed.alive).toEqual({slots:[100,null,102],free:[1]});expect(captureNativeWorldPawnFinderIds256(added).alive).toEqual([100,103,102]);
 expect(initial.alive.slots).toEqual([100,101,102]);expect(added.dead).toBe(initial.dead);expect(added.birth).toBe(initial.birth);
});

test('two actual removals retain LIFO order across cold save/restore',()=>{
 const removed=removeNativeWorldPawnOrder256(removeNativeWorldPawnOrder256(abc(),102),101);
 expect(removed.alive.free).toEqual([2,1]);const copy=restoreNativeWorldPawnOrder256(JSON.parse(JSON.stringify(removed)),110,0);
 const next=passNativeWorldPawnOrder256(passNativeWorldPawnOrder256(copy,104,false),105,false);
 expect(captureNativeWorldPawnFinderIds256(next).alive).toEqual([100,104,105]);expect(copy.alive.free).toEqual([2,1]);
});

test('last removal resets the logical prefix and free chain exactly',()=>{
 let s=abc();for(const id of [101,102,100])s=removeNativeWorldPawnOrder256(s,id);
 expect(s.alive).toEqual({slots:[],free:[]});expect(passNativeWorldPawnOrder256(s,106,false).alive.slots).toEqual([106]);expect(validNativeWorldPawnOrder256(s,110,0)).toBe(true);
});

test('duplicate pass and absent remove/destroy preserve the confirmed owner identity',()=>{
 const s=abc();expect(passNativeWorldPawnOrder256(s,101,true)).toBe(s);expect(removeNativeWorldPawnOrder256(s,109)).toBe(s);expect(destroyNativeWorldPawnOrder256(s,109)).toBe(s);
});

test('real mothball/death transitions preserve three separate native sets and finder order',()=>{
 const s=mothballNativeWorldPawnOrder256(abc(),101),destroyed=destroyNativeWorldPawnOrder256(s,101),next=passNativeWorldPawnOrder256(destroyed,104,false);
 expect(captureNativeWorldPawnFinderIds256(s)).toEqual({alive:[100,102,101],dead:[]});expect(captureNativeWorldPawnFinderIds256(next)).toEqual({alive:[100,104,102],dead:[101]});
 expect(destroyed.mothballed).toEqual({slots:[],free:[]});expect(destroyNativeWorldPawnOrder256(destroyed,101)).toBe(destroyed);expect(validNativeWorldPawnOrder256(next,110,10)).toBe(true);
});

test('guard rejects lost holes, duplicate members, accessors and nonreset vacant prefixes',()=>{
 const s=JSON.parse(JSON.stringify(removeNativeWorldPawnOrder256(abc(),101)));
 const invalid=[{...s,alive:{slots:[100,null,102],free:[]}},{...s,alive:{slots:[100,null,102],free:[0]}},{...s,alive:{slots:[null],free:[0]}},{...s,dead:{slots:[100],free:[]}}];
 for(const value of invalid)expect(validNativeWorldPawnOrder256(value,110,0)).toBe(false);
 const accessor={...s};Object.defineProperty(accessor,'alive',{enumerable:true,get(){throw Error('Never invoke a hostile getter');}});expect(validNativeWorldPawnOrder256(accessor,110,0)).toBe(false);
});

test('cold omission and ownundefined never become a reconstructed empty native owner',()=>{
 expect(validNativeWorldPawnOrder256(undefined,110,0)).toBe(false);expect(()=>restoreNativeWorldPawnOrder256(undefined,110,0)).toThrow('Invalid actual');
 const s={...born(),alive:undefined};expect(validNativeWorldPawnOrder256(s,110,0)).toBe(false);
});

test('snapshot arrays and successors are immutable; failed source preflight does not mutate',()=>{
 const s=abc(),before=JSON.stringify(s);expect(Object.isFrozen(s)).toBe(true);expect(Object.isFrozen(s.alive.slots)).toBe(true);
 expect(()=>mothballNativeWorldPawnOrder256(s,109)).toThrow('source is absent');expect(JSON.stringify(s)).toBe(before);
 expect(()=>constructNativeWorldPawnOrder256({atCore:10,atAbsCore:7200010,firstThingId:100})).toThrow('birth anchors');
});
