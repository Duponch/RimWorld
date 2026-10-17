const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const data=(v:Record<string,unknown>,key:string)=>Object.getOwnPropertyDescriptor(v,key);
function noFuture(v:unknown):boolean {
 if(!object(v))return true;if(Object.hasOwn(v,'worldFactions'))return false;
 const p=data(v,'planet');if(!p)return true;if(!Object.hasOwn(p,'value'))return false;
 if(!object(p.value))return true;if(Object.hasOwn(p.value,'geography'))return false;const revision=data(p.value,'revision');return !revision||Object.hasOwn(revision,'value')&&revision.value!==3;
}
/** RAW authority only. Decoder passes its own packet.world explicitly; no
 * outer schemaVersion/world-envelope heuristic may mask a future field. */
export function validPlanetGeographyHistorical256(raw:unknown,version:number):boolean {
 if(!Number.isSafeInteger(version)||version<1)return false;if(version>=256)return true;if(!object(raw))return true;if(!noFuture(raw))return false;
 const secondary=data(raw,'secondarySite');if(secondary){if(!Object.hasOwn(secondary,'value'))return false;if(object(secondary.value)){const map=data(secondary.value,'map');if(map&&(!Object.hasOwn(map,'value')||!noFuture(map.value)))return false;}}
 const registry=data(raw,'worldMaps');if(registry){if(!Object.hasOwn(registry,'value'))return false;if(object(registry.value)){const sites=data(registry.value,'sites');if(sites){if(!Object.hasOwn(sites,'value'))return false;if(Array.isArray(sites.value)){for(let i=0;i<sites.value.length;i++){const row=Object.getOwnPropertyDescriptor(sites.value,String(i));if(!row||!Object.hasOwn(row,'value'))return false;if(object(row.value)){const map=data(row.value,'map');if(map&&(!Object.hasOwn(map,'value')||!noFuture(map.value)))return false;}}}}}}
 return true;
}
