/** Cold raw historical fence, before complete old-schema validation. No getter
 * or imported context runs. The immutable planet owner has its own closed
 * schema guard; do not walk its dense geography a second time for travel tags. */
export function validCaravan261Historical(input:unknown,version:number):boolean {
 if(version>=261)return true;
 const forbidden=new Set(['retreat261','undraftIds261','encounters261','story261','battlefield261','pending261','arrival261','captivity261','encounterBirth261','caravan261','memberCount261','kidnap261','kidnapLord261','animalAmbush261','scaria261','permanent261','entryKind261','caravanCession261','tempIncidents261','tempIncident261','extraActive261','extraResults261','extraMechActive261']),seen=new Set<object>();
 const walk=(v:unknown):boolean=>{
  if(!v||typeof v!=='object'||seen.has(v))return true;seen.add(v);
  for(const k of Reflect.ownKeys(v)){
   const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value')||typeof k!=='string'||forbidden.has(k))return false;
   if(k==='kind'&&d.value==='battlefield'||k==='reason'&&d.value==='battlefield-empty')return false;
   if(k!=='planet'&&!walk(d.value))return false;
  }return true;
 };return walk(input);
}
