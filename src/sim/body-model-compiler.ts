import type { BodyPart,BodyPartId } from './body-definition.ts';
import type { AnimalSpeciesId } from './animal-species.ts';

/** Immutable anatomical indexes; this compiler knows no actor storage. */
export interface BodyModel {
  readonly kind:'human'|AnimalSpeciesId|'scyther';readonly healthScale:number;
  readonly parts:readonly BodyPart[];
  readonly byId:Readonly<Record<BodyPartId,BodyPart>>;
  readonly index:Readonly<Record<BodyPartId,number>>;
  readonly parents:readonly number[];readonly coverage:readonly number[];
}
export function compileBodyModel(kind:BodyModel['kind'],healthScale:number,parts:readonly BodyPart[]):BodyModel {
  const byId=Object.freeze(Object.fromEntries(parts.map(p=>[p.id,p])) as Record<BodyPartId,BodyPart>);
  const index=Object.freeze(Object.fromEntries(parts.map((p,i)=>[p.id,i])) as Record<BodyPartId,number>);
  const parents=Object.freeze(parts.map(p=>p.parent===null?-1:index[p.parent]));
  const coverage=Object.freeze(parts.map(p=>{
    let v=p.coverage;for(let id=p.parent;id!==null;id=byId[id].parent)v*=byId[id].coverage;
    return v*(1-parts.filter(c=>c.parent===p.id).reduce((n,c)=>n+c.coverage,0));
  }));
  return Object.freeze({kind,healthScale,parts,byId,index,parents,coverage});
}
