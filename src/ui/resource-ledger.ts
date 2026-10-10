import './resource-ledger.css';
import { type ItemId } from '../sim/items';
import { STORAGE_FILTER_TREE, type StorageFilterNode } from './storage-filter-tree';
import { modelIconUrl } from './pictograms';

/** Reuse the storage catalogue hierarchy. Quantities count physical units;
 * the nutrition readout is a separate metric and never enters this census. */
export interface ResourceLedgerBranch { id: string; quantity: number; children: readonly ResourceLedgerBranch[] }
export function resourceLedgerBranch(node: StorageFilterNode, counts: ReadonlyMap<ItemId, number>): ResourceLedgerBranch {
  const children = (node.children ?? []).map(child => resourceLedgerBranch(child, counts));
  return { id: node.id, quantity: node.item && node.item !== 'furniture' ? counts.get(node.item) ?? 0
    : children.reduce((sum, child) => sum + child.quantity, 0), children };
}

interface LeafView { row: HTMLElement; count: HTMLElement; quantity: number }
interface BranchView { node: StorageFilterNode; element: HTMLDetailsElement; count: HTMLElement; quantity: number; branches: BranchView[] }

/** Built once. The caller supplies quantities from its existing pile census,
 * so opening the ledger or changing a stock adds no second world traversal. */
export function createResourceLedger(root: HTMLElement): { update(counts: ReadonlyMap<ItemId, number>): void } {
  const container = root.querySelector<HTMLElement>('#resources')!;
  const compatibility = document.createElement('div');
  compatibility.className = 'resource-ledger-compatibility'; compatibility.hidden = true;
  const nutrition = root.querySelector<HTMLElement>('#food')!.parentElement!;
  const previousRows = [...container.children];
  for (const row of previousRows) if (row !== nutrition) compatibility.append(row);
  const foodItems = root.querySelector<HTMLElement>('#food-items');
  if (foodItems) compatibility.append(foodItems);
  container.replaceChildren(); root.querySelector('.resource-list')!.append(compatibility);
  const leaves = new Map<ItemId, LeafView>();
  const branchViews: BranchView[] = [];

  function create(node: StorageFilterNode): HTMLElement {
    if (node.item) {
      const row = document.createElement('div'); row.className = 'resource'; row.dataset.item = node.item; row.hidden = true;
      const icon = document.createElement('span'); icon.className = 'resource-symbol ui-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.style.backgroundImage = `url('${modelIconUrl(node.item === 'furniture' ? 'stockpile' : `item-${node.item}`)}')`;
      icon.style.backgroundSize = 'contain'; icon.style.backgroundPosition = 'center';
      const label = document.createElement('span'); label.className = 'resource-name'; label.textContent = node.label;
      const count = document.createElement('strong'); count.textContent = '0'; row.append(icon, label, count); row.title = node.label;
      if (node.item !== 'furniture') leaves.set(node.item, { row, count, quantity: 0 });
      return row;
    }
    const element = document.createElement('details'); element.className = 'resource-ledger-group'; element.dataset.resourceCategory = node.id;
    element.open = ['foods', 'manufactured', 'raw-resources'].includes(node.id);
    const summary = document.createElement('summary'); summary.className = 'resource-ledger-heading';
    const label = document.createElement('span'); label.textContent = node.label;
    const count = document.createElement('strong'); count.textContent = '0'; summary.append(label, count); element.append(summary);
    const children = document.createElement('div'); children.className = 'resource-ledger-children'; element.append(children);
    const view: BranchView = { node, element, count, quantity: 0, branches: [] }; branchViews.push(view);
    for (const child of node.children ?? []) {
      const start = branchViews.length;
      children.append(create(child));
      if (!child.item) view.branches.push(branchViews[start]!);
    }
    if (node.id === 'foods') { nutrition.classList.add('resource-metric'); children.prepend(nutrition); }
    element.hidden = true;
    return element;
  }
  for (const node of STORAGE_FILTER_TREE) container.append(create(node));
  // Descendant-first order makes each aggregate a sum of disjoint children.
  const aggregateOrder = [...branchViews].reverse();
  return { update(counts) {
    for (const [item, leaf] of leaves) {
      const quantity = counts.get(item) ?? 0;
      if (quantity !== leaf.quantity) {
        leaf.quantity = quantity; leaf.count.textContent = String(quantity); leaf.row.hidden = quantity === 0;
      }
    }
    for (const view of aggregateOrder) {
      let quantity = 0;
      for (const child of view.node.children ?? []) quantity += child.item
        ? child.item === 'furniture' ? 0 : counts.get(child.item) ?? 0
        : view.branches.find(branch => branch.node === child)!.quantity;
      if (quantity !== view.quantity) {
        view.quantity = quantity; view.count.textContent = String(quantity); view.element.hidden = quantity === 0;
        view.element.querySelector('summary')!.title = `${view.node.label} · ${quantity} unité${quantity > 1 ? 's' : ''}`;
      }
    }
  } };
}
