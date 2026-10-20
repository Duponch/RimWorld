import {isSmithingRecipe267,smithingRecipeAvailable267,isSmithingWorkpiece267,smithingMaterialAllowed267,smithingStackLimit267,smithingUnits267,smithingWorkpiece267,smithingWorkTotal267} from './smithing-content-267.ts';
import {isSchema267OrLater} from './schema-compatibility-257.ts';
import type {World} from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const closed=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>record(v)&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&keys.includes(k)&&Object.getOwnPropertyDescriptor(v,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
/** Called on each real pile, including historical/away containers, after the
 * ordinary pile owner/ID checks. A future marker is never silently discarded. */
export function validSmithingWorkShape267(p:Record<string,unknown>,version:number):boolean {
 if(!isSmithingWorkpiece267(p.item))return !Object.hasOwn(p,'smithingWork');
 const u=p.smithingWork;
 if(['unfinished','gunWork','flakWork','componentWork','artWork','apparel','weapon','egg','humanCorpse','mechCorpse'].some(k=>Object.hasOwn(p,k)))return false;
 if(!isSchema267OrLater(version)||p.kind!=='unfinished'||p.quantity!==1||!record(p.owner)||!['ground','pawn','inventory'].includes(String(p.owner.type))||!closed(u,['recipe','material','authorId','progress','parts','billId'])||!['recipe','material','authorId','progress','parts'].every(k=>Object.hasOwn(u,k))||!isSmithingRecipe267(u.recipe)||!smithingRecipeAvailable267(u.recipe,version)||!smithingMaterialAllowed267(u.recipe,u.material)||p.item!==smithingWorkpiece267(u.recipe)||!int(u.authorId,1)||!int(u.progress,0,smithingWorkTotal267(u.recipe,u.material))||Object.hasOwn(u,'billId')&&!int(u.billId,1)||!Array.isArray(u.parts)||!u.parts.length||u.parts.length>smithingUnits267(u.recipe,u.material))return false;
 let units=0;
 for(const part of u.parts){if(!closed(part,['item','quantity'])||Reflect.ownKeys(part).length!==2||part.item!==u.material||!int(part.quantity,1,smithingStackLimit267(u.material)))return false;units+=part.quantity;}
 return units===smithingUnits267(u.recipe,u.material);
}
/** Local bindings and original authors; no terrain scan or history generation. */
export function validateSmithingWorks267(w:World,version:number=w.schemaVersion):string[] {
 if(!w.piles.some(q=>isSmithingWorkpiece267(q.item)||Object.hasOwn(q,'smithingWork')))return [];
 const errors:string[]=[],bound=new Set<number>();
 const bills=[...w.structures,...w.packed.map(q=>q.building)].flatMap(s=>s.bills??[]);
 for(const q of w.piles){
  if(!validSmithingWorkShape267(q as unknown as Record<string,unknown>,version)){errors.push('Invalid unfinished smithing armor.');continue;}
  const u=q.smithingWork;if(!u)continue;
  // Departed/deceased creators keep factual provenance; only that ID resumes.
  if(u.authorId>=w.nextId)errors.push('Invalid unfinished smithing author identity.');
  if(u.billId!==undefined){if(bound.has(u.billId)||!bills.some(b=>b.id===u.billId&&b.recipe===u.recipe))errors.push('Invalid unfinished smithing bill.');bound.add(u.billId);}
 }
 return errors;
}
