import type { BodyPart,LancerPartId,PikemanPartId,ScytherPartId } from './body-definition.ts';
import { compileBodyModel } from './body-model-compiler.ts';
import { SCYTHER_DEFINITION,LANCER_DEFINITION,PIKEMAN_DEFINITION,type MechanoidKind } from './mechanoid-definition.ts';

function scytherBody():readonly BodyPart[] {
  const parts:BodyPart[]=[];
  const add=(id:ScytherPartId,label:string,parent:ScytherPartId|null,hp:number,coverage:number,
    options:Partial<Pick<BodyPart,'depth'|'height'>>={})=>{
    const ancestor=parts.find(p=>p.id===parent);
    if(parent&&!ancestor)throw new Error(`Anatomical parent must precede ${id}`);
    parts.push(Object.freeze({id,label,parent,hp:Math.ceil(hp*SCYTHER_DEFINITION.healthScale),coverage,
      groups:Object.freeze([]),depth:ancestor?.depth??'outside',height:ancestor?.height??'middle',
      destroyable:true,conceptual:false,...options}));
  };
  add('scyther-thorax','Thorax',null,40,1);
  add('scyther-neck','Cou','scyther-thorax',30,.1,{height:'top'});
  add('scyther-head','Tête','scyther-neck',30,.8);
  add('scyther-brain','Cerveau mécanique','scyther-head',10,.1,{depth:'inside'});
  for(const side of ['left','right'] as const){
    const label=side==='left'?'gauche':'droit';
    add(`scyther-${side}-sight-sensor`,`Capteur visuel ${label}`,'scyther-head',10,.13);
    add(`scyther-${side}-hearing-sensor`,`Capteur auditif ${label}`,'scyther-head',10,.1);
  }
  add('scyther-smell-sensor','Capteur olfactif','scyther-head',10,.1);
  for(const side of ['left','right'] as const){
    const label=side==='left'?'gauche':'droite';
    add(`scyther-${side}-shoulder`,`Épaule ${label}`,'scyther-thorax',25,.17);
    add(`scyther-${side}-arm`,`Bras ${side==='left'?'gauche':'droit'}`,`scyther-${side}-shoulder`,30,.85);
    add(`scyther-${side}-blade`,`Lame ${label}`,`scyther-${side}-arm`,20,.3);
    add(`scyther-${side}-hand`,`Main ${label}`,`scyther-${side}-arm`,20,.2,{height:'bottom'});
    for(const [finger,name] of [['pinky','Auriculaire'],['middle-finger','Majeur'],['index-finger','Index'],['thumb','Pouce']] as const)
      add(`scyther-${side}-${finger}`,`${name} ${side==='left'?'gauche':'droit'}`,`scyther-${side}-hand`,7,.15);
  }
  for(const side of ['left','right'] as const){
    add(`scyther-${side}-leg`,`Jambe ${side==='left'?'gauche':'droite'}`,'scyther-thorax',30,.2,{height:'bottom'});
    add(`scyther-${side}-foot`,`Pied ${side==='left'?'gauche':'droit'}`,`scyther-${side}-leg`,20,.2);
  }
  add('scyther-reactor','Réacteur','scyther-thorax',20,.06,{depth:'inside'});
  for(const side of ['left','right'] as const)
    add(`scyther-${side}-fluid-reprocessor`,`Filtre de fluide ${side==='left'?'gauche':'droit'}`,'scyther-thorax',15,.04,{depth:'inside'});
  return Object.freeze(parts);
}
export const SCYTHER_BODY=scytherBody();
export const SCYTHER_MODEL=compileBodyModel('scyther',SCYTHER_DEFINITION.healthScale,SCYTHER_BODY);
export const SCYTHER_PART_IDS:readonly ScytherPartId[]=Object.freeze(SCYTHER_BODY.map(p=>p.id as ScytherPartId));

/** Same biped hierarchy without blades, with its own IDs and original base HP.
 * Never rescale the already-ceiled Scyther HP to manufacture another body. */
