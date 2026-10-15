/** QA-only operational payloads. Historical FULLs stay immutable external authorities. */
import {createHash} from 'node:crypto';
export interface ProofAppend {append(tick:number,kind:string,payload:unknown):Promise<unknown>}
export function canonicalProofJson(value:unknown):string {
 const text=JSON.stringify(value,(_key,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite operational number');return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0)):v;});
 if(text===undefined)throw Error('Operational proof must be JSON');return text;
}
export const operationalHash=(value:unknown)=>createHash('sha256').update(canonicalProofJson(value)).digest('hex');
const validKey=(key:string)=>key.length>0&&key.length<=128&&!['__proto__','prototype','constructor'].includes(key);
export class OperationalProofWriter {
 private initialized=false;private hashes=new Map<string,string>();
 async persist(journal:ProofAppend,tick:number,state:Record<string,unknown>):Promise<string[]> {
  // Snapshot all changed JSON payloads before the first await; never lend live objects to disk writes.
  const prepared=new Map<string,{value:unknown;hash:string}>();
  for(const [key,value] of Object.entries(state)){if(!validKey(key))throw Error('Invalid operational key');if(value!==undefined){const text=canonicalProofJson(value);prepared.set(key,{value:JSON.parse(text),hash:createHash('sha256').update(text).digest('hex')});}}
  if(!this.initialized){const snapshot=Object.fromEntries([...prepared].map(([k,v])=>[k,v.value]));await journal.append(tick,'operational-initial',{state:snapshot});this.hashes=new Map([...prepared].map(([k,v])=>[k,v.hash]));this.initialized=true;return [...prepared.keys()];}
  const changed:string[]=[];for(const key of [...new Set([...prepared.keys(),...this.hashes.keys()])].sort()){const next=prepared.get(key),previousHash=this.hashes.get(key)??null;if((next?.hash??null)===previousHash)continue;await journal.append(tick,'operational-upsert',{key,previousHash,present:!!next,...next?{value:next.value}:{}});if(next)this.hashes.set(key,next.hash);else this.hashes.delete(key);changed.push(key);}return changed;
 }
}
export class OperationalProofReplay {
 private initialized=false;private state:Record<string,unknown>={};
 accept(record:{kind:string;payload:unknown}) {
  const payload=record.payload as any;
  if(record.kind==='operational-initial'){if(this.initialized||!payload?.state||Array.isArray(payload.state)||typeof payload.state!=='object')throw Error('Duplicate or invalid operational initial');this.state=JSON.parse(canonicalProofJson(payload.state));for(const key of Object.keys(this.state))if(!validKey(key))throw Error('Invalid operational key');this.initialized=true;return;}
  if(record.kind!=='operational-upsert')return;
  if(!this.initialized||!payload||typeof payload.key!=='string'||!validKey(payload.key)||typeof payload.present!=='boolean')throw Error('Operational upsert before initial or malformed');
  const old=Object.hasOwn(this.state,payload.key)?operationalHash(this.state[payload.key]):null;if(old!==payload.previousHash)throw Error('Operational previous value hash mismatch');
  if(payload.present){if(!Object.hasOwn(payload,'value'))throw Error('Missing operational value');this.state[payload.key]=JSON.parse(canonicalProofJson(payload.value));}else{if(Object.hasOwn(payload,'value'))throw Error('Deleted operational value included');delete this.state[payload.key];}
 }
 assertState(expected:unknown){if(!this.initialized||canonicalProofJson(this.state)!==canonicalProofJson(expected))throw Error('Durable operational state differs from final ledger');}
 value(){if(!this.initialized)throw Error('No operational initial');return JSON.parse(canonicalProofJson(this.state));}
}
