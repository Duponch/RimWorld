/** Beds share roles, reservations and physical sleep services. */
export const isBedKind=(value:unknown):value is 'bed'|'hospital-bed'|'double-bed'|'sleeping-spot'=>value==='sleeping-spot'||value==='bed'||value==='hospital-bed'||value==='double-bed';
