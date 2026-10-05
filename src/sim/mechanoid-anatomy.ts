import type { BodyPart,ScytherPartId } from './body-definition.ts';
import { compileBodyModel } from './body-model-compiler.ts';
import { SCYTHER_DEFINITION } from './mechanoid-definition.ts';

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
