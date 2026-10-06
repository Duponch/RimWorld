import { expect, test } from 'vitest';
import { NumericMembership, type NumericMembershipWriter } from '../src/sim/numeric-membership.ts';

// These assignments also exercise the real TypeScript boundary used by the
// five domain readers/writers, including their native Set defaults.
const writers: NumericMembershipWriter[] = [new Set<number>(), new NumericMembership()];
const readers: ReadonlySet<number>[] = writers;

test('numeric membership preserves native membership, insertion order and iterable construction across dense bounds', () => {
  expect(readers).toHaveLength(2);
  for (const capacity of [0, 65_536]) {
    const values = [65_535, 65_536, -0, 0, NaN, NaN, 1.5, -4, Infinity, -Infinity,
      Number.MAX_SAFE_INTEGER, 2 ** 53, 65_535];
    const native = new Set<number>(), numeric = new NumericMembership(capacity);
    for (const value of values) {
      native.add(value);
      expect(numeric.add(value)).toBe(numeric);
      expect(numeric.size).toBe(native.size);
      for (const probe of values) expect(numeric.has(probe)).toBe(native.has(probe));
      expect([...numeric]).toEqual([...native]);
      expect([...numeric.keys()]).toEqual([...native.keys()]);
      expect([...numeric.entries()]).toEqual([...native.entries()]);
    }
    expect([...new Set(numeric)]).toEqual([...native]);
    expect([...new NumericMembership(capacity, values)]).toEqual([...native]);
    expect(Object.is([...numeric].find(value => value === 0), -0)).toBe(false);
  }
});

test('live iterators and forEach observe additions with native owner and callback semantics', () => {
  const native = new Set([1, 2]), numeric = new NumericMembership(16, [1, 2]);
  const a = native.values(), b = numeric.values();
  expect(b.next()).toEqual(a.next());
  native.add(3); numeric.add(3);
  expect([...b]).toEqual([...a]);
  expect(b.next().done).toBe(true);
  native.add(4); numeric.add(4);
  expect(b.next()).toEqual(a.next()); // An exhausted iterator stays exhausted.
  const context = { marker: 228 };
  function visit(set: NumericMembershipWriter): number[] {
    const seen: number[] = [];
    set.forEach(function (this: typeof context, value, value2, owner) {
      expect(this).toBe(context); expect(owner).toBe(set); expect(Object.is(value, value2)).toBe(true);
      seen.push(value);
      if (seen.length === 1) set.add(5);
    }, context);
    return seen;
  }
  expect(visit(numeric)).toEqual(visit(native));
  const entriesA = native.entries(), entriesB = numeric.entries();
  expect(entriesB.next()).toEqual(entriesA.next());
  native.add(6); numeric.add(6);
  expect([...entriesB]).toEqual([...entriesA]);
  expect(() => Reflect.apply(numeric.forEach, numeric, [null])).toThrow(TypeError);
});

test('historical raw JavaScript IDs retain reference identity and SameValueZero without coercion', () => {
  const object = {}, otherObject = {}, symbol = Symbol('owner');
  const noCoercion = { [Symbol.toPrimitive]() { throw Error('Unexpected ID coercion'); } };
  const values: unknown[] = [3, '3', undefined, null, false, 3n, object, object, otherObject, symbol,
    symbol, noCoercion, noCoercion, NaN, NaN, -0, 0];
  const native = new Set<unknown>(), numeric = new NumericMembership();
  for (const value of values) {
    native.add(value);
    expect(Reflect.apply(numeric.add, numeric, [value])).toBe(numeric);
    expect(numeric.size).toBe(native.size);
    for (const probe of [...values, {}, Symbol('owner')]) {
      expect(Reflect.apply(numeric.has, numeric, [probe])).toBe(native.has(probe));
    }
    expect([...numeric]).toEqual([...native]);
  }
  expect([...new Set(numeric)]).toEqual([...native]);
  expect([...numeric.entries()]).toEqual([...native.entries()]);
});
