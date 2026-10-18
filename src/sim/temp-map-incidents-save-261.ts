const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return typeof k==='string'&&d.enumerable&&Object.hasOwn(d,'value');});
const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
export function validTempMapField261(record:object,version:number,tick:number):boolean {
 const d=Object.getOwnPropertyDescriptor(record,'tempIncidents261');if(!d)return !('tempIncidents261'in record);
 if(version!==261||!d.enumerable||!Object.hasOwn(d,'value')||!plain(d.value))return false;
 const r=record as Record<string,unknown>,s=d.value;
 if(Reflect.ownKeys(s).length!==3||s.revision!==1||!Object.hasOwn(s,'adoptedAtCore')||!Object.hasOwn(s,'last')||!int(s.adoptedAtCore,Number(r.createdAt)*10,tick*10)||s.adoptedAtCore%10||!plain(s.last))return false;
 if(!['camp','battlefield'].includes(String(r.kind))&&!(r.kind==='settlement'&&int(r.settledAt,s.adoptedAtCore/10,tick)))return false;
 const last=s.last,adoptedAtCore=s.adoptedAtCore;
 return Reflect.ownKeys(last).every(k=>typeof k==='string'&&['meeting','ambush','manhunterAmbush'].includes(k)&&int(last[k],adoptedAtCore+1,tick*10)&&Number(last[k])%1000===0);
}
