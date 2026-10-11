import { expect, test } from 'vitest';
import { CLOUD_MASK_RADIUS_KEY, cloudMaskRadius } from '../src/render/cloud-mask';
import { DEFAULT_ROOM_MASK_RADIUS, ROOM_MASK_RADIUS_KEY, roomMaskRadius, roomMaskRadiusLabel } from '../src/render/room-mask-settings';

test('the room central mask starts at the established cloud radius and defaults invalid storage', () => {
  expect(DEFAULT_ROOM_MASK_RADIUS).toBe(.31);
  for (const value of [null, undefined, '', '  ', '\n', NaN, Infinity, -Infinity, 'bad', 'Infinity', true, false, {}, []]) {
    expect(roomMaskRadius(value)).toBe(.31);
  }
});

test('explicit zero, endpoints and persisted intermediate radii survive without truthy coercion', () => {
  for (const radius of [0, .01, .31, .57, 1]) {
    expect(roomMaskRadius(radius)).toBe(radius);
    expect(roomMaskRadius(String(radius))).toBe(radius);
  }
});

test('finite out-of-range preferences are clamped to the full slider range', () => {
  expect(roomMaskRadius(-4)).toBe(0); expect(roomMaskRadius('-4')).toBe(0);
  expect(roomMaskRadius(4)).toBe(1); expect(roomMaskRadius('4')).toBe(1);
});

test('room and old cloud radii are separate browser preferences', () => {
  expect(ROOM_MASK_RADIUS_KEY).toBe('lisiere.presentation.room-mask-radius.v1');
  expect(ROOM_MASK_RADIUS_KEY).not.toBe(CLOUD_MASK_RADIUS_KEY);
  const stored = new Map([[ROOM_MASK_RADIUS_KEY, '.57'], [CLOUD_MASK_RADIUS_KEY, '.12']]);
  expect(roomMaskRadius(stored.get(ROOM_MASK_RADIUS_KEY))).toBe(.57);
  expect(cloudMaskRadius(stored.get(CLOUD_MASK_RADIUS_KEY))).toBe(.12);
});

test('labels distinguish disabled masking from a radius measured against the shorter viewport side', () => {
  expect(roomMaskRadiusLabel(0)).toBe('Aucun masquage central');
  expect(roomMaskRadiusLabel(.31)).toBe('Rayon : 31 % du petit côté de l’écran');
  expect(roomMaskRadiusLabel(1)).toBe('Rayon : 100 % du petit côté de l’écran');
});
