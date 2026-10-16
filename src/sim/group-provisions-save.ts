const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
const FIELDS=['revision','pemmicanLoadedUnits','pemmicanConsumedUnits','pemmicanSpoiledUnits'];

/** Only new group intentions own the mixed-provision contract. Existing food
 * possessions, including frozen archives, do not imply a new permission. */
export function validGroupProvisionsShape(group:unknown,version:number):boolean {
  try{
    if(!object(group))return true;
    const present=Object.hasOwn(group,'provisions');
    if(!present)return !(object(group.baseline)&&Object.hasOwn(group.baseline,'pemmican'))
      &&!(Array.isArray(group.manifest)&&group.manifest.some(line=>object(line)&&line.item==='pemmican'));
    const p=group.provisions;
    return version>=250&&object(p)&&Reflect.ownKeys(p).length===FIELDS.length
      &&FIELDS.every(key=>Object.hasOwn(p,key))&&p.revision===1
      &&FIELDS.slice(1).every(key=>int(p[key]));
  }catch{return false;}
}

/** RAW files and full/delta envelopes before migration/adoption. The bounded
 * group domains never traverse map grids, owned food or unrelated archives. */
export function validGroupProvisionsHistoricalTransport(value:unknown,version:number):boolean {
  try{
    if(version>=250||!object(value))return true;
    const world=object(value.world)?value.world:value;
    const domains=(w:unknown)=>!object(w)||validGroupProvisionsShape(w.group,version)
      &&(!Array.isArray(w.groupLosses)||w.groupLosses.every(loss=>validGroupProvisionsShape(loss,version)));
    return domains(world)&&(!object(world.secondarySite)||domains(world.secondarySite.map));
  }catch{return false;}
}