function lancerBody():readonly BodyPart[] {
  const baseHp=(id:BodyPart['id'])=>id==='scyther-thorax'?40:/-(neck|head|arm|leg)$/.test(id)?30:
    id.endsWith('-shoulder')?25:/-(hand|foot|reactor)$/.test(id)?20:id.endsWith('-fluid-reprocessor')?15:
    /-(pinky|middle-finger|index-finger|thumb)$/.test(id)?7:10;
  return Object.freeze(SCYTHER_BODY.filter(p=>!p.id.endsWith('-blade')).map(p=>{
    const id=p.id.replace('scyther-','lancer-') as LancerPartId;
    const parent=p.parent?.replace('scyther-','lancer-') as LancerPartId|undefined;
    const groups:BodyPart['groups']=/-(pinky|middle-finger|index-finger|thumb)$/.test(id)
      ?Object.freeze([id.startsWith('lancer-left-')?'left-hand':'right-hand'] as const):Object.freeze([]);
    return Object.freeze({...p,id,parent:parent??null,hp:Math.ceil(baseHp(p.id)*LANCER_DEFINITION.healthScale),groups});
  }));
}
function pikemanBody():readonly BodyPart[] {
  const parts:BodyPart[]=[];
  const add=(id:PikemanPartId,label:string,parent:PikemanPartId|null,hp:number,coverage:number,
    options:Partial<Pick<BodyPart,'depth'|'height'|'groups'>>={})=>{
    const ancestor=parts.find(p=>p.id===parent);
    if(parent&&!ancestor)throw Error(`Anatomical parent must precede ${id}`);
    parts.push(Object.freeze({id,label,parent,hp:Math.ceil(hp*PIKEMAN_DEFINITION.healthScale),coverage,
      groups:Object.freeze([]),depth:ancestor?.depth??'outside',height:ancestor?.height??'middle',destroyable:true,conceptual:false,...options}));
  };
  add('pikeman-thorax','Thorax manipulateur',null,40,1);
  add('pikeman-neck','Cou','pikeman-thorax',30,.1,{height:'top'});
  add('pikeman-head','Tête','pikeman-neck',30,.8);
  add('pikeman-brain','Cerveau mécanique','pikeman-head',10,.1,{depth:'inside'});
  for(const side of ['left','right'] as const){
    const label=side==='left'?'gauche':'droit';
    add(`pikeman-${side}-sight-sensor`,`Capteur visuel ${label}`,'pikeman-head',10,.2);
    add(`pikeman-${side}-hearing-sensor`,`Capteur auditif ${label}`,'pikeman-head',10,.05);
  }
  add('pikeman-smell-sensor','Capteur olfactif','pikeman-head',10,.06);
  for(const end of ['front','rear'] as const)for(const side of ['left','right'] as const){
    const name=`${end==='front'?'avant':'arrière'} ${side==='left'?'gauche':'droit'}`;
    add(`pikeman-${side}-${end}-leg`,`Jambe ${name}`,'pikeman-thorax',30,.18,{height:'bottom'});
    add(`pikeman-${side}-${end}-foot`,`Pied ${name}`,`pikeman-${side}-${end}-leg`,20,.5,
      {groups:Object.freeze(end==='front'?[side==='left'?'front-left-leg' as const:'front-right-leg' as const]:[])});
  }
  add('pikeman-reactor','Réacteur','pikeman-thorax',20,.06,{depth:'inside'});
  for(const side of ['left','right'] as const)
    add(`pikeman-${side}-fluid-reprocessor`,`Filtre de fluide ${side==='left'?'gauche':'droit'}`,'pikeman-thorax',15,.04,{depth:'inside'});
  return Object.freeze(parts);
}
export const LANCER_BODY=lancerBody();
export const LANCER_MODEL=compileBodyModel('lancer',LANCER_DEFINITION.healthScale,LANCER_BODY);
export const LANCER_PART_IDS:readonly LancerPartId[]=Object.freeze(LANCER_BODY.map(p=>p.id as LancerPartId));
export const PIKEMAN_BODY=pikemanBody();
export const PIKEMAN_MODEL=compileBodyModel('pikeman',PIKEMAN_DEFINITION.healthScale,PIKEMAN_BODY);
export const PIKEMAN_PART_IDS:readonly PikemanPartId[]=Object.freeze(PIKEMAN_BODY.map(p=>p.id as PikemanPartId));
const MODELS=Object.freeze({scyther:SCYTHER_MODEL,lancer:LANCER_MODEL,pikeman:PIKEMAN_MODEL});
export const mechanoidBodyModel=(kind:MechanoidKind)=>MODELS[kind];
