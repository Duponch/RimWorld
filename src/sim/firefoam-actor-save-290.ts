import {validCoveredInFirefoamField290} from './firefoam-actor-state-290.ts';

const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const own=(v:object,k:PropertyKey)=>Object.hasOwn(v,k);
/** Current custody lanes only: no terrain, plants, physiology or planet walk. */
const lanes=new Set(['world','summary','dynamic','campaign','map','worldMaps','sites','secondarySite','campaignMap',
 'pawns','wildlife','animals','mechanoids','flyers','structures','packed','building','casket','cryptosleep','shipCryptosleep277','occupant',
 'human','pawn','animal','mech','actor','piles','items','corpse','mechCorpse','worldGroups','groups','state','group','pending261','people','animalOwners','members',
 'groupLosses','animalLosses','losses','abandonedPawns','abandonedContents','humans','worldPawns','owners','heldCaskets259','heldPlayerCaskets271','heldShipCaskets277',
 'worldFactions','leaders','visitors','podRescues','departed','startingArrival','pods','scout','commercialTrip','legacyTravellers','upserted']);

/** Supplemental closed owner-context fence. Main guards still own actor shapes,
 * IDs and clocks. Relative remaining time is valid unchanged in frozen owners. */
export function validFirefoamActorOwners290(raw:unknown,version:number):boolean {
 if(!Number.isSafeInteger(version)||version<1||version>292)return false;
 const active=new Set<object>();let budget=2_000_000;
 const visit=(v:unknown,forbidden=false):boolean=>{
  if(--budget<0)return false;if(v===null||typeof v!=='object')return true;
  if(active.has(v)||!Array.isArray(v)&&!plain(v))return false;
  active.add(v);
  if(Array.isArray(v)){
   for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(d&&(!own(d,'value')||!visit(d.value,forbidden)))return false;}
  }else{
   const mode=Object.getOwnPropertyDescriptor(v,'mode');
   if(mode&&!own(mode,'value'))return false;
   const blocked=forbidden||mode?.value==='mothballed';
   const health=Object.getOwnPropertyDescriptor(v,'health');
   if(!health&&'health'in v)return false;
   if(health){
    if(!health.enumerable||!own(health,'value'))return false;
    if(health.value!==undefined){
     if(!validCoveredInFirefoamField290(health.value,version))return false;
     if(blocked&&own(health.value,'coveredInFirefoam290'))return false;
    }
   }
   // This field belongs only inside an admitted MedicalRecord.
   if('coveredInFirefoam290'in v)return false;
   for(const key of lanes){
    const d=Object.getOwnPropertyDescriptor(v,key);if(!d){if(key in v)return false;continue;}
    if(!d.enumerable||!own(d,'value'))return false;
    let initial=blocked;
    if(key==='startingArrival'&&plain(d.value)){
     const phase=Object.getOwnPropertyDescriptor(d.value,'phase');if(phase&&!own(phase,'value'))return false;
     initial=initial||phase?.value!=='opened';
    }
    if(!visit(d.value,initial))return false;
   }
  }
  active.delete(v);return true;
 };
 try{return visit(raw);}catch{return false;}
}
