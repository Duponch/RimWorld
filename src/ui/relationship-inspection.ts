import { captureRelationshipPeople } from '../sim/relationship-namespace';
import { relationshipIndex } from '../sim/relationship-runtime';
import type { OfferedRelationship,RelationshipPerson,RelationshipViewKind } from '../sim/relationship-state';
import type { Pawn,World } from '../sim/types';
import { setTooltip } from './tooltip';

export const RELATIONSHIP_LABELS:Readonly<Record<RelationshipViewKind,string>>={
  parent:'Parent',child:'Enfant',sibling:'Fratrie',lover:'Partenaire',spouse:'Partenaire (mariage)',
  'ex-lover':'Ancien partenaire','ex-spouse':'Ancien partenaire (mariage)',
};
export const RELATIONSHIP_STATUS_LABELS:Readonly<Record<RelationshipPerson['status'],string>>={
  present:'Présent',away:'En voyage',departed:'Absent',dead:'Décédé',
};
export interface RelationshipInspectionRow {id:number;name:string;status:RelationshipPerson['status'];kinds:readonly RelationshipViewKind[]}

/** Resolve only registered humans. A frozen departure never becomes a present
 * Pawn and an absent name never becomes a death or an invented biography. */
export function relationshipInspectionRows(world:World,pawn:Pick<Pawn,'id'>):RelationshipInspectionRow[]{
  if(!world.relationships?.links.length)return [];
  const people=captureRelationshipPeople(world),index=relationshipIndex(world);
  return [...people.values()].flatMap(person=>{
    if(person.id===pawn.id)return [];
    const kinds=index.kinds(pawn.id,person.id);
    return kinds.length?[{id:person.id,name:person.name,status:person.status,kinds}]:[];
  }).sort((a,b)=>a.id-b.id);
}

export function offeredRelationshipText(world:World,relationship:OfferedRelationship|undefined):string{
  if(!relationship)return '';
  const person=captureRelationshipPeople(world).get(relationship.otherId);
  return `Lien annoncé : ${RELATIONSHIP_LABELS[relationship.kind]} · ${person?.name??'Personne non renseignée'}${person?` · ${RELATIONSHIP_STATUS_LABELS[person.status]}`:''}`;
}

export function updateOfferedRelationship(node:HTMLElement,world:World,relationship:OfferedRelationship|undefined,candidate:string,admitted=false):void{
  node.hidden=!relationship;node.textContent=offeredRelationshipText(world,relationship);
  if(!relationship)return;
  const person=captureRelationshipPeople(world).get(relationship.otherId),name=person?.name??'Personne non renseignée';
  const direction=relationship.kind==='parent'?`${name} est le parent de ${candidate}.`:relationship.kind==='child'?`${name} est l’enfant de ${candidate}.`:`${candidate} et ${name} appartiennent à la même fratrie.`;
  setTooltip(node,{title:'Lien annoncé',body:`${direction} ${admitted?'La personne a réellement rejoint la colonie ; le lien est enregistré.':'Le lien sera enregistré après l’entrée réelle de la personne accueillie.'} Le statut indique la situation actuelle du proche.`});
}

export function createRelationshipInspection(parent:HTMLElement):void{
  const section=document.createElement('section');section.className='relationship-inspection';section.dataset.relationshipInspection='';
  const title=document.createElement('h4');title.textContent='Liens connus';
  const empty=document.createElement('p');empty.dataset.relationshipEmpty='';empty.textContent='Aucun lien familial ou de couple renseigné.';
  const list=document.createElement('ul');list.dataset.relationshipList='';
  section.append(title,empty,list);parent.append(section);
}

export function updateRelationshipInspection(parent:HTMLElement,world:World,pawn:Pawn):void{
  const section=parent.querySelector<HTMLElement>('[data-relationship-inspection]');if(!section)return;
  const rows=relationshipInspectionRows(world,pawn),list=section.querySelector<HTMLElement>('[data-relationship-list]')!;
  section.querySelector<HTMLElement>('[data-relationship-empty]')!.hidden=!!rows.length;list.hidden=!rows.length;
  const ids=new Set(rows.map(row=>String(row.id)));
  for(const node of list.querySelectorAll<HTMLElement>('[data-related-person]'))if(!ids.has(node.dataset.relatedPerson!))node.remove();
  for(const row of rows){
    let node=list.querySelector<HTMLElement>(`[data-related-person="${row.id}"]`);
    if(!node){node=document.createElement('li');node.dataset.relatedPerson=String(row.id);node.tabIndex=0;list.append(node);}
    const labels=row.kinds.map(kind=>RELATIONSHIP_LABELS[kind]).join(' · '),status=RELATIONSHIP_STATUS_LABELS[row.status];
    node.textContent=`${labels} : ${row.name} · ${status}`;
    setTooltip(node,{title:row.name,body:'Ces liens proviennent du dossier enregistré. L’absence ne signifie pas un décès. Le portrait, le nom et une opinion ne créent aucun lien.',rows:[{label:'Lien',value:labels},{label:'Situation',value:status}]});
  }
}
