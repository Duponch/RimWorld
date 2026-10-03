import { opinionCauses,opinionOf,SOCIAL_LABELS } from '../sim/social-state';
import { isColonist } from '../sim/affiliation';
import { TICKS_PER_DAY,type Pawn,type World } from '../sim/types';
import { pawnJournalRows } from './journal-inspection';
import { setTooltip } from './tooltip';

export interface SocialOpinionRow {
  id:number;
  name:string;
  own:number;
  reciprocal:number;
  causes:string;
}

/** Known people remain visible with a neutral opinion. Relationships such as
 * lover and rival are absent from the simulation and cannot be inferred here. */
export function socialOpinionRows(world:World,pawn:Pawn):SocialOpinionRow[] {
  return world.pawns.filter(other=>other.id!==pawn.id&&(isColonist(other)||pawn.social?.memories.some(m=>m.otherId===other.id)))
    .map(other=>({
      id:other.id,
      name:`${other.name}${other.state==='dead'?' (décédé)':''}`,
      own:opinionOf(pawn,other.id,world.tick),
      reciprocal:opinionOf(other,pawn.id,world.tick),
      causes:opinionCauses(pawn,other.id,world.tick).map(c=>`${SOCIAL_LABELS[c.kind]}${c.count>1?` ×${c.count}`:''} : ${c.value>0?'+':''}${c.value}`).join(' · '),
    })).sort((a,b)=>b.own-a.own||a.name.localeCompare(b.name,'fr'));
}

export function socialLastText(world:World,pawn:Pawn):string {
  const last=pawn.social?.last;if(!last)return 'Aucun échange récent.';
  const other=world.pawns.find(p=>p.id===last.otherId),name=other?.name??'une personne absente';
  const exchange=last.kind==='slight'?`${last.initiated?'A vexé':'A été vexé par'} ${name}`:
    last.kind==='insult'?`${last.initiated?'A insulté':'A été insulté par'} ${name}`:
    last.kind==='kind-words'?`${last.initiated?'A adressé des mots gentils à':'A reçu des mots gentils de'} ${name}`:
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
  const rows=socialOpinionRows(world,pawn),body=panel.querySelector<HTMLElement>('#social-opinions tbody')!,reciprocalCauses=rows.map(row=>opinionCauses(world.pawns.find(person=>person.id===row.id)!,pawn.id,world.tick)),signature=JSON.stringify([rows,reciprocalCauses]);
  if(body.dataset.signature===signature)return;body.dataset.signature=signature;
  body.replaceChildren(...rows.map((row,index)=>{
    const tr=document.createElement('tr');tr.dataset.socialPawn=String(row.id);
    const name=document.createElement('th');name.scope='row';name.textContent=row.name;
    const own=document.createElement('td');own.textContent=`${row.own>0?'+':''}${row.own}`;own.dataset.sign=row.own>0?'positive':row.own<0?'negative':'neutral';
    const reciprocal=document.createElement('td');reciprocal.textContent=`(${row.reciprocal>0?'+':''}${row.reciprocal})`;reciprocal.dataset.sign=row.reciprocal>0?'positive':row.reciprocal<0?'negative':'neutral';
    name.tabIndex=0;setTooltip(name,{title:row.name,body:'Opinions dirigées : chaque personne peut porter un avis différent sur l’autre.',rows:[{label:'Opinion',value:`${row.own>0?'+':''}${row.own}`},{label:'Avis réciproque',value:`${row.reciprocal>0?'+':''}${row.reciprocal}`}]});
    own.tabIndex=0;setTooltip(own,{title:`Opinion de ${pawn.name}`,body:row.causes||'Aucun souvenir social modifiant cette opinion.'});
    reciprocal.tabIndex=0;const other=world.pawns.find(person=>person.id===row.id)!;
    setTooltip(reciprocal,{title:`Opinion de ${other.name}`,body:reciprocalCauses[index]!.map(c=>`${SOCIAL_LABELS[c.kind]}${c.count>1?` ×${c.count}`:''} : ${c.value>0?'+':''}${c.value}`).join('\n')||'Aucun souvenir social modifiant cette opinion.'});
    tr.append(name,own,reciprocal);return tr;
  }));
}
