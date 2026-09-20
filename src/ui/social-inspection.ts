import { opinionCauses,opinionOf,SOCIAL_LABELS,socialImpact } from '../sim/social-state';
import { learningFactor } from '../sim/skills';
import { isColonist } from '../sim/affiliation';
import { TICKS_PER_DAY,type Pawn,type World } from '../sim/types';

export function createSocialInspection(panel:HTMLElement,onOpen:()=>void):void {
  const details=document.createElement('details');details.id='social-inspection';
  details.addEventListener('toggle',()=>{if(details.open)onOpen();});
  const title=document.createElement('summary');title.textContent='Social · opinions';
  const skill=document.createElement('p');skill.id='social-skill';
  const last=document.createElement('p');last.id='social-last';
  const list=document.createElement('ul');list.id='social-opinions';
  details.append(title,skill,last,list);const anchor=panel.querySelector('#manage-work');if(anchor)anchor.before(details);else panel.append(details);
}
export function updateSocialInspection(panel:HTMLElement,world:World,pawn:Pawn):void {
  if(!panel.querySelector<HTMLDetailsElement>('#social-inspection')?.open)return;
  const skill=pawn.skills.social??{level:0,xp:0,dailyXp:0,passion:0};
  panel.querySelector('#social-skill')!.textContent=`Social ${skill.level}/20 · ${(skill.xp/1000).toFixed(1)} XP · Impact ${Math.round(socialImpact(pawn)*100)} % · Apprentissage ${Math.round(learningFactor(skill,pawn)*100)} %`;
  const last=pawn.social?.last,other=world.pawns.find(p=>p.id===last?.otherId);
  panel.querySelector('#social-last')!.textContent=last?`${SOCIAL_LABELS[last.kind]} ${last.initiated?'engagé':'reçu'} avec ${other?.name??'une personne absente'}, il y a ${((world.tick-last.tick)/(TICKS_PER_DAY/24)).toFixed(1)} h.`:'Aucun échange vécu pour le moment. Les activités à proximité permettent de faire connaissance.';
  const rows=world.pawns.filter(p=>p.id!==pawn.id&&(isColonist(p)||pawn.social?.memories.some(m=>m.otherId===p.id))).map(p=>{
    const causes=opinionCauses(pawn,p.id,world.tick);
    return {id:p.id,text:`${p.name}${p.state==='dead'?' (décédé)':''} : ${opinionOf(pawn,p.id,world.tick)>0?'+':''}${opinionOf(pawn,p.id,world.tick)} · son opinion de ${pawn.name} : ${opinionOf(p,pawn.id,world.tick)}`,causes:causes.map(c=>`${SOCIAL_LABELS[c.kind]}${c.count>1?` ×${c.count}`:''} : +${c.value}${c.kind==='chitchat'?` · décroissance dans ${Math.ceil((c.nextChange-world.tick)/250)} h`:` · première expiration dans ${Math.ceil((c.nextChange-world.tick)/250)} h (atténuation en fin de souvenir)`}`).join(' ; ')||'Pas de souvenir social actif.'};
  });
  const list=panel.querySelector<HTMLElement>('#social-opinions')!,signature=JSON.stringify(rows);if(list.dataset.signature===signature)return;list.dataset.signature=signature;
  list.replaceChildren(...rows.map(row=>{const li=document.createElement('li');li.dataset.socialPawn=String(row.id);const label=document.createElement('strong'),cause=document.createElement('p');label.textContent=row.text;cause.textContent=row.causes;li.append(label,cause);return li;}));
}
