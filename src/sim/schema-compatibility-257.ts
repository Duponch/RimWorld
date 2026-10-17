/** Explicit compatibility window for persisted 256 mechanics. Never admits a future schema. */
export const isSchema256Or257=(value:unknown):value is 256|257=>value===256||value===257;
