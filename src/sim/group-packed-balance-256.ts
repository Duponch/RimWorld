import type {PackedFurniture} from './furniture-rules.ts';
import type {GroupState,GroupLoss} from './group-state.ts';
export interface GroupPackedBalance256 {revision:1;opening:number[];received:Record<string,number>;sent:Record<string,number>}
type Away=Extract<GroupState,{members:unknown}>;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const held=(g:Away,losses:readonly GroupLoss[])=>[...(g.packed??[]),...losses.filter(l=>l.groupId===g.id).flatMap(l=>l.packed??[])];
/** IDs only, not nested former groups or copies of building/stat histories. */
export function openGroupPackedBalance256(g:Away,losses:readonly GroupLoss[]):GroupPackedBalance256|undefined {const opening=held(g,losses).map(p=>p.building.id);if(new Set(opening).size!==opening.length)throw Error('Duplicate actual packed owner');return opening.length?{revision:1,opening,received:{},sent:{}}:undefined;}
export function exchangeGroupPackedBalance256(value:GroupPackedBalance256|undefined,direction:'received'|'sent',packs:readonly PackedFurniture[]):GroupPackedBalance256|undefined {
 if(!packs.length)return value;const base=value??{revision:1 as const,opening:[],received:{},sent:{}},next={...base[direction]};for(const p of packs){const id=p.building.id;if(!integer(id,1)||!integer((next[id]??0)+1,1))throw Error('Packed exchange counter exhausted');next[id]=(next[id]??0)+1;}return {...base,[direction]:next};
}
export function validGroupPackedBalanceShape256(value:unknown,nextId:number):value is GroupPackedBalance256|undefined {
 if(value===undefined)return true;if(!plain(value)||Reflect.ownKeys(value).length!==4||value.revision!==1||!Array.isArray(value.opening)||Object.getPrototypeOf(value.opening)!==Array.prototype||Reflect.ownKeys(value.opening).length!==value.opening.length+1)return false;
 const ids=new Set<number>();for(let i=0;i<value.opening.length;i++){const d=Object.getOwnPropertyDescriptor(value.opening,String(i));if(!d||!Object.hasOwn(d,'value')||!integer(d.value,1,nextId-1)||ids.has(d.value))return false;ids.add(d.value);}
 return [value.received,value.sent].every(v=>plain(v)&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&/^[1-9]\d*$/.test(k)&&String(Number(k))===k&&integer(Number(k),1,nextId-1)&&integer(v[k],1)));
}
export function groupPackedBalance256(g:Away,value:GroupPackedBalance256|undefined,losses:readonly GroupLoss[]):boolean {
 const packs=held(g,losses),actual=new Set(packs.map(p=>p.building.id));if(actual.size!==packs.length)return false;if(!value)return !actual.size;if(!validGroupPackedBalanceShape256(value,Number.MAX_SAFE_INTEGER))return false;const opening=new Set(value.opening),keys=new Set([...actual,...opening,...Object.keys(value.received).map(Number),...Object.keys(value.sent).map(Number)]);
 for(const id of keys){const expected=(opening.has(id)?1n:0n)+BigInt(value.received[id]??0)-BigInt(value.sent[id]??0);if(expected!==(actual.has(id)?1n:0n))return false;}return true;
}