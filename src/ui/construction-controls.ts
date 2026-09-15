import { constructionRecipe, constructionMaterials, validConstructionMaterial, deliveredMaterial, type ConstructionMaterial } from '../sim/construction-materials';
import { BUILDING_MATERIALS } from '../sim/building-materials';
import { ITEM_DEFINITIONS } from '../sim/items';
import { footprintCells } from '../sim/definitions';
import type { Job, JobKind, Structure, World } from '../sim/types';

const stuffable = new Set<string>(['door','wall', 'bed', 'table', 'stool', 'horseshoes', 'stonecutter']);
export const placementMaterial = (tool:string, material:ConstructionMaterial):ConstructionMaterial|undefined =>
  stuffable.has(tool) ? validConstructionMaterial(tool,material)?material:'wood' : tool === 'campfire' || tool === 'passive-cooler' ? 'wood' : undefined;

export function constructionControls(onChange:()=>void) {
  const control = document.getElementById('construction-material-controls')!;
  const select = document.getElementById('construction-material') as HTMLSelectElement;
  let previousTool='';
  select.onchange = onChange;
  return {
    material(tool:string) { return placementMaterial(tool, select.value as ConstructionMaterial); },
    update(tool:string, hint:string):string {
      control.hidden = !stuffable.has(tool);
      if(stuffable.has(tool)&&tool!==previousTool) {
        const preferred=select.value;
        select.replaceChildren(...constructionMaterials(tool).map(material=>{
          const option=document.createElement('option');option.value=material;option.textContent=ITEM_DEFINITIONS[material].label;return option;
        }));
        select.value=validConstructionMaterial(tool,preferred)?preferred:'wood';previousTool=tool;
      }
      const material = placementMaterial(tool, select.value as ConstructionMaterial);
      if (!material) return hint;
      const recipe = constructionRecipe({ kind:tool as JobKind, material });
      const rest=tool==='bed'&&BUILDING_MATERIALS[material].restFactor<1?' · Efficacité du repos : 90 %':'';
      return `${recipe.ingredients.map(c => `${c.quantity} ${ITEM_DEFINITIONS[c.item].label}`).join(' + ')} à livrer${rest} · ${hint}`;
    },
  };
}

export function constructionDeliveryLabel(world:World, job:Job):string {
  return constructionRecipe(job).ingredients.map(c => `${deliveredMaterial(world, job, c.item)}/${c.quantity} ${ITEM_DEFINITIONS[c.item].label}`).join(' + ');
}

export function structureFootprintLabel(structure:Structure):string {
  const cells=footprintCells(structure),xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
  return `${Math.max(...xs)-Math.min(...xs)+1} × ${Math.max(...zs)-Math.min(...zs)+1}`;
}
