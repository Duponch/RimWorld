/** Beds share roles, reservations and physical sleep services. */
export const isBedKind=(value:unknown):value is 'bed'|'hospital-bed'=>value==='bed'||value==='hospital-bed';
