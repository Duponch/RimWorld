import { opinionCauses,opinionOf,SOCIAL_LABELS } from '../sim/social-state';
import { isColonist } from '../sim/affiliation';
import { TICKS_PER_DAY,type Pawn,type World } from '../sim/types';
import { pawnJournalRows } from './journal-inspection';
import { setTooltip } from './tooltip';
import { captureRelationshipPeople } from '../sim/relationship-namespace';
import { relationshipIndex } from '../sim/relationship-runtime';
import { RELATIONSHIP_LABELS,RELATIONSHIP_STATUS_LABELS } from './relationship-inspection';

export interface SocialOpinionRow {
  id:number;
  name:string;
  own:number|null;
  reciprocal:number|null;
  causes:string;
  reciprocalCauses:string;
  relationships:string;
  status:string;
}

const signed=(value:number|null):string=>value===null?'—':`${value>0?'+':''}${Number(value.toFixed(1))}`;
const causesText=(pawn:Pawn,otherId:number,world:World):string=>opinionCauses(pawn,otherId,world.tick,world).map(c=>{
  return `${c.label}${c.count>1?` ×${c.count}`:''} : ${signed(c.value)}`;
}).join(' · ');

/** Directed opinions are current only for living map owners. Frozen archives
 * retain identity and links, without an invented reciprocal zero. */
export function socialOpinionRows(world:World,pawn:Pawn):SocialOpinionRow[] {
  const people=captureRelationshipPeople(world),index=relationshipIndex(world),mapPeople=new Map(world.pawns.map(p=>[p.id,p]));
  const remembered=new Set([...pawn.social?.memories??[],...pawn.romanceMemories??[],...pawn.familyBereavement??[]].map(m=>m.otherId));
  return [...people.values()].flatMap(person=>{
    if(person.id===pawn.id)return [];
    const other=mapPeople.get(person.id),kinds=index.kinds(pawn.id,person.id);
    if(!kinds.length&&!remembered.has(person.id)&&(!other||!isColonist(other)))return [];
    const current=person.status==='present'&&other?.state!=='dead',alive=pawn.state!=='dead';
    return [{id:person.id,name:`${person.name}${person.status==='dead'?' (décédé)':person.status==='away'?' (en voyage)':person.status==='departed'?' (absent)':''}`,
      own:alive?opinionOf(pawn,person.id,world.tick,world):null,reciprocal:current&&other?opinionOf(other,pawn.id,world.tick,world):null,
      causes:alive?causesText(pawn,person.id,world):'Une personne décédée ne porte pas d’avis actuel.',
      reciprocalCauses:current&&other?causesText(other,pawn.id,world):'Avis actuel indisponible : le dossier est absent ou la personne est décédée.',
      relationships:kinds.map(kind=>RELATIONSHIP_LABELS[kind]).join(' · '),status:RELATIONSHIP_STATUS_LABELS[person.status]}];
  }).sort((a,b)=>(b.own??-101)-(a.own??-101)||a.name.localeCompare(b.name,'fr'));
}

export function socialLastText(world:World,pawn:Pawn):string {
  const last=pawn.social?.last;if(!last)return 'Aucun échange récent.';
  const name=captureRelationshipPeople(world).get(last.otherId)?.name??'une personne non renseignée';
  const exchange=last.kind==='slight'?`${last.initiated?'A vexé':'A été vexé par'} ${name}`:
    last.kind==='insult'?`${last.initiated?'A insulté':'A été insulté par'} ${name}`:
    last.kind==='kind-words'?`${last.initiated?'A adressé des mots gentils à':'A reçu des mots gentils de'} ${name}`:
    last.kind==='romance-attempt'?`${last.initiated?'A tenté un rapprochement amoureux avec':'A reçu une tentative de rapprochement amoureux de'} ${name}`:
    last.kind==='breakup'?`${last.initiated?'A rompu avec':'A subi une rupture avec'} ${name}`:
    `${SOCIAL_LABELS[last.kind]} ${last.initiated?'engagé':'reçu'} avec ${name}`;
  return `${exchange} · il y a ${((world.tick-last.tick)/(TICKS_PER_DAY/24)).toFixed(1)} h`;
}

