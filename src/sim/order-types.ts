import type { CookingTask } from './cooking-types.ts';
import type { HaulTask } from './types.ts';

export interface CookingOrder { cooking: CookingTask }
export type QueuedOrder = number | HaulTask | CookingOrder;
export const isCookingOrder=(order:QueuedOrder):order is CookingOrder=>typeof order!=='number'&&'cooking' in order;
export const isHaulOrder=(order:QueuedOrder):order is HaulTask=>typeof order!=='number'&&!isCookingOrder(order);
