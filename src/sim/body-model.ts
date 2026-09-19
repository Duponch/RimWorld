import { HUMAN_BODY,type BodyPart,type BodyPartId } from './body-definition.ts';

/** Species anatomy is independent of both actor storage and graphical bones.
 * The medical kernel uses one immutable model, never a humanoid surrogate. */
export interface BodyModel {
  readonly kind:'human'|'hare'; readonly healthScale:number;
  readonly parts:readonly BodyPart[];
  readonly byId:Readonly<Record<BodyPartId,BodyPart>>;
  readonly index:Readonly<Record<BodyPartId,number>>;
  readonly parents:readonly number[]; readonly coverage:readonly number[];
}
function model(kind:BodyModel['kind'],healthScale:number,parts:readonly BodyPart[]):BodyModel {
  const byId=Object.freeze(Object.fromEntries(parts.map(p=>[p.id,p])) as Record<BodyPartId,BodyPart>);
  const index=Object.freeze(Object.fromEntries(parts.map((p,i)=>[p.id,i])) as Record<BodyPartId,number>);
  const parents=Object.freeze(parts.map(p=>p.parent===null?-1:index[p.parent]));
  const coverage=Object.freeze(parts.map(p=>{
    let v=p.coverage;for(let id=p.parent;id!==null;id=byId[id].parent)v*=byId[id].coverage;
    return v*(1-parts.filter(c=>c.parent===p.id).reduce((n,c)=>n+c.coverage,0));
  }));
  return Object.freeze({kind,healthScale,parts,byId,index,parents,coverage});
}
function hare():readonly BodyPart[] {
  const parts:BodyPart[]=[];
  const add=(id:BodyPartId,label:string,parent:BodyPartId|null,hp:number,coverage:number,inside=false,destroyable=true)=>{
    const ancestor=parent?parts.find(p=>p.id===parent):undefined;
    if(parent&&!ancestor)throw new Error('Missing anatomical parent');
    parts.push(Object.freeze({id,label,parent,hp:Math.ceil(hp*.4),coverage,groups:Object.freeze([]),
      depth:inside?'inside':ancestor?.depth??'outside',height:id==='neck'?'top':id.endsWith('-leg')?'bottom':ancestor?.height??'middle',destroyable,conceptual:false}));
  };
  add('torso','Corps',null,40,1);add('tail','Queue','torso',10,.07);
  add('spine','Colonne','torso',25,.03,true);add('stomach','Estomac','torso',20,.03,true);
  add('heart','Cœur','torso',15,.03,true);
  for(const side of ['left','right'] as const){add(`${side}-lung`,side==='left'?'Poumon gauche':'Poumon droit','torso',15,.03,true);add(`${side}-kidney`,side==='left'?'Rein gauche':'Rein droit','torso',15,.03,true);}
  add('liver','Foie','torso',20,.03,true);add('neck','Cou','torso',25,.2);add('head','Tête','neck',25,.75);
  add('skull','Crâne','head',25,.25,true,false);add('brain','Cerveau','skull',10,.7);
  for(const side of ['left','right'] as const){add(`${side}-eye`,side==='left'?'Œil gauche':'Œil droit','head',10,.12);add(`${side}-ear`,side==='left'?'Oreille gauche':'Oreille droite','head',12,.08);}
  add('nose','Nez','head',10,.1);add('jaw','Mâchoire','head',10,.1);
  for(const side of ['left','right'] as const)for(const end of ['front','rear'] as const){
    const name=`${end==='front'?'avant':'arrière'} ${side==='left'?'gauche':'droite'}`;
    add(`${side}-${end}-leg`,`Patte ${name}`,'torso',30,.07);add(`${side}-${end}-paw`,`Pied ${name}`,`${side}-${end}-leg`,10,.15);
  }
  return Object.freeze(parts);
}
export const HUMAN_MODEL=model('human',1,HUMAN_BODY);
export const HARE_MODEL=model('hare',.4,hare());
export const medicalModel=(record:{body?:'hare'}):BodyModel=>record.body==='hare'?HARE_MODEL:HUMAN_MODEL;
export const modelHasPart=(model:BodyModel,id:unknown):id is BodyPartId=>typeof id==='string'&&Object.hasOwn(model.byId,id);
