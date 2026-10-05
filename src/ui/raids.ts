import type { Command,World } from '../sim/types';

export function createRaidUI(send:(c:Command)=>Promise<unknown>,focus:(id:number)=>void):{update:(w:World)=>void} {
  const letter=document.createElement('button');letter.id='raid-letter';letter.className='arrival-letter';
  const dialog=document.createElement('dialog');dialog.id='raid-dialog';dialog.className='help-dialog';
  const title=document.createElement('h2'),body=document.createElement('p'),locate=document.createElement('button'),close=document.createElement('button');
  locate.id='locate-raid';locate.textContent='Voir les assaillants';close.textContent='Fermer';close.onclick=()=>dialog.close();
  dialog.append(title,body,locate,close);document.body.append(dialog);
  let world:World|undefined,busy=false,mechBusy=false;
  const target=()=>world?.mechanoids?.find(m=>m.raid?.group===world?.raids?.mechActive?.id&&m.state!=='dead'&&m.state!=='downed')??world?.pawns.find(p=>p.raid&&p.state!=='dead'&&p.state!=='downed');
  letter.onclick=()=>dialog.showModal();locate.onclick=()=>{const p=target();if(p)focus(p.id);dialog.close();};
  const enable=document.getElementById('enable-raids') as HTMLButtonElement;
  enable.title='Calendrier provisoire : première attaque dans 3,5 à 4 jours, puis 6 à 8 jours après chaque issue.';
  enable.onclick=()=>{if(busy)return;busy=true;enable.disabled=true;void send({type:'enable-raids'}).catch(e=>enable.title=String(e)).finally(()=>{busy=false;enable.disabled=false;});};
  const enableMech=document.getElementById('enable-mech-raids') as HTMLButtonElement|null;
  if(enableMech)enableMech.onclick=()=>{if(mechBusy)return;mechBusy=true;enableMech.disabled=true;void send({type:'enable-mech-raids'}).catch(e=>enableMech.title=String(e)).finally(()=>{mechBusy=false;enableMech.disabled=false;});};
  return {update(w){world=w;enable.hidden=!!w.raids;enable.disabled=busy;
    if(enableMech){enableMech.hidden=!!w.raids?.mechanoid;enableMech.disabled=mechBusy||w.raids?.profile!=='cassandra-raids-v1';enableMech.title=w.raids?.profile==='cassandra-raids-v1'?'Autoriser prospectivement la concurrence mécanique aux occasions Cassandra, à partir du jour 45 et avec une menace suffisante. Aucun raid n’est créé par ce bouton.':'Une colonie avec le calendrier Cassandra est nécessaire.';}
    const raid=w.raids?.active,mech=w.raids?.mechActive,last=w.raids?.last;
    if(!raid&&!mech&&!last){letter.remove();if(dialog.open)dialog.close();return;}
    const remaining=raid?w.pawns.filter(p=>raid.members.includes(p.id)&&p.state!=='dead'&&p.state!=='downed').length:0;
    const mechanicalRemaining=mech?w.mechanoids?.filter(m=>mech.members.includes(m.id)&&m.state!=='dead'&&m.state!=='downed').length??0:0;
    title.textContent=mech?`Raid mécanique : ${mechanicalRemaining} Scyther(s) · ${mech.phase==='staging'?'regroupement':'assaut'}`:raid?raid.phase==='assault'?`Raid : ${remaining} assaillant(s)`:'Retraite des assaillants':last?.mechanoid?'Assaut mécanique terminé':'Assaut terminé';
    letter.textContent=title.textContent;locate.hidden=!target();
    body.textContent=mech?mech.phase==='staging'?'Les machines hostiles se regroupent avant leur assaut. Elles peuvent déjà se défendre au contact. Préparez vos positions et votre circuit de défense.':'Les Scythers attaquent la colonie et peuvent ouvrir un passage dans les murs et portes. Leur anatomie mécanique est inspectable ; aucun soin, recrutement ou ordre colonial ne leur est accordé.':raid?raid.phase==='assault'?'Des ennemis arrivent par le bord et attaquent la colonie. Mobilisez les défenseurs, placez-les et préparez les secours. Les assaillants peuvent frapper les murs ou portes qui leur barrent l’accès.':'Les assaillants cherchent une sortie physique. Surveillez les blessés ; les survivants encore sur la carte restent hostiles.':last?.mechanoid?`Bilan confirmé : ${last.killed} Scyther(s) neutralisé(s). Une carcasse entière devient disponible après la fin de son déplacement et de son coup. Transportez-la pour une facture de concassage ou de broyage ; l’acier est produit à la finition réelle.`:`Bilan à la fin de l’assaut : ${last!.killed} ennemi(s) mort(s), ${last!.downed} à terre, ${last!.escaped} parti(s). Démobilisez, soignez les colons et réparez les ouvrages dans la zone de foyer. Les corps restent sur place pour les secours et la sépulture.`;
    const alerts=document.getElementById('alerts')!;if(letter.parentElement!==alerts)alerts.prepend(letter);
  }};
}
