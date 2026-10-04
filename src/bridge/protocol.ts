import type { Command } from '../sim/types';
import type { SnapshotMessage } from './snapshots';

export type Request =
  | { id: number; type: 'init'; seed: number; size: number; scenario?:import('../sim/scenario-definitions').ScenarioId; paused?:boolean; site?:import('../sim/site').SiteOptions }
  | { id: number; type: 'command'; command: Command }
  | { id: number; type: 'order-options'; pawnId: number; x: number; z: number; queue: boolean }
  | { id: number; type: 'speed'; speed: number }
  | { id: number; type: 'save' }
  | { id: number; type: 'resync' }
  | { id: number; type: 'load'; data: string };

export type Response =
  | SnapshotMessage
  | { type: 'reply'; id: number; ok: boolean; data?: string; reason?: string; outcome?: 'refused' | 'unknown'; checkpoint?: { epoch: number; revision: number } }
  | SimulationFault;

/** A fatal stop does not promise that the last tick was rolled back. */
export interface SimulationFault {
  type: 'fault';
  reason: string;
  speed: 0;
  tick?: number;
  transport?: true;
}

export interface SimulationRequestStatus {
  id: number;
  type: Request['type'];
  state: 'waiting' | 'settled';
  message?: string;
}

export class SimulationRequestError extends Error {
  constructor(message: string, readonly outcome: 'refused' | 'unknown', readonly stopped = false) {
    super(message);
    this.name = 'SimulationRequestError';
  }
}
