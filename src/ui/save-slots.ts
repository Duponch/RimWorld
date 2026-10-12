import { MAX_DECOMPRESSED_SAVE_BYTES, storedSaveMetadata } from './save-storage-codec';

/** Application storage records; never part of the simulation or its schema. */
export const NAMED_SAVE_KEYS = Object.freeze(Array.from({length:12},(_,i)=>`lisiere.named.v1.${i+1}`));
export const AUTO_SAVE_KEYS = Object.freeze(Array.from({length:3},(_,i)=>`lisiere.auto.v1.${i+1}`));
export const MANAGED_SAVE_KEYS = Object.freeze([...NAMED_SAVE_KEYS,...AUTO_SAVE_KEYS]);
export const isNamedSaveKey = (key:string):boolean => NAMED_SAVE_KEYS.includes(key);
export const isManagedSaveKey = (key:string):boolean => MANAGED_SAVE_KEYS.includes(key);

export interface SaveSlotRecord {format:'elsewhere-save-slot';version:1;label:string;savedAt:number;sequence:number;data:string}
export function saveLabel(value:string):string {
  const label=value.trim();
  if(!label||label.length>64||/[\u0000-\u001f\u007f]/.test(label))throw new Error('Choisissez un nom de 1 à 64 caractères, sans caractère de contrôle.');
  return label;
}
export function parseSaveSlot(value:string):SaveSlotRecord {
  if(value.length>MAX_DECOMPRESSED_SAVE_BYTES*2+1024)throw new Error('Emplacement de sauvegarde trop volumineux.');
  let slot:SaveSlotRecord;
  try{slot=JSON.parse(value);}catch{throw new Error('Emplacement de sauvegarde illisible.');}
  if(!slot||typeof slot!=='object'||Array.isArray(slot)||Object.keys(slot).length!==6||
    slot.format!=='elsewhere-save-slot'||slot.version!==1||typeof slot.label!=='string'||
    slot.label!==saveLabel(slot.label)||!Number.isSafeInteger(slot.savedAt)||slot.savedAt<0||
    !Number.isSafeInteger(slot.sequence)||slot.sequence<0||
    typeof slot.data!=='string'||!slot.data.length||slot.data.length>MAX_DECOMPRESSED_SAVE_BYTES||!storedSaveMetadata(slot.data))
    throw new Error('Emplacement de sauvegarde invalide.');
  return slot;
}
export function encodeSaveSlot(data:string,label:string,savedAt:number,sequence=0):string {
  if(!storedSaveMetadata(data)||!Number.isSafeInteger(savedAt)||savedAt<0||!Number.isSafeInteger(sequence)||sequence<0)throw new Error('Métadonnées de sauvegarde invalides.');
  return JSON.stringify({format:'elsewhere-save-slot',version:1,label:saveLabel(label),savedAt,sequence,data} satisfies SaveSlotRecord);
}

/** Empty first, then oldest structurally readable record. Full world validation
 * remains in the decoder/worker; metadata cannot detect every damaged payload. */
export function nextAutosaveKey(values:ReadonlyMap<string,string|null>):string {
  for(const key of AUTO_SAVE_KEYS)if(values.get(key)===null)return key;
  const candidates=AUTO_SAVE_KEYS.flatMap(key=>{
    try{return [{key,sequence:parseSaveSlot(values.get(key)!).sequence}];}catch{return [];}
  });
  candidates.sort((a,b)=>a.sequence-b.sequence||AUTO_SAVE_KEYS.indexOf(a.key)-AUTO_SAVE_KEYS.indexOf(b.key));
  if(!candidates.length)throw new Error('Les trois autosauvegardes sont illisibles. Exportez la partie et supprimez explicitement une copie pour libérer un emplacement.');
  return candidates[0]!.key;
}
export function nextAutosaveSequence(values:ReadonlyMap<string,string|null>):number {
  let sequence=0;
  for(const value of values.values())if(value!==null){try{sequence=Math.max(sequence,parseSaveSlot(value).sequence);}catch{/* Preserve invalid copies. */}}
  if(sequence===Number.MAX_SAFE_INTEGER)throw new Error('Compteur d’autosauvegardes épuisé. Exportez la partie avant de libérer les copies.');
  return sequence+1;
}
