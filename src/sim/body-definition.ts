/** Natural adult human body. Rules/provenance: docs/research/body-reference.md.
 * These IDs describe anatomy, not GPU bones, item IDs or mesh names. */
type Side = 'left' | 'right';
type PairedPart = 'eye' | 'ear' | 'lung' | 'kidney' | 'shoulder' | 'clavicle' | 'arm' | 'humerus' | 'radius' | 'hand'
  | 'pinky' | 'ring-finger' | 'middle-finger' | 'index-finger' | 'thumb'
  | 'leg' | 'femur' | 'tibia' | 'foot' | 'little-toe' | 'fourth-toe' | 'middle-toe' | 'second-toe' | 'big-toe';
export type BodyPartId = 'torso' | 'ribcage' | 'sternum' | 'pelvis' | 'spine' | 'stomach' | 'heart' | 'liver'
  | 'neck' | 'head' | 'skull' | 'brain' | 'nose' | 'jaw' | 'tongue' | 'waist' | `${Side}-${PairedPart}`
  | 'tail' | `${Side}-${'front'|'rear'}-${'leg'|'paw'}`;
export type BodyGroup = 'torso' | 'neck' | 'upper-head' | 'full-head' | 'eyes' | 'mouth' | 'teeth'
  | 'shoulders' | 'arms' | 'hands' | 'left-hand' | 'right-hand' | 'waist' | 'legs' | 'feet';
export interface BodyPart {
  readonly id:BodyPartId;
  readonly label:string;
  readonly parent:BodyPartId|null;
  readonly hp:number;
  readonly depth:'outside'|'inside';
  readonly height:'top'|'middle'|'bottom';
  /** Fraction of parent including descendants, not an unconditional hit chance. */
  readonly coverage:number;
  readonly groups:readonly BodyGroup[];
  readonly destroyable:boolean;
  readonly conceptual:boolean;
}