export function createSocialInspection(panel:HTMLElement,onOpen:()=>void):void {
  const details=document.createElement('details');details.id='social-inspection';
  details.addEventListener('toggle',()=>{if(details.open)onOpen();});
  const title=document.createElement('summary');title.textContent='Social';
  const table=document.createElement('table');table.id='social-opinions';
  table.innerHTML='<thead><tr><th scope="col">Personne</th><th scope="col">Opinion</th><th scope="col">Avis réciproque</th></tr></thead><tbody></tbody>';
  const lastTitle=document.createElement('h4');lastTitle.textContent='Dernier échange';
  const last=document.createElement('p');last.id='social-last';
  const history=document.createElement('ol');history.id='social-history';
  details.append(title,table,lastTitle,last,history);const anchor=panel.querySelector('#manage-work');if(anchor)anchor.before(details);else panel.append(details);
}

export function updateSocialInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  if(!panel.querySelector<HTMLDetailsElement>('#social-inspection')?.open)return;
  panel.querySelector('#social-last')!.textContent=socialLastText(world,pawn);
  const history=panel.querySelector<HTMLElement>('#social-history')!,events=pawnJournalRows(world,pawn).filter(row=>row.kind==='social').slice(0,12),historySignature=JSON.stringify(events);
  if(history.dataset.signature!==historySignature){history.dataset.signature=historySignature;history.replaceChildren(...events.map(event=>{const li=document.createElement('li');li.textContent=event.text;li.tabIndex=0;return li;}));}
  events.forEach((event,index)=>setTooltip(history.children[index] as HTMLElement,{title:'Interaction sociale',body:`Il y a ${((world.tick-event.tick)/(TICKS_PER_DAY/24)).toFixed(1)} h.\n${event.text}`}));
  const rows=socialOpinionRows(world,pawn),body=panel.querySelector<HTMLElement>('#social-opinions tbody')!,signature=JSON.stringify(rows);
  if(body.dataset.signature===signature)return;body.dataset.signature=signature;
  const focused=document.activeElement instanceof HTMLElement&&body.contains(document.activeElement)?document.activeElement:null;
  const ids=new Set(rows.map(row=>String(row.id)));
  for(const node of body.querySelectorAll<HTMLElement>('[data-social-pawn]'))if(!ids.has(node.dataset.socialPawn!))node.remove();
  rows.forEach((row,index)=>{
    let tr=body.querySelector<HTMLTableRowElement>(`[data-social-pawn="${row.id}"]`);
    if(!tr){tr=document.createElement('tr');tr.dataset.socialPawn=String(row.id);
      const name=document.createElement('th');name.scope='row';const own=document.createElement('td'),reciprocal=document.createElement('td');
      for(const node of [name,own,reciprocal])node.tabIndex=0;tr.append(name,own,reciprocal);
    }
    const [name,own,reciprocal]=Array.from(tr.children) as HTMLElement[];
    name!.textContent=`${row.name}${row.relationships?` · ${row.relationships}`:''}`;
    own!.textContent=signed(row.own);own!.dataset.sign=(row.own??0)>0?'positive':(row.own??0)<0?'negative':'neutral';
    reciprocal!.textContent=row.reciprocal===null?'—':`(${signed(row.reciprocal)})`;reciprocal!.dataset.sign=(row.reciprocal??0)>0?'positive':(row.reciprocal??0)<0?'negative':'neutral';
    setTooltip(name!,{title:row.name,body:'Opinions dirigées : chaque personne peut porter un avis différent sur l’autre.',rows:[{label:'Lien',value:row.relationships||'Non renseigné'},{label:'Situation',value:row.status},{label:'Opinion',value:signed(row.own)},{label:'Avis réciproque',value:row.reciprocal===null?'Non disponible':signed(row.reciprocal)}]});
    setTooltip(own!,{title:`Opinion de ${pawn.name}`,body:row.causes||'Aucun lien ni souvenir modifiant cette opinion.'});
    setTooltip(reciprocal!,{title:`Avis réciproque de ${row.name}`,body:row.reciprocalCauses||'Aucun lien ni souvenir modifiant cette opinion.'});
    if(body.children[index]!==tr)body.insertBefore(tr,body.children[index]??null);
  });
  if(focused&&focused.isConnected&&document.activeElement!==focused)focused.focus({preventScroll:true});
  else if(focused&&!focused.isConnected)body.querySelector<HTMLElement>('th')?.focus({preventScroll:true});
}
