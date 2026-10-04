import { TICKS_PER_DAY,type World } from '../sim/types';

function timeLeft(ticks:number):string {
  const minutes=Math.ceil(Math.max(0,ticks)*1440/TICKS_PER_DAY);
  return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h${minutes%60?` ${minutes%60} min`:''}`;
}

/** Confirmed snapshot projection: no predicted power state or wall-clock timer. */
export function createSolarFlareUI():{update:(world:World)=>void} {
  const letter=document.createElement('button');letter.id='solar-flare-letter';letter.className='arrival-letter';letter.type='button';
  const dialog=document.createElement('dialog');dialog.id='solar-flare-dialog';dialog.className='help-dialog';
  const title=document.createElement('h2'),body=document.createElement('p'),close=document.createElement('button');
  close.type='button';close.textContent='Fermer';close.onclick=()=>dialog.close();
  dialog.append(title,body,close);document.body.append(dialog);letter.onclick=()=>dialog.showModal();
  let previous='';
  return {update(world){
    const state=world.worldIncidents,active=state?.active;
    const endedAt=state?.lastEndCore===undefined?undefined:Math.floor(state.lastEndCore/10)+1;
    const recent=!active&&endedAt!==undefined&&world.tick>=endedAt&&world.tick-endedAt<600;
    const signature=`${world.tick}:${active?.start??''}:${active?.endCore??''}:${endedAt??''}`;
    if(signature===previous)return;previous=signature;
    if(!active&&!recent){letter.remove();if(dialog.open)dialog.close();return;}
    if(active){
      title.textContent='Éruption solaire';letter.textContent=`Éruption solaire · ${timeLeft(Math.floor(active.endCore/10)+1-world.tick)}`;
      body.textContent='Les appareils électriques s’arrêtent progressivement. Une batterie conserve sa charge mais ne peut ni alimenter le réseau ni se recharger pendant la condition ; son autodécharge continue. Les générateurs restent actifs et brûlent leur bois : demander leur arrêt exige le contact d’un colon. Surveillez le froid, la lumière, les cultures sous toit et les ateliers. Utilisez les appareils au bois et la lumière du jour ; le refroidisseur passif ne remplace pas un congélateur. La couture électrique peut continuer manuellement à vitesse réduite. Les interrupteurs et connexions sont conservés. Aucun toit ne protège de cette condition et la météo reste indépendante.';
    }else{
      title.textContent='Fin de l’éruption solaire';letter.textContent='Éruption solaire terminée';
      body.textContent=`La condition est terminée depuis ${timeLeft(world.tick-endedAt!)}. Les appareils redémarrent selon leurs cadences, leur alimentation et leurs interrupteurs réels. Les batteries peuvent à nouveau charger et décharger. Vérifiez le combustible, les pannes, le froid et les cultures : la fin ne rend pas la croissance ou la conservation perdues.`;
    }
    const alerts=document.getElementById('alerts');if(alerts&&letter.parentElement!==alerts)alerts.append(letter);
  }};
}
