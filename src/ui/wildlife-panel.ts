import type { World } from '../sim/types';
const labels={idle:'Se repose',moving:'Se déplace',eating:'Mange',sleeping:'Dort',hungry:'Cherche à manger'};
export function updateWildlifePanel(root:HTMLElement,world:World,focus:(id:number)=>void,enable:()=>void):void {
  if(!root.querySelector('[data-fauna-list]')) {
    root.innerHTML='<p>Lièvres sauvages · herbivores. Ils mangent les plantes accessibles, y compris les cultures, et les aliments au sol. Les portes fermées les arrêtent.</p><p class="muted">Première faune : santé animale, chasse, apprivoisement et dépouilles à venir. Ces animaux ne participent pas encore aux combats.</p><button data-fauna-enable>Introduire la faune dans cette ancienne partie</button><div data-fauna-list></div>';
    root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.onclick=enable;
  }
  root.querySelector<HTMLButtonElement>('[data-fauna-enable]')!.hidden=world.wildlife!==undefined;
  const list=root.querySelector<HTMLElement>('[data-fauna-list]')!,animals=world.wildlife?.animals??[];
  const signature=animals.map(a=>a.id).join(',');
  if(list.dataset.ids!==signature){
    list.dataset.ids=signature;list.replaceChildren(...animals.map(a=>{
      const row=document.createElement('p');row.dataset.animal=String(a.id);
      const button=document.createElement('button');button.textContent=`Repérer Lièvre ${a.id}`;button.onclick=()=>focus(a.id);
      row.append(button,document.createElement('span'));return row;
    }));
  }
  for(const a of animals){
    const state=a.state==='moving'&&!a.path.length&&!a.meal&&(!a.motion||a.motion.end<=world.tick)?'idle':a.state;
    list.querySelector(`[data-animal="${a.id}"] span`)!.textContent=` · ${a.sex==='female'?'Femelle':'Mâle'} · ${labels[state]}${a.meal&&state==='moving'?' vers sa nourriture':''} · ${a.x}, ${a.z}`;
  }
}
