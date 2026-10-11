import { expect, test } from 'vitest';
import { DEFAULT_ROOM_ENABLED, ROOM_PREFERENCE_KEY, roomEnabled } from '../src/render/room-settings';
import { DIORAMA_PREFERENCE_KEY, dioramaEnabled } from '../src/render/diorama-settings';

test('the new decorative room starts enabled unless the browser explicitly disables it', () => {
  expect(DEFAULT_ROOM_ENABLED).toBe(true);
  for (const value of [null, undefined, '', 'bad', 'False', '0', 0, NaN, {}, [], 'true', true]) {
    expect(roomEnabled(value)).toBe(true);
  }
  expect(roomEnabled('false')).toBe(false); expect(roomEnabled(false)).toBe(false);
});

test('room and diorama preferences have separate durable keys and independently represent all four combinations', () => {
  expect(ROOM_PREFERENCE_KEY).toBe('lisiere.presentation.room.v1');
  expect(ROOM_PREFERENCE_KEY).not.toBe(DIORAMA_PREFERENCE_KEY);
  for (const room of [false, true]) for (const diorama of [false, true]) {
    const storage = new Map([[ROOM_PREFERENCE_KEY, String(room)], [DIORAMA_PREFERENCE_KEY, String(diorama)]]);
    expect(roomEnabled(storage.get(ROOM_PREFERENCE_KEY))).toBe(room);
    expect(dioramaEnabled(storage.get(DIORAMA_PREFERENCE_KEY))).toBe(diorama);
  }
});
