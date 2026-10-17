/** Explicit compatibility window for persisted 256 mechanics through regular freight258. Never admits a future schema. */
export const isSchema256Or257=(value:unknown):value is 256|257|258=>value===256||value===257||value===258;
