import type { Command, World } from '../sim/types';

export type Request =
  | { id: number; type: 'init'; seed: number; size: number }
  | { id: number; type: 'command'; command: Command }
  | { id: number; type: 'speed'; speed: number }
  | { id: number; type: 'save' }
  | { id: number; type: 'load'; data: string };

export type Response =
  | { type: 'snapshot'; world: World; stepMs: number; speed: number }
  | { type: 'reply'; id: number; ok: boolean; data?: string; reason?: string };
