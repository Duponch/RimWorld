import {expect,test} from 'vitest';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {actualCampWorldPawnSituation256,actualCampWorldPawnWeight256} from '../src/sim/camp-world-pawn-authority-256.ts';
import {provisionalCampWorldPawnWeight261} from '../src/sim/camp-world-pawn-authority-261.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {prepareWorldAnimalGeneration256} from '../src/sim/world-pawn-generation-256.ts';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
// Same small declared original-record preparation as Camp1200's existing unit
// fixture. No historical World/seen/relations or played Camp is manufactured.
function fixture(){
 const animal:WildAnimal={id:17,species:'hare',sex:'female',ageTicks:1000000,x:1,z:1,food:.1,rest:.8,state:'idle',path:[],nextDecision:101};attachGeneratedAnimalGrowth256(animal,1000,256);
 const row:Extract<WorldPawnOwner256,{kind:'animal'}>={kind:'animal',actor:animal,factionId:null,originMapId:0,context:{seed:7,width:32,height:32},clockCore:1000,enteredAtAbsCore:101000,mode:'active',items:[],packed:[],free:true};
 const state:WorldPawnsState256={revision:1,atCore:1000,lastSuccessfulCore:0,currentRate:1,owners:[row]};return {animal,row,state};
}
function random(){const draws:string[]=[];return {draws,value(){draws.push('chance');return 0;},float(a:number,b:number){draws.push(`float:${a}:${b}`);return Math.fround(a);},integer(a:number,b:number){draws.push(`integer:${a}:${b}`);return a;}};}
test('historical strict reader still refuses unknown selection before actor, registry or allocator writes',()=>{
 const f=fixture(),before=JSON.stringify(f.state),r=random(),phase=prepareWorldAnimalGeneration256(f.state,{tick:100,nextId:100,random:r,situation:actualCampWorldPawnSituation256,weight:actualCampWorldPawnWeight256});
 expect(phase.generate(INITIAL_ANIMAL_FACTS_256.Hare,{x:5,z:6})).toMatchObject({status:'blocked',reason:'Actual seen/relationship selection weight is unavailable'});expect(r.draws).toEqual(['chance']);expect(phase.nextId).toBe(100);expect(JSON.stringify(f.state)).toBe(before);expect(()=>phase.commit()).toThrow();
});
test('provisional known/absent history is read-only and never treats malformed own history as unknown',()=>{
 const f=fixture(),unknown=JSON.stringify(f.row);Object.freeze(f.row);expect(provisionalCampWorldPawnWeight261(f.row)).toBe(1);expect(actualCampWorldPawnWeight256(f.row)).toBeUndefined();expect(JSON.stringify(f.row)).toBe(unknown);
 const seen={...f.row,everSeenByPlayer:true as const};Object.freeze(seen);expect(provisionalCampWorldPawnWeight261(seen)).toBe(actualCampWorldPawnWeight256(seen));
 const invalid=Object.defineProperty({...f.row},'everSeenByPlayer',{value:undefined,enumerable:true});expect(provisionalCampWorldPawnWeight261(invalid)).toBeUndefined();let reads=0;const accessor=Object.defineProperty({...f.row},'everSeenByPlayer',{get(){reads++;throw Error('not data');},enumerable:true});expect(provisionalCampWorldPawnWeight261(accessor)).toBeUndefined();expect(reads).toBe(0);
});
test('provisional selection keeps the full original candidate order and same draw path without creating history',()=>{
 const f=fixture(),second={...f.row,actor:structuredClone(f.animal)};second.actor.id=18;f.state.owners.push(second);
 const known=structuredClone(f.state);for(const row of known.owners)row.everSeenByPlayer=true;const a=random(),b=random(),before=JSON.stringify(f.state),actors=f.state.owners.map(r=>r.actor);
 const provisional=prepareWorldAnimalGeneration256(f.state,{tick:100,nextId:100,random:a,situation:actualCampWorldPawnSituation256,weight:provisionalCampWorldPawnWeight261}),primary=prepareWorldAnimalGeneration256(known,{tick:100,nextId:100,random:b,situation:actualCampWorldPawnSituation256,weight:actualCampWorldPawnWeight256});
 for(const cell of [{x:5,z:6},{x:7,z:6}]){const p=provisional.generate(INITIAL_ANIMAL_FACTS_256.Hare,cell),q=primary.generate(INITIAL_ANIMAL_FACTS_256.Hare,cell);expect(p.status).toBe('ready');expect(p).toEqual(q);}
 expect(a.draws).toEqual(b.draws);expect(provisional.selectedOriginals).toEqual(actors);expect(JSON.stringify(f.state)).toBe(before);expect(provisional.nextId).toBe(100);expect(provisional.current()).toBe(true);
 const adopted=provisional.commit();expect(adopted[0]).toBe(actors[0]);expect(adopted[1]).toBe(actors[1]);expect(f.state.owners).toEqual([]);expect(Object.hasOwn(f.row,'everSeenByPlayer')).toBe(false);expect(Object.hasOwn(second,'everSeenByPlayer')).toBe(false);
});