function adultHuman():readonly BodyPart[] {
  const parts:BodyPart[]=[];
  const add=(id:BodyPartId,label:string,parent:BodyPartId|null,hp:number,coverage:number,groups:BodyGroup[],
    options:Partial<Pick<BodyPart,'depth'|'height'|'destroyable'|'conceptual'>>={})=>{
    const ancestor=parts.find(p=>p.id===parent);
    if(parent&&!ancestor)throw new Error(`Anatomical parent must precede ${id}`);
    parts.push(Object.freeze({id,label,parent,hp,coverage,groups:Object.freeze(groups),depth:ancestor?.depth??'outside',height:ancestor?.height??'middle',destroyable:true,conceptual:false,...options}));
  };
  add('torso','Torse',null,40,1,['torso']);
  add('ribcage','Cage thoracique','torso',30,.036,['torso'],{depth:'inside',destroyable:false});
  add('sternum','Sternum','torso',20,.015,['torso'],{depth:'inside',destroyable:false});
  add('pelvis','Bassin','torso',25,.025,['torso'],{depth:'inside',height:'bottom',destroyable:false});
  add('spine','Colonne vertébrale','torso',25,.025,['torso'],{depth:'inside'});
  add('stomach','Estomac','torso',20,.025,['torso'],{depth:'inside'});
  add('heart','Cœur','torso',15,.020,['torso'],{depth:'inside'});
  for(const side of ['left','right'] as const) {
    const suffix=side==='left'?'gauche':'droit';
    add(`${side}-lung`,`Poumon ${suffix}`,'torso',15,.025,['torso'],{depth:'inside'});
    add(`${side}-kidney`,`Rein ${suffix}`,'torso',15,.017,['torso'],{depth:'inside'});
  }
  add('liver','Foie','torso',20,.025,['torso'],{depth:'inside'});
  add('neck','Cou','torso',25,.075,['neck'],{height:'top'});
  add('head','Tête','neck',25,.8,['upper-head','full-head']);
  add('skull','Crâne','head',25,.18,['upper-head','full-head','eyes'],{depth:'inside',destroyable:false});
  add('brain','Cerveau','skull',10,.8,['upper-head','full-head','eyes']);
  for(const side of ['left','right'] as const) {
    add(`${side}-eye`,side==='left'?'Œil gauche':'Œil droit','head',10,.07,['full-head','eyes']);
    add(`${side}-ear`,side==='left'?'Oreille gauche':'Oreille droite','head',12,.07,['upper-head','full-head']);
  }
  add('nose','Nez','head',10,.1,['full-head']);
  add('jaw','Mâchoire','head',20,.15,['teeth','full-head','mouth']);
  add('tongue','Langue','jaw',10,.001,['full-head','mouth']);
  for(const side of ['left','right'] as const) {
    const suffix=side==='left'?'gauche':'droit', feminine=side==='left'?'gauche':'droite';
    add(`${side}-shoulder`,`Épaule ${feminine}`,'torso',30,.12,['shoulders']);
    add(`${side}-clavicle`,`Clavicule ${feminine}`,`${side}-shoulder`,25,.09,['torso'],{depth:'inside',height:'top',destroyable:false});
    add(`${side}-arm`,`Bras ${suffix}`,`${side}-shoulder`,30,.77,['arms']);
    add(`${side}-humerus`,`Humérus ${suffix}`,`${side}-arm`,25,.1,['arms'],{depth:'inside'});
    add(`${side}-radius`,`Radius ${suffix}`,`${side}-arm`,20,.1,['arms'],{depth:'inside'});
    add(`${side}-hand`,`Main ${feminine}`,`${side}-arm`,20,.14,['hands'],{height:'bottom'});
    const fingers=[['pinky','Auriculaire',.06],['ring-finger','Annulaire',.07],['middle-finger','Majeur',.08],['index-finger','Index',.07],['thumb','Pouce',.08]] as const;
    for(const [id,label,coverage] of fingers)add(`${side}-${id}`,`${label} ${suffix}`,`${side}-hand`,8,coverage,['hands',`${side}-hand`]);
  }
  add('waist','Emplacement utilitaire','torso',10,0,['waist'],{height:'bottom',conceptual:true});
  for(const side of ['left','right'] as const) {
    const suffix=side==='left'?'gauche':'droit';
    add(`${side}-leg`,side==='left'?'Jambe gauche':'Jambe droite','torso',30,.14,['legs'],{height:'bottom'});
    add(`${side}-femur`,`Fémur ${suffix}`,`${side}-leg`,25,.1,['legs'],{depth:'inside'});
    add(`${side}-tibia`,`Tibia ${suffix}`,`${side}-leg`,25,.1,['legs'],{depth:'inside'});
    add(`${side}-foot`,`Pied ${suffix}`,`${side}-leg`,25,.1,['feet']);
    const toes=[['little-toe','Petit orteil',.06],['fourth-toe','Quatrième orteil',.07],['middle-toe','Troisième orteil',.08],['second-toe','Deuxième orteil',.09],['big-toe','Gros orteil',.09]] as const;
    for(const [id,label,coverage] of toes)add(`${side}-${id}`,`${label} ${suffix}`,`${side}-foot`,8,coverage,['feet']);
  }
  return Object.freeze(parts);
}
export const HUMAN_BODY = adultHuman();
export const BODY_PARTS:Readonly<Record<BodyPartId,BodyPart>> = Object.freeze(Object.fromEntries(HUMAN_BODY.map(p=>[p.id,p])) as Record<BodyPartId,BodyPart>);
export const bodyPartExists=(id:unknown):id is BodyPartId=>typeof id==='string'&&Object.hasOwn(BODY_PARTS,id);

/** Precomputed immutable indices; no hierarchy walk per frame or per pawn. */
export const BODY_INDEX:Readonly<Record<BodyPartId,number>>=Object.freeze(Object.fromEntries(HUMAN_BODY.map((p,i)=>[p.id,i])) as Record<BodyPartId,number>);
export const BODY_PARENTS:readonly number[]=Object.freeze(HUMAN_BODY.map(p=>p.parent===null?-1:BODY_INDEX[p.parent]));
export const BODY_COVERAGE:readonly number[]=Object.freeze(HUMAN_BODY.map(p=>{
  let absolute=p.coverage;
  for(let ancestor=p.parent;ancestor!==null;ancestor=BODY_PARTS[ancestor].parent)absolute*=BODY_PARTS[ancestor].coverage;
  return absolute*(1-HUMAN_BODY.filter(child=>child.parent===p.id).reduce((sum,child)=>sum+child.coverage,0));
}));
