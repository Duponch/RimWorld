import { constructionRecipe, deliveredMaterial, type ConstructionMaterial } from '../sim/construction-materials';
import { ITEM_DEFINITIONS } from '../sim/items';
import { footprintCells } from '../sim/definitions';
import type { Job, JobKind, Structure, World } from '../sim/types';

const stuffable = new Set<string>(['wall', 'bed', 'table', 'stool', 'horseshoes', 'stonecutter']);
export const placementMaterial = (tool:string, material:ConstructionMaterial):ConstructionMaterial|undefined =>
  stuffable.has(tool) ? material : tool === 'campfire' ? 'wood' : undefined;

export function constructionControls(onChange:()=>void) {
  const control = document.getElementById('construction-material-controls')!;
  const select = document.getElementById('construction-material') as HTMLSelectElement;
  select.onchange = onChange;
  return {
    material(tool:string) { return placementMaterial(tool, select.value as ConstructionMaterial); },
    update(tool:string, hint:string):string {
      control.hidden = !stuffable.has(tool);
      const material = placementMaterial(tool, select.value as ConstructionMaterial);
      if (!material) return hint;
      const recipe = constructionRecipe({ kind:tool as JobKind, material });
      return `${recipe.ingredients.map(c => `${c.quantity} ${ITEM_DEFINITIONS[c.item].label}`).join(' + ')} à livrer · ${hint}`;
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
