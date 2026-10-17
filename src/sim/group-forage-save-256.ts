import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function data(v:Record<string,unknown>,key:string):{ok:boolean;value:unknown}{const d=Object.getOwnPropertyDescriptor(v,key);return !d?{ok:true,value:undefined}:Object.hasOwn(d,'value')?{ok:true,value:d.value}:{ok:false,value:undefined};}
/** The actual transport authority is explicit. Never unwrap a raw `world`
 * decoy or treat ground food, a visitor inventory or an off-map owner as a
 * new local-return permission. Current256 exits before any owner scan. */
export function validGroupForageHistoricalTransport256(value:unknown,version:number,upsertedPiles?:unknown):boolean {
 if(version>=256)return true;if(!object(value))return true;
 const local=(raw:Record<string,unknown>,piles:unknown):boolean=>{const pd=data(raw,'pawns');if(!pd.ok)return false;if(!Array.isArray(piles))return true;const humans=Array.isArray(pd.value)?pd.value:[],wd=data(raw,'wildlife');if(!wd.ok)return false;const ad=object(wd.value)?data(wd.value,'animals'):{ok:true,value:undefined};if(!ad.ok)return false;const animals=Array.isArray(ad.value)?ad.value:[];
  for(let i=0;i<piles.length;i++){const d=Object.getOwnPropertyDescriptor(piles,String(i));if(!d||!Object.hasOwn(d,'value'))return false;const pile=d.value;if(!object(pile))continue;const item=data(pile,'item'),owner=data(pile,'owner');if(!item.ok||!owner.ok)return false;const futureFood=typeof item.value==='string'&&Object.hasOwn(ITEM_DEFINITIONS,item.value)&&ITEM_DEFINITIONS[item.value as ItemId].nutrition>0&&!['survival-meal','pemmican'].includes(item.value);if(!object(owner.value))continue;const type=data(owner.value,'type'),id=data(owner.value,'pawnId');if(!type.ok||!id.ok)return false;if(type.value!=='inventory')continue;
   for(let j=0;j<humans.length;j++){const q=Object.getOwnPropertyDescriptor(humans,String(j));if(!q||!Object.hasOwn(q,'value'))return false;if(!object(q.value))continue;const who=data(q.value,'id'),visitor=data(q.value,'visitor');if(!who.ok||!visitor.ok)return false;if(who.value===id.value&&!visitor.value&&futureFood)return false;}
   for(let j=0;j<animals.length;j++){const q=Object.getOwnPropertyDescriptor(animals,String(j));if(!q||!Object.hasOwn(q,'value'))return false;if(!object(q.value))continue;const who=data(q.value,'id');if(!who.ok)return false;if(who.value===id.value)return false;}
  }return true;};
 const domain=(raw:unknown):boolean=>{if(!object(raw))return true;const piles=data(raw,'piles');return piles.ok&&local(raw,piles.value);};
 if(!domain(value)||!local(value,upsertedPiles))return false;
 const old=data(value,'secondarySite');if(!old.ok)return false;if(object(old.value)){const map=data(old.value,'map');if(!map.ok||!domain(map.value))return false;}
 const registry=data(value,'worldMaps');if(!registry.ok)return false;if(object(registry.value)){const sites=data(registry.value,'sites');if(!sites.ok)return false;if(Array.isArray(sites.value))for(let i=0;i<sites.value.length;i++){const row=Object.getOwnPropertyDescriptor(sites.value,String(i));if(!row||!Object.hasOwn(row,'value'))return false;if(!object(row.value))continue;const map=data(row.value,'map');if(!map.ok||!domain(map.value))return false;}}
 return true;
}
