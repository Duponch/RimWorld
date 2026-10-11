import { expect, test } from 'vitest';
import { RESOURCE_TOOLTIP_POINTER_DELAY_MS, TOOLTIP_POINTER_DELAY_MS, tooltipPointerDelay } from '../src/ui/tooltip';

test('resource hints require a deliberate hover while the existing ordinary delay stays intact', () => {
  expect(TOOLTIP_POINTER_DELAY_MS).toBe(450);
  expect(RESOURCE_TOOLTIP_POINTER_DELAY_MS).toBeGreaterThanOrEqual(1500);
  expect(RESOURCE_TOOLTIP_POINTER_DELAY_MS).toBeLessThanOrEqual(1800);
  const resource = { closest: (selector: string) => selector === '.resource-list' ? {} : null } as unknown as Element;
  const ordinary = { closest: () => null } as unknown as Element;
  expect(tooltipPointerDelay(resource)).toBe(RESOURCE_TOOLTIP_POINTER_DELAY_MS);
  expect(tooltipPointerDelay(ordinary)).toBe(TOOLTIP_POINTER_DELAY_MS);
});
