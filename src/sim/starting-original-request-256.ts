import {validStartingCandidateDescriptor,STARTING_CANDIDATE_COUNT,STARTING_PARTY_COUNT,type StartingParty,type StartingCandidateDescriptor} from './starting-candidates.ts';
/** Current message payload subtype, not a save field or another RPC. Legacy
 * validStartingParty remains exact and rejects this four-key new-path value. */
export interface StartingOriginalRequest256 extends StartingParty {roster:StartingCandidateDescriptor[]}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
function descriptors(v:unknown,count:number):v is StartingCandidateDescriptor[]{if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length!==count||Reflect.ownKeys(v).length!==count+1)return false;for(let i=0;i<count;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable||!validStartingCandidateDescriptor(d.value))return false;}return new Set(v.map(d=>d.serial)).size===count;}
const same=(a:StartingCandidateDescriptor,b:StartingCandidateDescriptor)=>a.serial===b.serial&&a.generation===b.generation&&a.nameOverride===b.nameOverride;
export function validStartingOriginalRequest256(value:unknown):value is StartingOriginalRequest256 {
 if(!object(value)||Reflect.ownKeys(value).length!==4||!['version','seed','selected','roster'].every(k=>Object.hasOwn(value,k))||value.version!==1||typeof value.seed!=='number'||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff||!descriptors(value.selected,STARTING_PARTY_COUNT)||!descriptors(value.roster,STARTING_CANDIDATE_COUNT))return false;
 const roster=value.roster;return value.selected.every((d,i)=>same(d,roster[i]!));
}
/** Chooser order is copied at the actual Start gesture; renames/generations
 * of the five unchosen candidates are no longer silently discarded. */
export function startingOriginalRequestFromRoster256(seed:number,roster:readonly StartingCandidateDescriptor[]):StartingOriginalRequest256 {
 const ordered=roster.map(d=>({...d})),value={version:1 as const,seed,selected:ordered.slice(0,3) as StartingParty['selected'],roster:ordered};
 if(!validStartingOriginalRequest256(value))throw Error('Eight actual chooser entries are required before map creation');return value;
}
