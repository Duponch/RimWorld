import { describe, expect, test } from 'vitest';
import { NAVIGATION_LIMITS, validateBatch, validateGrid, type NavigationGrid } from '../src/navigation-gpu/contracts';
import { assertPathValid, solveCpuOracle } from '../src/navigation-gpu/oracle';

describe('GPU navigation diagnostic contracts (shader execution lives in gpu-navigation-bench)', () => {
  test('independent weighted oracle, cardinal geometry and result validation across obstacles and endpoints', () => {
    const grid: NavigationGrid = { width: 5, height: 3, revision: 1,
      costs: new Uint32Array([1, 8, 8, 8, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]) };
    const request = { id: 1, start: 0, goal: 4 };
    const path = solveCpuOracle(grid, request);
    expect(path.totalCost).toBe(8);
    expect([...path.cells]).toEqual([0, 5, 10, 11, 12, 13, 14, 9, 4]);
    assertPathValid(grid, request, path);
    expect(solveCpuOracle(grid, { ...request, goal: 6 }).status).toBe('unreachable');
    const stationary = solveCpuOracle(grid, { ...request, goal: 0 });
    expect(stationary.totalCost).toBe(0); expect([...stationary.cells]).toEqual([0]);
    const diagonal = { width: 2, height: 2, revision: 2, costs: new Uint32Array([1, 0, 0, 1]) };
    expect(solveCpuOracle(diagonal, { id: 0, start: 0, goal: 3 }).status).toBe('unreachable');
    const rowWrap = { id: 0, start: 4, goal: 5 };
    expect(() => assertPathValid(grid, rowWrap, { id: 0, status: 'found', cells: new Uint32Array([4, 5]), totalCost: 1 })).toThrow('non-cardinal');
    expect(() => assertPathValid(grid, request, { ...path, totalCost: 0 })).toThrow('reported cost');
    expect(() => assertPathValid(grid, request, { ...path, status: 'inconclusive' })).toThrow('partial result');
  });

  test('bounded integer inputs prevent overflow, aliasing-sized buffers, duplicate ids and oversized batches', () => {
    const grid: NavigationGrid = { width: 250, height: 250, revision: 0, costs: new Uint32Array(62500).fill(1) };
    validateGrid(grid);
    const requests = Array.from({ length: 32 }, (_, id) => ({ id, start: id, goal: 62499 - id }));
    const bounds = validateBatch(grid, requests);
    expect(bounds.fieldBytes).toBe(8_000_000);
    expect(bounds.allocatedBytes).toBeLessThan(NAVIGATION_LIMITS.maxAllocatedBytes);
    expect(bounds.maxIterations).toBe(512);
    for (const invalid of [NaN, Infinity, -1, 1.5, 0x1_0000_0000]) {
      expect(() => validateGrid({ ...grid, revision: invalid })).toThrow();
      expect(() => validateBatch(grid, [{ id: 0, start: invalid, goal: 0 }])).toThrow();
    }
    expect(() => validateGrid({ ...grid, costs: new Uint32Array(4) })).toThrow();
    expect(() => validateGrid({ width: 1, height: 1, revision: 1, costs: new Uint32Array([256]) })).toThrow();
    expect(() => validateBatch(grid, [])).toThrow();
    expect(() => validateBatch(grid, [...requests, { id: 32, start: 0, goal: 1 }])).toThrow();
    expect(() => validateBatch(grid, [requests[0], requests[0]])).toThrow();
    expect(() => validateBatch(grid, requests, { maxIterations: 4097 })).toThrow();
    expect(() => validateBatch(grid, requests, { maxPathLength: 0 })).toThrow();
    expect(validateBatch(grid, requests, { maxIterations: 0 }).maxIterations).toBe(0);
  });
});
