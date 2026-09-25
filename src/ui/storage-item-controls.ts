import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';

export type StorageItemSelection = Partial<Record<ItemId, boolean>>;
const GROUP_LABELS:Readonly<Record<string,string>>={silver:'Argent',corpse:'Dépouilles',wood:'Bois',food:'Nourriture',unfinished:'Ouvrages inachevés',textile:'Textiles',chunk:'Fragments',steel:'Acier',component:'Composants',medicine:'Médicaments',weapon:'Armes',apparel:'Vêtements',blocks:'Blocs de pierre'};

/** Mount beside the existing category controls. A historical zone without an
 * item list displays every item as selected, matching its category-only rule. */
export function mountStorageItemControls(parent:HTMLElement,items?:StorageItemSelection):HTMLElement {
  const fieldset=document.createElement('fieldset');
  fieldset.className='storage-item-controls';
  const legend=document.createElement('legend');legend.textContent='Objets précis';fieldset.append(legend);
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.dataset.storageItemToggle='';toggle.checked=items!==undefined;
  const enable=document.createElement('label');enable.append(toggle,document.createTextNode(' Affiner les catégories par objet'));fieldset.append(enable);
  const body=document.createElement('div');body.className='storage-item-list';body.hidden=!toggle.checked;fieldset.append(body);
  toggle.onchange=()=>{body.hidden=!toggle.checked;};
  const actions=document.createElement('div');actions.className='storage-item-actions';body.append(actions);
  for(const [label,checked] of [['Tout autoriser',true],['Tout refuser',false]] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{for(const c of body.querySelectorAll<HTMLInputElement>('input'))c.checked=checked;};actions.append(b);}
  const groups=new Map<string,HTMLElement>();
  for(const [id,definition] of Object.entries(ITEM_DEFINITIONS) as [ItemId,(typeof ITEM_DEFINITIONS)[ItemId]][]) {
    let group=groups.get(definition.kind);
    if(!group){
      const details=document.createElement('details'),summary=document.createElement('summary');
      summary.textContent=GROUP_LABELS[definition.kind]??definition.kind;details.append(summary);body.append(details);
      group=details;groups.set(definition.kind,group);
    }
    const label=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.dataset.storageItem=id;check.checked=items===undefined||items[id]===true;
    label.append(check,document.createTextNode(` ${definition.label}`));group.append(label);
  }
  parent.append(fieldset);return fieldset;
}

/** An explicit map intentionally contains only accepted items. */
export function readStorageItemControls(parent:ParentNode):StorageItemSelection|undefined {
  if(!parent.querySelector<HTMLInputElement>('[data-storage-item-toggle]')?.checked)return undefined;
  const items:StorageItemSelection={};
  for(const check of parent.querySelectorAll<HTMLInputElement>('input[data-storage-item]'))if(check.checked)items[check.dataset.storageItem as ItemId]=true;
  return items;
}

export function showStorageItemControls(parent:ParentNode,items?:StorageItemSelection):void {
  const toggle=parent.querySelector<HTMLInputElement>('[data-storage-item-toggle]');if(toggle)toggle.checked=items!==undefined;
  const body=parent.querySelector<HTMLElement>('.storage-item-list');if(body)body.hidden=items===undefined;
  for(const check of parent.querySelectorAll<HTMLInputElement>('input[data-storage-item]'))check.checked=items===undefined||items[check.dataset.storageItem as ItemId]===true;
}
